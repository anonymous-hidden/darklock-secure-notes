/**
 * @darklock/crypto - Public API
 * 
 * Central export point for all cryptographic operations.
 * This is the ONLY module that should be imported by application code.
 */

// Initialization
export { initCrypto, getSodium } from './sodium.js';

// Key Derivation
export {
  deriveRootKey,
  createKdfParams,
  generateSalt,
  hashServerAuthKey,
  verifyServerAuthKey,
  zeroize,
  zeroizeRootKey,
  calibrateKdf,
} from './kdf.js';

// AEAD Encryption
export {
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  generateKey,
} from './aead.js';

// Key Hierarchy
export {
  createItemKey,
  unwrapItemKey,
  createContentKey,
  unwrapContentKey,
  rotateItemKeys,
  generateShareKeypair,
  generateSigningKeypair,
} from './keys.js';

// Sharing Envelopes
export {
  createShareEnvelope,
  openShareEnvelope,
} from './envelope.js';

// Serialization
export {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  sha256,
  createExportPackage,
  openExportPackage,
} from './serialization.js';

// Types
export type {
  Bytes,
  Base64String,
  HexString,
  KdfParams,
  RootKey,
  WrappedItemKey,
  WrappedContentKey,
  EncryptedEnvelope,
  EncryptedNote,
  EncryptedAttachment,
  SharedKeyEnvelope,
  UserPublicKeyBundle,
  VaultMeta,
  DarklockPackage,
  ServerUserRecord,
  EncryptedRevision,
} from './types.js';

export { DEFAULT_KDF_PARAMS } from './types.js';
