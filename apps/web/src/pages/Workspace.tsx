/**
 * Darklock Secure Notes — Workspace (3-pane)
 *
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  TopBar                                                  │
 *  ├──────────┬──────────────┬────────────────────────────────┤
 *  │ NavPane  │ NoteListPane │      EditorPane                │
 *  │ sections │  note titles │  NoteEditor component           │
 *  └──────────┴──────────────┴────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, DecryptedNote } from '../stores/appStore';
import { Button, Input, Badge, Spinner } from '@darklock/ui';
import { TopBar } from '../components/TopBar';
import { NoteEditor } from '../components/NoteEditor';

/* ── SVG Icons ────────────────────────────────────────────────── */
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 3.5a1 1 0 0 1 1-1h2.172a1 1 0 0 1 .707.293l.621.621a1 1 0 0 0 .707.293H11.5a1 1 0 0 1 1 1V10.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7z"
      stroke="currentColor" strokeWidth="1.1" fill="none" />
  </svg>
);

const PinIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M6.5 1L9 3.5 6 6.5l-.5 2.5L3 6.5.5 4 3.5 1z" stroke="var(--dl-accent)" strokeWidth="0.8" fill="var(--dl-accent)" opacity="0.7" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const NoteDocIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <defs>
      <linearGradient id="ws-eg" x1="10" y1="8" x2="42" y2="44">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <rect x="12" y="6" width="28" height="40" rx="5" stroke="url(#ws-eg)" strokeWidth="1.5" fill="none" />
    <path d="M20 18h12M20 24h8M20 30h10" stroke="url(#ws-eg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────── */
