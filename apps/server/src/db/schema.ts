/**
 * Darklock Secure Notes - Server Database Schema
 * 
 * ZERO-KNOWLEDGE DESIGN: The server never stores plaintext note content.
 * All sensitive fields (title, body, tags, filenames) are encrypted
 * client-side before reaching the server. The server stores only:
 * - Encrypted blobs
 * - Authentication verifiers (double-hashed)
 * - KDF parameters (public, needed by clients)
 * - Structural metadata (IDs, timestamps, relationships)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_PATH || './data';

export function createDatabase(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const dbPath = path.join(DATA_DIR, 'darklock-notes.db');
  const db = new Database(dbPath);
  
  // Enable WAL mode for concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  
  initializeSchema(db);
  
  console.log(`[Darklock Notes DB] Connected: ${dbPath}`);
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- ================================================================
    -- USERS — server knows email + auth verifier + key params.
    -- Server NEVER has encryption keys.
    -- ================================================================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      -- Argon2id hash of the server-auth half of the root key
      auth_verifier TEXT NOT NULL,
      -- KDF params (JSON) — clients need these to re-derive keys
      key_params TEXT NOT NULL,
      -- X25519 public key for receiving shared notes (base64)
      encryption_public_key TEXT,
      -- Ed25519 public key for signature verification (base64)
      signing_public_key TEXT,
      -- Self-signature proving ownership of public keys (base64)
      public_key_signature TEXT,
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ================================================================
    -- SESSIONS — JWT-based with JTI tracking for revocation
    -- ================================================================
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      jti TEXT UNIQUE NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- VAULTS — a vault is a top-level container (local or cloud-backed)
    -- ================================================================
    CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      -- Encrypted vault name (JSON EncryptedEnvelope)
      encrypted_name TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('local', 'cloud')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- SECTIONS / NOTEBOOKS — organizational units within a vault
    -- ================================================================
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      vault_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted section name
      encrypted_name TEXT NOT NULL,
      -- Encrypted section metadata (color, icon, etc.)
      encrypted_metadata TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- NOTES — all content fields are encrypted client-side
    -- ================================================================
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted title (JSON EncryptedEnvelope)
      encrypted_title TEXT NOT NULL,
      -- Encrypted body (JSON EncryptedEnvelope)
      encrypted_body TEXT NOT NULL,
      -- Encrypted tags (JSON EncryptedEnvelope, contains JSON array)
      encrypted_tags TEXT,
      -- Content key ID used to encrypt this note
      content_key_id TEXT NOT NULL,
      -- Non-sensitive metadata (safe to expose)
      pinned INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      trashed INTEGER DEFAULT 0,
      trashed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- WRAPPED KEYS — encrypted key material (server cannot unwrap)
    -- ================================================================
    CREATE TABLE IF NOT EXISTS item_keys (
      id TEXT PRIMARY KEY,
      vault_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted item key (wrapped with root encryption key)
      ciphertext TEXT NOT NULL,
      nonce TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_keys (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted content key (wrapped with item key)
      ciphertext TEXT NOT NULL,
      nonce TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- ATTACHMENTS — encrypted file blobs
    -- ================================================================
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted original filename
      encrypted_filename TEXT NOT NULL,
      -- Encrypted MIME type
      encrypted_mimetype TEXT NOT NULL,
      -- Size of the encrypted blob (safe to expose)
      encrypted_size INTEGER NOT NULL,
      -- SHA-256 hash of ciphertext for integrity
      ciphertext_hash TEXT NOT NULL,
      -- Content key ID used
      content_key_id TEXT NOT NULL,
      -- The actual encrypted file blob path (stored on disk)
      blob_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- REVISIONS — encrypted note snapshots
    -- ================================================================
    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      -- Encrypted body snapshot
      encrypted_body TEXT NOT NULL,
      content_key_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- TAGS — encrypted tag names with unencrypted metadata
    -- ================================================================
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      -- Encrypted tag name
      encrypted_name TEXT NOT NULL,
      color TEXT DEFAULT '#808080',
      usage_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- SHARES — encrypted key envelopes for note/section sharing
    -- ================================================================
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('note', 'section')),
      permissions TEXT NOT NULL CHECK (permissions IN ('view', 'edit')),
      -- Encrypted item key for recipient (encrypted with recipient's public key)
      encrypted_key TEXT NOT NULL,
      ephemeral_public_key TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at TEXT,
      accepted_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- SYNC CURSORS — track client sync state
    -- ================================================================
    CREATE TABLE IF NOT EXISTS sync_cursors (
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      last_sync_at TEXT NOT NULL,
      cursor_token TEXT NOT NULL,
      PRIMARY KEY (user_id, device_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ================================================================
    -- INDEXES
    -- ================================================================
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti);
    CREATE INDEX IF NOT EXISTS idx_vaults_user ON vaults(user_id);
    CREATE INDEX IF NOT EXISTS idx_sections_vault ON sections(vault_id);
    CREATE INDEX IF NOT EXISTS idx_notes_section ON notes(section_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_item_keys_vault ON item_keys(vault_id);
    CREATE INDEX IF NOT EXISTS idx_content_keys_note ON content_keys(note_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
    CREATE INDEX IF NOT EXISTS idx_revisions_note ON revisions(note_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_shares_recipient ON shares(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_shares_target ON shares(target_id);
  `);
}
