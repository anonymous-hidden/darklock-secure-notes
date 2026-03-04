/**
 * @darklock/crypto - Type definitions
 * 
 * All types for the Darklock cryptographic system.
 * Key hierarchy: RootKey → ItemKey → ContentKey
 */

// ============================================================================
// PRIMITIVES
// ============================================================================

/** Raw byte array wrapper with explicit intent */
export type Bytes = Uint8Array;

/** Base64-encoded string for serialization */
export type Base64String = string;

/** Hex-encoded string */
export type HexString = string;

// ============================================================================
// KDF (Key Derivation Function)
// ============================================================================

/** Argon2id parameters stored alongside encrypted data */
export interface KdfParams {
  /** Algorithm identifier for future-proofing */
  algorithm: 'argon2id';
  /** Memory cost in bytes */
  memoryBytes: number;
  /** Number of iterations (time cost) */
  iterations: number;
  /** Degree of parallelism */
  parallelism: number;
  /** Salt (base64) — unique per derivation */
  salt: Base64String;
  /** Output key length in bytes */
  keyLength: number;
}

/** Default KDF parameters — OWASP recommended minimums */
export const DEFAULT_KDF_PARAMS: Omit<KdfParams, 'salt'> = {
  algorithm: 'argon2id',
  memoryBytes: 19 * 1024 * 1024, // 19 MiB minimum (OWASP)
  iterations: 2,
  parallelism: 1,
  keyLength: 64, // 512-bit output: split into 256-bit encryption + 256-bit auth
};

// ============================================================================
// KEY HIERARCHY
// ============================================================================

/** 
 * Root key — derived from master password via Argon2id.
 * NEVER stored. Split into encryption half and server-auth half.
 */
export interface RootKey {
  /** 256-bit key for wrapping item keys (first 32 bytes of KDF output) */
  encryptionKey: Bytes;
  /** 256-bit key used only for server authentication (last 32 bytes) */
  serverAuthKey: Bytes;
}

/**
 * Wrapped (encrypted) item key — stored on disk/server.
 * The plaintext item key is 256-bit random.
 */
export interface WrappedItemKey {
  /** Unique identifier */
  id: string;
  /** Which vault/section this key belongs to */
  vaultId: string;
  /** Encrypted item key (XChaCha20-Poly1305 with root encryption key) */
  ciphertext: Base64String;
  /** Nonce used for encryption */
  nonce: Base64String;
  /** Protocol version for forward compatibility */
  version: number;
  /** Timestamp */
  createdAt: string;
}

/**
 * Per-note content key — randomly generated, wrapped with item key.
 * Enables note-level sharing and key rotation.
 */
export interface WrappedContentKey {
  /** Unique identifier */
  id: string;
  /** Parent note ID */
  noteId: string;
  /** Encrypted content key */
  ciphertext: Base64String;
  /** Nonce */
  nonce: Base64String;
  /** Version */
  version: number;
}

// ============================================================================
// ENCRYPTED DATA
// ============================================================================

/** Versioned ciphertext envelope — every encrypted blob uses this format */
export interface EncryptedEnvelope {
  /** Protocol version (currently 1) */
  version: number;
  /** Algorithm identifier */
  algorithm: 'xchacha20-poly1305';
  /** Nonce (base64, 24 bytes for XChaCha20) */
  nonce: Base64String;
  /** Ciphertext including Poly1305 tag (base64) */
  ciphertext: Base64String;
  /** Associated data that was authenticated but not encrypted (base64) */
  associatedData?: Base64String;
}

/** Encrypted note stored on disk or server */
export interface EncryptedNote {
  id: string;
  sectionId: string;
  /** Encrypted title envelope */
  title: EncryptedEnvelope;
  /** Encrypted body envelope */
  body: EncryptedEnvelope;
  /** Encrypted tags (JSON array, encrypted as single blob) */
  tags?: EncryptedEnvelope;
  /** Pinned status (not encrypted — not sensitive) */
  pinned: boolean;
  /** Favorite status */
  favorite: boolean;
  /** Timestamps (not encrypted) */
  createdAt: string;
  updatedAt: string;
  /** Which content key ID was used */
  contentKeyId: string;
}

