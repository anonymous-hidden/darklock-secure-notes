/**
 * Darklock Secure Notes — Collaborators Screen
 *
 * Manage note sharing, team members, permissions, and pending invites.
 * End-to-end encrypted sharing via X25519 key exchange.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, Collaborator, SharedNote, CollabRole } from '../stores/appStore';
import { Button, Input, Modal, Badge, Spinner } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const TeamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1 17c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M13 17c0-2.5 1.5-4 3.5-4 1.5 0 2.5 1 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const InviteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 13c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M11 3v4M9 5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SharedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="11" cy="3" r="2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4.8 6.2l4.4-2.4M4.8 7.8l4.4 2.4" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const CrownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 9L1 4l3 2 2-3 2 3 3-2-1 5z" stroke="#eab308" strokeWidth="1" fill="#eab308" opacity="0.8" />
  </svg>
);

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2-6.5 6.5H2V8z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z" stroke="currentColor" strokeWidth="1" />
    <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const LockShareIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="ls-g" x1="8" y1="8" x2="40" y2="40">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <rect x="16" y="22" width="16" height="12" rx="3" stroke="url(#ls-g)" strokeWidth="1.5" />
    <path d="M20 22v-4a4 4 0 0 1 8 0v4" stroke="url(#ls-g)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="18" r="3" stroke="url(#ls-g)" strokeWidth="1.2" />
    <circle cx="38" cy="18" r="3" stroke="url(#ls-g)" strokeWidth="1.2" />
    <path d="M13 18h3M32 18h3" stroke="url(#ls-g)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

const roleLabel: Record<CollabRole, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const roleBadge: Record<CollabRole, 'info' | 'success' | 'default'> = { owner: 'info', editor: 'success', viewer: 'default' };

/* ── Component ─────────────────────────────────────────────────── */
export const Collaborators: React.FC = () => {
  const setScreen = useAppStore((s) => s.setScreen);
  const collaborators = useAppStore((s) => s.collaborators);
  const sharedNotes = useAppStore((s) => s.sharedNotes);
  const addCollaborator = useAppStore((s) => s.addCollaborator);
  const removeCollaborator = useAppStore((s) => s.removeCollaborator);
  const updateCollaboratorRole = useAppStore((s) => s.updateCollaboratorRole);
  const storageMode = useAppStore((s) => s.storageMode);
  const showCollabInviteModal = useAppStore((s) => s.showCollabInviteModal);
  const setShowCollabInviteModal = useAppStore((s) => s.setShowCollabInviteModal);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollabRole>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [tab, setTab] = useState<'team' | 'shared' | 'pending'>('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const filteredCollabs = useMemo(() => {
    if (!searchQuery) return collaborators;
    const q = searchQuery.toLowerCase();
    return collaborators.filter(
      (c) => c.email.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q),
    );
  }, [collaborators, searchQuery]);

  const pendingCollabs = collaborators.filter((c) => c.status === 'pending');
  const activeCollabs = filteredCollabs.filter((c) => c.status === 'active');

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // simulated
      addCollaborator({
        id: crypto.randomUUID(),
        email: inviteEmail.trim(),
        displayName: inviteEmail.split('@')[0],
        role: inviteRole,
        status: 'pending',
        addedAt: new Date().toISOString(),
      });
      setInviteEmail('');
      setShowCollabInviteModal(false);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    removeCollaborator(id);
    setConfirmRemoveId(null);
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="collab-screen">
      <TopBar />

      <div className="collab-body">
        {/* Header */}
        <div className="collab-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.3px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <TeamIcon /> Collaborators
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              {collaborators.length} member{collaborators.length !== 1 ? 's' : ''} &middot;{' '}
              {pendingCollabs.length} pending invite{pendingCollabs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={() => setScreen('library')}>
              Back to Library
            </Button>
            {storageMode === 'cloud' && (
              <Button variant="primary" size="sm" onClick={() => setShowCollabInviteModal(true)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <InviteIcon /> Invite Member
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="collab-tabs">
          {(['team', 'shared', 'pending'] as const).map((t) => (
            <button
              key={t}
              className={`collab-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'team' && 'Team Members'}
              {t === 'shared' && 'Shared Notes'}
              {t === 'pending' && `Pending (${pendingCollabs.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="collab-search" style={{ padding: '0 0 16px' }}>
          <input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', maxWidth: '400px', padding: '8px 14px',
              background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)',
              borderRadius: '8px', color: 'var(--dl-text)', fontSize: '13px', outline: 'none',
            }}
          />
        </div>

        {/* Content */}
        {tab === 'team' && (
          <div className="collab-list">
            {storageMode !== 'cloud' ? (
              <div className="collab-empty">
                <LockShareIcon />
                <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>Cloud Sync Required</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '320px' }}>
                  Collaboration requires cloud sync mode. Your notes are shared via encrypted key exchange — 
                  no one (including the server) can read your content.
                </p>
                <Button variant="primary" size="sm" onClick={() => setScreen('settings')}>
                  Enable Cloud Sync
                </Button>
              </div>
            ) : activeCollabs.length === 0 ? (
              <div className="collab-empty">
                <LockShareIcon />
                <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>No team members yet</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '300px' }}>
                  Invite people to collaborate on encrypted notes. They&apos;ll get their own encryption keys.
                </p>
                <Button variant="primary" size="sm" onClick={() => setShowCollabInviteModal(true)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <InviteIcon /> Send First Invite
                  </span>
                </Button>
              </div>
            ) : (
              <div className="collab-member-grid">
                {activeCollabs.map((c) => (
                  <div key={c.id} className="collab-member-card">
                    <div className="collab-member-avatar">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.displayName} />
                      ) : (
                        <span>{c.displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dl-text)' }}>
                          {c.displayName}
                        </span>
                        {c.role === 'owner' && <CrownIcon />}
                        <Badge variant={roleBadge[c.role]}>{roleLabel[c.role]}</Badge>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>
                        {c.email}
                      </div>
                      {c.lastSeen && (
                        <div style={{ fontSize: '11px', color: 'var(--dl-text-muted)', marginTop: '4px' }}>
                          Last seen: {new Date(c.lastSeen).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {c.role !== 'owner' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={c.role}
                          onChange={(e) => updateCollaboratorRole(c.id, e.target.value as CollabRole)}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--dl-border)',
                            background: 'var(--dl-bg-surface)', color: 'var(--dl-text)', fontSize: '11px',
                            cursor: 'pointer', outline: 'none',
                          }}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className="collab-remove-btn"
                          onClick={() => setConfirmRemoveId(c.id)}
                          title="Remove member"
                        >
                          <RemoveIcon />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'shared' && (
          <div className="collab-shared">
            {sharedNotes.length === 0 ? (
              <div className="collab-empty">
                <SharedIcon />
                <h3 style={{ margin: '12px 0 6px', fontSize: '15px', fontWeight: 600 }}>No shared notes</h3>
                <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)' }}>
                  Open a note and click &quot;Share&quot; to start collaborating.
                </p>
              </div>
            ) : (
              <div className="collab-shared-list">
                {sharedNotes.map((sn) => (
                  <div key={sn.noteId} className="collab-shared-card">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dl-text)' }}>{sn.noteTitle}</div>
                      <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>
                        in {sn.sectionName} &middot; {sn.collaborators.length} collaborator{sn.collaborators.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {sn.permissions.canEdit && <Badge variant="success">Can Edit</Badge>}
                      {sn.permissions.canShare && <Badge variant="info">Can Share</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'pending' && (
          <div className="collab-pending">
            {pendingCollabs.length === 0 ? (
              <div className="collab-empty">
                <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)' }}>No pending invitations.</p>
              </div>
            ) : (
              <div className="collab-member-grid">
                {pendingCollabs.map((c) => (
                  <div key={c.id} className="collab-member-card pending">
                    <div className="collab-member-avatar pending">
                      <span>{c.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', marginTop: '2px' }}>
                        Invited as {roleLabel[c.role]} &middot; {new Date(c.addedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                    <button className="collab-remove-btn" onClick={() => handleRemove(c.id)} title="Cancel invite">
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Encryption info bar */}
        <div className="collab-info-bar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="6.5" width="8" height="5.5" rx="1.5" stroke="var(--dl-success)" strokeWidth="1.1" />
            <path d="M5 6.5V4.5a2 2 0 0 1 4 0v2" stroke="var(--dl-success)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span>All sharing uses <strong>X25519 ECDH key exchange</strong> — notes are encrypted before leaving your device.</span>
        </div>
      </div>

      {/* ── Invite Modal ──────────────────────────────────────── */}
      {showCollabInviteModal && (
        <Modal isOpen={true} title="Invite Collaborator" onClose={() => setShowCollabInviteModal(false)} size="sm">
          <div className="modal-form">
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>
              The invitee must have a Darklock account. Their encryption keys will be fetched automatically.
            </p>
            <Input
              label="Email address"
              type="email"
              value={inviteEmail}
              autoFocus
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleInvite(); }}
              placeholder="user@example.com"
            />
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--dl-text)' }}>
                Permission Level
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['editor', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid',
                      borderColor: inviteRole === r ? 'var(--dl-accent)' : 'var(--dl-border)',
                      background: inviteRole === r ? 'var(--dl-accent-muted)' : 'var(--dl-bg-surface)',
                      color: inviteRole === r ? 'var(--dl-accent)' : 'var(--dl-text-secondary)',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {r === 'editor' ? <EditIcon /> : <EyeIcon />}
                    {r === 'editor' ? 'Can Edit' : 'View Only'}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowCollabInviteModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? <Spinner size={16} /> : 'Send Invite'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Remove Confirm ────────────────────────────────────── */}
      {confirmRemoveId && (
        <div className="delete-confirm-overlay" onClick={() => setConfirmRemoveId(null)}>
          <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Remove member?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              They will lose access to all shared notes. Their copy of shared content will be revoked.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleRemove(confirmRemoveId)}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
