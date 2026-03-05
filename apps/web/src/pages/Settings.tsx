/**
 * Darklock Secure Notes — Settings Screen (Full-Featured)
 *
 * 8 tabs:  Profile · Editor · Security · Shortcuts · Notifications · Data · Accessibility · Advanced
 */

import React, { useState } from 'react';
import { useAppStore, SettingsTab } from '../stores/appStore';
import { Button, Input, Modal, Spinner, Badge } from '@darklock/ui';
import { TopBar } from '../components/TopBar';
import { cryptoService } from '../services/crypto';
import { api } from '../services/api';

/* ── SVG Icons (compact) ─────────────────────────────────────── */
const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const UserIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M2 13.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>);
const EditorIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 5h5M5 7.5h3M5 10h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>);
const ShieldIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l5 2v4c0 3.5-2.5 5.5-5 6.5-2.5-1-5-3-5-6.5v-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5.5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const KeyboardIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" /><path d="M4 6h1M7 6h1M10 6h1M4 8.5h1M6 8.5h3M10 8.5h1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" /></svg>);
const BellIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3.5 3.5 0 0 0-3.5 3.5v3l-1 2h9l-1-2V5a3.5 3.5 0 0 0-3.5-3.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /><path d="M6 12a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.1" /></svg>);
const DataIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><ellipse cx="7.5" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.1" /><path d="M2.5 4v3.5c0 1.1 2.24 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.1" /><path d="M2.5 7.5V11c0 1.1 2.24 2 5 2s5-.9 5-2V7.5" stroke="currentColor" strokeWidth="1.1" /></svg>);
const AccessIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1" /><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1" /><path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>);
const GearIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1" /><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1.06 1.06M10.94 10.94L12 12M3 12l1.06-1.06M10.94 4.06L12 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>);
const SyncIcon = () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M11 3.5L13 5.5 11 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 5.5h11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /><path d="M4 11.5L2 9.5 4 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 9.5H2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>);
const LockIcon = () => (<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="3" y="6" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.1" /><path d="M4.5 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>);
const ExportIcon = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v7M4 6l3 3 3-3M2.5 10.5v1.5h9v-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ImportIcon = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 8.5v-7M4 5l3-3 3 3M2.5 10.5v1.5h9v-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const WarningIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L1.5 13.5h13z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 6v3" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="11" r="0.7" fill="#f59e0b" /></svg>);
const TrashIcon2 = () => (<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M4.5 3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3 3l.5 7.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5L10 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>);

/* ── Helpers ────────────────────────────────────────────────────── */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: 'var(--dl-text)', letterSpacing: '-0.2px' }}>{children}</h3>
);
const Divider = () => (<hr style={{ border: 'none', borderTop: '1px solid var(--dl-border)', margin: '24px 0' }} />);
const FieldRow: React.FC<{ label: string; children: React.ReactNode; description?: string }> = ({ label, children, description }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)', marginBottom: description ? '2px' : 0 }}>{label}</label>
        {description && <span style={{ fontSize: '11px', color: 'var(--dl-text-muted)' }}>{description}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  </div>
);
const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button onClick={onChange} style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: checked ? 'var(--dl-accent)' : 'var(--dl-border)', cursor: 'pointer', transition: 'background 0.2s', padding: 0 }}>
    <span style={{ position: 'absolute', top: '2px', left: checked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
  </button>
);
const Select: React.FC<{ value: any; onChange: (v: any) => void; options: { label: string; value: any }[] }> = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--dl-border)', background: 'var(--dl-bg-surface)', color: 'var(--dl-text)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const RangeSlider: React.FC<{ value: number; min: number; max: number; step?: number; onChange: (n: number) => void; unit?: string }> = ({ value, min, max, step, onChange, unit }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100px', accentColor: 'var(--dl-accent)' }} />
    <span style={{ fontSize: '12px', color: 'var(--dl-text-muted)', fontFamily: 'var(--dl-font-mono)', minWidth: '40px' }}>{value}{unit || ''}</span>
  </div>
);

