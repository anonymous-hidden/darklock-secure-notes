/**
 * Darklock Server - Notes, Vaults, Sections, Keys, Tags Routes
 * 
 * All note content is encrypted client-side. The server is a blind storage layer.
 * It validates structure (required fields, types) but never inspects content.
 */

import { Router, Request, Response } from 'express';
import type { Queries } from '../db/queries.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createVaultSchema, updateVaultSchema,
  createSectionSchema, updateSectionSchema,
  createNoteSchema, updateNoteSchema, moveNoteSchema,
  storeItemKeySchema, storeContentKeySchema,
  createTagSchema, updateTagSchema,
  createRevisionSchema,
} from '../middleware/validation.js';

export function createNotesRoutes(queries: Queries): Router {
  const router = Router();
  const auth = requireAuth(queries);

  // ================================================================
  // VAULTS
  // ================================================================

  router.get('/vaults', auth, (req: Request, res: Response) => {
    try {
      const vaults = queries.getVaultsByUser.all(req.user!.userId);
      res.json({ success: true, vaults });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load vaults' });
    }
  });

  router.post('/vaults', auth, (req: Request, res: Response) => {
    try {
      const parsed = createVaultSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.issues });
        return;
      }
      queries.insertVault.run(parsed.data.id, req.user!.userId, parsed.data.encryptedName, parsed.data.mode);
      res.status(201).json({ success: true, id: parsed.data.id });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create vault' });
    }
  });

  router.put('/vaults/:id', auth, (req: Request, res: Response) => {
    try {
      const parsed = updateVaultSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const result = queries.updateVault.run(parsed.data.encryptedName, req.params.id, req.user!.userId);
      if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Vault not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update vault' });
    }
  });

  router.delete('/vaults/:id', auth, (req: Request, res: Response) => {
    try {
      const result = queries.deleteVault.run(req.params.id, req.user!.userId);
      if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Vault not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete vault' });
    }
  });

  // ================================================================
  // SECTIONS
  // ================================================================

  router.get('/vaults/:vaultId/sections', auth, (req: Request, res: Response) => {
    try {
      const sections = queries.getSectionsByVault.all(req.params.vaultId, req.user!.userId);
      res.json({ success: true, sections });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load sections' });
    }
  });

  router.post('/sections', auth, (req: Request, res: Response) => {
    try {
      const parsed = createSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.issues });
        return;
      }
      const d = parsed.data;
      queries.insertSection.run(d.id, d.vaultId, req.user!.userId, d.encryptedName, d.encryptedMetadata || null, d.sortOrder || 0);
      res.status(201).json({ success: true, id: d.id });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create section' });
    }
  });

  router.put('/sections/:id', auth, (req: Request, res: Response) => {
    try {
      const parsed = updateSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const d = parsed.data;
      const result = queries.updateSection.run(d.encryptedName, d.encryptedMetadata || null, d.sortOrder || 0, req.params.id, req.user!.userId);
      if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Section not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update section' });
    }
  });

  router.delete('/sections/:id', auth, (req: Request, res: Response) => {
    try {
      const result = queries.deleteSection.run(req.params.id, req.user!.userId);
      if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Section not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete section' });
    }
  });

  // ================================================================
  // NOTES
  // ================================================================

  router.get('/sections/:sectionId/notes', auth, (req: Request, res: Response) => {
    try {
      const notes = queries.getNotesBySection.all(req.params.sectionId, req.user!.userId);
      res.json({ success: true, notes });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load notes' });
    }
  });

  router.get('/notes', auth, (req: Request, res: Response) => {
    try {
      const notes = queries.getNotesByUser.all(req.user!.userId);
      res.json({ success: true, notes });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load notes' });
    }
  });

  router.get('/notes/:id', auth, (req: Request, res: Response) => {
    try {
      const note = queries.getNoteById.get(req.params.id, req.user!.userId);
      if (!note) {
        res.status(404).json({ success: false, error: 'Note not found' });
        return;
      }
      res.json({ success: true, note });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load note' });
    }
  });

  router.post('/notes', auth, (req: Request, res: Response) => {
    try {
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.issues });
        return;
      }
      const d = parsed.data;
      queries.insertNote.run(
        d.id, d.sectionId, req.user!.userId,
        d.encryptedTitle, d.encryptedBody, d.encryptedTags || null,
        d.contentKeyId, d.pinned ? 1 : 0, d.favorite ? 1 : 0
      );
      res.status(201).json({ success: true, id: d.id });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create note' });
    }
  });

  router.put('/notes/:id', auth, (req: Request, res: Response) => {
    try {
      const parsed = updateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const d = parsed.data;
      const result = queries.updateNote.run(
        d.encryptedTitle, d.encryptedBody, d.encryptedTags || null,
        d.pinned ? 1 : 0, d.favorite ? 1 : 0,
        req.params.id, req.user!.userId
      );
      if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Note not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update note' });
    }
  });

  router.put('/notes/:id/move', auth, (req: Request, res: Response) => {
    try {
      const parsed = moveNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      queries.moveNote.run(parsed.data.sectionId, req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to move note' });
    }
  });

  router.delete('/notes/:id', auth, (req: Request, res: Response) => {
    try {
      queries.trashNote.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to trash note' });
    }
  });

  router.post('/notes/:id/restore', auth, (req: Request, res: Response) => {
    try {
      queries.restoreNote.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to restore note' });
    }
  });

  router.delete('/notes/:id/permanent', auth, (req: Request, res: Response) => {
    try {
      queries.deleteNotePermanently.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to permanently delete note' });
    }
  });

  router.get('/trash', auth, (req: Request, res: Response) => {
    try {
      const notes = queries.getTrashedNotes.all(req.user!.userId);
      res.json({ success: true, notes });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load trash' });
    }
  });

  // ================================================================
  // KEYS
  // ================================================================

  router.post('/keys/item', auth, (req: Request, res: Response) => {
    try {
      const parsed = storeItemKeySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const d = parsed.data;
      queries.insertItemKey.run(d.id, d.vaultId, req.user!.userId, d.ciphertext, d.nonce, d.version);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to store item key' });
    }
  });

  router.get('/keys/item/:vaultId', auth, (req: Request, res: Response) => {
    try {
      const keys = queries.getItemKeysByVault.all(req.params.vaultId, req.user!.userId);
      res.json({ success: true, keys });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load item keys' });
    }
  });

  router.post('/keys/content', auth, (req: Request, res: Response) => {
    try {
      const parsed = storeContentKeySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const d = parsed.data;
      queries.insertContentKey.run(d.id, d.noteId, req.user!.userId, d.ciphertext, d.nonce, d.version);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to store content key' });
    }
  });

  router.get('/keys/content/:noteId', auth, (req: Request, res: Response) => {
    try {
      const keys = queries.getContentKeysByNote.all(req.params.noteId, req.user!.userId);
      res.json({ success: true, keys });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load content keys' });
    }
  });

  // ================================================================
  // TAGS
  // ================================================================

  router.get('/tags', auth, (req: Request, res: Response) => {
    try {
      const tags = queries.getTagsByUser.all(req.user!.userId);
      res.json({ success: true, tags });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load tags' });
    }
  });

  router.post('/tags', auth, (req: Request, res: Response) => {
    try {
      const parsed = createTagSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      queries.insertTag.run(parsed.data.id, req.user!.userId, parsed.data.encryptedName, parsed.data.color || '#808080');
      res.status(201).json({ success: true, id: parsed.data.id });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create tag' });
    }
  });

  router.put('/tags/:id', auth, (req: Request, res: Response) => {
    try {
      const parsed = updateTagSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      queries.updateTag.run(parsed.data.encryptedName, parsed.data.color || '#808080', req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update tag' });
    }
  });

  router.delete('/tags/:id', auth, (req: Request, res: Response) => {
    try {
      queries.deleteTag.run(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete tag' });
    }
  });

  // ================================================================
  // REVISIONS
  // ================================================================

  router.post('/revisions', auth, (req: Request, res: Response) => {
    try {
      const parsed = createRevisionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const d = parsed.data;
      queries.insertRevision.run(d.id, d.noteId, req.user!.userId, d.encryptedBody, d.contentKeyId, d.revisionNumber);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create revision' });
    }
  });

  router.get('/notes/:noteId/revisions', auth, (req: Request, res: Response) => {
    try {
      const revisions = queries.getRevisionsByNote.all(req.params.noteId, req.user!.userId);
      res.json({ success: true, revisions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load revisions' });
    }
  });

  router.get('/revisions/:id', auth, (req: Request, res: Response) => {
    try {
      const revision = queries.getRevisionById.get(req.params.id, req.user!.userId);
      if (!revision) {
        res.status(404).json({ success: false, error: 'Revision not found' });
        return;
      }
      res.json({ success: true, revision });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to load revision' });
    }
  });

  return router;
}
