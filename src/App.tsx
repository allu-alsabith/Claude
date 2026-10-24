import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, Attachment, ModelOption } from './types/chat';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ArtifactsPanel } from './components/ArtifactsPanel';
import { ImageStudioModal } from './components/ImageStudioModal';
import { VideoStudioModal } from './components/VideoStudioModal';
import { VaultModal } from './components/VaultModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { extractArtifacts, Artifact } from './utils/artifacts';
import {
  DEFAULT_SHORTCUTS,
  loadCustomShortcuts,
  matchesShortcut,
  UserCustomShortcuts,
} from './utils/shortcuts';
import {
  getLocalVaultSettings,
  saveLocalVaultSettings,
  getLocalSessions,
  saveLocalSessions,
  syncSessionToCloud,
  fetchSessionsFromCloud,
  deleteSessionFromCloud,
  VaultSettings,
} from './services/storageService';
import { hashPassphrase } from './utils/crypto';
import { auth, testConnection } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Sparkles, Code, Brain, Film, Globe, ShieldCheck } from 'lucide-react';

const DEFAULT_MODELS: ModelOption[] = [
  {
    id: 'claude-fable-5.1',
    name: 'Claude Fable 5.1',
    provider: 'Anthropic',
    badge: 'Flagship',
    description: 'Anthropic next-gen intelligence with extended thinking & artifacts',
    supportsThinking: true,
    supportsArtifacts: true,
    supportsVision: true,
    recommended: true,
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    badge: 'Hybrid Reasoning',
    description: 'Cutting-edge reasoning and software architecture precision',
    supportsThinking: true,
    supportsArtifacts: true,
    supportsVision: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    badge: 'Code Benchmark',
    description: 'Industry standard for complex programming and synthesis',
    supportsThinking: false,
    supportsArtifacts: true,
    supportsVision: true,
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    provider: 'Google',
    badge: 'Deep Reasoning',
    description: 'Deep high-thinking level model with video and image understanding',
    supportsThinking: true,
    supportsArtifacts: true,
    supportsVision: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google',
    badge: 'Search Grounded',
    description: 'High-speed intelligence powered with live Google Search',
    supportsThinking: true,
    supportsArtifacts: true,
    supportsVision: true,
    supportsSearch: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'Google',
    badge: 'Sub-Second',
    description: 'Ultra low-latency responses for quick questions and edits',
    supportsThinking: false,
    supportsArtifacts: true,
    supportsVision: false,
  },
];

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('claude_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // UI view states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024;
    return true;
  });
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  // Models
  const [availableModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [currentModelId, setCurrentModelId] = useState<string>('claude-fable-5.1');

  // Chat options
  const [enableThinking, setEnableThinking] = useState(true);
  const [enableSearch, setEnableSearch] = useState(false);

  // Sessions and Active Chat
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authentication & Vault
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [vaultSettings, setVaultSettings] = useState<VaultSettings>(getLocalVaultSettings());
  const [vaultPassphrase, setVaultPassphrase] = useState<string>('local-claude-master-key'); // Default local unlock
  const [customShortcuts, setCustomShortcuts] = useState<UserCustomShortcuts>(loadCustomShortcuts());

  // Modals
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isVideoStudioOpen, setIsVideoStudioOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Audio TTS playback
  const [currentTtsId, setCurrentTtsId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync theme class to html/body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('claude_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('claude_theme', 'light');
    }
  }, [isDarkMode]);

  // Test Firestore on boot and listen to Firebase Auth
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const cloudSessions = await fetchSessionsFromCloud(vaultPassphrase);
          if (cloudSessions.length > 0) {
            setSessions(cloudSessions);
            setCurrentSessionId(cloudSessions[0].id);
          }
        } catch (e) {
          console.warn('Could not load cloud sessions:', e);
        }
      }
    });
    return () => unsubscribe();
  }, [vaultPassphrase]);

  // Load initial local sessions
  useEffect(() => {
    (async () => {
      try {
        const loaded = await getLocalSessions(vaultPassphrase);
        if (loaded && loaded.length > 0) {
          setSessions(loaded);
          setCurrentSessionId(loaded[0].id);
        } else {
          // Create initial welcome session
          handleCreateNewChat();
        }
      } catch (err: any) {
        if (err.message === 'VAULT_LOCKED') {
          setVaultSettings((prev) => ({ ...prev, isLocked: true }));
        }
      }
    })();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea unless it's a Ctrl/Cmd combination
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      DEFAULT_SHORTCUTS.forEach((action) => {
        if (matchesShortcut(e, action, customShortcuts)) {
          if (isInput && !action.modifiers.ctrlOrMeta) return;
          e.preventDefault();

          if (action.id === 'new_chat') handleCreateNewChat();
          else if (action.id === 'toggle_sidebar') setIsSidebarOpen((prev) => !prev);
          else if (action.id === 'toggle_artifacts') {
            if (activeArtifact) setActiveArtifact(null);
            else {
              const currentChat = sessions.find((s) => s.id === currentSessionId);
              const lastArtifact = currentChat?.messages
                .flatMap((m) => m.artifacts || [])
                .at(-1);
              if (lastArtifact) setActiveArtifact(lastArtifact);
            }
          } else if (action.id === 'toggle_theme') setIsDarkMode((prev) => !prev);
          else if (action.id === 'open_shortcuts') setIsShortcutsModalOpen(true);
          else if (action.id === 'toggle_voice') setIsVoiceModalOpen(true);
        }
      });
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [customShortcuts, activeArtifact, sessions, currentSessionId]);

  // Active session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;

  // New Chat handler
  const handleCreateNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      userId: currentUser?.uid || 'local-guest',
      title: 'New Conversation',
      model: currentModelId,
      messages: [],
      isEncrypted: vaultSettings.isE2EEEnabled,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveArtifact(null);
    saveLocalSessions([newSession, ...sessions], vaultPassphrase, vaultSettings.isE2EEEnabled);
  };

  // Delete chat
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveLocalSessions(updated, vaultPassphrase, vaultSettings.isE2EEEnabled);
    if (currentUser) deleteSessionFromCloud(id);

    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
      } else {
        handleCreateNewChat();
      }
    }
  };

  // Rename chat
  const handleRenameSession = (id: string, newTitle: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s));
    setSessions(updated);
    saveLocalSessions(updated, vaultPassphrase, vaultSettings.isE2EEEnabled);
    const renamed = updated.find((s) => s.id === id);
    if (renamed && currentUser) syncSessionToCloud(renamed, vaultPassphrase);
  };

  // Toggle pin
  const handleTogglePinSession = (id: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s));
    setSessions(updated);
    saveLocalSessions(updated, vaultPassphrase, vaultSettings.isE2EEEnabled);
    const pinned = updated.find((s) => s.id === id);
    if (pinned && currentUser) syncSessionToCloud(pinned, vaultPassphrase);
  };

  // Send message & streaming response
  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    let targetSession = currentSession;
    if (!targetSession) {
      const newId = `chat-${Date.now()}`;
      targetSession = {
        id: newId,
        userId: currentUser?.uid || 'local-guest',
        title: text.slice(0, 32) || 'New Conversation',
        model: currentModelId,
        messages: [],
        isEncrypted: vaultSettings.isE2EEEnabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions([targetSession, ...sessions]);
      setCurrentSessionId(newId);
    }

    // User message
    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    // Placeholder assistant message
    const assistantMessageId = `msg-${Date.now() + 1}-a`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: currentModelId,
      timestamp: Date.now(),
    };

    const newMessages = [...targetSession.messages, userMessage, initialAssistantMessage];

    // Auto-title from first user message
    const updatedTitle =
      targetSession.messages.length === 0
        ? text.slice(0, 36) || 'New Conversation'
        : targetSession.title;

    const updatedSession: ChatSession = {
      ...targetSession,
      title: updatedTitle,
      messages: newMessages,
      model: currentModelId,
      updatedAt: Date.now(),
    };

    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          modelId: currentModelId,
          messages: newMessages.slice(0, -1), // exclude empty assistant message
          enableThinking,
          enableSearch,
          attachments: attachments.map((a) => ({ mimeType: a.mimeType, data: a.data })),
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let thinkingTrace = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  fullContent += parsed.text;
                }
                if (parsed.thinking) {
                  thinkingTrace += parsed.thinking;
                }

                // Check for artifacts in progress
                const { cleanedText, artifacts } = extractArtifacts(fullContent);

                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id !== updatedSession.id) return s;
                    const msgs = s.messages.map((m) => {
                      if (m.id === assistantMessageId) {
                        return {
                          ...m,
                          content: fullContent,
                          thinkingTrace: thinkingTrace || undefined,
                          artifacts,
                        };
                      }
                      return m;
                    });
                    return { ...s, messages: msgs };
                  })
                );

                // Auto-open first detected artifact
                if (artifacts.length > 0 && !activeArtifact) {
                  setActiveArtifact(artifacts[0]);
                }
              } catch {
                // partial chunk, ignore
              }
            }
          }
        }
      }

      // Finalize artifacts
      const { artifacts } = extractArtifacts(fullContent);
      const finalizedSession: ChatSession = {
        ...updatedSession,
        messages: updatedSession.messages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: fullContent, thinkingTrace: thinkingTrace || undefined, artifacts }
            : m
        ),
      };

      setSessions((prev) => prev.map((s) => (s.id === finalizedSession.id ? finalizedSession : s)));
      saveLocalSessions([finalizedSession, ...sessions.filter((s) => s.id !== finalizedSession.id)], vaultPassphrase, vaultSettings.isE2EEEnabled);
      if (currentUser) syncSessionToCloud(finalizedSession, vaultPassphrase);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat generation error:', err);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== updatedSession.id) return s;
            const msgs = s.messages.map((m) => {
              if (m.id === assistantMessageId) {
                return {
                  ...m,
                  content: `⚠️ Error generating response: ${err.message}. Please check your connection.`,
                };
              }
              return m;
            });
            return { ...s, messages: msgs };
          })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // TTS handler with gemini-3.8-flash-tts
  const handleTtsPlay = async (messageId: string, text: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setCurrentTtsId(messageId);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Kore' }),
      });
      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setCurrentTtsId(null);
        audio.onerror = () => setCurrentTtsId(null);
        audio.play();
      } else {
        setCurrentTtsId(null);
      }
    } catch (e) {
      console.error('TTS playback error:', e);
      setCurrentTtsId(null);
    }
  };

  const handleTtsStop = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setCurrentTtsId(null);
    }
  };

  // Vault unlock
  const handleUnlockVault = async (passphrase: string): Promise<boolean> => {
    try {
      const loaded = await getLocalSessions(passphrase);
      setVaultPassphrase(passphrase);
      setVaultSettings((prev) => {
        const s = { ...prev, isLocked: false };
        saveLocalVaultSettings(s);
        return s;
      });
      if (loaded.length > 0) {
        setSessions(loaded);
        setCurrentSessionId(loaded[0].id);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Vault lock
  const handleLockVault = () => {
    setVaultPassphrase('');
    setVaultSettings((prev) => {
      const s = { ...prev, isLocked: true };
      saveLocalVaultSettings(s);
      return s;
    });
    setSessions([]);
    setCurrentSessionId(null);
    setActiveArtifact(null);
  };

  // Set passphrase
  const handleSetPassphrase = async (newPassphrase: string) => {
    const { hash, salt } = await hashPassphrase(newPassphrase);
    setVaultPassphrase(newPassphrase);
    const updated: VaultSettings = {
      isE2EEEnabled: true,
      isLocked: false,
      passphraseHash: hash,
      passphraseSalt: salt,
    };
    setVaultSettings(updated);
    saveLocalVaultSettings(updated);
    saveLocalSessions(sessions, newPassphrase, true);
  };

  // Export encrypted vault
  const handleExportVault = () => {
    const rawData = localStorage.getItem('claude_fable_sessions_v1') || '[]';
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import vault
  const handleImportVault = async (file: File) => {
    const text = await file.text();
    localStorage.setItem('claude_fable_sessions_v1', text);
    const loaded = await getLocalSessions(vaultPassphrase);
    setSessions(loaded);
    if (loaded.length > 0) setCurrentSessionId(loaded[0].id);
  };

  // Insert generated media to chat
  const handleInsertMedia = (url: string, promptText: string, isVideo = false) => {
    handleSendMessage(
      `Here is the ${isVideo ? 'video' : 'image'} I created:\n\n${
        isVideo
          ? `<video controls src="${url}" class="rounded-xl max-h-80 w-full"></video>`
          : `![${promptText}](${url})`
      }`
    );
  };

  // Claude greeting time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans transition-colors ${
        isDarkMode ? 'bg-[#18181a] text-zinc-100' : 'bg-[#faf9f5] text-stone-900'
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setActiveArtifact(null);
        }}
        onNewChat={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        onOpenVault={() => setIsVaultModalOpen(true)}
        isVaultLocked={vaultSettings.isLocked}
      />

      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <Header
          currentModelId={currentModelId}
          onSelectModel={setCurrentModelId}
          availableModels={availableModels}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onOpenVault={() => setIsVaultModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          chatTitle={currentSession?.title || 'Claude'}
          isVaultLocked={vaultSettings.isLocked}
          currentUser={currentUser}
        />

        {/* Chat / Workspace Body */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {vaultSettings.isLocked ? (
              /* Vault Locked View */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2">Vault is Encrypted &amp; Locked</h3>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mb-6 leading-relaxed">
                  Your chat history is protected with zero-knowledge 256-bit AES-GCM encryption. Enter your master passphrase to unlock.
                </p>
                <button
                  onClick={() => setIsVaultModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#CC785C] text-white font-medium text-xs hover:bg-[#b8664c] transition-colors shadow-sm"
                >
                  Unlock Vault
                </button>
              </div>
            ) : !currentSession || currentSession.messages.length === 0 ? (
              /* Claude Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto">
                {/* Claude Clover Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-[#CC785C] text-white flex items-center justify-center mb-4 shadow-sm select-none">
                  <Sparkles className="w-6 h-6" />
                </div>

                <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-tight mb-2">
                  {getGreeting()}
                </h1>
                <p className="text-xs md:text-sm text-stone-500 dark:text-zinc-400 font-serif max-w-md mb-8">
                  Claude Fable 5.1 is Anthropic's flagship intelligence, ready for reasoning, code artifacts, and multimodal creation.
                </p>

                {/* Prompt Starters Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Build an interactive React Kanban Board component with columns for Backlog, In Progress, and Done, with drag-and-drop cards and warm Claude styling.'
                      )
                    }
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-amber-500/50 hover:bg-stone-50 dark:hover:bg-zinc-800/80 transition-all text-xs group"
                  >
                    <div className="flex items-center space-x-2 font-semibold font-serif mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      <Code className="w-3.5 h-3.5 text-[#CC785C]" />
                      <span>Interactive Kanban App</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-2">
                      Generate a responsive drag-and-drop board rendered live in Artifacts
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Perform a deep thinking analysis comparing transformer scaling laws, test-time compute, and future architectural limits in modern frontier models.'
                      )
                    }
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-amber-500/50 hover:bg-stone-50 dark:hover:bg-zinc-800/80 transition-all text-xs group"
                  >
                    <div className="flex items-center space-x-2 font-semibold font-serif mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      <Brain className="w-3.5 h-3.5 text-[#CC785C]" />
                      <span>Deep Reasoning Analysis</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-2">
                      Rigorous multi-step thinking on test-time compute and scaling laws
                    </p>
                  </button>

                  <button
                    onClick={() => setIsImageStudioOpen(true)}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-amber-500/50 hover:bg-stone-50 dark:hover:bg-zinc-800/80 transition-all text-xs group"
                  >
                    <div className="flex items-center space-x-2 font-semibold font-serif mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      <Sparkles className="w-3.5 h-3.5 text-[#CC785C]" />
                      <span>Studio Image Generator</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-2">
                      Configure 1:1, 16:9, or 21:9 aspect ratios in 1K, 2K, or 4K resolution
                    </p>
                  </button>

                  <button
                    onClick={() => setIsVideoStudioOpen(true)}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-amber-500/50 hover:bg-stone-50 dark:hover:bg-zinc-800/80 transition-all text-xs group"
                  >
                    <div className="flex items-center space-x-2 font-semibold font-serif mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      <Film className="w-3.5 h-3.5 text-[#CC785C]" />
                      <span>Cinematic Video Synthesizer</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-2">
                      Animate photos or text into 16:9 landscape or 9:16 portrait video
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="flex-1 pb-4">
                {currentSession.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isDarkMode={isDarkMode}
                    onOpenArtifact={(art) => setActiveArtifact(art)}
                    onTtsPlay={handleTtsPlay}
                    isPlayingTts={currentTtsId === message.id}
                    onTtsStop={handleTtsStop}
                  />
                ))}
                {isLoading && (
                  <div className="py-4 px-8 max-w-3xl mx-auto flex items-center space-x-3 text-xs text-stone-500 dark:text-zinc-400 font-mono">
                    <div className="w-2 h-2 rounded-full bg-[#CC785C] animate-ping" />
                    <span>Claude Fable 5.1 is thinking and writing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Bottom Floating Input */}
            {!vaultSettings.isLocked && (
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onStopGeneration={handleStopGeneration}
                isDarkMode={isDarkMode}
                enableThinking={enableThinking}
                onToggleThinking={() => setEnableThinking(!enableThinking)}
                enableSearch={enableSearch}
                onToggleSearch={() => setEnableSearch(!enableSearch)}
                onOpenImageStudio={() => setIsImageStudioOpen(true)}
                onOpenVideoStudio={() => setIsVideoStudioOpen(true)}
              />
            )}
          </div>

          {/* Claude Artifacts Split-Screen Panel */}
          {activeArtifact && (
            <ArtifactsPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        isDarkMode={isDarkMode}
        onInsertImageToChat={(url, prompt) => handleInsertMedia(url, prompt, false)}
      />

      <VideoStudioModal
        isOpen={isVideoStudioOpen}
        onClose={() => setIsVideoStudioOpen(false)}
        isDarkMode={isDarkMode}
        onInsertVideoToChat={(url, prompt) => handleInsertMedia(url, prompt, true)}
      />

      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        isDarkMode={isDarkMode}
        isLocked={vaultSettings.isLocked}
        onUnlockVault={handleUnlockVault}
        onLockVault={handleLockVault}
        onSetPassphrase={handleSetPassphrase}
        hasPassphrase={!!vaultPassphrase}
        onExportVault={handleExportVault}
        onImportVault={handleImportVault}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        isDarkMode={isDarkMode}
        customShortcuts={customShortcuts}
        onUpdateShortcuts={setCustomShortcuts}
      />

      <LiveVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        isDarkMode={isDarkMode}
        modelName={currentModelId.toUpperCase()}
      />
    </div>
  );
}