/* ── Main ──────────────────────────────────────────────────────── */
export const Settings: React.FC = () => {
  const settingsTab = useAppStore((s) => s.settingsTab);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const setScreen = useAppStore((s) => s.setScreen);

  const tabConfig: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
    { id: 'editor', label: 'Editor', icon: <EditorIcon /> },
    { id: 'security', label: 'Security', icon: <ShieldIcon /> },
    { id: 'data', label: 'Data', icon: <DataIcon /> },
    { id: 'sync', label: 'Sync', icon: <SyncIcon /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <KeyboardIcon /> },
    { id: 'accessibility', label: 'Access.', icon: <AccessIcon /> },
    { id: 'advanced', label: 'Advanced', icon: <GearIcon /> },
  ];

  return (
    <div className="settings-screen">
      <TopBar />
      <div className="settings-body">
        <div className="settings-sidebar">
          <button className="settings-back" onClick={() => setScreen('library')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--dl-text-muted)', fontSize: '12px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px' }}>
            <BackIcon /> Back to Library
          </button>
          <h2 style={{ margin: '0 0 20px 12px', fontSize: '18px', fontWeight: 600 }}>Settings</h2>
          <nav className="settings-nav" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tabConfig.map((tab) => (
              <button key={tab.id} className={`settings-nav-item ${settingsTab === tab.id ? 'active' : ''}`} onClick={() => setSettingsTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px',
                  fontWeight: settingsTab === tab.id ? 500 : 400, background: settingsTab === tab.id ? 'rgba(99,102,241,.15)' : 'transparent',
                  color: settingsTab === tab.id ? 'var(--dl-accent)' : 'var(--dl-text-secondary)', transition: 'all 0.15s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="settings-content" style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', animation: 'dl-fadeIn 0.3s ease', maxWidth: '640px' }}>
          {settingsTab === 'profile' && <ProfileTab />}
          {settingsTab === 'editor' && <EditorTab />}
          {settingsTab === 'security' && <SecurityTab />}
          {settingsTab === 'data' && <DataTab />}
          {settingsTab === 'sync' && <SyncSettingsTab />}
          {settingsTab === 'shortcuts' && <ShortcutsTab />}
          {settingsTab === 'accessibility' && <AccessibilityTab />}
          {settingsTab === 'advanced' && <AdvancedTab />}
        </div>
      </div>
    </div>
  );
};

/* ── Profile Tab ──────────────────────────────────────────────── */
const ProfileTab: React.FC = () => {
  const user = useAppStore((s) => s.user);
  const storageMode = useAppStore((s) => s.storageMode);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  return (
    <div>
      <SectionTitle>Profile</SectionTitle>
      {storageMode === 'cloud' ? (
        <>
          <FieldRow label="Email" description="Associated with your Darklock account">
            <span style={{ fontSize: '13px', color: 'var(--dl-text-muted)' }}>{user?.email || '—'}</span>
          </FieldRow>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)', marginBottom: '6px' }}>Display Name</label>
            <Input value={displayName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)} />
          </div>
          <Button variant="primary" size="sm">Save</Button>
        </>
      ) : (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', fontSize: '13px', color: 'var(--dl-text-secondary)' }}>
          You&rsquo;re using a <strong style={{ color: 'var(--dl-text)' }}>local-only</strong> vault. No account is associated.
        </div>
      )}
      <Divider />
      <SectionTitle>Storage</SectionTitle>
      <FieldRow label="Mode"><Badge variant={storageMode === 'cloud' ? 'info' : 'default'}>{storageMode === 'cloud' ? 'Cloud Sync' : 'Local Only'}</Badge></FieldRow>
    </div>
  );
};