export const Workspace: React.FC = () => {
  const sections = useAppStore((s) => s.sections);
  const activeSectionId = useAppStore((s) => s.activeSectionId);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const notes = useAppStore((s) => s.notes);
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const setActiveNote = useAppStore((s) => s.setActiveNote);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const removeNote = useAppStore((s) => s.removeNote);
  const navCollapsed = useAppStore((s) => s.navCollapsed);
  const toggleNav = useAppStore((s) => s.toggleNav);
  const toolsSidebarOpen = useAppStore((s) => s.toolsSidebarOpen);
  const noteSearchQuery = useAppStore((s) => s.noteSearchQuery);
  const setNoteSearchQuery = useAppStore((s) => s.setNoteSearchQuery);

  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');

  /* ---------- derived ---------- */
  const sectionNotes = useMemo(
    () =>
      notes
        .filter((n) => n.sectionId === activeSectionId)
        .filter((n) => {
          if (!noteSearchQuery) return true;
          const q = noteSearchQuery.toLowerCase();
          return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
        })
        .sort((a, b) => {
          if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          if (sortBy === 'title') return a.title.localeCompare(b.title);
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [notes, activeSectionId, noteSearchQuery, sortBy],
  );

  const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? null, [notes, activeNoteId]);
  const activeSection = sections.find((s) => s.id === activeSectionId);

  /* ---------- create note ---------- */
  const handleNewNote = () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const note: DecryptedNote = {
      id,
      sectionId: activeSectionId || sections[0]?.id || '',
      title: '',
      body: '',
      tags: [],
      pinned: false,
      favorite: false,
      createdAt: now,
      updatedAt: now,
      contentKeyId: '',
    };
    addNote(note);
    setActiveNote(id);
  };

  /* ---------- save ---------- */
  const handleNoteChange = useCallback(
    (id: string, field: 'title' | 'body', value: string) => {
      updateNote(id, { [field]: value, updatedAt: new Date().toISOString() });
    },
    [updateNote],
  );

  /* ---------- delete ---------- */
  const handleDeleteNote = (id: string) => {
    removeNote(id);
    if (activeNoteId === id) setActiveNote(null);
  };

  /* ---------- import ---------- */
  const handleImport = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.md,.txt,.dlpkg';
    inp.multiple = false;
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const text = await file.text();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const title = file.name.replace(/\.(md|txt|dlpkg)$/i, '').slice(0, 38) || 'Imported Note';
      const note: DecryptedNote = {
        id,
        sectionId: activeSectionId || sections[0]?.id || '',
        title,
        body: text,
        tags: [],
        pinned: false,
        favorite: false,
        createdAt: now,
        updatedAt: now,
        contentKeyId: '',
      };
      addNote(note);
      setActiveNote(id);
    };
    inp.click();
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); handleNewNote(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSectionId]);

  /* ---------- helper: relative date ---------- */
  const relDate = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="workspace-screen">
      <TopBar />

      <div className="workspace-body">
        {/* ── Nav Pane ──────────────────────────────────────── */}
        {!navCollapsed && (
          <aside className="nav-pane">
            <div className="nav-pane-header">
              <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--dl-text-muted)' }}>
                Sections
              </span>
              <button className="nav-collapse-btn" onClick={toggleNav} title="Collapse sidebar">
                <ChevronLeft />
              </button>
            </div>

            <ul className="nav-section-list">
              {sections.map((sec) => {
                const count = notes.filter((n) => n.sectionId === sec.id).length;
                return (
                  <li
                    key={sec.id}
                    className={`nav-section-item ${sec.id === activeSectionId ? 'active' : ''}`}
                    onClick={() => setActiveSection(sec.id)}
                  >
                    <FolderIcon />
                    <span className="nav-section-name">{sec.name}</span>
                    <span className="nav-section-count">{count}</span>
                  </li>
                );
              })}
            </ul>

            <button
              className="nav-add-section"
              onClick={() => useAppStore.getState().setShowNewSectionModal(true)}
            >
              <PlusIcon /> Add Section
            </button>
          </aside>
        )}

        {navCollapsed && (
          <button className="nav-expand-btn" onClick={toggleNav} title="Expand sidebar">
            <ChevronRight />
          </button>
        )}

        {/* ── Note List Pane ───────────────────────────────── */}
        <div className="notelist-pane">
          <div className="notelist-header">
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              {activeSection?.name || 'All Notes'}
            </h3>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <Button variant="ghost" size="sm" onClick={handleImport} title="Import a .md or .txt file">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⬆ Import</span>
              </Button>
              <Button variant="primary" size="sm" onClick={handleNewNote}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><PlusIcon /> Note</span>
              </Button>
            </div>
          </div>

          <div className="notelist-search">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dl-text-muted)', pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
              <input
                className="notelist-search-input"
                placeholder="Search notes…"
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px 7px 32px',
                  background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)',
                  borderRadius: '8px', color: 'var(--dl-text)', fontSize: '12px',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
              />
            </div>
          </div>

          <div className="notelist-sort">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--dl-text-muted)',
                fontSize: '11px', cursor: 'pointer', outline: 'none', padding: '2px 4px',
              }}
            >
              <option value="updated">Last modified</option>
              <option value="title">Title A–Z</option>
              <option value="created">Created date</option>
            </select>
          </div>

          {sectionNotes.length === 0 ? (
            <div className="notelist-empty">
              <p style={{ color: 'var(--dl-text-muted)', fontSize: '12px' }}>No notes yet</p>
              <Button variant="ghost" size="sm" onClick={handleNewNote}>Create one</Button>
            </div>
          ) : (
            <ul className="notelist-items">
              {sectionNotes.map((note) => (
                <li
                  key={note.id}
                  className={`notelist-item ${note.id === activeNoteId ? 'active' : ''}`}
                  onClick={() => setActiveNote(note.id)}
                >
                  <div className="notelist-item-title">
                    {note.pinned && <PinIcon />}
                    <span>{note.title || 'Untitled'}</span>
                  </div>
                  <div className="notelist-item-preview">
                    {note.body.slice(0, 90) || 'Empty note'}
                  </div>
                  <div className="notelist-item-meta">
                    <span>{relDate(note.updatedAt)}</span>
                    {note.tags.length > 0 && (
                      <span className="notelist-item-tags">
                        {note.tags.slice(0, 2).map((t) => (
                          <span key={t} className="notelist-tag">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Editor Pane ──────────────────────────────────── */}
        <div className="editor-pane">
          {activeNote ? (
            <NoteEditor note={activeNote} onChange={handleNoteChange} onDelete={handleDeleteNote} />
          ) : (
            <div className="editor-empty">
              <div className="empty-state" style={{ animation: 'dl-fadeIn 0.5s ease' }}>
                <NoteDocIcon />
                <h3 style={{ margin: '16px 0 4px', fontSize: '15px', fontWeight: 600 }}>Select or create a note</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--dl-text-muted)' }}>
                  Choose from the list or press <kbd style={{
                    display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '11px',
                    background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', fontFamily: 'var(--dl-font-mono)',
                  }}>Ctrl+N</kbd>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Tools Sidebar ────────────────────────────────── */}
        {toolsSidebarOpen && activeNote && (
          <aside className="tools-sidebar">
            <ToolsPanel key={activeNote.id} note={activeNote} />
          </aside>
        )}
      </div>
    </div>
  );
};

/* ── In-memory revision snapshots (per session) ─────────────── */
interface RevSnapshot { id: string; body: string; savedAt: string; }
const sessionRevisions = new Map<string, RevSnapshot[]>();

/* ── In-memory file attachments (per note, per session) ──────── */
interface AttachedFile { id: string; name: string; size: number; type: string; addedAt: string; }
const sessionFiles = new Map<string, AttachedFile[]>();

/* ── Line-level diff (LCS-based, max 400 lines) ──────────────── */
type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };
function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n').slice(0, 400);
  const b = newText.split('\n').slice(0, 400);
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { result.unshift({ type: 'same', text: a[i - 1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { result.unshift({ type: 'add', text: b[j - 1] }); j--; }
    else { result.unshift({ type: 'remove', text: a[i - 1] }); i--; }
  }
  return result;
}

/* ── Tools Panel ──────────────────────────────────────────────── */
const ToolsPanel: React.FC<{ note: DecryptedNote }> = ({ note }) => {
  const toolsTab = useAppStore((s) => s.toolsTab);
  const setToolsTab = useAppStore((s) => s.setToolsTab);
  const notes = useAppStore((s) => s.notes);
  const sections = useAppStore((s) => s.sections);
  const updateNote = useAppStore((s) => s.updateNote);

  /* ── Revision state ─────────────────────────────────────── */
  const [revisions, setRevisions] = useState<RevSnapshot[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const prevBodyRef = React.useRef<string>('');

  /* ── File attachment state (per note) ───────────────────── */
  const [files, setFiles] = useState<AttachedFile[]>(() => sessionFiles.get(note.id) ?? []);
  const [dragOver, setDragOver] = useState(false);

  /* Initialise snapshots when note changes */
  useEffect(() => {
    const existing = sessionRevisions.get(note.id);
    if (!existing || existing.length === 0) {
      const snap: RevSnapshot[] = [{ id: crypto.randomUUID(), body: note.body, savedAt: new Date().toISOString() }];
      sessionRevisions.set(note.id, snap);
      setRevisions(snap);
    } else {
      setRevisions([...existing]);
    }
    setSelectedRevId(null);
    prevBodyRef.current = note.body;
  }, [note.id]);

  /* Push a snapshot only after typing pauses for 60s (Google Docs-style) */
  const snapTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (note.body === prevBodyRef.current) return;
    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const current = note.body;
      if (current === prevBodyRef.current) return;
      prevBodyRef.current = current;
      const existing = sessionRevisions.get(note.id) ?? [];
      const last = existing[existing.length - 1];
      if (last && last.body === current) return;
      const updated = [...existing, { id: crypto.randomUUID(), body: current, savedAt: new Date().toISOString() }].slice(-12);
      sessionRevisions.set(note.id, updated);
      setRevisions([...updated]);
    }, 60_000);
    return () => clearTimeout(snapTimerRef.current);
  }, [note.body, note.id]);

  const tabs = [
    { id: 'outline' as const, label: 'Outline' },
    { id: 'backlinks' as const, label: 'Backlinks' },
    { id: 'revisions' as const, label: 'History' },
    { id: 'attachments' as const, label: 'Files' },
  ];

  const section = sections.find((s) => s.id === note.sectionId);

  /* Info rows */
  const created = new Date(note.createdAt);
  const updated = new Date(note.updatedAt);
  const wordCount = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
  const readingMins = Math.max(1, Math.round(wordCount / 200));

  /* Backlinks: notes whose body mentions this note's title */
  const backlinks = useMemo(() => {
    if (!note.title) return [];
    const titleLower = note.title.toLowerCase();
    return notes.filter(
      (n) => n.id !== note.id && n.body.toLowerCase().includes(titleLower),
    );
  }, [notes, note.id, note.title]);

  const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--dl-border-subtle)' }}>
      <span style={{ fontSize: '11px', color: 'var(--dl-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '11px', color: 'var(--dl-text-secondary)', textAlign: 'right', marginLeft: '8px', fontFamily: 'var(--dl-font-mono)', lineBreak: 'anywhere' as const }}>{value}</span>
    </div>
  );

  return (
    <div className="tools-panel">
      <div className="tools-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={toolsTab === t.id ? 'active' : ''} onClick={() => setToolsTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tools-content">
        {toolsTab === 'outline' && <OutlineTab body={note.body} />}

        {toolsTab === 'backlinks' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '11px', color: 'var(--dl-text-muted)' }}>
              Notes that reference &ldquo;{note.title || 'this note'}&rdquo;
            </div>
            {backlinks.length === 0 ? (
              <div className="tools-empty">No backlinks found.<br />Other notes that mention this title will appear here.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {backlinks.map((n) => (
                  <li key={n.id} style={{
                    padding: '8px 10px', borderRadius: '8px', background: 'var(--dl-bg-surface)',
                    border: '1px solid var(--dl-border-subtle)', cursor: 'pointer',
                  }}
                    onClick={() => useAppStore.getState().setActiveNote(n.id)}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dl-text)', marginBottom: '3px' }}>
                      {n.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', lineHeight: 1.4 }}>
                      {(() => {
                        const lower = n.body.toLowerCase();
                        const idx = lower.indexOf(note.title.toLowerCase());
                        if (idx === -1) return n.body.slice(0, 70);
                        const start = Math.max(0, idx - 30);
                        const end = Math.min(n.body.length, idx + note.title.length + 40);
                        const before = n.body.slice(start, idx);
                        const match = n.body.slice(idx, idx + note.title.length);
                        const after = n.body.slice(idx + note.title.length, end);
                        return <>
                          {start > 0 ? '…' : ''}{before}<mark style={{ background: 'var(--dl-accent-muted)', color: 'var(--dl-accent)', borderRadius: '2px', padding: '0 2px' }}>{match}</mark>{after}{end < n.body.length ? '…' : ''}
                        </>;
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {toolsTab === 'revisions' && (() => {
          /* ── Diff view ── */
          if (selectedRevId) {
            const rev = revisions.find(r => r.id === selectedRevId);
            if (!rev) return <div className="tools-empty">Revision not found.</div>;
            const diff = diffLines(rev.body, note.body);
            const added = diff.filter(l => l.type === 'add').length;
            const removed = diff.filter(l => l.type === 'remove').length;
            const savedTime = new Date(rev.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div className="rev-diff-view">
                <div className="rev-diff-header">
                  <button className="rev-back-btn" onClick={() => setSelectedRevId(null)}>← Back</button>
                  <div className="rev-diff-meta">
                    <span>{savedTime}</span>
                    <span className="rev-diff-stat add">+{added}</span>
                    <span className="rev-diff-stat remove">−{removed}</span>
                  </div>
                </div>
                <div className="rev-diff-hint">Comparing this snapshot → current</div>
                <div className="rev-diff-lines">
                  {diff.map((line, idx) => (
                    <div key={idx} className={`rev-diff-line ${line.type}`}>
                      <span className="rev-diff-gutter">
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                      </span>
                      <span className="rev-diff-text">{line.text || '\u00a0'}</span>
                    </div>
                  ))}
                  {diff.length === 0 && (
                    <div className="tools-empty" style={{ margin: '20px 0' }}>No changes — identical to current version.</div>
                  )}
                </div>
                <div className="rev-diff-actions">
                  <button
                    className="rev-restore-btn"
                    onClick={() => {
                      updateNote(note.id, { body: rev.body, updatedAt: new Date().toISOString() });
                      setSelectedRevId(null);
                    }}
                  >
                    Restore this version
                  </button>
                </div>
              </div>
            );
          }

          /* ── Revision list ── */
          const sorted = [...revisions].reverse(); // newest first
          return (
            <div>
              <div style={{ marginBottom: '10px', fontSize: '11px', color: 'var(--dl-text-muted)' }}>
                {revisions.length} snapshot{revisions.length !== 1 ? 's' : ''} this session — click to view changes
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sorted.map((rev, i) => {
                  const isCurrent = i === 0;
                  const prevRev = sorted[i + 1];
                  const stats = prevRev ? (() => {
                    const d = diffLines(prevRev.body, rev.body);
                    return { add: d.filter(l => l.type === 'add').length, remove: d.filter(l => l.type === 'remove').length };
                  })() : null;
                  const words = rev.body.trim() ? rev.body.trim().split(/\s+/).length : 0;
                  const time = new Date(rev.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <li
                      key={rev.id}
                      className={`rev-list-item ${isCurrent ? 'current' : ''}`}
                      onClick={() => !isCurrent && setSelectedRevId(rev.id)}
                      title={isCurrent ? 'This is the current version' : 'Click to view diff'}
                    >
                      <div className="rev-list-label">
                        {isCurrent ? 'Current version' : time}
                      </div>
                      <div className="rev-list-meta">
                        <span>{words} words</span>
                        {stats && (stats.add > 0 || stats.remove > 0) && (
                          <>
                            {stats.add > 0 && <span className="rev-diff-stat add">+{stats.add}</span>}
                            {stats.remove > 0 && <span className="rev-diff-stat remove">−{stats.remove}</span>}
                          </>
                        )}
                      </div>
                      {!isCurrent && <span className="rev-list-arrow">›</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        {toolsTab === 'attachments' && (
          <div>
            {/* Drop zone */}
            <div
              className={`attach-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const dropped = Array.from(e.dataTransfer.files);
                const added: AttachedFile[] = dropped.map(f => ({
                  id: crypto.randomUUID(),
                  name: f.name,
                  size: f.size,
                  type: f.type || 'application/octet-stream',
                  addedAt: new Date().toISOString(),
                }));
                const updated = [...(sessionFiles.get(note.id) ?? []), ...added];
                sessionFiles.set(note.id, updated);
                setFiles([...updated]);
              }}
              onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file'; inp.multiple = true;
                inp.onchange = () => {
                  if (!inp.files) return;
                  const added: AttachedFile[] = Array.from(inp.files).map(f => ({
                    id: crypto.randomUUID(), name: f.name, size: f.size,
                    type: f.type || 'application/octet-stream', addedAt: new Date().toISOString(),
                  }));
                  const updated = [...(sessionFiles.get(note.id) ?? []), ...added];
                  sessionFiles.set(note.id, updated);
                  setFiles([...updated]);
                };
                inp.click();
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>📎</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dl-text)', marginBottom: '3px' }}>
                {dragOver ? 'Drop to attach' : 'Drop files or click to browse'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--dl-text-muted)' }}>
                Encrypted client-side · XChaCha20-Poly1305
              </div>
            </div>

            {/* File list for this note */}
            {files.length === 0 ? (
              <div className="tools-empty" style={{ marginTop: 10 }}>No files attached to this note.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {files.map(f => {
                  const kb = (f.size / 1024).toFixed(1);
                  const ext = f.name.split('.').pop()?.toUpperCase() ?? '?';
                  return (
                    <li key={f.id} className="attach-file-row">
                      <span className="attach-ext">{ext}</span>
                      <div className="attach-meta">
                        <span className="attach-name">{f.name}</span>
                        <span className="attach-size">{kb} KB · {new Date(f.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button
                        className="attach-remove"
                        title="Remove file"
                        onClick={() => {
                          const updated = files.filter(x => x.id !== f.id);
                          sessionFiles.set(note.id, updated);
                          setFiles(updated);
                        }}
                      >✕</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Note Info footer */}
      <div style={{ borderTop: '1px solid var(--dl-border)', padding: '12px 14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dl-text-muted)', marginBottom: '8px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          Note Info
        </div>
        <InfoRow label="Section" value={section?.name || '—'} />
        <InfoRow label="Created" value={created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} />
        <InfoRow label="Modified" value={updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <InfoRow label="Words" value={wordCount.toLocaleString()} />
        <InfoRow label="Reading time" value={`~${readingMins} min`} />
        <InfoRow label="Cipher" value="XChaCha20-Poly1305" />
        <InfoRow label="Status" value={<span style={{ color: 'var(--dl-success)' }}>🔒 Encrypted</span>} />
      </div>
    </div>
  );
};

/* ── Outline Tab ──────────────────────────────────────────────── */
const OutlineTab: React.FC<{ body: string }> = ({ body }) => {
  const lines = body.split('\n');
  const headings = useMemo(() => {
    const items: { level: number; text: string; lineIndex: number }[] = [];
    lines.forEach((line, lineIndex) => {
      const m = line.match(/^(#{1,6})\s+(.+)/);
      if (m) items.push({ level: m[1].length, text: m[2], lineIndex });
    });
    return items;
  }, [body]);

  const scrollTo = (lineIndex: number) => {
    const ta = document.querySelector<HTMLTextAreaElement>('.note-body-input');
    if (!ta) return;
    const before = lines.slice(0, lineIndex).join('\n');
    const charPos = before.length;
    ta.focus();
    ta.setSelectionRange(charPos, charPos + (lines[lineIndex]?.length ?? 0));
    // scroll the textarea so the selected line is visible
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 22;
    ta.scrollTop = Math.max(0, lineIndex * lineHeight - ta.clientHeight / 2);
  };

  const levelIcons: Record<number, string> = { 1: 'H1', 2: 'H2', 3: 'H3', 4: 'H4', 5: 'H5', 6: 'H6' };

  if (headings.length === 0) {
    return (
      <div className="tools-empty">
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>📋</div>
        No headings found.<br />
        <span style={{ fontSize: '11px', color: 'var(--dl-text-muted)' }}>Type <code style={{ fontFamily: 'var(--dl-font-mono)' }}># Heading</code> to create an outline.</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--dl-text-muted)', marginBottom: '8px', letterSpacing: '0.3px' }}>
        {headings.length} heading{headings.length !== 1 ? 's' : ''} · click to jump
      </div>
      <ul className="outline-list">
        {headings.map((h, i) => (
          <li
            key={i}
            className={`outline-item level-${h.level}`}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '6px' }}
            onClick={() => scrollTo(h.lineIndex)}
            title={`Jump to: ${h.text}`}
          >
            <span style={{
              fontSize: '9px', fontWeight: 700, fontFamily: 'var(--dl-font-mono)',
              color: 'var(--dl-accent)', background: 'var(--dl-accent-muted)',
              borderRadius: '3px', padding: '1px 4px', flexShrink: 0,
            }}>
              {levelIcons[h.level]}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const EmptyTab: React.FC<{ text: string }> = ({ text }) => (
  <div className="tools-empty">{text}</div>
);
