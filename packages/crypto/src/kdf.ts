/**
 * @darklock/crypto - Key Derivation Function (Argon2id)
 * 
 * Derives cryptographic keys from passwords using Argon2id.
 * OWASP recommended: Argon2id, ≥19 MiB memory, ≥2 iterations, 1 parallelism.
 * 
 * The 64-byte output is split:
 *   - First 32 bytes: encryption key (wraps item keys, never leaves client)
 *   - Last 32 bytes:  server auth key (sent to server for authentication)
 */

import { getSodium } from './sodium.js';
import type { KdfParams, RootKey, Base64String, Bytes } from './types.js';
import { DEFAULT_KDF_PARAMS } from './types.js';

/**
 * Generate a random salt for KDF.
 */
export async function generateSalt(): Promise<Bytes> {
  const sodium = await getSodium();
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

/**
 * Derive a root key from a master password using Argon2id.
 * 
 * @param password - The user's master password (UTF-8 string)
 * @param params - KDF parameters (including salt)
 * @returns RootKey with encryption and server-auth halves
 * 
 * SECURITY: The returned RootKey must be held in memory only for the
 * duration of the session. Clear with `zeroize()` when locking.
 */
export async function deriveRootKey(password: string, params: KdfParams): Promise<RootKey> {
  const sodium = await getSodium();
  
  const salt = sodium.from_base64(params.salt, sodium.base64_variants.ORIGINAL);
  
  if (salt.length !== sodium.crypto_pwhash_SALTBYTES) {
    throw new Error(`Invalid salt length: expected ${sodium.crypto_pwhash_SALTBYTES}, got ${salt.length}`);
  }
  
  // Argon2id key derivation — produces 64 bytes
  const derived = sodium.crypto_pwhash(
    params.keyLength,
    password,
    salt,
    params.iterations,
    params.memoryBytes,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
  
  if (derived.length !== 64) {
    throw new Error(`KDF output length mismatch: expected 64, got ${derived.length}`);
  }
  
  // Split into two 256-bit keys
  const encryptionKey = derived.slice(0, 32);
  const serverAuthKey = derived.slice(32, 64);
  
  // Zero the full derived buffer (defense in depth)
  sodium.memzero(derived);
  
  return { encryptionKey, serverAuthKey };
}

/**
 * Create KDF parameters for a new vault or account.
 * Generates a fresh random salt.
 * 
 * @param overrides - Optional parameter overrides for calibration
 * @returns Complete KdfParams ready for storage
 */
export async function createKdfParams(
  overrides?: Partial<Omit<KdfParams, 'salt' | 'algorithm'>>
): Promise<KdfParams> {
  const sodium = await getSodium();
  const salt = await generateSalt();
  
  return {
    ...DEFAULT_KDF_PARAMS,
    ...overrides,
    algorithm: 'argon2id',
    salt: sodium.to_base64(salt, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Hash the server auth key for storage on the server.
 * Uses Argon2id again so that a database dump doesn't reveal the auth key.
 * 
 * @param serverAuthKey - The 256-bit server auth half of the root key
 * @returns Argon2id hash string suitable for server storage
 */
export async function hashServerAuthKey(serverAuthKey: Bytes): Promise<string> {
  const sodium = await getSodium();
  // Use sodium's password hashing (produces a self-contained hash string)
  return sodium.crypto_pwhash_str(
    serverAuthKey,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE
  );
}

/**
 * Verify a server auth key against a stored hash.
 */
export async function verifyServerAuthKey(serverAuthKey: Bytes, hash: string): Promise<boolean> {
  const sodium = await getSodium();
  return sodium.crypto_pwhash_str_verify(hash, serverAuthKey);
}

/**
 * Securely zero a key from memory.
 * Call this when locking the vault or ending a session.
 */
export async function zeroize(key: Bytes): Promise<void> {
  const sodium = await getSodium();
  sodium.memzero(key);
}

/**
 * Zeroize an entire RootKey.
 */
export async function zeroizeRootKey(rootKey: RootKey): Promise<void> {
  await zeroize(rootKey.encryptionKey);
  await zeroize(rootKey.serverAuthKey);
}

/**
 * Calibrate KDF parameters for the current device.
 * Targets the specified duration (default 500ms).
 * Never goes below OWASP minimums.
 * 
 * @param targetMs - Target derivation time in milliseconds
 * @returns Calibrated KdfParams
 */
export async function calibrateKdf(targetMs: number = 500): Promise<KdfParams> {
  const minMemory = DEFAULT_KDF_PARAMS.memoryBytes;
  const minIterations = DEFAULT_KDF_PARAMS.iterations;
  
  let memory = minMemory;
  let iterations = minIterations;
  
  // Test with minimum params first
  const testPassword = 'calibration-test';
  const params = await createKdfParams({ memoryBytes: memory, iterations });
  
  const start = performance.now();
  await deriveRootKey(testPassword, params);
  const elapsed = performance.now() - start;
  
  if (elapsed < targetMs) {
    // Scale up memory first (more effective than iterations for Argon2id)
    const factor = Math.min(targetMs / elapsed, 8);
    memory = Math.round(memory * factor);
    
    // Re-test and adjust iterations if needed
    const params2 = await createKdfParams({ memoryBytes: memory, iterations });
    const start2 = performance.now();
    await deriveRootKey(testPassword, params2);
    const elapsed2 = performance.now() - start2;
    
    if (elapsed2 < targetMs * 0.5) {
      iterations = Math.max(minIterations, Math.round(iterations * (targetMs / elapsed2)));
    }
  }
  
  return createKdfParams({ memoryBytes: memory, iterations });
}