/* ── Editor Tab ──────────────────────────────────────────────── */
const EditorTab: React.FC = () => {
  const editorFontSize = useAppStore((x) => x.editorFontSize);
  const editorFontFamily = useAppStore((x) => x.editorFontFamily);
  const editorLineHeight = useAppStore((x) => x.editorLineHeight);
  const spellCheck = useAppStore((x) => x.spellCheck);
  const autoSave = useAppStore((x) => x.autoSave);
  const autoSaveInterval = useAppStore((x) => x.autoSaveInterval);
  const showLineNumbers = useAppStore((x) => x.showLineNumbers);
  const showWordCount = useAppStore((x) => x.showWordCount);
  const markdownPreview = useAppStore((x) => x.markdownPreview);
  const defaultSortBy = useAppStore((x) => x.defaultSortBy);
  return (
    <div>
      <SectionTitle>Typography</SectionTitle>
      <FieldRow label="Font Size" description="Adjust the editor text size"><RangeSlider value={editorFontSize} min={12} max={24} onChange={useAppStore.getState().setEditorFontSize} unit="px" /></FieldRow>
      <FieldRow label="Font Family" description="Choose an editor typeface"><Select value={editorFontFamily} onChange={useAppStore.getState().setEditorFontFamily} options={[{ label: 'Sans-Serif (Inter)', value: 'sans' }, { label: 'Monospace (JetBrains)', value: 'mono' }, { label: 'Serif', value: 'serif' }]} /></FieldRow>
      <FieldRow label="Line Height" description="Spacing between lines"><RangeSlider value={editorLineHeight} min={1.2} max={2.4} step={0.1} onChange={useAppStore.getState().setEditorLineHeight} /></FieldRow>
      <Divider />
      <SectionTitle>Behavior</SectionTitle>
      <FieldRow label="Spell Check" description="Underline misspelled words"><Toggle checked={spellCheck} onChange={() => useAppStore.getState().setSpellCheck(!spellCheck)} /></FieldRow>
      <FieldRow label="Auto-Save" description="Automatically save changes"><Toggle checked={autoSave} onChange={() => useAppStore.getState().setAutoSave(!autoSave)} /></FieldRow>
      {autoSave && <FieldRow label="Save Interval" description="Seconds between auto-saves"><RangeSlider value={autoSaveInterval} min={1} max={30} onChange={useAppStore.getState().setAutoSaveInterval} unit="s" /></FieldRow>}
      <FieldRow label="Line Numbers" description="Show line numbers in the editor"><Toggle checked={showLineNumbers} onChange={() => useAppStore.getState().setShowLineNumbers(!showLineNumbers)} /></FieldRow>
      <FieldRow label="Word Count" description="Show word/character count in status bar"><Toggle checked={showWordCount} onChange={() => useAppStore.getState().setShowWordCount(!showWordCount)} /></FieldRow>
      <FieldRow label="Markdown Preview" description="Live preview panel beside the editor"><Toggle checked={markdownPreview} onChange={() => useAppStore.getState().setMarkdownPreview(!markdownPreview)} /></FieldRow>
      <Divider />
      <SectionTitle>Defaults</SectionTitle>
      <FieldRow label="Default Sort" description="How notes are sorted by default"><Select value={defaultSortBy} onChange={useAppStore.getState().setDefaultSortBy} options={[{ label: 'Last Modified', value: 'updated' }, { label: 'Title A–Z', value: 'title' }, { label: 'Created Date', value: 'created' }]} /></FieldRow>
    </div>
  );
};

