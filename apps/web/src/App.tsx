/**
 * Darklock Web — App Root
 *
 * Top-level router + global keyboard shortcut handler.
 */

import React, { useEffect, useCallback } from 'react';
import { useAppStore } from './stores/appStore';
import { SetupWizard } from './pages/SetupWizard';
import { UnlockScreen } from './pages/UnlockScreen';
import { Library } from './pages/Library';
import { Workspace } from './pages/Workspace';
import { Settings } from './pages/Settings';
import { Collaborators } from './pages/Collaborators';
import { Trash } from './pages/Trash';
import { Charts } from './pages/Charts';
import { Search } from './pages/Search';
import { Sharing } from './pages/Sharing';
import { Sync } from './pages/Sync';
import { CommandPalette } from '@darklock/ui';
import { cryptoService } from './services/crypto';

/* ------------------------------------------------------------------ */
/*  Command palette actions                                           */
/* ------------------------------------------------------------------ */
const buildCommands = (
  store: ReturnType<typeof useAppStore.getState>,
) => [
  { id: 'new-note', label: 'New Note', shortcut: 'Ctrl+N', action: () => { /* dispatched below */ } },
  { id: 'search', label: 'Search Notes', shortcut: 'Ctrl+Shift+F', action: () => store.setScreen('search') },
  { id: 'library', label: 'Go to Library', shortcut: 'Ctrl+L', action: () => store.setScreen('library') },
  { id: 'sharing', label: 'Manage Sharing', action: () => store.setScreen('sharing') },
  { id: 'sync', label: 'Sync Status', action: () => store.setScreen('sync') },
  { id: 'settings', label: 'Open Settings', action: () => store.setScreen('settings') },
  { id: 'lock', label: 'Lock Vault', shortcut: 'Ctrl+Shift+L', action: () => { cryptoService.lock(); store.lockApp(); } },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', action: () => store.toggleNav() },
  { id: 'toggle-tools', label: 'Toggle Tools Panel', action: () => store.toggleToolsSidebar() },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const App: React.FC = () => {
  const screen = useAppStore((s) => s.screen);
  const isLocked = useAppStore((s) => s.isLocked);
  const storageMode = useAppStore((s) => s.storageMode);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);

  /* ---------- Dev bypass (only in dev builds) ---------- */
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true') {
      const store = useAppStore.getState();
      store.setStorageMode('local');
      store.setAuthenticated(true);
      store.setLocked(false);
      store.setScreen('library');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Global keyboard shortcuts ---------- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Command palette
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Only when unlocked
      if (isLocked) return;

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        // Create new note — handled in workspace
        useAppStore.getState().setScreen('workspace');
      }

      if (ctrl && e.key === 'l') {
        e.preventDefault();
        useAppStore.getState().setScreen('library');
      }

      // Ctrl+Shift+L — Lock vault
      if (ctrl && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        cryptoService.lock();
        useAppStore.getState().lockApp();
      }

      // Ctrl+Shift+F — Global search
      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        useAppStore.getState().setScreen('search');
      }
    },
    [isLocked, toggleCommandPalette],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ---------- Clipboard auto-clear (30 s after copy) ----------
   * Snapshots the clipboard immediately after copy. 30 s later it
   * only clears if the clipboard STILL holds that same text —
   * so user copies after ours are never wiped prematurely.
   * Falls back to unconditional clear if readText() is denied.
   * ------------------------------------------------------------ */
  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const handleCopy = () => {
      if (clearTimer) clearTimeout(clearTimer);
      void (async () => {
        let snapshot: string | null = null;
        try {
          snapshot = await navigator.clipboard.readText();
        } catch { /* readText denied (e.g. Firefox without permission) */ }
        clearTimer = setTimeout(async () => {
          try {
            if (snapshot !== null) {
              // Only clear if clipboard still holds the same text
              const current = await navigator.clipboard.readText();
              if (current === snapshot) await navigator.clipboard.writeText('');
            } else {
              // readText unavailable — unconditional clear
              await navigator.clipboard.writeText('');
            }
          } catch { /* permission revoked or clipboard inaccessible — skip */ }
        }, 30_000);
      })();
    };
    document.addEventListener('copy', handleCopy);
    return () => {
      document.removeEventListener('copy', handleCopy);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, []);

  /* ---------- Route resolution ---------- */
  const resolveScreen = (): React.ReactNode => {
    // First-time setup: no storageMode chosen yet
    if (!storageMode) return <SetupWizard />;

    // Vault locked
    if (isLocked) return <UnlockScreen />;

    switch (screen) {
      case 'library':
        return <Library />;
      case 'workspace':
        return <Workspace />;
      case 'settings':
        return <Settings />;
      case 'collaborators':
        return <Collaborators />;
      case 'trash':
        return <Trash />;
      case 'charts':
        return <Charts />;
      case 'search':
        return <Search />;
      case 'sharing':
        return <Sharing />;
      case 'sync':
        return <Sync />;
      default:
        return <Library />;
    }
  };

  return (
    <div className="app-root">
      {resolveScreen()}

      {commandPaletteOpen && (
        <CommandPalette
          commands={buildCommands(useAppStore.getState())}
          onClose={toggleCommandPalette}
          placeholder="Type a command…"
        />
      )}
    </div>
  );
};

export default App;
