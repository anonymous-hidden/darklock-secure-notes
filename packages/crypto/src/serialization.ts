/**
 * @darklock/crypto - Serialization utilities
 * 
 * Handles conversion between in-memory objects and storage/wire formats.
 * All serialization is deterministic for reproducibility.
 */

import { getSodium } from './sodium.js';
import type { Bytes, Base64String, HexString, EncryptedEnvelope, DarklockPackage, KdfParams } from './types.js';
import { encrypt, decrypt, generateKey } from './aead.js';
import { deriveRootKey, createKdfParams } from './kdf.js';

/**
 * Encode bytes to base64.
 */
export async function toBase64(bytes: Bytes): Promise<Base64String> {
  const sodium = await getSodium();
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

/**
 * Decode base64 to bytes.
 */
export async function fromBase64(b64: Base64String): Promise<Bytes> {
  const sodium = await getSodium();
  return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
}

/**
 * Encode bytes to hex.
 */
export async function toHex(bytes: Bytes): Promise<HexString> {
  const sodium = await getSodium();
  return sodium.to_hex(bytes);
}

/**
 * Decode hex to bytes.
 */
export async function fromHex(hex: HexString): Promise<Bytes> {
  const sodium = await getSodium();
  return sodium.from_hex(hex);
}

/**
 * Compute SHA-256 hash of data (for integrity checks on ciphertext).
 */
export async function sha256(data: Bytes): Promise<HexString> {
  const sodium = await getSodium();
  const hash = sodium.crypto_hash_sha256(data);
  return sodium.to_hex(hash);
}

/**
 * Create a .darklock encrypted export package.
 * 
 * @param items - Array of plaintext note JSON strings to include
 * @param exportPassword - Password to protect the export
 * @returns DarklockPackage object
 */
export async function createExportPackage(
  items: string[],
  exportPassword: string
): Promise<DarklockPackage> {
  // Derive export key from password
  const kdfParams = await createKdfParams();
  const rootKey = await deriveRootKey(exportPassword, kdfParams);
  const exportKey = rootKey.encryptionKey;
  
  // Encrypt manifest (list of items)
  const manifest = await encrypt(
    JSON.stringify({ itemCount: items.length, exportedAt: new Date().toISOString() }),
    exportKey,
    'darklock:export:manifest'
  );
  
  // Encrypt each item
  const encryptedItems: EncryptedEnvelope[] = [];
  for (let i = 0; i < items.length; i++) {
    const envelope = await encrypt(
      items[i],
      exportKey,
      `darklock:export:item:${i}`
    );
    encryptedItems.push(envelope);
  }
  
  // Zero the key
  const sodium = await getSodium();
  sodium.memzero(exportKey);
  sodium.memzero(rootKey.serverAuthKey);
  
  return {
    magic: 'DARKLOCK_ENCRYPTED_PACKAGE',
    formatVersion: 1,
    kdfParams,
    manifest,
    items: encryptedItems,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Open a .darklock encrypted export package.
 * 
 * @param pkg - The encrypted package
 * @param exportPassword - Password used to create the package
 * @returns Array of decrypted item JSON strings
 */
export async function openExportPackage(
  pkg: DarklockPackage,
  exportPassword: string
): Promise<string[]> {
  if (pkg.magic !== 'DARKLOCK_ENCRYPTED_PACKAGE') {
    throw new Error('Invalid package: not a Darklock encrypted package');
  }
  
  if (pkg.formatVersion !== 1) {
    throw new Error(`Unsupported package version: ${pkg.formatVersion}`);
  }
  
  // Derive export key
  const rootKey = await deriveRootKey(exportPassword, pkg.kdfParams);
  const exportKey = rootKey.encryptionKey;
  
  // Decrypt manifest first (validates password)
  const sodium = await getSodium();
  try {
    await decrypt(pkg.manifest, exportKey);
  } catch {
    sodium.memzero(exportKey);
    sodium.memzero(rootKey.serverAuthKey);
    throw new Error('Incorrect export password or corrupted package');
  }
  
  // Decrypt items
  const items: string[] = [];
  for (const envelope of pkg.items) {
    const plaintext = await decrypt(envelope, exportKey);
    items.push(sodium.to_string(plaintext));
  }
  
  // Zero the key
  sodium.memzero(exportKey);
  sodium.memzero(rootKey.serverAuthKey);
  
  return items;
}