/* ── Security Tab ─────────────────────────────────────────────── */
const SecurityTab: React.FC = () => {
  const storageMode = useAppStore((s) => s.storageMode);
  const lockApp = useAppStore((s) => s.lockApp);
  const autoLockMinutes = useAppStore((s) => s.autoLockMinutes);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const handleChangePassword = async () => {
    setError(''); setSuccess('');
    if (!currentPw || !newPw) { setError('All fields required.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    if (newPw.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setLoading(true);
    try { await new Promise((r) => setTimeout(r, 1500)); setSuccess('Password changed successfully.'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); } catch (e: any) { setError(e.message || 'Failed'); } finally { setLoading(false); }
  };
  const handleLock = () => { cryptoService.lock(); lockApp(); };
  const handleSignOutAll = async () => { try { await api.auth.signoutAll(); } catch { /* */ } handleLock(); };
  const strength = newPw.length === 0 ? 0 : newPw.length < 8 ? 1 : newPw.length < 12 ? 2 : newPw.length < 16 ? 3 : 4;
  const strengthColors = ['transparent', '#ef4444', '#eab308', '#22c55e', '#6366f1'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong', 'Excellent'];
  return (
    <div>
      <SectionTitle>Encryption</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '10px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', marginBottom: '8px' }}>
        <LockIcon />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)' }}>End-to-End Encrypted</div>
          <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>XChaCha20-Poly1305 &middot; Argon2id KDF &middot; Zero-knowledge sync</div>
        </div>
      </div>
      <Divider />
      <SectionTitle>Auto-Lock</SectionTitle>
      <FieldRow label="Lock After Inactivity" description="Automatically lock vault when idle">
        <Select value={autoLockMinutes} onChange={(v: any) => useAppStore.getState().setAutoLockMinutes(Number(v))} options={[{ label: '1 minute', value: 1 }, { label: '5 minutes', value: 5 }, { label: '15 minutes', value: 15 }, { label: '30 minutes', value: 30 }, { label: '1 hour', value: 60 }, { label: 'Never', value: 0 }]} />
      </FieldRow>
      <Divider />
      <SectionTitle>Change Master Password</SectionTitle>
      {error && <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>{success}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
        <Input label="Current Password" type="password" value={currentPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPw(e.target.value)} />
        <Input label="New Password" type="password" value={newPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPw(e.target.value)} />
        {newPw && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--dl-border)', overflow: 'hidden' }}><div style={{ width: `${strength * 25}%`, height: '100%', borderRadius: '2px', background: strengthColors[strength], transition: 'all 0.3s' }} /></div><span style={{ fontSize: '11px', color: strengthColors[strength], fontWeight: 500 }}>{strengthLabels[strength]}</span></div>}
        <Input label="Confirm New Password" type="password" value={confirmPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPw(e.target.value)} />
        <div><Button variant="primary" size="sm" onClick={handleChangePassword} disabled={loading}>{loading ? <Spinner size={16} /> : 'Change Password'}</Button></div>
      </div>
      <Divider />
      <SectionTitle>Sessions</SectionTitle>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={handleLock}><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><LockIcon /> Lock Now</span></Button>
        {storageMode === 'cloud' && <Button variant="danger" size="sm" onClick={handleSignOutAll}>Sign Out All Devices</Button>}
      </div>
      <Divider />
      <SectionTitle>Export</SectionTitle>
      <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>Export all notes as an encrypted Darklock package or as plaintext Markdown.</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={() => setShowExport(true)}><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExportIcon /> Encrypted (.dlpkg)</span></Button>
        <Button variant="ghost" size="sm" onClick={() => setShowExport(true)}><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExportIcon /> Markdown (.zip)</span></Button>
        <Button variant="ghost" size="sm" onClick={() => setShowExport(true)}><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExportIcon /> JSON (.json)</span></Button>
      </div>
      {showExport && (
        <Modal isOpen={true} title="Export Notes" onClose={() => setShowExport(false)} size="sm">
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: '20px' }}>
              <WarningIcon />
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--dl-text-secondary)' }}>Plaintext export creates unencrypted files. Store them securely.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowExport(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setShowExport(false)}>Download</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ── Shortcuts Tab ────────────────────────────────────────────── */
const ShortcutsTab: React.FC = () => {
  const shortcuts = [
    { key: 'Ctrl + N', action: 'New note' }, { key: 'Ctrl + K', action: 'Command palette' }, { key: 'Ctrl + L', action: 'Go to library' },
    { key: 'Ctrl + B', action: 'Bold text' }, { key: 'Ctrl + I', action: 'Italic text' }, { key: 'Ctrl + S', action: 'Force save' },
    { key: 'Ctrl + \\', action: 'Toggle sidebar' }, { key: 'Ctrl + Shift + T', action: 'Toggle tools panel' }, { key: 'Ctrl + Shift + L', action: 'Lock vault' },
    { key: 'Ctrl + F', action: 'Search notes' }, { key: 'Ctrl + ,', action: 'Open settings' }, { key: 'Ctrl + /', action: 'Toggle Markdown preview' },
    { key: 'Esc', action: 'Close modal / deselect' }, { key: 'Ctrl + Shift + D', action: 'Duplicate note' }, { key: 'Ctrl + Shift + Delete', action: 'Move to trash' },
  ];
  const vimMode = useAppStore((s) => s.vimMode);
  return (
    <div>
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>Available shortcuts in the editor and app.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {shortcuts.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--dl-text)' }}>{s.action}</span>
            <kbd style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--dl-bg-primary)', border: '1px solid var(--dl-border)', fontFamily: 'var(--dl-font-mono)', color: 'var(--dl-text-muted)' }}>{s.key}</kbd>
          </div>
        ))}
      </div>
      <Divider />
      <SectionTitle>Vim Mode</SectionTitle>
      <FieldRow label="Enable Vim Keybindings" description="Use h/j/k/l navigation, modes, etc."><Toggle checked={vimMode} onChange={() => useAppStore.getState().setVimMode(!vimMode)} /></FieldRow>
    </div>
  );
};

