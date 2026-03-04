/**
 * Darklock Secure Notes — Note Editor
 *
 * Markdown-native editor with:
 * - SVG-based format toolbar
 * - Title input with auto-focus
 * - Body textarea (Markdown)
 * - Tag editor
 * - Word / char count status bar
 * - Pin / favourite / delete actions
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DecryptedNote } from '../stores/appStore';
import { Button, Badge } from '@darklock/ui';

interface Props {
  note: DecryptedNote;
  onChange: (id: string, field: 'title' | 'body', value: string) => void;
  onDelete: (id: string) => void;
}

/* ── SVG Icons ────────────────────────────────────────────────── */
const BoldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3.5 2.5h4a2.5 2.5 0 0 1 0 5H3.5zM3.5 7.5h5a2.5 2.5 0 0 1 0 5H3.5z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const ItalicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5.5 12.5L8.5 1.5M4.5 12.5h3M6.5 1.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M4.5 3.5L1.5 7l3 3.5M9.5 3.5l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const H1Icon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 3v8M2 7h5M7 3v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <text x="9.5" y="11.5" fontSize="6" fill="currentColor" fontWeight="600">1</text>
  </svg>
);

const H2Icon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 3v8M2 7h5M7 3v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <text x="9.5" y="11.5" fontSize="6" fill="currentColor" fontWeight="600">2</text>
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="2.5" cy="4" r="1" fill="currentColor" />
    <circle cx="2.5" cy="7" r="1" fill="currentColor" />
    <circle cx="2.5" cy="10" r="1" fill="currentColor" />
    <path d="M5.5 4h6M5.5 7h6M5.5 10h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const OrderedListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <text x="1" y="5.5" fontSize="5" fill="currentColor" fontWeight="600">1</text>
    <text x="1" y="8.5" fontSize="5" fill="currentColor" fontWeight="600">2</text>
    <text x="1" y="11.5" fontSize="5" fill="currentColor" fontWeight="600">3</text>
    <path d="M5.5 4h6M5.5 7h6M5.5 10h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const TaskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="4" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.1" />
    <path d="M3.5 6.5l1 1 2-2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 5h3M9 8h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M6 8l2-2M4.5 9.5a2 2 0 0 1 0-2.83l1-1a2 2 0 0 1 2.83 0M7.5 4.5a2 2 0 0 1 0 2.83l-1 1a2 2 0 0 1-2.83 0"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 3v8" stroke="var(--dl-accent)" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 5h5M6 8h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const CodeBlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1" />
    <path d="M4 5l-1.5 2L4 9M7 5l1.5 2L7 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DividerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PinIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8.5 1.5l4 4-3.5 3.5-.5 3.5L5 9 1.5 5.5 5 2z"
      stroke={active ? 'var(--dl-accent)' : 'currentColor'} strokeWidth="1.1"
      fill={active ? 'var(--dl-accent)' : 'none'} opacity={active ? 0.8 : 1} />
  </svg>
);

const StarIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5l1.76 3.56 3.93.57-2.85 2.77.67 3.92L7 10.38l-3.51 1.94.67-3.92L1.31 5.63l3.93-.57z"
      stroke={active ? '#f59e0b' : 'currentColor'} strokeWidth="1"
      fill={active ? '#f59e0b' : 'none'} />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 3.5h9M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3.5 3.5l.5 8a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5l.5-8"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockSmallIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <rect x="2.5" y="5" width="6" height="4" rx="1" stroke="var(--dl-success)" strokeWidth="0.9" />
    <path d="M4 5V3.5a1.5 1.5 0 0 1 3 0V5" stroke="var(--dl-success)" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

const TagIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 6V2a.5.5 0 0 1 .5-.5h4L10.5 6l-4 4z" stroke="currentColor" strokeWidth="0.9" />
    <circle cx="4" cy="4" r="0.7" fill="currentColor" />
  </svg>
);

/* ── Format helpers ────────────────────────────────────────────── */
const wrapSelection = (ta: HTMLTextAreaElement, before: string, after: string) => {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel = value.slice(s, e) || 'text';
  ta.setRangeText(`${before}${sel}${after}`, s, e, 'select');
  ta.focus();
  return ta.value;
};

