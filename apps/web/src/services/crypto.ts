/**
 * Darklock Web - Crypto Service
 * 
 * Wraps @darklock/crypto for web app usage.
 * Manages the in-memory root key and provides convenience methods.
 */

import {
  initCrypto,
  deriveRootKey,
  createKdfParams,
  encryptString,
  decryptString,
  createItemKey,
  unwrapItemKey,
  createContentKey,
  unwrapContentKey,
  rotateItemKeys,
  generateKey,
  toBase64,
  fromBase64,
  createExportPackage,
  openExportPackage,
  zeroizeRootKey,
  generateShareKeypair,
  generateSigningKeypair,
  createShareEnvelope,
  openShareEnvelope,
  type RootKey,
  type KdfParams,
  type WrappedItemKey,
  type WrappedContentKey,
  type EncryptedEnvelope,
  type Bytes,
} from '@darklock/crypto';

let _rootKey: RootKey | null = null;
let _initialized = false;

/**
 * Initialize crypto engine (call at app start).
 */
export async function init(): Promise<void> {
  if (!_initialized) {
    await initCrypto();
    _initialized = true;
  }
}

/**
 * Derive root key from password and store in memory.
 */
export async function unlock(password: string, kdfParams: KdfParams): Promise<RootKey> {
  await init();
  _rootKey = await deriveRootKey(password, kdfParams);
  return _rootKey;
}

/**
 * Lock the vault — zero and discard the root key.
 */
export async function lock(): Promise<void> {
  if (_rootKey) {
    await zeroizeRootKey(_rootKey);
    _rootKey = null;
  }
}

/**
 * Check if vault is currently unlocked.
 */
export function isUnlocked(): boolean {
  return _rootKey !== null;
}

/**
 * Get the current root key (throws if locked).
 */
export function getRootKey(): RootKey {
  if (!_rootKey) throw new Error('Vault is locked');
  return _rootKey;
}

/**
 * Get base64 server auth key for API calls.
 */
export async function getServerAuthKeyBase64(): Promise<string> {
  return toBase64(getRootKey().serverAuthKey);
}

/**
 * Create new KDF parameters for a fresh vault/account.
 */
export { createKdfParams };

/**
 * Encrypt a note's title.
 */
export async function encryptTitle(title: string, contentKey: Bytes): Promise<EncryptedEnvelope> {
  return encryptString(title, contentKey);
}

/**
 * Decrypt a note's title.
 */
export async function decryptTitle(envelope: EncryptedEnvelope, contentKey: Bytes): Promise<string> {
  return decryptString(envelope, contentKey);
}

/**
 * Encrypt a note's body.
 */
export async function encryptBody(body: string, contentKey: Bytes): Promise<EncryptedEnvelope> {
  return encryptString(body, contentKey);
}

/**
 * Decrypt a note's body.
 */
export async function decryptBody(envelope: EncryptedEnvelope, contentKey: Bytes): Promise<string> {
  return decryptString(envelope, contentKey);
}

/**
 * Encrypt tags array.
 */
export async function encryptTags(tags: string[], contentKey: Bytes): Promise<EncryptedEnvelope> {
  return encryptString(JSON.stringify(tags), contentKey);
}

/**
 * Decrypt tags array.
 */
export async function decryptTags(envelope: EncryptedEnvelope, contentKey: Bytes): Promise<string[]> {
  const json = await decryptString(envelope, contentKey);
  return JSON.parse(json);
}

// Re-export key management
export {
  createItemKey,
  unwrapItemKey,
  createContentKey,
  unwrapContentKey,
  rotateItemKeys,
  toBase64,
  fromBase64,
  createExportPackage,
  openExportPackage,
  generateShareKeypair,
  generateSigningKeypair,
  createShareEnvelope,
  openShareEnvelope,
};

export type {
  RootKey,
  KdfParams,
  WrappedItemKey,
  WrappedContentKey,
  EncryptedEnvelope,
  Bytes,
};

/* ------------------------------------------------------------------ */
/*  cryptoService — convenience object used by UI components          */
/* ------------------------------------------------------------------ */
export const cryptoService = {
  /** Unlock vault: derive root key from password. kdfParams is optional (created fresh if omitted). */
  async unlock(password: string, kdfParams?: KdfParams): Promise<void> {
    await init();
    const params = kdfParams ?? createKdfParams();
    _rootKey = await deriveRootKey(password, params);
  },

  /** Lock vault and zeroize in-memory root key. */
  async lock(): Promise<void> {
    if (_rootKey) {
      const keyRef = _rootKey;
      _rootKey = null;
      await zeroizeRootKey(keyRef);
    }
  },

  isUnlocked(): boolean {
    return _rootKey !== null;
  },

  /** Returns null if locked; never throws. */
  getRootKey(): RootKey | null {
    return _rootKey;
  },

  /** Encrypt a string using the root encryption key. Returns base64. */
  async encryptTitle(text: string): Promise<string> {
    if (!_rootKey) throw new Error('Vault is locked');
    const env = encryptString(text, _rootKey.encryptionKey);
    return JSON.stringify({ n: toBase64(env.nonce), c: toBase64(env.ciphertext) });
  },

  /** Decrypt a base64-encoded blob back to a string. */
  async decryptTitle(blob: string): Promise<string> {
    if (!_rootKey) throw new Error('Vault is locked');
    try {
      const { n, c } = JSON.parse(blob);
      const env = { version: 1 as const, nonce: fromBase64(n), ciphertext: fromBase64(c) };
      return decryptString(env, _rootKey.encryptionKey);
    } catch {
      return '[Encrypted — decryption failed]';
    }
  },

  async encryptBody(text: string): Promise<string> {
    return cryptoService.encryptTitle(text);
  },

  async decryptBody(blob: string): Promise<string> {
    return cryptoService.decryptTitle(blob);
  },

  async encryptTags(tags: string[]): Promise<string> {
    return cryptoService.encryptTitle(JSON.stringify(tags));
  },

  async decryptTags(blob: string): Promise<string[]> {
    const json = await cryptoService.decryptTitle(blob);
    try { return JSON.parse(json); } catch { return []; }
  },
};
