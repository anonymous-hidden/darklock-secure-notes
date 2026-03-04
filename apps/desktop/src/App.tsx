/**
 * Darklock Desktop — App Root
 *
 * Extends the web app with desktop-specific features:
 * - Tauri IPC for secure file operations
 * - Native window controls
 * - System tray integration
 */

import React, { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { SetupWizard, UnlockScreen, Library, Workspace, Settings } from './pages';
import { CommandPalette } from '@darklock/ui';
import { cryptoService } from '../../web/src/services/crypto';

// Re-use the same store & pages as the web app (shared via packages)
// Desktop-specific overrides happen through the Tauri bridge

const buildCommands = (store: ReturnType<typeof useAppStore.getState>) => [
  { id: 'new-note', label: 'New Note', shortcut: 'Ctrl+N', action: () => store.setScreen('workspace') },
  { id: 'search', label: 'Search Notes', shortcut: 'Ctrl+F', action: () => {} },
  { id: 'library', label: 'Go to Library', shortcut: 'Ctrl+L', action: () => store.setScreen('library') },
  { id: 'settings', label: 'Open Settings', action: () => store.setScreen('settings') },
  { id: 'lock', label: 'Lock Vault', action: () => { cryptoService.lock(); store.lockApp(); } },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', action: () => store.toggleNav() },
];

export const App: React.FC = () => {
  const screen = useAppStore((s) => s.screen);
  const isLocked = useAppStore((s) => s.isLocked);
  const storageMode = useAppStore((s) => s.storageMode);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);

  /* ---------- Dev bypass (VITE_DEV_BYPASS=true) ---------- */
  useEffect(() => {
    if (import.meta.env.VITE_DEV_BYPASS === 'true') {
      const store = useAppStore.getState();
      store.setStorageMode('local');
      store.setAuthenticated(true);
      store.setLocked(false);
      store.setScreen('library');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop: attempt native window customization
  useEffect(() => {
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        // Transparent title bar on macOS/Linux
        // win.setDecorations(false); // uncomment for custom title bar
      } catch {
        // Running in browser, not Tauri
      }
    })();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'k') { e.preventDefault(); toggleCommandPalette(); }
      if (isLocked) return;
      if (ctrl && e.key === 'n') { e.preventDefault(); useAppStore.getState().setScreen('workspace'); }
      if (ctrl && e.key === 'l') { e.preventDefault(); useAppStore.getState().setScreen('library'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLocked, toggleCommandPalette]);

  const resolveScreen = () => {
    if (!storageMode) return <SetupWizard />;
    if (isLocked) return <UnlockScreen />;
    switch (screen) {
      case 'library': return <Library />;
      case 'workspace': return <Workspace />;
      case 'settings': return <Settings />;
      default: return <Library />;
    }
  };

  return (
    <div className="app-root desktop-app">
      {/* Desktop drag region for custom title bar */}
      <div className="desktop-titlebar-drag" data-tauri-drag-region />

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
