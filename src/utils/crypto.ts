/**
 * End-to-End Encryption (E2EE) Cryptographic Utilities
 * Uses Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation).
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

export interface EncryptedPayload {
  iv: string; // base64
  salt: string; // base64
  ciphertext: string; // base64
  version: number;
}

/**
 * Convert ArrayBuffer or Uint8Array to Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-GCM CryptoKey from a user passphrase and salt using PBKDF2
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary string with a passphrase using AES-256-GCM
 */
export async function encryptData(plainText: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    enc.encode(plainText)
  );

  return {
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    version: 1,
  };
}

/**
 * Decrypt an EncryptedPayload back into plaintext using the passphrase
 */
export async function decryptData(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Failed to decrypt: invalid password or corrupted data');
  }
}

/**
 * Generate a secure authentication hash token for passphrase validation
 */
export async function hashPassphrase(passphrase: string, saltBase64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltBase64 ? base64ToUint8Array(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const rawKey = await crypto.subtle.exportKey('raw', key).catch(async () => {
    // Fallback SHA-256 HMAC or direct hash
    const enc = new TextEncoder();
    const data = enc.encode(passphrase + arrayBufferToBase64(salt));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return digest;
  });
  return {
    hash: arrayBufferToBase64(rawKey),
    salt: arrayBufferToBase64(salt),
  };
}
