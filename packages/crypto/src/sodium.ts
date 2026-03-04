/**
 * @darklock/crypto - Sodium initialization
 * 
 * Ensures libsodium is initialized before any crypto operations.
 * All modules import sodium through this wrapper.
 */

import _sodium from 'libsodium-wrappers-sumo';

let initialized = false;

/**
 * Get initialized libsodium instance.
 * Must be called (and awaited) before any crypto operations.
 */
export async function getSodium(): Promise<typeof _sodium> {
  if (!initialized) {
    await _sodium.ready;
    initialized = true;
  }
  return _sodium;
}

/**
 * Ensure sodium is ready. Call this at app startup.
 */
export async function initCrypto(): Promise<void> {
  await getSodium();
}
