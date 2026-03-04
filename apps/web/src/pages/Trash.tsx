/**
 * Darklock Secure Notes — Trash Screen
 *
 * View, restore, and permanently delete trashed notes.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, DecryptedNote } from '../stores/appStore';
import { Button, Badge, Modal } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const TrashBinIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="tb-g2" x1="12" y1="8" x2="36" y2="42">
        <stop stopColor="#ef4444" />
        <stop offset="1" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <path d="M14 16h20M18 16v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M16 16l1.5 22a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3L32 16"
      stroke="url(#tb-g2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 22v10M27 22v10" stroke="url(#tb-g2)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 5h3v-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8a4 4 0 1 0 1-3.5L2.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const Trash: React.FC = () => {
  const trashedNotes = useAppStore((s) => s.trashedNotes);
  const setTrashedNotes = useAppStore((s) => s.setTrashedNotes);
  const addNote = useAppStore((s) => s.addNote);
  const setScreen = useAppStore((s) => s.setScreen);
  const showTrashWarning = useAppStore((s) => s.showTrashWarning);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return trashedNotes;
    const q = search.toLowerCase();
    return trashedNotes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [trashedNotes, search]);

  const restoreNote = (note: DecryptedNote) => {
    addNote(note);
    setTrashedNotes(trashedNotes.filter((n) => n.id !== note.id));
  };

  const permanentDelete = (id: string) => {
    setTrashedNotes(trashedNotes.filter((n) => n.id !== id));
    setConfirmDeleteId(null);
  };

  const emptyTrash = () => {
    setTrashedNotes([]);
    setConfirmEmptyAll(false);
  };

  const relDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 86_400_000) return 'Today';
    if (diff < 172_800_000) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="trash-screen">
      <TopBar />
      <div className="trash-body">
        <div className="collab-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Trash</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              {trashedNotes.length} deleted note{trashedNotes.length !== 1 ? 's' : ''}
              {trashedNotes.length > 0 && ' — auto-deleted after 30 days'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={() => setScreen('library')}>Back to Library</Button>
            {trashedNotes.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => setConfirmEmptyAll(true)}>Empty Trash</Button>
            )}
          </div>
        </div>

        {trashedNotes.length > 3 && (
          <div style={{ padding: '0 0 16px' }}>
            <input
              placeholder="Search deleted notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', maxWidth: '400px', padding: '8px 14px',
                background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)',
                borderRadius: '8px', color: 'var(--dl-text)', fontSize: '13px', outline: 'none',
              }}
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="collab-empty">
            <TrashBinIcon />
            <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>Trash is empty</h3>
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)' }}>Deleted notes will appear here.</p>
          </div>
        ) : (
          <div className="trash-list">
            {filtered.map((note) => (
              <div key={note.id} className="trash-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dl-text)' }}>
                    {note.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.body.slice(0, 120) || 'Empty note'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '4px' }}>
                    Deleted {relDate(note.updatedAt)}
                    {note.tags.length > 0 && <> &middot; {note.tags.join(', ')}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" onClick={() => restoreNote(note)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><RestoreIcon /> Restore</span>
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(note.id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><XIcon /> Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="delete-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Permanently delete?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              This note will be permanently destroyed — encrypted content will be purged and cannot be recovered.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => permanentDelete(confirmDeleteId)}>Delete Forever</Button>
            </div>
          </div>
        </div>
      )}

      {confirmEmptyAll && (
        <div className="delete-confirm-overlay" onClick={() => setConfirmEmptyAll(false)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Empty entire trash?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              All {trashedNotes.length} notes will be permanently destroyed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmEmptyAll(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={emptyTrash}>Empty Trash</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
