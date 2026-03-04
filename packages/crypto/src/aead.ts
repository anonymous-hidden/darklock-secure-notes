/**
 * @darklock/crypto - AEAD Encryption (XChaCha20-Poly1305)
 * 
 * All encryption in Darklock uses XChaCha20-Poly1305 AEAD.
 * - 256-bit keys
 * - 192-bit nonces (safe to generate randomly — collision probability negligible)
 * - Poly1305 authentication tag (16 bytes, appended to ciphertext)
 * 
 * Every ciphertext is wrapped in a versioned EncryptedEnvelope for
 * forward compatibility and to bind metadata (note ID, type) as
 * associated data.
 */

import { getSodium } from './sodium.js';
import type { Bytes, Base64String, EncryptedEnvelope } from './types.js';

/** Current protocol version */
const PROTOCOL_VERSION = 1;

/**
 * Encrypt plaintext bytes using XChaCha20-Poly1305 AEAD.
 * 
 * @param plaintext - Data to encrypt
 * @param key - 256-bit encryption key
 * @param associatedData - Optional data to authenticate but not encrypt
 *                         (e.g., note ID, content type)
 * @returns EncryptedEnvelope with versioned metadata
 */
export async function encrypt(
  plaintext: Bytes | string,
  key: Bytes,
  associatedData?: Bytes | string
): Promise<EncryptedEnvelope> {
  const sodium = await getSodium();
  
  // Validate key length
  if (key.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    throw new Error(
      `Invalid key length: expected ${sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES}, got ${key.length}`
    );
  }
  
  // Convert string inputs to bytes
  const plaintextBytes = typeof plaintext === 'string'
    ? sodium.from_string(plaintext)
    : plaintext;
  
  const adBytes = associatedData
    ? (typeof associatedData === 'string' ? sodium.from_string(associatedData) : associatedData)
    : null;
  
  // Generate random 192-bit nonce
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );
  
  // Encrypt with AEAD
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintextBytes,
    adBytes,
    null, // nsec (unused in this construction)
    nonce,
    key
  );
  
  const envelope: EncryptedEnvelope = {
    version: PROTOCOL_VERSION,
    algorithm: 'xchacha20-poly1305',
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
  };
  
  if (adBytes) {
    envelope.associatedData = sodium.to_base64(adBytes, sodium.base64_variants.ORIGINAL);
  }
  
  return envelope;
}

/**
 * Decrypt an EncryptedEnvelope using XChaCha20-Poly1305 AEAD.
 * 
 * @param envelope - The encrypted envelope
 * @param key - 256-bit decryption key
 * @returns Decrypted plaintext bytes
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decrypt(
  envelope: EncryptedEnvelope,
  key: Bytes
): Promise<Bytes> {
  const sodium = await getSodium();
  
  // Validate version
  if (envelope.version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported envelope version: ${envelope.version} (expected ${PROTOCOL_VERSION})`);
  }
  
  // Validate algorithm
  if (envelope.algorithm !== 'xchacha20-poly1305') {
    throw new Error(`Unsupported algorithm: ${envelope.algorithm}`);
  }
  
  // Validate key length
  if (key.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    throw new Error(
      `Invalid key length: expected ${sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES}, got ${key.length}`
    );
  }
  
  const nonce = sodium.from_base64(envelope.nonce, sodium.base64_variants.ORIGINAL);
  const ciphertext = sodium.from_base64(envelope.ciphertext, sodium.base64_variants.ORIGINAL);
  const ad = envelope.associatedData
    ? sodium.from_base64(envelope.associatedData, sodium.base64_variants.ORIGINAL)
    : null;
  
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, // nsec (unused)
      ciphertext,
      ad,
      nonce,
      key
    );
    return plaintext;
  } catch {
    throw new Error('Decryption failed: invalid key, corrupted data, or tampered ciphertext');
  }
}

/**
 * Encrypt a UTF-8 string and return the envelope.
 * Convenience wrapper for text content.
 */
export async function encryptString(
  text: string,
  key: Bytes,
  associatedData?: string
): Promise<EncryptedEnvelope> {
  return encrypt(text, key, associatedData);
}

/**
 * Decrypt an envelope and return a UTF-8 string.
 * Convenience wrapper for text content.
 */
export async function decryptString(
  envelope: EncryptedEnvelope,
  key: Bytes
): Promise<string> {
  const sodium = await getSodium();
  const bytes = await decrypt(envelope, key);
  return sodium.to_string(bytes);
}

/**
 * Generate a random 256-bit symmetric key.
 */
export async function generateKey(): Promise<Bytes> {
  const sodium = await getSodium();
  return sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
}
