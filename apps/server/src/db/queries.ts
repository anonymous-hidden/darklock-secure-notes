/**
 * Darklock Server - Database Queries
 * 
 * All database operations. Parameterized queries throughout.
 */

import type Database from 'better-sqlite3';

export function createQueries(db: Database.Database) {
  // ============================================================
  // USERS
  // ============================================================
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, auth_verifier, key_params, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const getUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const getUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);

  const updateUserPublicKeys = db.prepare(`
    UPDATE users SET
      encryption_public_key = ?,
      signing_public_key = ?,
      public_key_signature = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  const updateAuthVerifier = db.prepare(`
    UPDATE users SET auth_verifier = ?, key_params = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  // ============================================================
  // SESSIONS
  // ============================================================
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, user_id, jti, ip, user_agent, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
  `);

  const getSessionByJti = db.prepare(`
    SELECT * FROM sessions WHERE jti = ? AND revoked_at IS NULL
  `);

  const revokeSession = db.prepare(`
    UPDATE sessions SET revoked_at = datetime('now') WHERE jti = ?
  `);

  const revokeAllUserSessions = db.prepare(`
    UPDATE sessions SET revoked_at = datetime('now')
    WHERE user_id = ? AND revoked_at IS NULL
  `);

  const getUserSessions = db.prepare(`
    SELECT id, jti, ip, user_agent, created_at, expires_at
    FROM sessions WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
  `);

  const cleanExpiredSessions = db.prepare(`
    DELETE FROM sessions WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL
  `);

  // ============================================================
  // VAULTS
  // ============================================================
  const insertVault = db.prepare(`
    INSERT INTO vaults (id, user_id, encrypted_name, mode, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const getVaultsByUser = db.prepare(`
    SELECT * FROM vaults WHERE user_id = ? ORDER BY created_at ASC
  `);

  const getVaultById = db.prepare(`SELECT * FROM vaults WHERE id = ? AND user_id = ?`);

  const updateVault = db.prepare(`
    UPDATE vaults SET encrypted_name = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const deleteVault = db.prepare(`DELETE FROM vaults WHERE id = ? AND user_id = ?`);

  // ============================================================
  // SECTIONS
  // ============================================================
  const insertSection = db.prepare(`
    INSERT INTO sections (id, vault_id, user_id, encrypted_name, encrypted_metadata, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const getSectionsByVault = db.prepare(`
    SELECT * FROM sections WHERE vault_id = ? AND user_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `);

  const getSectionById = db.prepare(`SELECT * FROM sections WHERE id = ? AND user_id = ?`);

  const updateSection = db.prepare(`
    UPDATE sections SET encrypted_name = ?, encrypted_metadata = ?, sort_order = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const deleteSection = db.prepare(`DELETE FROM sections WHERE id = ? AND user_id = ?`);

  // ============================================================
  // NOTES
  // ============================================================
  const insertNote = db.prepare(`
    INSERT INTO notes (id, section_id, user_id, encrypted_title, encrypted_body, encrypted_tags,
      content_key_id, pinned, favorite, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const getNotesBySection = db.prepare(`
    SELECT * FROM notes WHERE section_id = ? AND user_id = ? AND trashed = 0
    ORDER BY pinned DESC, updated_at DESC
  `);

  const getNoteById = db.prepare(`SELECT * FROM notes WHERE id = ? AND user_id = ?`);

  const updateNote = db.prepare(`
    UPDATE notes SET
      encrypted_title = ?, encrypted_body = ?, encrypted_tags = ?,
      pinned = ?, favorite = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const trashNote = db.prepare(`
    UPDATE notes SET trashed = 1, trashed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const restoreNote = db.prepare(`
    UPDATE notes SET trashed = 0, trashed_at = NULL, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const deleteNotePermanently = db.prepare(`
    DELETE FROM notes WHERE id = ? AND user_id = ? AND trashed = 1
  `);

  const getTrashedNotes = db.prepare(`
    SELECT * FROM notes WHERE user_id = ? AND trashed = 1
    ORDER BY trashed_at DESC
  `);

  const getNotesByUser = db.prepare(`
    SELECT * FROM notes WHERE user_id = ? AND trashed = 0
    ORDER BY updated_at DESC
  `);

  const moveNote = db.prepare(`
    UPDATE notes SET section_id = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  // ============================================================
  // KEYS
  // ============================================================
  const insertItemKey = db.prepare(`
    INSERT INTO item_keys (id, vault_id, user_id, ciphertext, nonce, version, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getItemKeysByVault = db.prepare(`
    SELECT * FROM item_keys WHERE vault_id = ? AND user_id = ?
  `);

  const updateItemKey = db.prepare(`
    UPDATE item_keys SET ciphertext = ?, nonce = ? WHERE id = ? AND user_id = ?
  `);

  const insertContentKey = db.prepare(`
    INSERT INTO content_keys (id, note_id, user_id, ciphertext, nonce, version, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getContentKey = db.prepare(`
    SELECT * FROM content_keys WHERE id = ? AND user_id = ?
  `);

  const getContentKeysByNote = db.prepare(`
    SELECT * FROM content_keys WHERE note_id = ? AND user_id = ?
  `);

  // ============================================================
  // ATTACHMENTS
  // ============================================================
  const insertAttachment = db.prepare(`
    INSERT INTO attachments (id, note_id, user_id, encrypted_filename, encrypted_mimetype,
      encrypted_size, ciphertext_hash, content_key_id, blob_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getAttachmentsByNote = db.prepare(`
    SELECT * FROM attachments WHERE note_id = ? AND user_id = ?
  `);

  const getAttachmentById = db.prepare(`
    SELECT * FROM attachments WHERE id = ? AND user_id = ?
  `);

  const deleteAttachment = db.prepare(`
    DELETE FROM attachments WHERE id = ? AND user_id = ?
  `);

  // ============================================================
  // REVISIONS
  // ============================================================
  const insertRevision = db.prepare(`
    INSERT INTO revisions (id, note_id, user_id, encrypted_body, content_key_id, revision_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getRevisionsByNote = db.prepare(`
    SELECT id, note_id, revision_number, content_key_id, created_at
    FROM revisions WHERE note_id = ? AND user_id = ?
    ORDER BY revision_number DESC
  `);

  const getRevisionById = db.prepare(`
    SELECT * FROM revisions WHERE id = ? AND user_id = ?
  `);

  // ============================================================
  // TAGS
  // ============================================================
  const insertTag = db.prepare(`
    INSERT INTO tags (id, user_id, encrypted_name, color, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const getTagsByUser = db.prepare(`
    SELECT * FROM tags WHERE user_id = ? ORDER BY usage_count DESC
  `);

  const updateTag = db.prepare(`
    UPDATE tags SET encrypted_name = ?, color = ? WHERE id = ? AND user_id = ?
  `);

  const deleteTag = db.prepare(`DELETE FROM tags WHERE id = ? AND user_id = ?`);

  const incrementTagUsage = db.prepare(`
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = ? AND user_id = ?
  `);

  // ============================================================
  // SHARES
  // ============================================================
  const insertShare = db.prepare(`
    INSERT INTO shares (id, sender_id, recipient_id, target_id, target_type,
      permissions, encrypted_key, ephemeral_public_key, nonce, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getSharesForRecipient = db.prepare(`
    SELECT s.*, u.email as sender_email, u.display_name as sender_name
    FROM shares s JOIN users u ON s.sender_id = u.id
    WHERE s.recipient_id = ? AND s.revoked_at IS NULL
    ORDER BY s.created_at DESC
  `);

  const getSharesBySender = db.prepare(`
    SELECT s.*, u.email as recipient_email, u.display_name as recipient_name
    FROM shares s JOIN users u ON s.recipient_id = u.id
    WHERE s.sender_id = ? AND s.target_id = ?
    ORDER BY s.created_at DESC
  `);

  const acceptShare = db.prepare(`
    UPDATE shares SET accepted_at = datetime('now') WHERE id = ? AND recipient_id = ?
  `);

  const revokeShare = db.prepare(`
    UPDATE shares SET revoked_at = datetime('now') WHERE id = ? AND sender_id = ?
  `);

  // ============================================================
  // SYNC
  // ============================================================
  const upsertSyncCursor = db.prepare(`
    INSERT INTO sync_cursors (user_id, device_id, last_sync_at, cursor_token)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT (user_id, device_id) DO UPDATE SET
      last_sync_at = datetime('now'),
      cursor_token = excluded.cursor_token
  `);

  const getSyncCursor = db.prepare(`
    SELECT * FROM sync_cursors WHERE user_id = ? AND device_id = ?
  `);

  const getChangedNotes = db.prepare(`
    SELECT * FROM notes WHERE user_id = ? AND updated_at > ?
    ORDER BY updated_at ASC
  `);

  return {
    // Users
    insertUser,
    getUserById,
    getUserByEmail,
    updateUserPublicKeys,
    updateAuthVerifier,
    // Sessions
    insertSession,
    getSessionByJti,
    revokeSession,
    revokeAllUserSessions,
    getUserSessions,
    cleanExpiredSessions,
    // Vaults
    insertVault,
    getVaultsByUser,
    getVaultById,
    updateVault,
    deleteVault,
    // Sections
    insertSection,
    getSectionsByVault,
    getSectionById,
    updateSection,
    deleteSection,
    // Notes
    insertNote,
    getNotesBySection,
    getNoteById,
    updateNote,
    trashNote,
    restoreNote,
    deleteNotePermanently,
    getTrashedNotes,
    getNotesByUser,
    moveNote,
    // Keys
    insertItemKey,
    getItemKeysByVault,
    updateItemKey,
    insertContentKey,
    getContentKey,
    getContentKeysByNote,
    // Attachments
    insertAttachment,
    getAttachmentsByNote,
    getAttachmentById,
    deleteAttachment,
    // Revisions
    insertRevision,
    getRevisionsByNote,
    getRevisionById,
    // Tags
    insertTag,
    getTagsByUser,
    updateTag,
    deleteTag,
    incrementTagUsage,
    // Shares
    insertShare,
    getSharesForRecipient,
    getSharesBySender,
    acceptShare,
    revokeShare,
    // Sync
    upsertSyncCursor,
    getSyncCursor,
    getChangedNotes,
  };
}

export type Queries = ReturnType<typeof createQueries>;