/** Encrypted attachment metadata */
export interface EncryptedAttachment {
  id: string;
  noteId: string;
  /** Encrypted original filename */
  filename: EncryptedEnvelope;
  /** Encrypted MIME type */
  mimetype: EncryptedEnvelope;
  /** Unencrypted size (of ciphertext, not plaintext — safe to expose) */
  encryptedSize: number;
  /** SHA-256 hash of the ciphertext for integrity verification */
  ciphertextHash: HexString;
  /** The encrypted file bytes are stored separately */
  contentKeyId: string;
  createdAt: string;
}

// ============================================================================
// SHARING
// ============================================================================

/** Key envelope for sharing — encrypted with recipient's public key */
export interface SharedKeyEnvelope {
  /** Share identifier */
  shareId: string;
  /** Sender user ID */
  senderId: string;
  /** Recipient user ID */
  recipientId: string;
  /** The shared item (note or section) */
  targetId: string;
  targetType: 'note' | 'section';
  /** Permission level */
  permissions: 'view' | 'edit';
  /** Item key encrypted with recipient's public key (X25519 + XChaCha20-Poly1305) */
  encryptedKey: Base64String;
  /** Ephemeral public key used for the key exchange */
  ephemeralPublicKey: Base64String;
  /** Nonce */
  nonce: Base64String;
  /** Optional expiration */
  expiresAt?: string;
  createdAt: string;
}

/** User's public key for receiving shared notes */
export interface UserPublicKeyBundle {
  userId: string;
  /** X25519 public key for key exchange */
  encryptionPublicKey: Base64String;
  /** Ed25519 public key for signature verification */
  signingPublicKey: Base64String;
  /** Self-signature to prove ownership */
  signature: Base64String;
  createdAt: string;
}

// ============================================================================
// VAULT & EXPORT
// ============================================================================

/** Vault metadata (partially encrypted) */
export interface VaultMeta {
  id: string;
  name: string;
  mode: 'local' | 'cloud';
  /** KDF params used for this vault's root key derivation */
  kdfParams: KdfParams;
  createdAt: string;
  updatedAt: string;
}

/** Encrypted export package (.darklock file format) */
export interface DarklockPackage {
  /** Magic identifier */
  magic: 'DARKLOCK_ENCRYPTED_PACKAGE';
  /** Format version */
  formatVersion: number;
  /** KDF params for the export password */
  kdfParams: KdfParams;
  /** Encrypted manifest (lists all items in the package) */
  manifest: EncryptedEnvelope;
  /** Encrypted items (notes, attachments, keys) */
  items: EncryptedEnvelope[];
  /** Export timestamp */
  exportedAt: string;
}

// ============================================================================
// SERVER AUTH
// ============================================================================

/** What the server stores for a user — NO encryption keys */
export interface ServerUserRecord {
  id: string;
  email: string;
  /** Argon2id hash of the serverAuthKey (double-hashed: password→KDF→serverAuthKey→server hash) */
  authVerifier: string;
  /** KDF params needed by clients to re-derive keys (salt, memory, iterations) */
  keyParams: KdfParams;
  /** User's public key bundle for receiving shared notes */
  publicKeyBundle?: UserPublicKeyBundle;
  createdAt: string;
}

// ============================================================================
// REVISION HISTORY
// ============================================================================

export interface EncryptedRevision {
  id: string;
  noteId: string;
  /** Encrypted snapshot of the note body at this point */
  body: EncryptedEnvelope;
  /** Content key ID used */
  contentKeyId: string;
  /** Revision number (monotonically increasing) */
  revisionNumber: number;
  createdAt: string;
}
