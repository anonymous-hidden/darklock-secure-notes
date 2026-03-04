/**
 * Darklock Secure Notes — Unlock Screen
 *
 * Premium vault unlock UI with animated lock icon,
 * subtle glow effects, and polished interactions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Button, Spinner, EncryptionBadge } from '@darklock/ui';
import { cryptoService } from '../services/crypto';
import { api } from '../services/api';

/* ── SVG Icons ─────────────────────────────────────────────────── */
const LockIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lock-grad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
      <filter id="lock-glow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#lock-grad)" fillOpacity="0.12" />
    <path
      d="M32 18a8 8 0 0 0-8 8v6h16v-6a8 8 0 0 0-8-8z"
      stroke="url(#lock-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round"
      filter="url(#lock-glow)"
    />
    <rect x="20" y="32" width="24" height="16" rx="4" fill="url(#lock-grad)" fillOpacity="0.9" />
    <circle cx="32" cy="39" r="2.5" fill="#0a0a0f" />
    <path d="M32 41v3" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5l5.5 2v4c0 3.5-2.5 5.5-5.5 7-3-1.5-5.5-3.5-5.5-7v-4L8 1.5z"
      stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    <path d="M6 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────── */
export const UnlockScreen: React.FC = () => {
  const storageMode = useAppStore((s) => s.storageMode);
  const setLocked = useAppStore((s) => s.setLocked);
  const setScreen = useAppStore((s) => s.setScreen);
  const setUser = useAppStore((s) => s.setUser);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const user = useAppStore((s) => s.user);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleUnlock = async () => {
    if (!password) return;
    setError('');
    setLoading(true);

    try {
      if (storageMode === 'cloud' && user?.email) {
        const { keyParams } = (await api.auth.getKeyParams(user.email)) as any;
        await cryptoService.unlock(password, keyParams);
        const rootKey = cryptoService.getRootKey()!;
        const { hashServerAuthKey } = await import('@darklock/crypto');
        const serverAuthKeyHash = await hashServerAuthKey(rootKey.serverAuthKey);
        await api.auth.signin({ email: user.email, authKey: serverAuthKeyHash });
        setAuthenticated(true);
      } else {
        await cryptoService.unlock(password);
      }
      setLocked(false);
      setScreen('library');
    } catch {
      setError('Incorrect password');
      triggerShake();
      cryptoService.lock();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="unlock-screen">
      <div className={`unlock-card ${shake ? 'unlock-shake' : ''}`}>
        {/* Animated Lock Icon */}
        <div className="unlock-logo">
          <LockIcon />
        </div>

        <h1 className="unlock-title">Vault Locked</h1>
        <p className="unlock-subtitle">
          {storageMode === 'cloud' && user?.email
            ? user.email
            : 'Local vault'}
          <span style={{ margin: '0 8px', opacity: .3 }}>&bull;</span>
          Enter your master password
        </p>

        {error && (
          <div className="unlock-error">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <div className="unlock-form">
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              inputMode="text"
              enterKeyHint="done"
              data-1p-ignore=""
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--dl-bg-input)',
                border: '1px solid var(--dl-border)',
                borderRadius: 'var(--dl-radius-md)',
                color: 'var(--dl-text-primary)',
                fontSize: '15px',
                fontFamily: 'var(--dl-font-sans)',
                outline: 'none',
                transition: 'border-color var(--dl-transition), box-shadow var(--dl-transition)',
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={handleUnlock}
            disabled={loading || !password}
            className="unlock-btn"
          >
            {loading ? <Spinner size={16} /> : 'Unlock Vault'}
          </Button>
        </div>

        {/* Footer security indicator */}
        <div className="unlock-footer">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: 'var(--dl-text-muted)',
          }}>
            <ShieldIcon />
            <span>Zero-knowledge &bull; E2E encrypted &bull; XChaCha20-Poly1305</span>
          </div>
        </div>
      </div>

      {/* Version tag */}
      <div style={{
        position: 'absolute', bottom: '16px',
        fontSize: '11px', color: 'var(--dl-text-muted)', opacity: .4,
      }}>
        Darklock Secure Notes v0.1.0
      </div>
    </div>
  );
};
