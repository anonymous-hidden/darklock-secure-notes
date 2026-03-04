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
            <Button variant="primary" size="sm" onClick={handleNewNote}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><PlusIcon /> Note</span>
            </Button>
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
            <ToolsPanel note={activeNote} />
          </aside>
        )}
      </div>
    </div>
  );
};

/* ── Tools Panel ──────────────────────────────────────────────── */
const ToolsPanel: React.FC<{ note: DecryptedNote }> = ({ note }) => {
  const toolsTab = useAppStore((s) => s.toolsTab);
  const setToolsTab = useAppStore((s) => s.setToolsTab);

  const tabs = [
    { id: 'outline' as const, label: 'Outline' },
    { id: 'backlinks' as const, label: 'Links' },
    { id: 'revisions' as const, label: 'History' },
    { id: 'attachments' as const, label: 'Files' },
  ];

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
        {toolsTab === 'backlinks' && <EmptyTab text="No backlinks found." />}
        {toolsTab === 'revisions' && <EmptyTab text="Revision history coming soon." />}
        {toolsTab === 'attachments' && <EmptyTab text="No attachments. Drag files here to encrypt & attach." />}
      </div>
    </div>
  );
};

/* ── Outline Tab ──────────────────────────────────────────────── */
const OutlineTab: React.FC<{ body: string }> = ({ body }) => {
  const headings = useMemo(() => {
    const items: { level: number; text: string }[] = [];
    body.split('\n').forEach((line) => {
      const m = line.match(/^(#{1,6})\s+(.+)/);
      if (m) items.push({ level: m[1].length, text: m[2] });
    });
    return items;
  }, [body]);

  if (headings.length === 0) {
    return <div className="tools-empty">No headings found.<br />Use # Heading in your note.</div>;
  }

  return (
    <ul className="outline-list">
      {headings.map((h, i) => (
        <li key={i} className={`outline-item level-${h.level}`}>{h.text}</li>
      ))}
    </ul>
  );
};

const EmptyTab: React.FC<{ text: string }> = ({ text }) => (
  <div className="tools-empty">{text}</div>
);
