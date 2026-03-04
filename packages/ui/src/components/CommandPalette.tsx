import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  category?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  actions,
  placeholder = 'Type a command...',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    (a.category && a.category.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '20vh',
        background: 'var(--dl-bg-overlay)',
      }}
      role="dialog"
      aria-label="Command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 560,
          background: 'var(--dl-bg-secondary)',
          border: '1px solid var(--dl-border)',
          borderRadius: 'var(--dl-radius-lg)',
          boxShadow: 'var(--dl-shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dl-border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'none',
              border: 'none',
              color: 'var(--dl-text-primary)',
              fontSize: 'var(--dl-font-size-lg)',
              fontFamily: 'var(--dl-font-sans)',
              outline: 'none',
            }}
            aria-label="Command search"
          />
        </div>

        <div style={{ maxHeight: 320, overflow: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--dl-text-muted)' }}>
              No commands found
            </div>
          ) : (
            filtered.map((action, i) => (
              <button
                key={action.id}
                onClick={() => { action.action(); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 16px',
                  background: i === selectedIndex ? 'var(--dl-bg-surface-hover)' : 'transparent',
                  border: 'none', color: 'var(--dl-text-primary)',
                  cursor: 'pointer', fontFamily: 'var(--dl-font-sans)',
                  fontSize: 'var(--dl-font-size-sm)',
                  textAlign: 'left',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {action.icon && <span style={{ color: 'var(--dl-text-tertiary)', fontSize: '16px' }}>{action.icon}</span>}
                  <span>
                    {action.category && (
                      <span style={{ color: 'var(--dl-text-muted)', marginRight: '6px' }}>{action.category} &gt;</span>
                    )}
                    {action.label}
                  </span>
                </span>
                {action.shortcut && (
                  <span style={{
                    fontSize: 'var(--dl-font-size-xs)',
                    color: 'var(--dl-text-muted)',
                    background: 'var(--dl-bg-surface)',
                    padding: '2px 6px',
                    borderRadius: 'var(--dl-radius-sm)',
                    fontFamily: 'var(--dl-font-mono)',
                  }}>
                    {action.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
