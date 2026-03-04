/**
 * Darklock Secure Notes — TopBar
 *
 * Sleek persistent header with gradient brand mark,
 * keyboard-shortcut search pill, sync status, and icon-based actions.
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

/* ── Component ─────────────────────────────────────────────────── */
export const TopBar: React.FC = () => {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const storageMode = useAppStore((s) => s.storageMode);
  const lockApp = useAppStore((s) => s.lockApp);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);
  const toggleToolsSidebar = useAppStore((s) => s.toggleToolsSidebar);

  const handleLock = () => {
    cryptoService.lock();
    lockApp();
  };

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
            Library
          </button>
          <button
            className={`topbar-nav-item ${screen === 'workspace' ? 'active' : ''}`}
            onClick={() => setScreen('workspace')}
          >
            Workspace
          </button>
          <button
            className={`topbar-nav-item ${screen === 'collaborators' ? 'active' : ''}`}
            onClick={() => setScreen('collaborators')}
          >
            Team
          </button>
          <button
            className={`topbar-nav-item ${screen === 'charts' ? 'active' : ''}`}
            onClick={() => setScreen('charts')}
          >
            Charts
          </button>
          <button
            className={`topbar-nav-item ${screen === 'trash' ? 'active' : ''}`}
            onClick={() => setScreen('trash')}
          >
            Trash
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

        {screen === 'workspace' && (
          <Button variant="ghost" size="sm" onClick={toggleToolsSidebar} tooltip="Toggle tools panel">
            <ToolsIcon />
          </Button>
        )}

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
