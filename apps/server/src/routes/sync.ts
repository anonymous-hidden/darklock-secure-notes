/**
 * Darklock Server - Sharing & Sync Routes
 */

import { Router, Request, Response } from 'express';
import type { Queries } from '../db/queries.js';
import { requireAuth } from '../middleware/auth.js';
import { createShareSchema, syncRequestSchema } from '../middleware/validation.js';

export function createSyncRoutes(queries: Queries): Router {
  const router = Router();
  const auth = requireAuth(queries);

  // ================================================================
  // SHARES
  // ================================================================

  /**
   * POST /shares
   * Share a note or section with another user.
   */
  router.post('/shares', auth, (req: Request, res: Response) => {
    try {
      const parsed = createShareSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.issues });
        return;
      }
      const d = parsed.data;

      // Look up recipient by email
      const recipient = queries.getUserByEmail.get(d.recipientEmail) as any;
      if (!recipient) {
        res.status(404).json({ success: false, error: 'Recipient not found' });
        return;
      }

      if (recipient.id === req.user!.userId) {
        res.status(400).json({ success: false, error: 'Cannot share with yourself' });
        return;
      }

      if (!recipient.encryption_public_key) {
        res.status(400).json({ success: false, error: 'Recipient has not set up encryption keys' });
        return;
      }

      queries.insertShare.run(
        d.id, req.user!.userId, recipient.id,
        d.targetId, d.targetType, d.permissions,
        d.encryptedKey, d.ephemeralPublicKey, d.nonce,
        d.expiresAt || null
      );

      res.status(201).json({ success: true, id: d.id });
    } catch (err) {
      console.error('[Shares] Create error:', err);
      res.status(500).json({ success: false, error: 'Failed to create share' });
    }
  });

  /**
   * GET /shares/received
   * Get notes/sections shared with me.
   */
  router.get('/shares/received', auth, (req: Request, res: Response) => {
    try {
      const shares = queries.getSharesForRecipient.all(req.user!.userId);
      res.json({ success: true, shares });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load shares' });
    }
  });

  /**
   * GET /shares/sent/:targetId
   * Get sharing status for a note/section I own.
   */
  router.get('/shares/sent/:targetId', auth, (req: Request, res: Response) => {
    try {
      const shares = queries.getSharesBySender.all(req.user!.userId, req.params.targetId);
      res.json({ success: true, shares });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load shares' });
    }
  });

  /**
   * POST /shares/:id/accept
   * Accept a shared note/section.
   */
  router.post('/shares/:id/accept', auth, (req: Request, res: Response) => {
    try {
      queries.acceptShare.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to accept share' });
    }
  });

  /**
   * DELETE /shares/:id
   * Revoke a share (sender) or decline a share (recipient).
   */
  router.delete('/shares/:id', auth, (req: Request, res: Response) => {
    try {
      queries.revokeShare.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to revoke share' });
    }
  });

  /**
   * GET /shares/user/:email/public-key
   * Get a user's public encryption key for creating share envelopes.
   */
  router.get('/shares/user/:email/public-key', auth, (req: Request, res: Response) => {
    try {
      const user = queries.getUserByEmail.get(req.params.email) as any;
      if (!user || !user.encryption_public_key) {
        res.status(404).json({ success: false, error: 'User or public key not found' });
        return;
      }
      res.json({
        success: true,
        publicKey: {
          userId: user.id,
          encryptionPublicKey: user.encryption_public_key,
          signingPublicKey: user.signing_public_key,
          signature: user.public_key_signature,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get public key' });
    }
  });

  // ================================================================
  // SYNC
  // ================================================================

  /**
   * POST /sync/pull
   * Pull changes since last sync. Returns notes updated after the cursor.
   */
  router.post('/sync/pull', auth, (req: Request, res: Response) => {
    try {
      const parsed = syncRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const { deviceId, lastSyncAt } = parsed.data;

      const since = lastSyncAt || '1970-01-01T00:00:00.000Z';
      const changedNotes = queries.getChangedNotes.all(req.user!.userId, since);

      // Update sync cursor
      const cursorToken = new Date().toISOString();
      queries.upsertSyncCursor.run(req.user!.userId, deviceId, cursorToken);

      res.json({
        success: true,
        notes: changedNotes,
        cursor: cursorToken,
        hasMore: false, // Pagination for future
      });
    } catch (err) {
      console.error('[Sync] Pull error:', err);
      res.status(500).json({ success: false, error: 'Sync pull failed' });
    }
  });

  /**
   * POST /sync/push
   * Push local changes to server. Accepts a batch of encrypted notes.
   */
  router.post('/sync/push', auth, (req: Request, res: Response) => {
    try {
      const { deviceId, notes: noteBatch } = req.body;

      if (!deviceId || !Array.isArray(noteBatch)) {
        res.status(400).json({ success: false, error: 'Invalid sync push payload' });
        return;
      }

      let created = 0;
      let updated = 0;

      for (const note of noteBatch) {
        const existing = queries.getNoteById.get(note.id, req.user!.userId);

        if (existing) {
          queries.updateNote.run(
            note.encryptedTitle, note.encryptedBody, note.encryptedTags || null,
            note.pinned ? 1 : 0, note.favorite ? 1 : 0,
            note.id, req.user!.userId
          );
          updated++;
        } else {
          queries.insertNote.run(
            note.id, note.sectionId, req.user!.userId,
            note.encryptedTitle, note.encryptedBody, note.encryptedTags || null,
            note.contentKeyId, note.pinned ? 1 : 0, note.favorite ? 1 : 0
          );
          created++;
        }
      }

      const cursorToken = new Date().toISOString();
      queries.upsertSyncCursor.run(req.user!.userId, deviceId, cursorToken);

      res.json({ success: true, created, updated, cursor: cursorToken });
    } catch (err) {
      console.error('[Sync] Push error:', err);
      res.status(500).json({ success: false, error: 'Sync push failed' });
    }
  });

  return router;
}
