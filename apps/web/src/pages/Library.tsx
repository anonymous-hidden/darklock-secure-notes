/**
 * Darklock Secure Notes — Library Screen
 *
 * Premium section card grid with subtle gradients, hover-lift,
 * accent top-bar on hover, and a polished empty-state illustration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { Button, Input, Modal, Spinner, Badge } from '@darklock/ui';
import { api } from '../services/api';
import { cryptoService } from '../services/crypto';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const FolderIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path
      d="M2 5a2 2 0 0 1 2-2h3.172a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 10.828 5H16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"
      stroke="var(--dl-accent)" strokeWidth="1.3" fill="none"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 3.5h10M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3.5 3.5l.5 8a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5l.5-8"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmptyIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <defs>
      <linearGradient id="eg" x1="20" y1="10" x2="70" y2="86">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
      <filter id="egl" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <rect x="22" y="18" width="52" height="60" rx="8" stroke="url(#eg)" strokeWidth="2" fill="none" filter="url(#egl)" />
    <path d="M34 36h28M34 46h20M34 56h24" stroke="url(#eg)" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    <circle cx="48" cy="48" r="38" stroke="var(--dl-border)" strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.2" />
  </svg>
);

const NoteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 2h4.5L10 4.5V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1" />
    <path d="M7 2v3h3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────── */
export const Library: React.FC = () => {
  const sections = useAppStore((s) => s.sections);
  const setSections = useAppStore((s) => s.setSections);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const setScreen = useAppStore((s) => s.setScreen);
  const storageMode = useAppStore((s) => s.storageMode);
  const showNewSectionModal = useAppStore((s) => s.showNewSectionModal);
  const setShowNewSectionModal = useAppStore((s) => s.setShowNewSectionModal);

  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ---------- load sections ---------- */
  const loadSections = useCallback(async () => {
    if (storageMode !== 'cloud') return;
    try {
      const vaults = useAppStore.getState().vaults;
      if (vaults.length === 0) return;
      const vaultId = vaults[0].id;
      const res = (await api.sections.list(vaultId)).sections;
      const mapped = await Promise.all(
        res.map(async (s: any) => ({
          id: s.id,
          vaultId: s.vault_id || vaultId,
          name: s.encrypted_name ? await decryptSafe(s.encrypted_name) : s.name || 'Untitled',
          noteCount: s.note_count ?? 0,
          sortOrder: s.sort_order ?? 0,
        })),
      );
      setSections(mapped);
    } catch { /* silent */ }
  }, [storageMode, setSections]);

  useEffect(() => { loadSections(); }, [loadSections]);

  /* ---------- decrypt helper ---------- */
  async function decryptSafe(blob: string): Promise<string> {
    try { return await cryptoService.decryptTitle(blob); }
    catch { return 'Untitled'; }
  }

  /* ---------- create ---------- */
  const handleCreateSection = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      if (storageMode === 'cloud') {
        const vaults = useAppStore.getState().vaults;
        if (vaults.length === 0) return;
        const encName = await cryptoService.encryptTitle(newName.trim());
        const res = await api.sections.create({
          id: crypto.randomUUID(),
          vaultId: vaults[0].id,
          encryptedName: encName,
          sortOrder: sections.length,
        });
        useAppStore.getState().addSection({
          id: res.id ?? crypto.randomUUID(),
          vaultId: vaults[0].id,
          name: newName.trim(),
          noteCount: 0,
          sortOrder: sections.length,
        });
      } else {
        useAppStore.getState().addSection({
          id: crypto.randomUUID(),
          vaultId: 'local',
          name: newName.trim(),
          noteCount: 0,
          sortOrder: sections.length,
        });
      }
      setNewName('');
      setShowNewSectionModal(false);
    } catch { /* */ } finally { setLoading(false); }
  };

  /* ---------- open ---------- */
  const openSection = (id: string) => { setActiveSection(id); setScreen('workspace'); };

  /* ---------- rename ---------- */
  const startRename = (id: string, current: string) => { setRenamingId(id); setRenameValue(current); };
  const submitRename = () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    const store = useAppStore.getState();
    store.setSections(store.sections.map((s) => (s.id === renamingId ? { ...s, name: renameValue.trim() } : s)));
    setRenamingId(null);
  };

  /* ---------- delete ---------- */
  const deleteSection = (id: string) => {
    useAppStore.getState().removeSection(id);
    setConfirmDeleteId(null);
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="library-screen">
      <TopBar />

      <div className="library-body">
        {/* Header */}
        <div className="library-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.3px' }}>Library</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              {sections.length} section{sections.length !== 1 ? 's' : ''} &middot; double-click to rename
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowNewSectionModal(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusIcon /> New Section
            </span>
          </Button>
        </div>

        {/* Grid or Empty */}
        {sections.length === 0 ? (
          <div className="empty-state" style={{ animation: 'dl-fadeIn 0.6s ease' }}>
            <div style={{ marginBottom: '16px', opacity: 0.85 }}><EmptyIllustration /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600 }}>No sections yet</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '260px' }}>
              Create your first section to start organizing encrypted notes.
            </p>
            <Button variant="primary" onClick={() => setShowNewSectionModal(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon /> Create Section
              </span>
            </Button>
          </div>
        ) : (
          <div className="library-grid" style={{ animation: 'dl-fadeIn 0.4s ease' }}>
            {sections.map((section, i) => (
              <div
                key={section.id}
                className="section-card"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => openSection(section.id)}
                onDoubleClick={(e) => { e.stopPropagation(); startRename(section.id, section.name); }}
              >
                <div className="section-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <FolderIcon />
                    {renamingId === section.id ? (
                      <input
                        className="section-rename-input"
                        value={renameValue}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      <span className="section-card-name">{section.name}</span>
                    )}
                  </div>
                  <button
                    className="section-delete-btn"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(section.id); }}
                    title="Delete section"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="section-card-meta">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--dl-text-muted)' }}>
                    <NoteIcon /> {section.noteCount} note{section.noteCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick-add card */}
            <div className="section-card section-card-add" onClick={() => setShowNewSectionModal(true)}>
              <PlusIcon />
              <span style={{ fontSize: '13px', marginTop: '6px' }}>Add section</span>
            </div>
          </div>
        )}
      </div>

      {/* ── New Section Modal ──────────────────────────────────── */}
      {showNewSectionModal && (
        <Modal isOpen={true} title="New Section" onClose={() => setShowNewSectionModal(false)} size="sm">
          <div className="modal-form">
            <Input
              label="Section name"
              value={newName}
              autoFocus
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleCreateSection(); }}
              placeholder="e.g. Personal, Work, Passwords"
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowNewSectionModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateSection} disabled={loading || !newName.trim()}>
                {loading ? <Spinner size={16} /> : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete ─────────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="delete-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Delete section?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              This will permanently remove the section and all its notes. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => deleteSection(confirmDeleteId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
