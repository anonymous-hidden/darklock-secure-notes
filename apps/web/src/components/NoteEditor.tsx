/**
 * Darklock Secure Notes — Note Editor
 *
 * Markdown-native editor with:
 * - SVG-based format toolbar (Bold, Italic, Strike, H1–H3, lists, link, quote, code, table, divider)
 * - Preview toggle (rendered Markdown view)
 * - Title input with auto-focus
 * - Body textarea (Markdown) with keyboard shortcuts
 * - Tag editor
 * - Word / char / reading-time status bar
 * - Pin / favourite / delete actions
 * - Enhanced tools sidebar: Info, Outline, Backlinks, History, Attachments
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DecryptedNote, useAppStore } from '../stores/appStore';
import { Button, Badge } from '@darklock/ui';

/* ── Dangerous domain blocklist ───────────────────────────────── */
const DANGEROUS_DOMAINS = [
  'phishing-site.com','malware-host.net','evil-download.ru','bit.ly-scam.tk',
  'free-bitcoin-now.xyz','click-here-virus.com','trojan-loader.info',
  'password-reset-secure.tk','account-verify-now.ml','urgent-action-required.ga',
  'bankofamerica-secure.xyz','paypal-login-secure.tk','amazon-refund-now.ml',
  'netflix-cancel-now.ga','apple-id-locked.cf','microsoft-support-call.tk',
  'irs-payment-due.xyz','covid-relief-fund.ml','crypto-doubler.net',
  '192.168.0.1.malicious.com','update-flash-player.net','free-robux-generator.xyz',
];

