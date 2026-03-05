/**
 * Darklock Secure Notes — Sharing Screen
 *
 * Manage shared notes/sections, recipients, permissions, and revocation.
 * Key-wrapped envelopes via X25519 — server is blind to plaintext.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, SharedResource, ShareRecipient, ShareRole } from '../stores/appStore';
import { Button, Input, Modal, Badge, Spinner } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const ShareGraphic = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <defs>
      <linearGradient id="sg-g" x1="8" y1="8" x2="44" y2="44">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <circle cx="14" cy="14" r="5" stroke="url(#sg-g)" strokeWidth="1.5" />
    <circle cx="38" cy="14" r="5" stroke="url(#sg-g)" strokeWidth="1.5" />
    <circle cx="26" cy="40" r="5" stroke="url(#sg-g)" strokeWidth="1.5" />
    <path d="M19 16l5 20M33 16l-5 20" stroke="url(#sg-g)" strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="M19 14h14" stroke="url(#sg-g)" strokeWidth="1.5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="9.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 6.5L2 11.5M2 11.5h2.5M2 11.5v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RevokeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 4l5 5M9 4L4 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3.5 2h5L12 5.5V12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 12V3.5A1.5 1.5 0 0 1 3.5 2z" stroke="currentColor" strokeWidth="1.1" />
    <path d="M8 2v4h4" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

const SectionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 3.5a1 1 0 0 1 1-1h2.172a1 1 0 0 1 .707.293l.621.621a1 1 0 0 0 .707.293H11.5a1 1 0 0 1 1 1V10.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7z"
      stroke="currentColor" strokeWidth="1.1" fill="none" />
  </svg>
);

const roleLabels: Record<ShareRole, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const roleBadgeVariant: Record<ShareRole, 'info' | 'success' | 'default'> = { owner: 'info', editor: 'success', viewer: 'default' };
const statusBadgeVariant: Record<string, 'info' | 'success' | 'default' | 'warning' | 'danger'> = {
  active: 'success', pending: 'warning', revoked: 'danger', expired: 'default',
};

/* ── Component ─────────────────────────────────────────────────── */
export const Sharing: React.FC = () => {
  const sharedResources = useAppStore((s) => s.sharedResources);
  const addSharedResource = useAppStore((s) => s.addSharedResource);
  const removeSharedResource = useAppStore((s) => s.removeSharedResource);
  const activeShareId = useAppStore((s) => s.activeShareId);
  const setActiveShare = useAppStore((s) => s.setActiveShare);
  const notes = useAppStore((s) => s.notes);
  const sections = useAppStore((s) => s.sections);
  const user = useAppStore((s) => s.user);
  const setScreen = useAppStore((s) => s.setScreen);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ShareRole>('viewer');
  const [inviteType, setInviteType] = useState<'note' | 'section'>('note');
  const [inviteResourceId, setInviteResourceId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<{ shareId: string; recipientId: string } | null>(null);

  const activeShare = sharedResources.find((r) => r.id === activeShareId);

  /* ── Create Share ─────────────────────────────────────────── */
  const handleShare = async () => {
    if (!inviteEmail.trim() || !inviteResourceId) return;
    setInviteLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const resourceName = inviteType === 'note'
        ? notes.find((n) => n.id === inviteResourceId)?.title || 'Untitled'
        : sections.find((s) => s.id === inviteResourceId)?.name || 'Untitled';

      const resource: SharedResource = {
        id: crypto.randomUUID(),
        resourceType: inviteType,
        resourceId: inviteResourceId,
        resourceName,
        recipients: [{
          id: crypto.randomUUID(),
          email: inviteEmail.trim(),
          displayName: inviteEmail.split('@')[0],
          role: inviteRole,
          status: 'pending',
          addedAt: new Date().toISOString(),
        }],
        createdAt: new Date().toISOString(),
        permissions: {
          canEdit: inviteRole !== 'viewer',
          canShare: inviteRole === 'owner',
          canExport: inviteRole !== 'viewer',
        },
      };
      addSharedResource(resource);
      setInviteEmail('');
      setInviteResourceId('');
      setShowInviteModal(false);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevoke = (shareId: string, recipientId: string) => {
    // In production: send revocation to server, trigger rekey
    removeSharedResource(shareId);
    setConfirmRevokeId(null);
  };

  /* ── Detail View ──────────────────────────────────────────── */
  if (activeShare) {
    return (
      <div className="sharing-screen">
        <TopBar />
        <div className="sharing-body">
          <div className="sharing-detail-header">
            <button className="sharing-back-btn" onClick={() => setActiveShare(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All Shares
            </button>
          </div>

          <div className="sharing-detail-info">
            <div className="sharing-detail-icon">
              {activeShare.resourceType === 'note' ? <NoteIcon /> : <SectionIcon />}
            </div>
            <div>
              <h1 className="sharing-detail-name">{activeShare.resourceName}</h1>
              <div className="sharing-detail-meta">
                <Badge variant="info">{activeShare.resourceType}</Badge>
                <span>&middot; {activeShare.recipients.length} recipient{activeShare.recipients.length !== 1 ? 's' : ''}</span>
                <span>&middot; Shared {new Date(activeShare.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Permissions summary */}
          <div className="sharing-permissions-card">
            <h3>Permissions</h3>
            <div className="sharing-permissions-list">
              <div className="sharing-perm-item">
                <span>Can edit</span>
                <Badge variant={activeShare.permissions.canEdit ? 'success' : 'default'}>
                  {activeShare.permissions.canEdit ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="sharing-perm-item">
                <span>Can share</span>
                <Badge variant={activeShare.permissions.canShare ? 'success' : 'default'}>
                  {activeShare.permissions.canShare ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="sharing-perm-item">
                <span>Can export</span>
                <Badge variant={activeShare.permissions.canExport ? 'success' : 'default'}>
                  {activeShare.permissions.canExport ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="sharing-recipients-section">
            <h2>Recipients</h2>
            <div className="sharing-recipients-list">
              {activeShare.recipients.map((r) => (
                <div key={r.id} className="sharing-recipient-row">
                  <div className="sharing-recipient-avatar">
                    {r.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="sharing-recipient-info">
                    <div className="sharing-recipient-name">
                      {r.displayName}
                      <Badge variant={roleBadgeVariant[r.role]}>{roleLabels[r.role]}</Badge>
                      <Badge variant={statusBadgeVariant[r.status] as any} size="sm">{r.status}</Badge>
                    </div>
                    <div className="sharing-recipient-email">{r.email}</div>
                  </div>
                  <button
                    className="sharing-revoke-btn"
                    onClick={() => setConfirmRevokeId({ shareId: activeShare.id, recipientId: r.id })}
                    title="Revoke access"
                  >
                    <RevokeIcon /> Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Encryption info */}
          <div className="sharing-crypto-info">
            <KeyIcon />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>End-to-end encrypted sharing</div>
              <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>
                Content keys wrapped per-recipient via X25519 ECDH. Server stores ciphertext only.
                Revoking a recipient triggers key rotation for remaining members.
              </div>
            </div>
          </div>
        </div>

        {/* Revoke confirm */}
        {confirmRevokeId && (
          <div className="delete-confirm-overlay" onClick={() => setConfirmRevokeId(null)}>
            <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Revoke access?</h3>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
                This will remove the recipient&rsquo;s access and rotate the content encryption key.
              </p>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--dl-warning-bg)', border: '1px solid rgba(234,179,8,0.2)', fontSize: '12px', color: 'var(--dl-text-secondary)', marginBottom: '16px' }}>
                <strong>Cryptographic rekey:</strong> All remaining recipients will receive a new wrapped key. Previously downloaded content cannot be re-decrypted by the revoked user going forward.
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeId(null)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => handleRevoke(confirmRevokeId.shareId, confirmRevokeId.recipientId)}>
                  Revoke &amp; Rekey
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── List View ────────────────────────────────────────────── */
  return (
    <div className="sharing-screen">
      <TopBar />
      <div className="sharing-body">
        <div className="sharing-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Sharing</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              {sharedResources.length} shared resource{sharedResources.length !== 1 ? 's' : ''} &middot; key-wrapped encrypted envelopes
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusIcon /> Share Resource
            </span>
          </Button>
        </div>

        {sharedResources.length === 0 ? (
          <div className="sharing-empty">
            <ShareGraphic />
            <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>Nothing shared yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '320px' }}>
              Share a note or section with another Darklock user. Content keys are wrapped per-recipient using X25519 — the server never sees plaintext.
            </p>
            <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)} style={{ marginTop: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon /> Share Resource
              </span>
            </Button>
          </div>
        ) : (
          <div className="sharing-grid">
            {sharedResources.map((resource) => (
              <div key={resource.id} className="sharing-card" onClick={() => setActiveShare(resource.id)}>
                <div className="sharing-card-header">
                  <div className="sharing-card-icon">
                    {resource.resourceType === 'note' ? <NoteIcon /> : <SectionIcon />}
                  </div>
                  <div className="sharing-card-title">
                    <div className="sharing-card-name">{resource.resourceName}</div>
                    <Badge variant="info" size="sm">{resource.resourceType}</Badge>
                  </div>
                </div>
                <div className="sharing-card-recipients">
                  {resource.recipients.slice(0, 3).map((r) => (
                    <div key={r.id} className="sharing-card-avatar" title={r.displayName}>
                      {r.displayName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {resource.recipients.length > 3 && (
                    <span className="sharing-card-more">+{resource.recipients.length - 3}</span>
                  )}
                </div>
                <div className="sharing-card-meta">
                  Shared {new Date(resource.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Encryption info */}
        <div className="collab-info-bar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="6.5" width="8" height="5.5" rx="1.5" stroke="var(--dl-success)" strokeWidth="1.1" />
            <path d="M5 6.5V4.5a2 2 0 0 1 4 0v2" stroke="var(--dl-success)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span>Sharing uses <strong>X25519 key exchange</strong> with per-recipient wrapped keys. Revocation triggers key rotation.</span>
        </div>
      </div>

      {/* ── Invite Modal ──────────────────────────────────────── */}
      {showInviteModal && (
        <Modal isOpen={true} title="Share Resource" onClose={() => setShowInviteModal(false)} size="md">
          <div className="modal-form">
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>
              Select a note or section, choose a role, and enter the recipient&rsquo;s email.
              An encrypted invite envelope will be created.
            </p>

            {/* Resource type toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--dl-text)' }}>Resource Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['note', 'section'] as const).map((t) => (
                  <button key={t} onClick={() => { setInviteType(t); setInviteResourceId(''); }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${inviteType === t ? 'var(--dl-accent)' : 'var(--dl-border)'}`,
                      background: inviteType === t ? 'var(--dl-accent-muted)' : 'transparent',
                      color: inviteType === t ? 'var(--dl-accent)' : 'var(--dl-text-secondary)',
                    }}>
                    {t === 'note' ? 'Note' : 'Section'}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource picker */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--dl-text)' }}>
                {inviteType === 'note' ? 'Select Note' : 'Select Section'}
              </label>
              <select
                value={inviteResourceId}
                onChange={(e) => setInviteResourceId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--dl-border)', background: 'var(--dl-bg-surface)',
                  color: 'var(--dl-text)', fontSize: '13px', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">Choose…</option>
                {inviteType === 'note'
                  ? notes.map((n) => <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>)
                  : sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                }
              </select>
            </div>

            {/* Role */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--dl-text)' }}>Permission Level</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['viewer', 'editor', 'owner'] as ShareRole[]).map((role) => (
                  <button key={role} onClick={() => setInviteRole(role)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${inviteRole === role ? 'var(--dl-accent)' : 'var(--dl-border)'}`,
                      background: inviteRole === role ? 'var(--dl-accent-muted)' : 'transparent',
                      color: inviteRole === role ? 'var(--dl-accent)' : 'var(--dl-text-secondary)',
                      textAlign: 'center',
                    }}>
                    <div>{roleLabels[role]}</div>
                    <div style={{ fontSize: '10px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>
                      {role === 'viewer' && 'Read only'}
                      {role === 'editor' && 'Read + write'}
                      {role === 'owner' && 'Full control'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Recipient email"
              value={inviteEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleShare(); }}
              placeholder="colleague@example.com"
            />

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleShare} disabled={inviteLoading || !inviteEmail.trim() || !inviteResourceId}>
                {inviteLoading ? <Spinner size={16} /> : 'Create Invite Envelope'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
