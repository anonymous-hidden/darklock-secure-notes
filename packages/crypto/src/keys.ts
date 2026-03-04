/**
 * @darklock/crypto - Key Hierarchy Management
 * 
 * Implements the three-level key hierarchy:
 *   RootKey (password-derived) → ItemKey (per-vault/section) → ContentKey (per-note)
 * 
 * Key wrapping uses XChaCha20-Poly1305 AEAD so wrapped keys include
 * integrity protection and version binding.
 */

import { getSodium } from './sodium.js';
import { encrypt, decrypt, generateKey } from './aead.js';
import type {
  Bytes,
  Base64String,
  RootKey,
  WrappedItemKey,
  WrappedContentKey,
  EncryptedEnvelope,
} from './types.js';

/** Current key wrapping version */
const KEY_WRAP_VERSION = 1;

/**
 * Generate a new random item key and wrap it with the root encryption key.
 * 
 * @param rootEncryptionKey - The 256-bit encryption half of the root key
 * @param vaultId - Vault ID bound as associated data
 * @returns WrappedItemKey ready for storage
 */
export async function createItemKey(
  rootEncryptionKey: Bytes,
  vaultId: string
): Promise<{ plainKey: Bytes; wrapped: WrappedItemKey }> {
  const sodium = await getSodium();
  
  const plainKey = await generateKey();
  const id = sodium.to_hex(sodium.randombytes_buf(16));
  
  // Bind vault ID as associated data
  const ad = `darklock:item-key:${vaultId}:${id}`;
  const envelope = await encrypt(plainKey, rootEncryptionKey, ad);
  
  return {
    plainKey,
    wrapped: {
      id,
      vaultId,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      version: KEY_WRAP_VERSION,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Unwrap an item key using the root encryption key.
 * 
 * @param wrapped - The stored wrapped item key
 * @param rootEncryptionKey - The 256-bit encryption half of the root key
 * @returns The plaintext 256-bit item key
 */
export async function unwrapItemKey(
  wrapped: WrappedItemKey,
  rootEncryptionKey: Bytes
): Promise<Bytes> {
  const sodium = await getSodium();
  
  const ad = `darklock:item-key:${wrapped.vaultId}:${wrapped.id}`;
  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: 'xchacha20-poly1305',
    nonce: wrapped.nonce,
    ciphertext: wrapped.ciphertext,
    associatedData: sodium.to_base64(
      sodium.from_string(ad),
      sodium.base64_variants.ORIGINAL
    ),
  };
  
  return decrypt(envelope, rootEncryptionKey);
}

/**
 * Generate a new random content key and wrap it with an item key.
 * 
 * @param itemKey - The 256-bit item key
 * @param noteId - Note ID bound as associated data
 * @returns WrappedContentKey ready for storage
 */
export async function createContentKey(
  itemKey: Bytes,
  noteId: string
): Promise<{ plainKey: Bytes; wrapped: WrappedContentKey }> {
  const sodium = await getSodium();
  
  const plainKey = await generateKey();
  const id = sodium.to_hex(sodium.randombytes_buf(16));
  
  const ad = `darklock:content-key:${noteId}:${id}`;
  const envelope = await encrypt(plainKey, itemKey, ad);
  
  return {
    plainKey,
    wrapped: {
      id,
      noteId,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      version: KEY_WRAP_VERSION,
    },
  };
}

/**
 * Unwrap a content key using its parent item key.
 */
export async function unwrapContentKey(
  wrapped: WrappedContentKey,
  itemKey: Bytes
): Promise<Bytes> {
  const sodium = await getSodium();
  
  const ad = `darklock:content-key:${wrapped.noteId}:${wrapped.id}`;
  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: 'xchacha20-poly1305',
    nonce: wrapped.nonce,
    ciphertext: wrapped.ciphertext,
    associatedData: sodium.to_base64(
      sodium.from_string(ad),
      sodium.base64_variants.ORIGINAL
    ),
  };
  
  return decrypt(envelope, itemKey);
}

/**
 * Re-wrap all item keys with a new root encryption key.
 * Used during master password change.
 * 
 * @param wrappedKeys - Currently stored wrapped item keys
 * @param oldRootKey - Previous root encryption key
 * @param newRootKey - New root encryption key
 * @returns Array of re-wrapped item keys
 */
export async function rotateItemKeys(
  wrappedKeys: WrappedItemKey[],
  oldRootKey: Bytes,
  newRootKey: Bytes
): Promise<WrappedItemKey[]> {
  const reWrapped: WrappedItemKey[] = [];
  
  for (const wrapped of wrappedKeys) {
    // Unwrap with old key
    const plainKey = await unwrapItemKey(wrapped, oldRootKey);
    
    // Re-wrap with new key
    const ad = `darklock:item-key:${wrapped.vaultId}:${wrapped.id}`;
    const envelope = await encrypt(plainKey, newRootKey, ad);
    
    reWrapped.push({
      ...wrapped,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
    });
    
    // Zero the plaintext key from memory
    const sodium = await getSodium();
    sodium.memzero(plainKey);
  }
  
  return reWrapped;
}

/**
 * Generate a keypair for sharing (X25519 for key exchange).
 */
export async function generateShareKeypair(): Promise<{
  publicKey: Bytes;
  secretKey: Bytes;
}> {
  const sodium = await getSodium();
  const keypair = sodium.crypto_box_keypair();
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.privateKey,
  };
}

/**
 * Generate a signing keypair (Ed25519) for identity verification.
 */
export async function generateSigningKeypair(): Promise<{
  publicKey: Bytes;
  secretKey: Bytes;
}> {
  const sodium = await getSodium();
  const keypair = sodium.crypto_sign_keypair();
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.privateKey,
  };
}
