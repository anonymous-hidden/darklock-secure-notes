/**
 * Darklock Server - Request Validation Schemas (Zod)
 * 
 * Input validation for all API endpoints. Defense in depth:
 * even though client sends encrypted blobs, we validate structure.
 */

import { z } from 'zod';

// ============================================================
// AUTH
// ============================================================

export const signupSchema = z.object({
  email: z.string().email().max(255),
  /** Base64-encoded server auth key (NOT the password itself) */
  authKey: z.string().min(1).max(500),
  /** KDF params (JSON) — stored for the client */
  keyParams: z.object({
    algorithm: z.literal('argon2id'),
    memoryBytes: z.number().int().min(1024 * 1024), // At least 1 MiB
    iterations: z.number().int().min(1),
    parallelism: z.number().int().min(1),
    salt: z.string().min(1),
    keyLength: z.number().int().min(32),
  }),
  displayName: z.string().max(100).optional(),
});

export const signinSchema = z.object({
  email: z.string().email().max(255),
  /** Base64-encoded server auth key */
  authKey: z.string().min(1).max(500),
});

export const updatePublicKeysSchema = z.object({
  encryptionPublicKey: z.string().min(1).max(500),
  signingPublicKey: z.string().min(1).max(500),
  signature: z.string().min(1).max(1000),
});

// ============================================================
// VAULTS
// ============================================================

export const createVaultSchema = z.object({
  id: z.string().uuid(),
  encryptedName: z.string().min(1).max(10000),
  mode: z.enum(['local', 'cloud']),
});

export const updateVaultSchema = z.object({
  encryptedName: z.string().min(1).max(10000),
});

// ============================================================
// SECTIONS
// ============================================================

export const createSectionSchema = z.object({
  id: z.string().uuid(),
  vaultId: z.string().uuid(),
  encryptedName: z.string().min(1).max(10000),
  encryptedMetadata: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSectionSchema = z.object({
  encryptedName: z.string().min(1).max(10000),
  encryptedMetadata: z.string().max(50000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================================
// NOTES
// ============================================================

export const createNoteSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  encryptedTitle: z.string().min(1).max(50000),
  encryptedBody: z.string().min(1).max(10_000_000), // 10MB encrypted body limit
  encryptedTags: z.string().max(100000).optional(),
  contentKeyId: z.string().min(1).max(100),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
});

export const updateNoteSchema = z.object({
  encryptedTitle: z.string().min(1).max(50000),
  encryptedBody: z.string().min(1).max(10_000_000),
  encryptedTags: z.string().max(100000).optional(),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
});

export const moveNoteSchema = z.object({
  sectionId: z.string().uuid(),
});

// ============================================================
// KEYS
// ============================================================

export const storeItemKeySchema = z.object({
  id: z.string().min(1).max(100),
  vaultId: z.string().uuid(),
  ciphertext: z.string().min(1).max(10000),
  nonce: z.string().min(1).max(200),
  version: z.number().int().min(1),
});

export const storeContentKeySchema = z.object({
  id: z.string().min(1).max(100),
  noteId: z.string().uuid(),
  ciphertext: z.string().min(1).max(10000),
  nonce: z.string().min(1).max(200),
  version: z.number().int().min(1),
});

// ============================================================
// TAGS
// ============================================================

export const createTagSchema = z.object({
  id: z.string().uuid(),
  encryptedName: z.string().min(1).max(10000),
  color: z.string().max(20).optional(),
});

export const updateTagSchema = z.object({
  encryptedName: z.string().min(1).max(10000),
  color: z.string().max(20).optional(),
});

// ============================================================
// SHARES
// ============================================================

export const createShareSchema = z.object({
  id: z.string().uuid(),
  recipientEmail: z.string().email(),
  targetId: z.string().uuid(),
  targetType: z.enum(['note', 'section']),
  permissions: z.enum(['view', 'edit']),
  encryptedKey: z.string().min(1).max(10000),
  ephemeralPublicKey: z.string().min(1).max(500),
  nonce: z.string().min(1).max(200),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================
// REVISIONS
// ============================================================

export const createRevisionSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
  encryptedBody: z.string().min(1).max(10_000_000),
  contentKeyId: z.string().min(1).max(100),
  revisionNumber: z.number().int().min(1),
});

// ============================================================
// SYNC
// ============================================================

export const syncRequestSchema = z.object({
  deviceId: z.string().min(1).max(100),
  lastSyncAt: z.string().datetime().optional(),
});
