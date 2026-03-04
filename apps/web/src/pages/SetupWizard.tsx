/**
 * Darklock Secure Notes — Setup Wizard
 *
 * First-run onboarding with polished step transitions,
 * branded mode selection cards, and password strength meter.
 */

import React, { useState } from 'react';
import { useAppStore, SetupStep } from '../stores/appStore';
import { Button, Input, Spinner } from '@darklock/ui';
import { cryptoService } from '../services/crypto';
import { api } from '../services/api';

/* ── SVG Icons ────────────────────────────────────────────────── */
const DarklockLogo = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <defs>
      <linearGradient id="logo-g" x1="4" y1="4" x2="48" y2="48">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
      <filter id="logo-glow">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <rect width="52" height="52" rx="14" fill="url(#logo-g)" filter="url(#logo-glow)" />
    <path d="M26 12v28M18 22h16M18 30h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const CloudIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path d="M10 24a6 6 0 0 1-.6-11.96A9 9 0 0 1 27 14a7 7 0 0 1-1 13.96" stroke="var(--dl-accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M14 22l4-4 4 4M18 28v-10" stroke="var(--dl-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShieldLockIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path d="M18 4L6 10v8c0 7 5 11.5 12 14 7-2.5 12-7 12-14v-8L18 4z" stroke="var(--dl-accent)" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <rect x="14" y="16" width="8" height="7" rx="2" fill="var(--dl-accent)" fillOpacity=".2" stroke="var(--dl-accent)" strokeWidth="1.5" />
    <path d="M15 16v-2a3 3 0 0 1 6 0v2" stroke="var(--dl-accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="28" stroke="var(--dl-success)" strokeWidth="2.5" fill="rgba(34,197,94,.08)" />
    <path d="M22 32l7 7 13-14" stroke="var(--dl-success)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BackArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Helpers ───────────────────────────────────────────────────── */
const passwordStrength = (pw: string): { score: number; label: string } => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const l = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  return { score: s, label: l[Math.min(s, 4)] };
};

/* ── Component ─────────────────────────────────────────────────── */
export const SetupWizard: React.FC = () => {
  const step = useAppStore((s) => s.setupStep);
  const setStep = useAppStore((s) => s.setSetupStep);
  const setStorageMode = useAppStore((s) => s.setStorageMode);
  const setScreen = useAppStore((s) => s.setScreen);
  const setLocked = useAppStore((s) => s.setLocked);
  const setUser = useAppStore((s) => s.setUser);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleCloudSignup = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setLoading(true);
    try {
      await cryptoService.unlock(password);
      const rootKey = cryptoService.getRootKey()!;
      const { hashServerAuthKey } = await import('@darklock/crypto');
      const serverAuthKeyHash = await hashServerAuthKey(rootKey.serverAuthKey);
      const res = await api.auth.signup({
        email, displayName: displayName || undefined,
        authKey: serverAuthKeyHash,
        keyParams: (rootKey as any).kdfParams,
      });
      setUser({ id: (res as any).user?.id || '', email });
      setAuthenticated(true);
      setStorageMode('cloud');
      setLocked(false);
      setStep('finish');
    } catch (e: any) {
      setError(e.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  const handleCloudSignin = async () => {
    setError('');
    if (!email || !password) { setError('Email and password required.'); return; }
    setLoading(true);
    try {
      const { keyParams } = (await api.auth.getKeyParams(email)) as any;
      await cryptoService.unlock(password, keyParams);
      const rootKey = cryptoService.getRootKey()!;
      const { hashServerAuthKey } = await import('@darklock/crypto');
      const serverAuthKeyHash = await hashServerAuthKey(rootKey.serverAuthKey);
      const res = await api.auth.signin({ email, authKey: serverAuthKeyHash });
      setUser({ id: (res as any).user?.id || '', email });
      setAuthenticated(true);
      setStorageMode('cloud');
      setLocked(false);
      setStep('finish');
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
    } finally { setLoading(false); }
  };

  const handleLocalCreate = async () => {
    setError('');
    if (!password) { setError('Password is required.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setLoading(true);
    try {
      await cryptoService.unlock(password);
      setStorageMode('local');
      setLocked(false);
      setStep('finish');
    } catch (e: any) {
      setError(e.message || 'Failed to create vault');
    } finally { setLoading(false); }
  };

  /* ── Strength Bar Sub-component ─────────────────────────────── */
  const StrengthBar = () => password ? (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className="password-strength-fill"
          data-score={strength.score}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      <span className="password-strength-label">{strength.label}</span>
    </div>
  ) : null;

  /* ── Step Indicator ─────────────────────────────────────────── */
  const steps: SetupStep[] = ['choose-mode', step === 'cloud-signup' || step === 'cloud-signin' ? step : 'local-create', 'finish'];
  const stepIndex = step === 'choose-mode' ? 0 : step === 'finish' ? 2 : 1;

  const StepDots = () => (
    <div style={{
      display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px',
    }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: i === stepIndex ? '24px' : '8px',
          height: '4px',
          borderRadius: '4px',
          background: i <= stepIndex ? 'var(--dl-accent)' : 'var(--dl-border)',
          transition: 'all .3s ease',
        }} />
      ))}
    </div>
  );

  /* ── Back Button ────────────────────────────────────────────── */
  const BackBtn = () => (
    <button className="setup-back" onClick={() => { setStep('choose-mode'); setError(''); }}>
      <BackArrowIcon /> Back
    </button>
  );

  /* ── Error Message ──────────────────────────────────────────── */
  const ErrorMsg = () => error ? <div className="setup-error">{error}</div> : null;

  /* ── RENDER: Choose Mode ────────────────────────────────────── */
  const renderChooseMode = () => (
    <div className="setup-wizard">
      <div className="setup-card">
        <div className="setup-logo"><DarklockLogo /></div>
        <h1 className="setup-title">Darklock Secure Notes</h1>
        <p className="setup-subtitle">
          End-to-end encrypted notes with zero-knowledge architecture.
          <br />Choose how you want to store your data.
        </p>
        <StepDots />

        <div className="setup-options">
          <button className="setup-option-card" onClick={() => setStep('cloud-signup')}>
            <CloudIcon />
            <h3>Cloud Sync</h3>
            <p>Sync across devices with E2E encryption. The server never sees your content.</p>
          </button>

          <button className="setup-option-card" onClick={() => setStep('local-create')}>
            <ShieldLockIcon />
            <h3>Local Only</h3>
            <p>Everything stays on this device. No account needed.</p>
          </button>
        </div>
      </div>
    </div>
  );

  /* ── RENDER: Cloud Signup ───────────────────────────────────── */
  const renderCloudSignup = () => (
    <div className="setup-wizard">
      <div className="setup-card">
        <BackBtn />
        <StepDots />
        <h2 className="setup-title">Create Account</h2>
        <p className="setup-subtitle">Your password never leaves this device.</p>
        <ErrorMsg />
        <div className="setup-form">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Master Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" spellCheck={false} autoCorrect="off" autoCapitalize="none" inputMode="text" enterKeyHint="next" data-1p-ignore="" />
          <StrengthBar />
          <Input label="Confirm Password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" spellCheck={false} autoCorrect="off" autoCapitalize="none" inputMode="text" enterKeyHint="done" data-1p-ignore="" />
          <Button variant="primary" onClick={handleCloudSignup} disabled={loading} className="setup-btn">
            {loading ? <Spinner size={16} /> : 'Create Account'}
          </Button>
          <p className="setup-switch">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => { setStep('cloud-signin'); setError(''); }}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );

  /* ── RENDER: Cloud Sign In ──────────────────────────────────── */
  const renderCloudSignin = () => (
    <div className="setup-wizard">
      <div className="setup-card">
        <BackBtn />
        <StepDots />
        <h2 className="setup-title">Sign In</h2>
        <p className="setup-subtitle">Unlock your encrypted vault.</p>
        <ErrorMsg />
        <div className="setup-form">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Master Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" spellCheck={false} autoCorrect="off" autoCapitalize="none" inputMode="text" enterKeyHint="done" data-1p-ignore="" />
          <Button variant="primary" onClick={handleCloudSignin} disabled={loading} className="setup-btn">
            {loading ? <Spinner size={16} /> : 'Sign In'}
          </Button>
          <p className="setup-switch">
            Need an account?{' '}
            <button className="link-btn" onClick={() => { setStep('cloud-signup'); setError(''); }}>Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );

  /* ── RENDER: Local Create ───────────────────────────────────── */
  const renderLocalCreate = () => (
    <div className="setup-wizard">
      <div className="setup-card">
        <BackBtn />
        <StepDots />
        <h2 className="setup-title">Create Local Vault</h2>
        <p className="setup-subtitle">Choose a master password. It cannot be recovered if lost.</p>
        <ErrorMsg />
        <div className="setup-form">
          <Input label="Master Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" spellCheck={false} autoCorrect="off" autoCapitalize="none" inputMode="text" enterKeyHint="next" data-1p-ignore="" />
          <StrengthBar />
          <Input label="Confirm Password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" spellCheck={false} autoCorrect="off" autoCapitalize="none" inputMode="text" enterKeyHint="done" data-1p-ignore="" />
          <Button variant="primary" onClick={handleLocalCreate} disabled={loading} className="setup-btn">
            {loading ? <Spinner size={16} /> : 'Create Vault'}
          </Button>
        </div>
      </div>
    </div>
  );

  /* ── RENDER: Finish ─────────────────────────────────────────── */
  const renderFinish = () => (
    <div className="setup-wizard">
      <div className="setup-card setup-finish">
        <CheckCircleIcon />
        <h2 className="setup-title" style={{ marginTop: '16px' }}>You're all set</h2>
        <p className="setup-subtitle">Your encrypted vault is ready.</p>
        <Button variant="primary" onClick={() => setScreen('library')} className="setup-btn">
          Open Library
        </Button>
      </div>
    </div>
  );

  switch (step) {
    case 'choose-mode': return renderChooseMode();
    case 'cloud-signup': return renderCloudSignup();
    case 'cloud-signin': return renderCloudSignin();
    case 'local-create': return renderLocalCreate();
    case 'finish': return renderFinish();
    default: return renderChooseMode();
  }
};
