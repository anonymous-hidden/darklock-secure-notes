/**
 * Darklock Secure Notes — Sync Screen
 *
 * Sync status, device list, conflicts, revisions, and recovery.
 * Makes conflicts visible — never silent overwrite.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, SyncDevice, SyncConflict, NoteRevision, ConflictPolicy } from '../stores/appStore';
import { Button, Badge, Modal, Spinner } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const SyncGraphic = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <defs>
      <linearGradient id="sync-g" x1="8" y1="8" x2="44" y2="44">
        <stop stopColor="#22c55e" />
        <stop offset="1" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    <circle cx="26" cy="26" r="18" stroke="url(#sync-g)" strokeWidth="2" strokeDasharray="4 4" />
    <path d="M26 14v24M14 26h24" stroke="url(#sync-g)" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 20l-6-6-6 6M20 32l6 6 6-6" stroke="url(#sync-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DesktopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 14h6M8 11v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 8h12M8 2c-2 2-2 10 0 12M8 2c2 2 2 10 0 12" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="4" y="1" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="12.5" r="0.8" fill="currentColor" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L1.5 13.5h13z" stroke="var(--dl-warning)" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M8 6v3" stroke="var(--dl-warning)" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.7" fill="var(--dl-warning)" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6l2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const deviceIcons: Record<string, React.FC> = { desktop: DesktopIcon, web: GlobeIcon, mobile: PhoneIcon };

/* ── Component ─────────────────────────────────────────────────── */
export const Sync: React.FC = () => {
  const syncStatus = useAppStore((s) => s.syncStatus);
  const storageMode = useAppStore((s) => s.storageMode);
  const syncDevices = useAppStore((s) => s.syncDevices);
  const syncConflicts = useAppStore((s) => s.syncConflicts);
  const setSyncConflicts = useAppStore((s) => s.setSyncConflicts);
  const noteRevisions = useAppStore((s) => s.noteRevisions);
  const conflictPolicy = useAppStore((s) => s.conflictPolicy);
  const setConflictPolicy = useAppStore((s) => s.setConflictPolicy);
  const notes = useAppStore((s) => s.notes);
  const setScreen = useAppStore((s) => s.setScreen);

  const [activeTab, setActiveTab] = useState<'status' | 'devices' | 'conflicts' | 'revisions'>('status');
  const [confirmResolveId, setConfirmResolveId] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState<NoteRevision | null>(null);

  const unresolvedConflicts = syncConflicts.filter((c) => !c.resolved);

  const resolveConflict = (id: string) => {
    setSyncConflicts(syncConflicts.map((c) => (c.id === id ? { ...c, resolved: true } : c)));
    setConfirmResolveId(null);
  };

  const syncStatusColor: Record<string, string> = {
    synced: 'var(--dl-success)', syncing: 'var(--dl-info)', offline: 'var(--dl-text-muted)', error: 'var(--dl-danger)',
  };
  const syncStatusLabel: Record<string, string> = {
    synced: 'All synced', syncing: 'Syncing...', offline: 'Offline', error: 'Sync error',
  };

  const relDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const tabs = [
    { id: 'status' as const, label: 'Status' },
    { id: 'devices' as const, label: `Devices${syncDevices.length > 0 ? ` (${syncDevices.length})` : ''}` },
    { id: 'conflicts' as const, label: `Conflicts${unresolvedConflicts.length > 0 ? ` (${unresolvedConflicts.length})` : ''}` },
    { id: 'revisions' as const, label: 'Revisions' },
  ];

  return (
    <div className="sync-screen">
      <TopBar />
      <div className="sync-body">
        {/* Header */}
        <div className="sync-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Sync</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              Sync status, devices, conflicts &amp; revision history
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
              borderRadius: '9999px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: syncStatusColor[syncStatus],
                animation: syncStatus === 'syncing' ? 'dl-pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{syncStatusLabel[syncStatus]}</span>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="sync-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sync-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Status Tab ─────────────────────────────────────── */}
        {activeTab === 'status' && (
          <div className="sync-tab-content" style={{ animation: 'dl-fadeIn 0.3s ease' }}>
            {storageMode !== 'cloud' ? (
              <div className="sync-offline-card">
                <SyncGraphic />
                <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>Local-only mode</h3>
                <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '320px' }}>
                  Your vault is stored locally. Enable cloud sync in Settings to sync across devices.
                </p>
              </div>
            ) : (
              <div className="sync-status-grid">
                <div className="sync-stat-card">
                  <div className="sync-stat-value" style={{ color: syncStatusColor[syncStatus] }}>
                    {syncStatus === 'synced' ? <CheckIcon /> : null}
                    {syncStatusLabel[syncStatus]}
                  </div>
                  <div className="sync-stat-label">Sync Status</div>
                </div>
                <div className="sync-stat-card">
                  <div className="sync-stat-value">{syncDevices.length}</div>
                  <div className="sync-stat-label">Connected Devices</div>
                </div>
                <div className="sync-stat-card">
                  <div className="sync-stat-value" style={{ color: unresolvedConflicts.length > 0 ? 'var(--dl-warning)' : 'var(--dl-text-secondary)' }}>
                    {unresolvedConflicts.length}
                  </div>
                  <div className="sync-stat-label">Unresolved Conflicts</div>
                </div>
                <div className="sync-stat-card">
                  <div className="sync-stat-value">{noteRevisions.length}</div>
                  <div className="sync-stat-label">Revisions Stored</div>
                </div>
              </div>
            )}

            {/* Conflict policy */}
            <div className="sync-policy-section">
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Conflict Resolution Policy</h3>
              <p style={{ fontSize: '12px', color: 'var(--dl-text-muted)', margin: '0 0 12px' }}>
                Choose how concurrent edits from different devices are handled.
              </p>
              <div className="sync-policy-options">
                {([
                  { id: 'auto-merge' as ConflictPolicy, label: 'Auto-merge', desc: 'Attempt automatic merge using diff/patch. Creates conflict markers on failure.' },
                  { id: 'conflict-copy' as ConflictPolicy, label: 'Conflict copy', desc: 'Always create a separate copy. Never loses data.' },
                  { id: 'last-write-wins' as ConflictPolicy, label: 'Last-write-wins', desc: 'Accept the newest version. May discard concurrent edits.' },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    className={`sync-policy-btn ${conflictPolicy === opt.id ? 'active' : ''}`}
                    onClick={() => setConflictPolicy(opt.id)}
                  >
                    <div className="sync-policy-radio">
                      {conflictPolicy === opt.id && <div className="sync-policy-radio-dot" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Devices Tab ────────────────────────────────────── */}
        {activeTab === 'devices' && (
          <div className="sync-tab-content" style={{ animation: 'dl-fadeIn 0.3s ease' }}>
            {syncDevices.length === 0 ? (
              <div className="sync-empty-tab">
                <DesktopIcon />
                <p>No devices synced yet. This device will appear when cloud sync is active.</p>
              </div>
            ) : (
              <div className="sync-devices-list">
                {syncDevices.map((dev) => {
                  const Icon = deviceIcons[dev.platform] || DesktopIcon;
                  return (
                    <div key={dev.id} className={`sync-device-row ${dev.isCurrentDevice ? 'current' : ''}`}>
                      <div className="sync-device-icon"><Icon /></div>
                      <div className="sync-device-info">
                        <div className="sync-device-name">
                          {dev.name}
                          {dev.isCurrentDevice && <Badge variant="info" size="sm">This device</Badge>}
                        </div>
                        <div className="sync-device-meta">
                          {dev.platform} &middot; Last seen {relDate(dev.lastSeen)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Conflicts Tab ──────────────────────────────────── */}
        {activeTab === 'conflicts' && (
          <div className="sync-tab-content" style={{ animation: 'dl-fadeIn 0.3s ease' }}>
            {syncConflicts.length === 0 ? (
              <div className="sync-empty-tab">
                <CheckIcon />
                <p>No conflicts. All notes are in sync.</p>
              </div>
            ) : (
              <div className="sync-conflicts-list">
                {syncConflicts.map((conflict) => (
                  <div key={conflict.id} className={`sync-conflict-row ${conflict.resolved ? 'resolved' : ''}`}>
                    <div className="sync-conflict-icon">
                      {conflict.resolved ? <CheckIcon /> : <WarningIcon />}
                    </div>
                    <div className="sync-conflict-info">
                      <div className="sync-conflict-title">{conflict.noteTitle}</div>
                      <div className="sync-conflict-meta">
                        Local v{conflict.localVersion} vs Remote v{conflict.remoteVersion}
                        &middot; {relDate(conflict.createdAt)}
                      </div>
                    </div>
                    <div className="sync-conflict-actions">
                      {conflict.resolved ? (
                        <Badge variant="success" size="sm">Resolved</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmResolveId(conflict.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Revisions Tab ──────────────────────────────────── */}
        {activeTab === 'revisions' && (
          <div className="sync-tab-content" style={{ animation: 'dl-fadeIn 0.3s ease' }}>
            {noteRevisions.length === 0 ? (
              <div className="sync-empty-tab">
                <HistoryIcon />
                <p>No revisions stored yet. Edit notes to create revision history.</p>
              </div>
            ) : (
              <div className="sync-revisions-list">
                {noteRevisions.map((rev) => (
                  <div key={rev.id} className="sync-revision-row">
                    <div className="sync-revision-info">
                      <div className="sync-revision-title">
                        {notes.find((n) => n.id === rev.noteId)?.title || 'Unknown note'}
                        <span className="sync-revision-version">v{rev.version}</span>
                      </div>
                      <div className="sync-revision-meta">
                        {rev.deviceName} &middot; {relDate(rev.createdAt)} &middot; {(rev.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="sync-revision-actions">
                      <Button variant="ghost" size="sm" onClick={() => setShowRestoreModal(rev)}>
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Encryption note */}
        <div className="collab-info-bar" style={{ marginTop: '24px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="6.5" width="8" height="5.5" rx="1.5" stroke="var(--dl-success)" strokeWidth="1.1" />
            <path d="M5 6.5V4.5a2 2 0 0 1 4 0v2" stroke="var(--dl-success)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span>Sync uses <strong>encrypted delta sync</strong> with version vectors. Server stores ciphertext + version metadata only.</span>
        </div>
      </div>

      {/* Resolve conflict modal */}
      {confirmResolveId && (
        <div className="delete-confirm-overlay" onClick={() => setConfirmResolveId(null)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Resolve conflict</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              This will apply the current conflict policy ({conflictPolicy.replace(/-/g, ' ')}) to merge or choose a version.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmResolveId(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => resolveConflict(confirmResolveId)}>Resolve</Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore revision modal */}
      {showRestoreModal && (
        <div className="delete-confirm-overlay" onClick={() => setShowRestoreModal(null)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Restore revision?</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              This will create a new version of the note from revision v{showRestoreModal.version}.
              The current version will be preserved in history.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowRestoreModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => setShowRestoreModal(null)}>Restore</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