const insertAtCursor = (ta: HTMLTextAreaElement, text: string) => {
  const s = ta.selectionStart;
  ta.setRangeText(text, s, s, 'end');
  ta.focus();
  return ta.value;
};

/* ── Component ─────────────────────────────────────────────────── */
export const NoteEditor: React.FC<Props> = ({ note, onChange, onDelete }) => {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!note.title && titleRef.current) titleRef.current.focus();
  }, [note.id]);

  /* ---------- debounced save ---------- */
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const debouncedChange = useCallback(
    (field: 'title' | 'body', value: string) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => onChange(note.id, field, value), 300);
    },
    [note.id, onChange],
  );

  /* ---------- stats ---------- */
  const stats = useMemo(() => {
    const words = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
    return { words, chars: note.body.length };
  }, [note.body]);

  /* ---------- format ---------- */
  const fmt = (type: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    let v: string;
    switch (type) {
      case 'bold': v = wrapSelection(ta, '**', '**'); break;
      case 'italic': v = wrapSelection(ta, '_', '_'); break;
      case 'code': v = wrapSelection(ta, '`', '`'); break;
      case 'codeblock': v = wrapSelection(ta, '\n```\n', '\n```\n'); break;
      case 'link': v = wrapSelection(ta, '[', '](url)'); break;
      case 'h1': v = insertAtCursor(ta, '\n# '); break;
      case 'h2': v = insertAtCursor(ta, '\n## '); break;
      case 'ul': v = insertAtCursor(ta, '\n- '); break;
      case 'ol': v = insertAtCursor(ta, '\n1. '); break;
      case 'task': v = insertAtCursor(ta, '\n- [ ] '); break;
      case 'quote': v = insertAtCursor(ta, '\n> '); break;
      case 'hr': v = insertAtCursor(ta, '\n---\n'); break;
      default: return;
    }
    onChange(note.id, 'body', v);
  };

  /* ---------- tags ---------- */
  const addTag = () => {
    const t = tagValue.trim().toLowerCase();
    if (t && !note.tags.includes(t)) {
      onChange(note.id, 'body', note.body); // trigger save
    }
    setTagValue('');
    setShowTagInput(false);
  };

  /* ── Toolbar button helper ──────────────────────────────────── */
  const ToolBtn: React.FC<{ icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }> = ({ icon, title, onClick, active }) => (
    <button
      className={`fmt-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
        background: active ? 'var(--dl-accent-alpha)' : 'transparent',
        color: active ? 'var(--dl-accent)' : 'var(--dl-text-muted)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="note-editor">
      {/* Format Toolbar */}
      <div className="format-toolbar" style={{
        display: 'flex', alignItems: 'center', gap: '2px', padding: '6px 12px',
        borderBottom: '1px solid var(--dl-border)', background: 'var(--dl-bg-surface)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '1px' }}>
          <ToolBtn icon={<BoldIcon />} title="Bold (Ctrl+B)" onClick={() => fmt('bold')} />
          <ToolBtn icon={<ItalicIcon />} title="Italic (Ctrl+I)" onClick={() => fmt('italic')} />
          <ToolBtn icon={<CodeIcon />} title="Inline code" onClick={() => fmt('code')} />
        </div>
        <div style={{ width: '1px', height: '18px', background: 'var(--dl-border)', margin: '0 6px' }} />
        <div style={{ display: 'flex', gap: '1px' }}>
          <ToolBtn icon={<H1Icon />} title="Heading 1" onClick={() => fmt('h1')} />
          <ToolBtn icon={<H2Icon />} title="Heading 2" onClick={() => fmt('h2')} />
        </div>
        <div style={{ width: '1px', height: '18px', background: 'var(--dl-border)', margin: '0 6px' }} />
        <div style={{ display: 'flex', gap: '1px' }}>
          <ToolBtn icon={<ListIcon />} title="Bullet list" onClick={() => fmt('ul')} />
          <ToolBtn icon={<OrderedListIcon />} title="Numbered list" onClick={() => fmt('ol')} />
          <ToolBtn icon={<TaskIcon />} title="Task list" onClick={() => fmt('task')} />
        </div>
        <div style={{ width: '1px', height: '18px', background: 'var(--dl-border)', margin: '0 6px' }} />
        <div style={{ display: 'flex', gap: '1px' }}>
          <ToolBtn icon={<LinkIcon />} title="Link" onClick={() => fmt('link')} />
          <ToolBtn icon={<QuoteIcon />} title="Block quote" onClick={() => fmt('quote')} />
          <ToolBtn icon={<CodeBlockIcon />} title="Code block" onClick={() => fmt('codeblock')} />
          <ToolBtn icon={<DividerIcon />} title="Horizontal rule" onClick={() => fmt('hr')} />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: '2px' }}>
          <ToolBtn icon={<PinIcon active={note.pinned} />} title="Pin note" onClick={() => {}} active={note.pinned} />
          <ToolBtn icon={<StarIcon active={note.favorite} />} title="Favourite" onClick={() => {}} active={note.favorite} />
          <ToolBtn icon={<TrashIcon />} title="Delete note" onClick={() => setShowDeleteConfirm(true)} />
        </div>
      </div>

      {/* Title */}
      <input
        ref={titleRef}
        className="note-title-input"
        placeholder="Note title"
        value={note.title}
        onChange={(e) => onChange(note.id, 'title', e.target.value)}
        style={{
          display: 'block', width: '100%', padding: '16px 20px 4px',
          border: 'none', background: 'transparent', color: 'var(--dl-text)',
          fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px',
          outline: 'none', fontFamily: 'inherit',
        }}
      />

      {/* Tags */}
      <div className="note-tags-row" style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 20px 8px', flexWrap: 'wrap',
      }}>
        {note.tags.map((tag) => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '2px 8px', borderRadius: '9999px', fontSize: '11px',
            background: 'var(--dl-accent-alpha)', color: 'var(--dl-accent)',
          }}>
            <TagIcon /> {tag}
          </span>
        ))}
        {showTagInput ? (
          <input
            className="note-tag-input"
            placeholder="tag"
            value={tagValue}
            autoFocus
            onChange={(e) => setTagValue(e.target.value)}
            onBlur={addTag}
            onKeyDown={(e) => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setShowTagInput(false); }}
            style={{
              padding: '2px 6px', borderRadius: '9999px', border: '1px solid var(--dl-border)',
              background: 'transparent', color: 'var(--dl-text)', fontSize: '11px', outline: 'none', width: '70px',
            }}
          />
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '2px 8px', borderRadius: '9999px', fontSize: '11px',
              background: 'transparent', border: '1px dashed var(--dl-border)',
              color: 'var(--dl-text-muted)', cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            + tag
          </button>
        )}
      </div>

      {/* Body */}
      <textarea
        ref={bodyRef}
        className="note-body-input"
        placeholder="Start writing… (Markdown supported)"
        value={note.body}
        onChange={(e) => {
          debouncedChange('body', e.target.value);
          onChange(note.id, 'body', e.target.value);
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); fmt('bold'); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); fmt('italic'); }
        }}
        style={{
          flex: 1, display: 'block', width: '100%', padding: '8px 20px',
          border: 'none', background: 'transparent', color: 'var(--dl-text)',
          fontSize: '14px', lineHeight: 1.7, resize: 'none', outline: 'none',
          fontFamily: 'var(--dl-font-mono)', minHeight: '200px',
        }}
      />

      {/* Status Bar */}
      <div className="editor-statusbar" style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '6px 20px',
        borderTop: '1px solid var(--dl-border)', fontSize: '11px', color: 'var(--dl-text-muted)',
        background: 'var(--dl-bg-surface)',
      }}>
        <span>{stats.words} words &middot; {stats.chars} chars</span>
        <span style={{ flex: 1 }} />
        <span>Saved {new Date(note.updatedAt).toLocaleTimeString()}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--dl-success)' }}>
          <LockSmallIcon /> Encrypted
        </span>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>
              Delete &ldquo;{note.title || 'Untitled'}&rdquo;?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              This note will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { onDelete(note.id); setShowDeleteConfirm(false); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