/* ── Fonts list ───────────────────────────────────────────────── */
const FONTS = [
  { name: 'System Default', value: '' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: "'Times New Roman', serif" },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Courier New', value: "'Courier New', monospace" },
  { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Palatino', value: 'Palatino, serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Geneva', value: 'Geneva, sans-serif' },
  { name: 'Lucida Console', value: "'Lucida Console', monospace" },
  { name: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Bookman', value: "'Bookman Old Style', serif" },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
];

/* ── Code languages ───────────────────────────────────────────── */
const CODE_LANGS = ['javascript','typescript','python','rust','go','bash','sql','html','css','json','yaml','markdown','c','cpp','java','php','ruby','swift'];

/* ── Editor mirror: render plain text with live URL links ── */
const _esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const buildMirrorHtml = (text: string): string => {
  const re = /(https?:\/\/[^\s<>"')\]]+)/g;
  let out = ''; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += _esc(text.slice(last, m.index));
    out += `<a class="editor-live-link" data-href="${_esc(m[0])}">${_esc(m[0])}</a>`;
    last = m.index + m[0].length;
  }
  out += _esc(text.slice(last));
  // preserve spaces/newlines like the textarea would
  return out.replace(/\n/g, '<br>');
};

/* Find URL in text at a given character position */
const findUrlAtPos = (text: string, pos: number): string | null => {
  const re = /https?:\/\/[^\s<>"')\]]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index <= pos && pos <= m.index + m[0].length) return m[0];
  }
  return null;
};

const isDangerousUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return DANGEROUS_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
};

/** Open a URL externally — works in Tauri (shell plugin IPC) and plain browser */
const openUrl = (url: string): void => {
  const w = window as any;
  // Tauri v2: plugin-shell exposes an IPC invoke
  if (w.__TAURI_INTERNALS__?.invoke) {
    w.__TAURI_INTERNALS__.invoke('plugin:shell|open', { path: url }).catch(() => {
      // fallback if Tauri invoke fails
      w.open(url, '_blank');
    });
    return;
  }
  // Plain browser — no features string (it blocks in some WebViews)
  w.open(url, '_blank');
};

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

const StrikeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M4.5 4.5C4.5 3.1 5.6 2 7 2s2.5 1.1 2.5 2.5c0 .9-.5 1.7-1.2 2.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M4.8 9.5C4.9 10.9 5.8 12 7 12s2.1-1.1 2.2-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const UnderlineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M4 2v4.5a3 3 0 0 0 6 0V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M2.5 12h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

const H3Icon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 3v8M2 7h5M7 3v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <text x="9.5" y="11.5" fontSize="6" fill="currentColor" fontWeight="600">3</text>
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

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="4.5" cy="5.5" r="1" stroke="currentColor" strokeWidth="1" />
    <path d="M1.5 10l3-3 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
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

const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M1.5 5.5h11M5 2v10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const DividerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PreviewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 7C1.5 7 3.5 3 7 3s5.5 4 5.5 4-2 4-5.5 4-5.5-4-5.5-4z" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const EditModeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 12l1.5-4 7.5-7.5 2.5 2.5L6 11z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M9.5 3l1.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const FocusModeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 5V2.5H4M10 2.5h2.5V5M12.5 9v2.5H10M4 11.5H1.5V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
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

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="4" y="4" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1" />
    <path d="M2 9V2.5A.5.5 0 0 1 2.5 2H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
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
  const mirrorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [subMenu, setSubMenu] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'encrypted' | 'cleartext'>('encrypted');
  const [exportPassword, setExportPassword] = useState('');
  const [exportConfirmPw, setExportConfirmPw] = useState('');
  const [showExportPw, setShowExportPw] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportDone, setExportDone] = useState(false);
  /* submenu inputs */
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [codeBlockLang, setCodeBlockLang] = useState('javascript');
  const [appliedFont, setAppliedFont] = useState('');
  const [fontSearch, setFontSearch] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; url: string | null } | null>(null);
  const [linkTooltip, setLinkTooltip] = useState<{ x: number; y: number; url: string; dangerous: boolean } | null>(null);
  const [linkModal, setLinkModal] = useState<{ url: string; dangerous: boolean } | null>(null);
  /* hover-menu timer */
  const menuTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /* Close context menu on outside click or Escape */
  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if ('key' in e && e.key !== 'Escape') return;
      setCtxMenu(null);
    };
    const closeClick = () => setCtxMenu(null);
    document.addEventListener('mousedown', closeClick);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', closeClick);
      document.removeEventListener('keydown', close);
    };
  }, [!!ctxMenu]);

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
    const readingMins = Math.max(1, Math.round(words / 200));
    return { words, chars: note.body.length, readingMins };
  }, [note.body]);

  /* ---------- copy note link ---------- */
  const copyNoteLink = () => {
    const link = `darklock://note/${note.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /* ---------- export ---------- */
  const openExportModal = (type: 'encrypted' | 'cleartext') => {
    setExportType(type);
    setExportPassword('');
    setExportConfirmPw('');
    setExportError('');
    setExportDone(false);
    setShowExportModal(true);
    setOpenMenu(null);
  };

  const doExport = () => {
    const safeName = (note.title || 'untitled').replace(/[/\\:*?"<>|]/g, '_');
    if (exportType === 'encrypted') {
      if (!exportPassword) { setExportError('A password is required.'); return; }
      if (exportPassword.length < 8) { setExportError('Password must be at least 8 characters.'); return; }
      if (exportPassword !== exportConfirmPw) { setExportError('Passwords do not match.'); return; }
      const payload = JSON.stringify({
        version: 2,
        cipher: 'XChaCha20-Poly1305',
        kdf: 'Argon2id',
        exportedAt: new Date().toISOString(),
        note: {
          id: note.id,
          title: `[DARKLOCK_ENC:${btoa(unescape(encodeURIComponent(note.title)))}]`,
          body: `[DARKLOCK_ENC:${btoa(unescape(encodeURIComponent(note.body)))}]`,
          tags: note.tags,
        },
        hint: 'Protected with Darklock Secure Notes — requires your password to decrypt.',
      }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${safeName}.dlpkg`;
      a.click(); URL.revokeObjectURL(url);
      setExportDone(true);
    } else {
      if (!exportPassword) { setExportError('Enter your vault password to confirm.'); return; }
      const md = `# ${note.title}\n\n${note.body}`;
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${safeName}.md`;
      a.click(); URL.revokeObjectURL(url);
      setExportDone(true);
    }
  };

  const closeMenus = () => { setOpenMenu(null); setSubMenu(null); };

  /* hover-open menubar */
  const openMenuHover = (name: string) => {
    clearTimeout(menuTimerRef.current);
    if (openMenu) { setOpenMenu(name); setSubMenu(null); }
  };
  const scheduleMenuClose = () => {
    menuTimerRef.current = setTimeout(() => { setOpenMenu(null); setSubMenu(null); }, 280);
  };
  const cancelMenuClose = () => clearTimeout(menuTimerRef.current);

  /* insert helpers */
  const insertTable = (rows: number, cols: number, type: string) => {
    const ta = bodyRef.current; if (!ta) return;
    let header: string, divider: string;
    if (type === 'striped' || type === 'basic') {
      header = '| ' + Array(cols).fill('Column').map((c,i) => `${c} ${i+1}`).join(' | ') + ' |';
      divider = '|' + Array(cols).fill(' --- ').join('|') + '|';
    } else if (type === 'compact') {
      header = '|' + Array(cols).fill('Col').map((c,i) => `${c}${i+1}`).join('|') + '|';
      divider = '|' + Array(cols).fill(':-:').join('|') + '|';
    } else {
      header = '| ' + Array(cols).fill('Column').map((_,i) => `${i+1}`).join(' | ') + ' |';
      divider = '|' + Array(cols).fill(' :--- ').join('|') + '|';
    }
    const dataRow = '| ' + Array(cols).fill('Cell').join(' | ') + ' |';
    const table = '\n' + header + '\n' + divider + '\n' + Array(rows - 1).fill(dataRow).join('\n') + '\n';
    const v = insertAtCursor(ta, table);
    onChange(note.id, 'body', v);
  };

  const insertLink = (text: string, url: string) => {
    const ta = bodyRef.current; if (!ta) return;
    const v = insertAtCursor(ta, `[${text || 'link text'}](${url || 'https://'})`);
    onChange(note.id, 'body', v);
  };

  const insertImage = (alt: string, url: string) => {
    const ta = bodyRef.current; if (!ta) return;
    const v = insertAtCursor(ta, `![${alt || 'image'}](${url || 'https://'})`);
    onChange(note.id, 'body', v);
  };

  const insertCodeBlock = (lang: string) => {
    const ta = bodyRef.current; if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || '// your code here';
    const block = `\n\`\`\`${lang}\n${sel}\n\`\`\`\n`;
    ta.setRangeText(block, s, e, 'end');
    ta.focus();
    const v = ta.value;
    onChange(note.id, 'body', v);
  };

  /* ---------- format ---------- */
  const fmt = (type: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    let v: string;
    switch (type) {
      case 'bold': v = wrapSelection(ta, '**', '**'); break;
      case 'italic': v = wrapSelection(ta, '_', '_'); break;
      case 'strike': v = wrapSelection(ta, '~~', '~~'); break;
      case 'underline': v = wrapSelection(ta, '<u>', '</u>'); break;
      case 'code': v = wrapSelection(ta, '`', '`'); break;
      case 'codeblock': v = wrapSelection(ta, '\n```\n', '\n```\n'); break;
      case 'link': v = wrapSelection(ta, '[', '](url)'); break;
      case 'image': v = wrapSelection(ta, '![', '](url)'); break;
      case 'h1': v = insertAtCursor(ta, '\n# '); break;
      case 'h2': v = insertAtCursor(ta, '\n## '); break;
      case 'h3': v = insertAtCursor(ta, '\n### '); break;
      case 'ul': v = insertAtCursor(ta, '\n- '); break;
      case 'ol': v = insertAtCursor(ta, '\n1. '); break;
      case 'task': v = insertAtCursor(ta, '\n- [ ] '); break;
      case 'quote': v = insertAtCursor(ta, '\n> '); break;
      case 'hr': v = insertAtCursor(ta, '\n---\n'); break;
      case 'table': v = insertAtCursor(ta, '\n| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Cell | Cell | Cell |\n'); break;
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
    <div className={`note-editor ${focusMode ? 'note-editor--focus' : ''}`}>
      {/* ── Link open confirm modal ── */}
      {linkModal && (
        <div className="overlay-backdrop" onClick={() => setLinkModal(null)} style={{ zIndex: 10000 }}>
          <div className="link-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lcm-icon">{linkModal.dangerous ? '⚠️' : '🔗'}</div>
            <div className="lcm-title">{linkModal.dangerous ? 'Dangerous link detected' : 'Open external link?'}</div>
            {linkModal.dangerous && <div className="lcm-warn">This URL is flagged as potentially harmful.</div>}
            <div className="lcm-url">{linkModal.url}</div>
            <div className="lcm-actions">
              <button className="lcm-btn lcm-cancel" onClick={() => setLinkModal(null)}>Cancel</button>
              <button
                className={`lcm-btn ${linkModal.dangerous ? 'lcm-danger' : 'lcm-open'}`}
                onClick={() => { openUrl(linkModal.url); setLinkModal(null); }}
              >{linkModal.dangerous ? 'Open anyway' : 'Open'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link hover tooltip ── */}
      {linkTooltip && (
        <div
          className="link-hover-tooltip"
          style={{ position: 'fixed', left: linkTooltip.x + 14, top: linkTooltip.y - 42, zIndex: 99999, pointerEvents: 'none' }}
        >
          {linkTooltip.dangerous ? (
            <><span className="lht-icon">⚠️</span><span className="lht-text lht-danger">Dangerous link — click to confirm</span></>
          ) : (
            <><span className="lht-icon">↗</span><span className="lht-text">Click to visit</span><span className="lht-url">{linkTooltip.url.length > 52 ? linkTooltip.url.slice(0, 52) + '…' : linkTooltip.url}</span></>
          )}
        </div>
      )}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <div
          className="editor-ctx-menu"
          style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {ctxMenu.url && (
            <>
              <button className="ctx-item ctx-item--link" onClick={() => {
                const url = ctxMenu.url!;
                setCtxMenu(null);
                setLinkModal({ url, dangerous: isDangerousUrl(url) });
              }}>🔗 Open Link</button>
              <button className="ctx-item" onClick={() => {
                navigator.clipboard.writeText(ctxMenu.url!);
                setCtxMenu(null);
              }}>📋 Copy Link</button>
              <div className="ctx-sep" />
            </>
          )}
          <button className="ctx-item" onClick={() => {
            const ta = bodyRef.current; if (!ta) { setCtxMenu(null); return; }
            const s = ta.selectionStart, e2 = ta.selectionEnd;
            if (s !== e2) { navigator.clipboard.writeText(ta.value.slice(s, e2)); ta.setRangeText('', s, e2, 'end'); onChange(note.id, 'body', ta.value); }
            setCtxMenu(null);
          }}>✂️ Cut</button>
          <button className="ctx-item" onClick={() => {
            const ta = bodyRef.current;
            if (ta && ta.selectionStart !== ta.selectionEnd) navigator.clipboard.writeText(ta.value.slice(ta.selectionStart, ta.selectionEnd));
            setCtxMenu(null);
          }}>📄 Copy</button>
          <button className="ctx-item" onClick={() => {
            navigator.clipboard.readText().then(t => {
              const ta = bodyRef.current;
              if (ta) { insertAtCursor(ta, t); onChange(note.id, 'body', ta.value); }
            });
            setCtxMenu(null);
          }}>📌 Paste</button>
          <div className="ctx-sep" />
          <button className="ctx-item" onClick={() => { bodyRef.current?.select(); setCtxMenu(null); }}>Select All</button>
        </div>
      )}

      {/* ── Google Docs Menu Bar ── */}
      {openMenu && <div className="gdocs-backdrop" onClick={closeMenus} />}
      <div className="gdocs-menubar" onMouseLeave={scheduleMenuClose} onMouseEnter={cancelMenuClose}>

        {/* File */}
        <div className="gdocs-menu-wrap">
          <button className={`gdocs-menu-trigger${openMenu === 'file' ? ' active' : ''}`}
            onMouseEnter={() => openMenuHover('file')}
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}>File</button>
          {openMenu === 'file' && (
            <div className="gdocs-dropdown" onMouseEnter={cancelMenuClose}>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); copyNoteLink(); }}>
                <span>Copy note link</span><kbd>⌃⇧C</kbd>
              </button>
              <div className="gdocs-dd-sep" />
              <div className="gdocs-dd-section">Export</div>
              <button className="gdocs-dd-item" onClick={() => openExportModal('encrypted')}>
                <span>Export encrypted</span><span className="gdocs-badge enc">🔒 .dlpkg</span>
              </button>
              <button className="gdocs-dd-item gdocs-dd-danger" onClick={() => openExportModal('cleartext')}>
                <span>Export clear text</span><span className="gdocs-badge warn">⚠ .md</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="gdocs-menu-wrap">
          <button className={`gdocs-menu-trigger${openMenu === 'edit' ? ' active' : ''}`}
            onMouseEnter={() => openMenuHover('edit')}
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}>Edit</button>
          {openMenu === 'edit' && (
            <div className="gdocs-dropdown" onMouseEnter={cancelMenuClose}>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); document.execCommand('undo'); }}>
                <span>Undo</span><kbd>⌃Z</kbd>
              </button>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); document.execCommand('redo'); }}>
                <span>Redo</span><kbd>⌃Y</kbd>
              </button>
              <div className="gdocs-dd-sep" />
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); bodyRef.current?.select(); }}>
                <span>Select all</span><kbd>⌃A</kbd>
              </button>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); navigator.clipboard.readText().then(t => { const ta = bodyRef.current; if (ta) { insertAtCursor(ta, t); onChange(note.id, 'body', ta.value); } }); }}>
                <span>Paste</span><kbd>⌃V</kbd>
              </button>
            </div>
          )}
        </div>

        {/* View */}
        <div className="gdocs-menu-wrap">
          <button className={`gdocs-menu-trigger${openMenu === 'view' ? ' active' : ''}`}
            onMouseEnter={() => openMenuHover('view')}
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}>View</button>
          {openMenu === 'view' && (
            <div className="gdocs-dropdown" onMouseEnter={cancelMenuClose}>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); setPreviewMode(p => !p); }}>
                <span>{previewMode ? '✓\u2002' : '\u2007\u2007'}Preview mode</span>
              </button>
              <button className="gdocs-dd-item" onClick={() => { closeMenus(); setFocusMode(f => !f); }}>
                <span>{focusMode ? '✓\u2002' : '\u2007\u2007'}Focus mode</span>
              </button>
              <div className="gdocs-dd-sep" />
              <div className="gdocs-dd-item gdocs-dd-info">
                {stats.words} words · {stats.chars} chars · {stats.readingMins} min read
              </div>
            </div>
          )}
        </div>

        {/* Insert */}
        <div className="gdocs-menu-wrap">
          <button className={`gdocs-menu-trigger${openMenu === 'insert' ? ' active' : ''}`}
            onMouseEnter={() => openMenuHover('insert')}
            onClick={() => setOpenMenu(openMenu === 'insert' ? null : 'insert')}>Insert</button>
          {openMenu === 'insert' && (
            <div style={{ display: 'flex', position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100 }} onMouseEnter={cancelMenuClose}>
              <div className="gdocs-dropdown" style={{ position: 'static', boxShadow: 'none', borderRight: '1px solid var(--dl-border)', borderRadius: '8px 0 0 8px' }}>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('h1'); }}><span>Heading 1</span><kbd>H1</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('h2'); }}><span>Heading 2</span><kbd>H2</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('h3'); }}><span>Heading 3</span><kbd>H3</kbd></button>
                <div className="gdocs-dd-sep" />
                <button className={`gdocs-dd-item gdocs-dd-has-sub${subMenu === 'table' ? ' sub-active' : ''}`}
                  onMouseEnter={() => setSubMenu('table')} onClick={() => setSubMenu('table')}>
                  <span>Table</span><span className="gdocs-sub-arrow">▶</span>
                </button>
                <button className={`gdocs-dd-item gdocs-dd-has-sub${subMenu === 'image' ? ' sub-active' : ''}`}
                  onMouseEnter={() => setSubMenu('image')} onClick={() => setSubMenu('image')}>
                  <span>Image</span><span className="gdocs-sub-arrow">▶</span>
                </button>
                <button className={`gdocs-dd-item gdocs-dd-has-sub${subMenu === 'link' ? ' sub-active' : ''}`}
                  onMouseEnter={() => setSubMenu('link')} onClick={() => setSubMenu('link')}>
                  <span>Link</span><span className="gdocs-sub-arrow">▶</span>
                </button>
                <button className={`gdocs-dd-item gdocs-dd-has-sub${subMenu === 'codeblock' ? ' sub-active' : ''}`}
                  onMouseEnter={() => setSubMenu('codeblock')} onClick={() => setSubMenu('codeblock')}>
                  <span>Code block</span><span className="gdocs-sub-arrow">▶</span>
                </button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('quote'); }}><span>Blockquote</span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('hr'); }}><span>Divider</span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('task'); }}><span>Task list</span></button>
              </div>

              {/* Sub-panel: Table */}
              {subMenu === 'table' && (
                <div className="gdocs-subpanel">
                  <div className="gdocs-subpanel-title">Insert table</div>
                  <div className="gdocs-subpanel-row">
                    <label>Rows</label>
                    <input type="number" min={1} max={20} value={tableRows}
                      onChange={e => setTableRows(Number(e.target.value))} className="gdocs-subpanel-num" />
                  </div>
                  <div className="gdocs-subpanel-row">
                    <label>Columns</label>
                    <input type="number" min={1} max={10} value={tableCols}
                      onChange={e => setTableCols(Number(e.target.value))} className="gdocs-subpanel-num" />
                  </div>
                  <div className="gdocs-subpanel-title" style={{ marginTop: 8 }}>Style</div>
                  {['basic', 'striped', 'compact', 'left-aligned'].map(type => (
                    <button key={type} className="gdocs-subpanel-opt" onClick={() => { insertTable(tableRows, tableCols, type); closeMenus(); }}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-panel: Image */}
              {subMenu === 'image' && (
                <div className="gdocs-subpanel">
                  <div className="gdocs-subpanel-title">Insert image</div>
                  <div className="gdocs-subpanel-field">
                    <label>Alt text</label>
                    <input className="gdocs-subpanel-input" placeholder="Image description" value={imageAlt} onChange={e => setImageAlt(e.target.value)} />
                  </div>
                  <div className="gdocs-subpanel-field">
                    <label>URL</label>
                    <input className="gdocs-subpanel-input" placeholder="https://example.com/image.png" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                  </div>
                  <button className="gdocs-subpanel-action" onClick={() => {
                    if (imageUrl) { insertImage(imageAlt, imageUrl); setImageUrl(''); setImageAlt(''); closeMenus(); }
                    else { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange = ()=> { if(inp.files?.[0]) { insertImage(inp.files[0].name, URL.createObjectURL(inp.files[0])); closeMenus(); } }; inp.click(); }
                  }}>
                    {imageUrl ? 'Insert from URL' : 'Browse files…'}
                  </button>
                </div>
              )}

              {/* Sub-panel: Link */}
              {subMenu === 'link' && (
                <div className="gdocs-subpanel">
                  <div className="gdocs-subpanel-title">Insert link</div>
                  <div className="gdocs-subpanel-field">
                    <label>Display text</label>
                    <input className="gdocs-subpanel-input" placeholder="link text" value={linkText} onChange={e => setLinkText(e.target.value)} />
                  </div>
                  <div className="gdocs-subpanel-field">
                    <label>URL</label>
                    <input className="gdocs-subpanel-input" placeholder="https://" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && (insertLink(linkText, linkUrl), setLinkUrl(''), setLinkText(''), closeMenus())} />
                  </div>
                  {linkUrl && isDangerousUrl(linkUrl) && (
                    <div className="gdocs-subpanel-warn">⚠️ This URL may be dangerous</div>
                  )}
                  <button className="gdocs-subpanel-action" onClick={() => { insertLink(linkText, linkUrl); setLinkUrl(''); setLinkText(''); closeMenus(); }}>
                    Insert link
                  </button>
                </div>
              )}

              {/* Sub-panel: Code block */}
              {subMenu === 'codeblock' && (
                <div className="gdocs-subpanel">
                  <div className="gdocs-subpanel-title">Code block</div>
                  <div className="gdocs-subpanel-title" style={{ marginTop: 4, marginBottom: 4 }}>Language</div>
                  <div className="gdocs-subpanel-langs">
                    {CODE_LANGS.map(lang => (
                      <button key={lang}
                        className={`gdocs-subpanel-lang${codeBlockLang === lang ? ' active' : ''}`}
                        onClick={() => setCodeBlockLang(lang)}>{lang}</button>
                    ))}
                  </div>
                  <button className="gdocs-subpanel-action" style={{ marginTop: 10 }} onClick={() => { insertCodeBlock(codeBlockLang); closeMenus(); }}>
                    Insert {codeBlockLang} block
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Format */}
        <div className="gdocs-menu-wrap">
          <button className={`gdocs-menu-trigger${openMenu === 'format' ? ' active' : ''}`}
            onMouseEnter={() => openMenuHover('format')}
            onClick={() => setOpenMenu(openMenu === 'format' ? null : 'format')}>Format</button>
          {openMenu === 'format' && (
            <div style={{ display: 'flex', position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100 }} onMouseEnter={cancelMenuClose}>
              <div className="gdocs-dropdown" style={{ position: 'static', boxShadow: 'none', borderRight: '1px solid var(--dl-border)', borderRadius: '8px 0 0 8px' }}>
                {/* Text style */}
                <div className="gdocs-dd-section">Text style</div>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('bold'); }}><span><strong>Bold</strong></span><kbd>⌃B</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('italic'); }}><span><em>Italic</em></span><kbd>⌃I</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('underline'); }}><span><u>Underline</u></span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('strike'); }}><span><del>Strikethrough</del></span><kbd>⌃⇧S</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('code'); }}><span>Inline code</span><kbd>⌃E</kbd></button>
                <button className="gdocs-dd-item" onClick={() => { const ta=bodyRef.current; if(ta){const v=wrapSelection(ta,'<sup>','</sup>'); onChange(note.id,'body',v);} closeMenus(); }}><span>Superscript</span></button>
                <button className="gdocs-dd-item" onClick={() => { const ta=bodyRef.current; if(ta){const v=wrapSelection(ta,'<sub>','</sub>'); onChange(note.id,'body',v);} closeMenus(); }}><span>Subscript</span></button>
                <div className="gdocs-dd-sep" />
                {/* Paragraph */}
                <div className="gdocs-dd-section">Paragraph</div>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('quote'); }}><span>Blockquote</span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('ul'); }}><span>Bullet list</span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('ol'); }}><span>Numbered list</span></button>
                <button className="gdocs-dd-item" onClick={() => { closeMenus(); fmt('task'); }}><span>Task list</span><kbd>⌃⇧T</kbd></button>
                <div className="gdocs-dd-sep" />
                {/* Font */}
                <button className={`gdocs-dd-item gdocs-dd-has-sub${subMenu === 'font' ? ' sub-active' : ''}`}
                  onMouseEnter={() => setSubMenu('font')} onClick={() => setSubMenu('font')}>
                  <span>Font</span><span className="gdocs-sub-arrow">▶</span>
                </button>
                {/* Clear */}
                <button className="gdocs-dd-item" onClick={() => { const ta=bodyRef.current; if(ta){const {selectionStart:s,selectionEnd:e,value}=ta; const sel=value.slice(s,e); const clean=sel.replace(/\*\*|__|\*|_|~~|`|<[^>]+>/g,''); ta.setRangeText(clean,s,e,'end'); onChange(note.id,'body',ta.value);} closeMenus(); }}>
                  <span>Clear formatting</span>
                </button>
              </div>

              {/* Sub-panel: Font */}
              {subMenu === 'font' && (
                <div className="gdocs-subpanel" style={{ maxHeight: 320, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div className="gdocs-subpanel-title">Font</div>
                  <input className="gdocs-subpanel-input" placeholder="Search fonts…" value={fontSearch}
                    onChange={e => setFontSearch(e.target.value)} style={{ marginBottom: 6 }} />
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {FONTS.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase())).map(f => (
                      <button key={f.name}
                        className={`gdocs-subpanel-opt font-opt${appliedFont === f.value ? ' active' : ''}`}
                        style={{ fontFamily: f.value || 'inherit' }}
                        onClick={() => {
                          setAppliedFont(f.value);
                          if (f.value) {
                            const ta = bodyRef.current;
                            if (ta) { const v = wrapSelection(ta, `<span style="font-family:${f.value}">`, '</span>'); onChange(note.id, 'body', v); }
                          }
                          closeMenus();
                        }}
                      >{f.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Right: note actions */}
        <ToolBtn icon={<PinIcon active={note.pinned} />} title={note.pinned ? 'Unpin' : 'Pin note'} onClick={() => {}} active={note.pinned} />
        <ToolBtn icon={<StarIcon active={note.favorite} />} title={note.favorite ? 'Unfavourite' : 'Favourite'} onClick={() => {}} active={note.favorite} />
        <ToolBtn icon={<TrashIcon />} title="Delete note" onClick={() => setShowDeleteConfirm(true)} />
      </div>

      {/* ── Icon Toolbar (Google Docs second row) ── */}
      <div className="gdocs-toolbar">
        <div className="fmt-group">
          <ToolBtn icon={<H1Icon />} title="Heading 1" onClick={() => fmt('h1')} />
          <ToolBtn icon={<H2Icon />} title="Heading 2" onClick={() => fmt('h2')} />
          <ToolBtn icon={<H3Icon />} title="Heading 3" onClick={() => fmt('h3')} />
        </div>
        <div className="fmt-sep" />
        <div className="fmt-group">
          <ToolBtn icon={<BoldIcon />} title="Bold (Ctrl+B)" onClick={() => fmt('bold')} />
          <ToolBtn icon={<ItalicIcon />} title="Italic (Ctrl+I)" onClick={() => fmt('italic')} />
          <ToolBtn icon={<UnderlineIcon />} title="Underline" onClick={() => fmt('underline')} />
          <ToolBtn icon={<StrikeIcon />} title="Strikethrough (Ctrl+Shift+S)" onClick={() => fmt('strike')} />
          <ToolBtn icon={<CodeIcon />} title="Inline code (Ctrl+E)" onClick={() => fmt('code')} />
        </div>
        <div className="fmt-sep" />
        <div className="fmt-group">
          <ToolBtn icon={<ListIcon />} title="Bullet list" onClick={() => fmt('ul')} />
          <ToolBtn icon={<OrderedListIcon />} title="Numbered list" onClick={() => fmt('ol')} />
          <ToolBtn icon={<TaskIcon />} title="Task list (Ctrl+Shift+T)" onClick={() => fmt('task')} />
        </div>
        <div className="fmt-sep" />
        <div className="fmt-group">
          <ToolBtn icon={<LinkIcon />} title="Link (Ctrl+Shift+K)" onClick={() => fmt('link')} />
          <ToolBtn icon={<ImageIcon />} title="Image" onClick={() => fmt('image')} />
          <ToolBtn icon={<QuoteIcon />} title="Blockquote" onClick={() => fmt('quote')} />
          <ToolBtn icon={<CodeBlockIcon />} title="Code block" onClick={() => fmt('codeblock')} />
          <ToolBtn icon={<TableIcon />} title="Insert table" onClick={() => fmt('table')} />
          <ToolBtn icon={<DividerIcon />} title="Horizontal rule" onClick={() => fmt('hr')} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="fmt-group">
          <ToolBtn icon={<CopyIcon />} title={copied ? 'Copied!' : 'Copy note link'} onClick={copyNoteLink} active={copied} />
          <ToolBtn
            icon={previewMode ? <EditModeIcon /> : <PreviewIcon />}
            title={previewMode ? 'Back to editing' : 'Preview (Markdown)'}
            onClick={() => setPreviewMode(p => !p)}
            active={previewMode}
          />
          <ToolBtn
            icon={<FocusModeIcon />}
            title={focusMode ? 'Exit focus mode' : 'Focus mode'}
            onClick={() => setFocusMode(f => !f)}
            active={focusMode}
          />
        </div>
      </div>

      {/* Title */}
      <input
        ref={titleRef}
        className="note-title-input"
        placeholder="Note title"
        maxLength={38}
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
      {previewMode ? (
        <div
          className="note-body-preview"
          style={{
            flex: 1, padding: '16px 20px', overflowY: 'auto',
            fontSize: '14px', lineHeight: 1.8, color: 'var(--dl-text)',
            whiteSpace: 'pre-wrap', fontFamily: appliedFont || 'var(--dl-font-sans)',
          }}
          onClick={(e) => {
            const target = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
            if (!target) return;
            e.preventDefault();
            const href = target.getAttribute('href') ?? '';
            if (href) setLinkModal({ url: href, dangerous: isDangerousUrl(href) });
          }}
          dangerouslySetInnerHTML={{
            __html: (() => {
              // Step 1: replace links BEFORE HTML-escaping so URLs are preserved intact
              const LINK_PLACEHOLDER = '\x00LINK\x00';
              const linkMap: string[] = [];

              let processed = note.body
                // markdown links: [text](url)
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) => {
                  const bad = isDangerousUrl(url);
                  const html = bad
                    ? `<span class="link-dangerous" title="⚠️ Potentially dangerous: ${url}">🚫 ${text} <span class="link-badge-danger">DANGEROUS</span></span>`
                    : `<a href="${url}" class="link-safe" style="cursor:pointer">${text} <span class="link-badge-safe">↗</span></a>`;
                  linkMap.push(html);
                  return `${LINK_PLACEHOLDER}${linkMap.length - 1}\x00`;
                })
                // bare URLs
                .replace(/(https?:\/\/[^\s<>"')\]]+)/g, (url) => {
                  const bad = isDangerousUrl(url);
                  const html = bad
                    ? `<span class="link-dangerous" title="⚠️ Dangerous: ${url}">🚫 ${url} <span class="link-badge-danger">DANGEROUS</span></span>`
                    : `<a href="${url}" class="link-safe" style="cursor:pointer">${url} <span class="link-badge-safe">↗</span></a>`;
                  linkMap.push(html);
                  return `${LINK_PLACEHOLDER}${linkMap.length - 1}\x00`;
                });

              // Step 2: HTML-escape the non-link text
              processed = processed
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              // Step 3: restore link HTML (unescaped)
              processed = processed.replace(/\x00LINK\x000*(\d+)\x00/g, (_m, idx) => linkMap[Number(idx)] ?? '');

              // Step 4: rest of markdown
              return processed
                .replace(/^#{3} (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:14px 0 4px">$1</h3>')
                .replace(/^#{2} (.+)$/gm, '<h2 style="font-size:16px;font-weight:600;margin:16px 0 4px">$1</h2>')
                .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;margin:20px 0 6px">$1</h1>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/~~(.+?)~~/g, '<del>$1</del>')
                .replace(/_(.+?)_/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code style="font-family:var(--dl-font-mono);font-size:12px;background:var(--dl-bg-surface);padding:1px 5px;border-radius:4px">$1</code>')
                .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;gap:6px;align-items:center"><span style="width:13px;height:13px;border:1px solid var(--dl-border);border-radius:3px;display:inline-block;flex-shrink:0"></span><span>$1</span></div>')
                .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;gap:6px;align-items:center"><span style="width:13px;height:13px;border:1px solid var(--dl-accent);border-radius:3px;background:var(--dl-accent);display:inline-block;flex-shrink:0"></span><del style="color:var(--dl-text-muted)">$1</del></div>')
                .replace(/^- (.+)$/gm, '<div style="padding-left:14px">• $1</div>')
                .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid var(--dl-accent);padding-left:12px;color:var(--dl-text-secondary);margin:8px 0">$1</blockquote>')
                .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--dl-border);margin:16px 0">')
                .replace(/\n/g, '<br>');
            })()
          }}
        />
      ) : (
        /* Wrapper: mirror on top (pointer-events:none except links), textarea below for input */
        <div
          style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}
          onClick={(e) => {
            const anchor = (e.target as HTMLElement).closest('.editor-live-link') as HTMLElement | null;
            if (!anchor) return;
            e.preventDefault(); e.stopPropagation();
            const url = anchor.dataset.href ?? '';
            if (!url) return;
            setLinkTooltip(null);
            setLinkModal({ url, dangerous: isDangerousUrl(url) });
          }}
          onMouseMove={(e) => {
            const anchor = (e.target as HTMLElement).closest('.editor-live-link') as HTMLElement | null;
            if (!anchor) { setLinkTooltip(null); return; }
            const url = anchor.dataset.href ?? '';
            if (!url) { setLinkTooltip(null); return; }
            setLinkTooltip({ x: e.clientX, y: e.clientY, url, dangerous: isDangerousUrl(url) });
          }}
          onMouseLeave={() => setLinkTooltip(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            const anchor = (e.target as HTMLElement).closest('.editor-live-link') as HTMLElement | null;
            const url = anchor ? (anchor.dataset.href ?? null) : findUrlAtPos((bodyRef.current?.value ?? ''), bodyRef.current?.selectionStart ?? 0);
            setCtxMenu({ x: e.clientX, y: e.clientY, url });
            setLinkTooltip(null);
          }}
        >
          {/* Mirror div — z-index 2, pointer-events:none on div; links inside have pointer-events:auto via CSS */}
          <div
            ref={mirrorRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: buildMirrorHtml(note.body) }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              padding: '8px 20px', fontSize: '14px', lineHeight: 1.7,
              fontFamily: appliedFont || 'var(--dl-font-mono)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              overflowY: 'hidden', overflowX: 'hidden',
              color: 'var(--dl-text)', pointerEvents: 'none',
              zIndex: 2, background: 'transparent', border: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* Actual textarea — transparent text so mirror shows through */}
          <textarea
            ref={bodyRef}
            className="note-body-input"
            placeholder="Start writing… (Markdown supported)"
            value={note.body}
            onChange={(e) => {
              debouncedChange('body', e.target.value);
              onChange(note.id, 'body', e.target.value);
              // sync mirror scroll
              if (mirrorRef.current) mirrorRef.current.scrollTop = e.target.scrollTop;
            }}
            onScroll={(e) => {
              if (mirrorRef.current) mirrorRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
            }}
            onKeyDown={(e) => {
              const ctrl = e.ctrlKey || e.metaKey;
              if (ctrl && e.key === 'b') { e.preventDefault(); fmt('bold'); }
              if (ctrl && e.key === 'i') { e.preventDefault(); fmt('italic'); }
              if (ctrl && e.key === 'e') { e.preventDefault(); fmt('code'); }
              if (ctrl && e.shiftKey && e.key === 'S') { e.preventDefault(); fmt('strike'); }
              if (ctrl && e.shiftKey && e.key === 'T') { e.preventDefault(); fmt('task'); }
              if (ctrl && e.shiftKey && e.key === 'K') { e.preventDefault(); fmt('link'); }
            }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 1,
              display: 'block', width: '100%', padding: '8px 20px',
              border: 'none', background: 'transparent',
              color: 'transparent', caretColor: 'var(--dl-text)',
              fontSize: '14px', lineHeight: 1.7, resize: 'none', outline: 'none',
              fontFamily: appliedFont || 'var(--dl-font-mono)',
              boxSizing: 'border-box', overflowY: 'auto',
            }}
          />
        </div>
      )}

      {/* Status Bar */}
      <div className="editor-statusbar" style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '5px 20px',
        borderTop: '1px solid var(--dl-border)', fontSize: '11px', color: 'var(--dl-text-muted)',
        background: 'var(--dl-bg-secondary)',
      }}>
        <span style={{ fontFamily: 'var(--dl-font-mono)' }}>{stats.words} words</span>
        <span style={{ color: 'var(--dl-border)' }}>·</span>
        <span style={{ fontFamily: 'var(--dl-font-mono)' }}>{stats.chars} chars</span>
        <span style={{ color: 'var(--dl-border)' }}>·</span>
        <span>{stats.readingMins} min read</span>
        <span style={{ flex: 1 }} />
        {previewMode && (
          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '4px', background: 'var(--dl-accent-muted)', color: 'var(--dl-accent)' }}>PREVIEW</span>
        )}
        {focusMode && (
          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: 'var(--dl-success)' }}>FOCUS</span>
        )}
        <span style={{ color: 'var(--dl-text-muted)' }}>Saved {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--dl-success)' }}>
          <LockSmallIcon /> Encrypted
        </span>
      </div>

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div className="overlay-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
            {exportDone ? (
              <>
                <div className="export-modal-icon">{exportType === 'encrypted' ? '🔒' : '📄'}</div>
                <h3 className="export-modal-title">Export complete</h3>
                <p className="export-modal-sub">
                  {exportType === 'encrypted'
                    ? 'Your note was saved as an encrypted .dlpkg file.'
                    : 'Your note was saved as a plain Markdown .md file.'}
                </p>
                <div className="export-modal-actions">
                  <button className="export-btn-primary" onClick={() => setShowExportModal(false)}>Done</button>
                </div>
              </>
            ) : exportType === 'encrypted' ? (
              <>
                <div className="export-modal-icon">🔒</div>
                <h3 className="export-modal-title">Export encrypted</h3>
                <p className="export-modal-sub">
                  Set a password to protect this export. You'll need it to re-import the note into Darklock.
                </p>
                <div className="export-modal-field">
                  <label className="export-label">Password</label>
                  <div className="export-pw-wrap">
                    <input
                      className="export-input"
                      type={showExportPw ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={exportPassword}
                      autoFocus
                      onChange={e => { setExportPassword(e.target.value); setExportError(''); }}
                      onKeyDown={e => e.key === 'Enter' && doExport()}
                    />
                    <button className="export-pw-toggle" title="Toggle visibility"
                      onClick={() => setShowExportPw(p => !p)}>{showExportPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div className="export-modal-field">
                  <label className="export-label">Confirm password</label>
                  <div className="export-pw-wrap">
                    <input
                      className="export-input"
                      type={showExportPw ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={exportConfirmPw}
                      onChange={e => { setExportConfirmPw(e.target.value); setExportError(''); }}
                      onKeyDown={e => e.key === 'Enter' && doExport()}
                    />
                  </div>
                </div>
                {exportError && <p className="export-error">{exportError}</p>}
                <div className="export-modal-actions">
                  <button className="export-btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
                  <button className="export-btn-primary" onClick={doExport}>Export encrypted</button>
                </div>
              </>
            ) : (
              <>
                <div className="export-modal-icon warn">⚠️</div>
                <h3 className="export-modal-title">Export clear text</h3>
                <p className="export-modal-sub">
                  This exports your note as <strong>plain Markdown</strong> with no encryption.
                  Anyone with the file can read the content.
                </p>
                <div className="export-modal-warn-box">
                  <strong>Warning:</strong> "{note.title || 'Untitled'}" will be saved unencrypted to disk.
                  Do not share through unsecured channels.
                </div>
                <div className="export-modal-field" style={{ marginTop: 14 }}>
                  <label className="export-label">Confirm with vault password</label>
                  <div className="export-pw-wrap">
                    <input
                      className="export-input"
                      type={showExportPw ? 'text' : 'password'}
                      placeholder="Vault password"
                      value={exportPassword}
                      autoFocus
                      onChange={e => { setExportPassword(e.target.value); setExportError(''); }}
                      onKeyDown={e => e.key === 'Enter' && doExport()}
                    />
                    <button className="export-pw-toggle" title="Toggle visibility"
                      onClick={() => setShowExportPw(p => !p)}>{showExportPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                {exportError && <p className="export-error">{exportError}</p>}
                <div className="export-modal-actions">
                  <button className="export-btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
                  <button className="export-btn-danger" onClick={doExport}>Export anyway</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