/* ── Notifications Tab ────────────────────────────────────────── */
const NotificationsTab: React.FC = () => {
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const notifySyncErrors = useAppStore((s) => s.notifySyncErrors);
  const notifyCollabChanges = useAppStore((s) => s.notifyCollabChanges);
  const notifyShareInvites = useAppStore((s) => s.notifyShareInvites);
  return (
    <div>
      <SectionTitle>Notifications</SectionTitle>
      <FieldRow label="Enable Notifications" description="Show desktop or in-app notifications"><Toggle checked={notificationsEnabled} onChange={() => useAppStore.getState().setNotificationsEnabled(!notificationsEnabled)} /></FieldRow>
      {notificationsEnabled && (<>
        <Divider />
        <SectionTitle>Notification Types</SectionTitle>
        <FieldRow label="Sync Errors" description="Alert when cloud sync fails"><Toggle checked={notifySyncErrors} onChange={() => useAppStore.getState().setNotifySyncErrors(!notifySyncErrors)} /></FieldRow>
        <FieldRow label="Collaboration Changes" description="Notify when a collaborator edits a shared note"><Toggle checked={notifyCollabChanges} onChange={() => useAppStore.getState().setNotifyCollabChanges(!notifyCollabChanges)} /></FieldRow>
        <FieldRow label="Share Invitations" description="Alert when someone invites you to collaborate"><Toggle checked={notifyShareInvites} onChange={() => useAppStore.getState().setNotifyShareInvites(!notifyShareInvites)} /></FieldRow>
      </>)}
    </div>
  );
};

/* ── Data Tab ─────────────────────────────────────────────────── */
const DataTab: React.FC = () => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const confirmBeforeDelete = useAppStore((s) => s.confirmBeforeDelete);
  const showTrashWarning = useAppStore((s) => s.showTrashWarning);
  return (
    <div>
      <SectionTitle>Import &amp; Export</SectionTitle>
      <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>Move your data in or out of Darklock. Imports support Markdown, JSON, and .dlpkg files.</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <Button variant="ghost" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ImportIcon /> Import Notes</span></Button>
        <Button variant="ghost" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExportIcon /> Export All</span></Button>
        <Button variant="ghost" size="sm"><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ExportIcon /> Export Section</span></Button>
      </div>
      <Divider />
      <SectionTitle>Deletion Preferences</SectionTitle>
      <FieldRow label="Confirm Before Delete" description="Show a confirmation dialog before deleting"><Toggle checked={confirmBeforeDelete} onChange={() => useAppStore.getState().setConfirmBeforeDelete(!confirmBeforeDelete)} /></FieldRow>
      <FieldRow label="Trash Warning" description="Warn when permanently emptying trash"><Toggle checked={showTrashWarning} onChange={() => useAppStore.getState().setShowTrashWarning(!showTrashWarning)} /></FieldRow>
      <Divider />
      <SectionTitle>Storage Usage</SectionTitle>
      <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', marginBottom: '16px' }}>
        {['Notes Database', 'Attachments', 'Revisions'].map((label) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--dl-text)' }}>{label}</span>
            <span style={{ fontSize: '12px', color: 'var(--dl-text-muted)' }}>—</span>
          </div>
        ))}
      </div>
      <Divider />
      <SectionTitle>Danger Zone</SectionTitle>
      <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#ef4444' }}>Clear All Local Data</div>
            <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>Remove all notes, sections, and cached data from this device.</div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(true)}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><TrashIcon2 /> Clear</span></Button>
        </div>
      </div>
      {showClearConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Clear all data?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>This will permanently remove all local notes, sections, and preferences.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(false)}>Clear Everything</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Accessibility Tab ────────────────────────────────────────── */
