/**
 * Darklock Secure Notes — TopBar (Context-Aware)
 *
 * Adapts to the current screen:
 * - Workspace: minimal — breadcrumb, note search, tools toggle, lock
 * - Library/other: full nav with destinations
 */

import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Button, Badge, EncryptionBadge } from '@darklock/ui';
import { cryptoService } from '../services/crypto';

/* ── SVG Icons ────────────────────────────────────────────────── */
const BrandMark = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="tb-g" x1="4" y1="4" x2="44" y2="44">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#tb-g)" />
    <path d="M24 12v24M16 20h16M16 28h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3.5" y="7.5" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const ToolsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="2" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.1" />
    <rect x="7" y="2" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.1" />
    <rect x="11.5" y="2" width="2" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const TeamIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="10.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M10 13c0-1.5 1-2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const ChartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="8" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6" y="4" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    <rect x="10.5" y="2" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M2.5 4h10M5 4V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1M4 4l.5 8a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5L11 4"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchNavIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const ShareNavIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="4" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="11" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="11" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M5.8 6.6l3.4-2.2M5.8 8.4l3.4 2.2" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SyncNavIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M10.5 3L13 5.5 10.5 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 5.5h11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M4.5 12L2 9.5 4.5 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 9.5H2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────── */
export const TopBar: React.FC = () => {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const storageMode = useAppStore((s) => s.storageMode);
  const lockApp = useAppStore((s) => s.lockApp);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);
  const toggleToolsSidebar = useAppStore((s) => s.toggleToolsSidebar);
  const activeSectionId = useAppStore((s) => s.activeSectionId);
  const sections = useAppStore((s) => s.sections);

  const handleLock = () => {
    cryptoService.lock();
    lockApp();
  };

  const isWorkspace = screen === 'workspace';
  const activeSection = sections.find((s) => s.id === activeSectionId);

  const SyncDot = () => {
    const colors: Record<string, string> = {
      synced: 'var(--dl-success)',
      syncing: 'var(--dl-info)',
      offline: 'var(--dl-text-muted)',
      error: 'var(--dl-danger)',
    };
    const labels: Record<string, string> = {
      synced: 'Synced',
      syncing: 'Syncing...',
      offline: 'Offline',
      error: 'Sync Error',
    };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '11px', color: 'var(--dl-text-muted)',
        padding: '3px 10px', borderRadius: '9999px',
        background: 'var(--dl-bg-surface)',
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors[syncStatus],
          animation: syncStatus === 'syncing' ? 'dl-pulse 1.5s infinite' : 'none',
        }} />
        {labels[syncStatus]}
      </div>
    );
  };

  /* ── Workspace TopBar: minimal, focused ──────────────────── */
  if (isWorkspace) {
    return (
      <header className="topbar topbar--workspace">
        <div className="topbar-left">
          <button className="topbar-back-btn" onClick={() => setScreen('library')} title="Back to Library">
            <BackIcon />
          </button>
          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-root" onClick={() => setScreen('library')}>Library</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-current">{activeSection?.name || 'Notes'}</span>
          </div>
        </div>

        <div className="topbar-center">
          <button className="topbar-search" onClick={toggleCommandPalette}>
            <SearchIcon />
            <span className="topbar-search-text">Search notes…</span>
            <kbd className="topbar-search-kbd">Ctrl+K</kbd>
          </button>
        </div>

        <div className="topbar-right">
          {storageMode === 'cloud' && <SyncDot />}
          <EncryptionBadge />
          <Button variant="ghost" size="sm" onClick={toggleToolsSidebar} tooltip="Toggle tools panel">
            <ToolsIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLock} tooltip="Lock vault">
            <LockIcon />
          </Button>
        </div>
      </header>
    );
  }

  /* ── Default TopBar: full navigation ─────────────────────── */
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo" onClick={() => setScreen('library')}>
          <BrandMark />
          <span className="topbar-brand">Darklock</span>
        </div>

        <nav className="topbar-nav">
          <button
            className={`topbar-nav-item ${screen === 'library' ? 'active' : ''}`}
            onClick={() => setScreen('library')}
          >
            <LibraryIcon /> Library
          </button>
          <button
            className={`topbar-nav-item ${screen === 'search' ? 'active' : ''}`}
            onClick={() => setScreen('search')}
          >
            <SearchNavIcon /> Search
          </button>
          <button
            className={`topbar-nav-item ${screen === 'sharing' ? 'active' : ''}`}
            onClick={() => setScreen('sharing')}
          >
            <ShareNavIcon /> Sharing
          </button>
          <button
            className={`topbar-nav-item ${screen === 'sync' ? 'active' : ''}`}
            onClick={() => setScreen('sync')}
          >
            <SyncNavIcon /> Sync
          </button>
          <button
            className={`topbar-nav-item ${screen === 'charts' ? 'active' : ''}`}
            onClick={() => setScreen('charts')}
          >
            <ChartIcon /> Charts
          </button>
          <button
            className={`topbar-nav-item ${screen === 'trash' ? 'active' : ''}`}
            onClick={() => setScreen('trash')}
          >
            <TrashIcon /> Trash
          </button>
        </nav>
      </div>

      <div className="topbar-center">
        <button className="topbar-search" onClick={toggleCommandPalette}>
          <SearchIcon />
          <span className="topbar-search-text">Search or command...</span>
          <kbd className="topbar-search-kbd">Ctrl+K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        {storageMode === 'cloud' && <SyncDot />}
        <EncryptionBadge />
        <Button variant="ghost" size="sm" onClick={() => setScreen('settings')} tooltip="Settings">
          <SettingsIcon />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLock} tooltip="Lock vault">
          <LockIcon />
        </Button>
      </div>
    </header>
  );
};
