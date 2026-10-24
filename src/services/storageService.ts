import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { ChatSession } from '../types/chat';
import { encryptData, decryptData, EncryptedPayload } from '../utils/crypto';

const LOCAL_STORAGE_KEY = 'claude_fable_sessions_v1';
const VAULT_SETTINGS_KEY = 'claude_vault_settings_v1';

export interface VaultSettings {
  isE2EEEnabled: boolean;
  isLocked: boolean;
  passphraseHash?: string;
  passphraseSalt?: string;
}

export function getLocalVaultSettings(): VaultSettings {
  if (typeof window === 'undefined') return { isE2EEEnabled: false, isLocked: false };
  try {
    const raw = localStorage.getItem(VAULT_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { isE2EEEnabled: true, isLocked: false };
  } catch {
    return { isE2EEEnabled: true, isLocked: false };
  }
}

export function saveLocalVaultSettings(settings: VaultSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VAULT_SETTINGS_KEY, JSON.stringify(settings));
}

// Local sessions store
export async function getLocalSessions(passphrase?: string): Promise<ChatSession[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // If data is encrypted payload
    if (parsed.version && parsed.ciphertext) {
      if (!passphrase) {
        throw new Error('VAULT_LOCKED');
      }
      const decrypted = await decryptData(parsed as EncryptedPayload, passphrase);
      return JSON.parse(decrypted);
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    if (err.message === 'VAULT_LOCKED') throw err;
    console.error('Error loading local sessions:', err);
    return [];
  }
}

export async function saveLocalSessions(sessions: ChatSession[], passphrase?: string, encrypt: boolean = false): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (encrypt && passphrase) {
      const encrypted = await encryptData(JSON.stringify(sessions), passphrase);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(encrypted));
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (err) {
    console.error('Error saving local sessions:', err);
  }
}

// Firestore cloud sync (when user signed in)
export async function syncSessionToCloud(session: ChatSession, passphrase?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const chatPath = `users/${user.uid}/chats/${session.id}`;
  try {
    let cloudData: any = {
      id: session.id,
      userId: user.uid,
      title: session.title.slice(0, 500),
      model: session.model,
      pinned: !!session.pinned,
      isEncrypted: !!session.isEncrypted,
      preview: session.messages[session.messages.length - 1]?.content.slice(0, 300) || '',
      messageCount: session.messages.length,
      createdAt: new Date(session.createdAt).toISOString(),
      updatedAt: new Date(session.updatedAt).toISOString(),
    };

    if (session.isEncrypted && passphrase) {
      const payload = await encryptData(JSON.stringify(session.messages), passphrase);
      cloudData.encryptedData = JSON.stringify(payload);
    } else {
      cloudData.messages = JSON.stringify(session.messages);
    }

    await setDoc(doc(db, 'users', user.uid, 'chats', session.id), cloudData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, chatPath);
  }
}

export async function fetchSessionsFromCloud(passphrase?: string): Promise<ChatSession[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const chatCollectionPath = `users/${user.uid}/chats`;
  try {
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'chats'));
    const sessions: ChatSession[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let messages = [];

      if (data.isEncrypted && data.encryptedData) {
        if (passphrase) {
          try {
            const payload = JSON.parse(data.encryptedData);
            const decrypted = await decryptData(payload, passphrase);
            messages = JSON.parse(decrypted);
          } catch {
            messages = [{ id: 'locked', role: 'assistant', content: '🔒 [Encrypted Message - Enter vault passphrase to decrypt]', timestamp: Date.now() }];
          }
        } else {
          messages = [{ id: 'locked', role: 'assistant', content: '🔒 [Encrypted Message - Enter vault passphrase to decrypt]', timestamp: Date.now() }];
        }
      } else if (data.messages) {
        try {
          messages = JSON.parse(data.messages);
        } catch {
          messages = [];
        }
      }

      sessions.push({
        id: data.id,
        userId: data.userId,
        title: data.title || 'Untitled Chat',
        model: data.model || 'claude-fable-5.1',
        messages,
        pinned: !!data.pinned,
        isEncrypted: !!data.isEncrypted,
        createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
      });
    }

    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, chatCollectionPath);
  }
}

export async function deleteSessionFromCloud(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const chatPath = `users/${user.uid}/chats/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'chats', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, chatPath);
  }
}