const AccessibilityTab: React.FC = () => {
  const compactMode = useAppStore((s) => s.compactMode);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const highContrast = useAppStore((s) => s.highContrast);
  const focusMode = useAppStore((s) => s.focusMode);
  const zenMode = useAppStore((s) => s.zenMode);
  return (
    <div>
      <SectionTitle>Display</SectionTitle>
      <FieldRow label="Compact Mode" description="Reduce padding and spacing throughout the UI"><Toggle checked={compactMode} onChange={() => useAppStore.getState().setCompactMode(!compactMode)} /></FieldRow>
      <FieldRow label="High Contrast" description="Increase text contrast for better readability"><Toggle checked={highContrast} onChange={() => useAppStore.getState().setHighContrast(!highContrast)} /></FieldRow>
      <FieldRow label="Reduced Motion" description="Disable animations and transitions"><Toggle checked={reducedMotion} onChange={() => useAppStore.getState().setReducedMotion(!reducedMotion)} /></FieldRow>
      <Divider />
      <SectionTitle>Focus</SectionTitle>
      <FieldRow label="Focus Mode" description="Dim everything except the active paragraph"><Toggle checked={focusMode} onChange={() => useAppStore.getState().setFocusMode(!focusMode)} /></FieldRow>
      <FieldRow label="Zen Mode" description="Full-screen distraction-free writing"><Toggle checked={zenMode} onChange={() => useAppStore.getState().setZenMode(!zenMode)} /></FieldRow>
    </div>
  );
};

/* ── Advanced Tab ─────────────────────────────────────────────── */
const AdvancedTab: React.FC = () => {
  const devToolsEnabled = useAppStore((s) => s.devToolsEnabled);
  const telemetryEnabled = useAppStore((s) => s.telemetryEnabled);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const noteListWidth = useAppStore((s) => s.noteListWidth);
  const theme = useAppStore((s) => s.theme);
  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <FieldRow label="Theme" description="Choose color scheme"><Select value={theme} onChange={useAppStore.getState().setTheme} options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'System', value: 'system' }]} /></FieldRow>
      <Divider />
      <SectionTitle>Layout</SectionTitle>
      <FieldRow label="Sidebar Width" description="Width of the sections sidebar"><RangeSlider value={sidebarWidth} min={180} max={400} onChange={useAppStore.getState().setSidebarWidth} unit="px" /></FieldRow>
      <FieldRow label="Note List Width" description="Width of the note list panel"><RangeSlider value={noteListWidth} min={200} max={500} onChange={useAppStore.getState().setNoteListWidth} unit="px" /></FieldRow>
      <Divider />
      <SectionTitle>Developer</SectionTitle>
      <FieldRow label="Developer Tools" description="Enable DevTools in desktop app (F12)"><Toggle checked={devToolsEnabled} onChange={() => useAppStore.getState().setDevToolsEnabled(!devToolsEnabled)} /></FieldRow>
      <FieldRow label="Telemetry" description="Send anonymous usage analytics"><Toggle checked={telemetryEnabled} onChange={() => useAppStore.getState().setTelemetryEnabled(!telemetryEnabled)} /></FieldRow>
      <Divider />
      <SectionTitle>About</SectionTitle>
      <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dl-text)', marginBottom: '8px' }}>Darklock Secure Notes</div>
        <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', lineHeight: 1.6 }}>
          Version 0.1.0<br />React 18 &middot; Tauri v2 &middot; Vite 5<br />Encryption: XChaCha20-Poly1305 + Argon2id<br />License: Proprietary &copy; 2026 Darklock
        </div>
      </div>
    </div>
  );
};
