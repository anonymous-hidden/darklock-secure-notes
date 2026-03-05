/**
 * Darklock Secure Notes — Teams Screen
 *
 * Simplified team collaboration with invite codes.
 * Create a team → share the code → members join with code.
 * All sharing is end-to-end encrypted via X25519 key exchange.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, Team, TeamMember, TeamRole } from '../stores/appStore';
import { Button, Input, Modal, Badge, Spinner } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── Helpers ──────────────────────────────────────────────────── */
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/1/O/0
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

/* ── SVG Icons ────────────────────────────────────────────────── */
const TeamGroupIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="7" cy="6" r="3" stroke="currentcolor" strokeWidth="1.3" />
    <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1 17c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M13 17c0-2.5 1.5-4 3.5-4 1.5 0 2.5 1 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 2l-4 10M3 4L1 7l2 3M11 4l2 3-2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1h-4A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const CrownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 9L1 4l3 2 2-3 2 3 3-2-1 5z" stroke="#eab308" strokeWidth="1" fill="#eab308" opacity="0.8" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

const roleLabel: Record<TeamRole, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const roleBadge: Record<TeamRole, 'info' | 'success' | 'default'> = { owner: 'info', admin: 'success', member: 'default' };

/* ── Component ─────────────────────────────────────────────────── */
export const Collaborators: React.FC = () => {
  const setScreen = useAppStore((s) => s.setScreen);
  const teams = useAppStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const addTeam = useAppStore((s) => s.addTeam);
  const removeTeam = useAppStore((s) => s.removeTeam);
  const setActiveTeam = useAppStore((s) => s.setActiveTeam);
  const showCreateTeamModal = useAppStore((s) => s.showCreateTeamModal);
  const showJoinTeamModal = useAppStore((s) => s.showJoinTeamModal);
  const setShowCreateTeamModal = useAppStore((s) => s.setShowCreateTeamModal);
  const setShowJoinTeamModal = useAppStore((s) => s.setShowJoinTeamModal);
  const user = useAppStore((s) => s.user);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const handleCreate = async () => {
    if (!newTeamName.trim()) return;
    setCreateLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const team: Team = {
        id: crypto.randomUUID(),
        name: newTeamName.trim(),
        inviteCode: generateInviteCode(),
        description: newTeamDesc.trim() || undefined,
        memberCount: 1,
        members: [{
          id: user?.id || crypto.randomUUID(),
          displayName: user?.displayName || user?.email?.split('@')[0] || 'You',
          email: user?.email || '',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        }],
        createdAt: new Date().toISOString(),
        ownerId: user?.id || '',
      };
      addTeam(team);
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateTeamModal(false);
      setActiveTeam(team.id);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    setJoinLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      // Simulated: in production this would call the server to validate the code
      const team: Team = {
        id: crypto.randomUUID(),
        name: `Team ${code}`,
        inviteCode: code,
        memberCount: 2,
        members: [{
          id: user?.id || crypto.randomUUID(),
          displayName: user?.displayName || user?.email?.split('@')[0] || 'You',
          email: user?.email || '',
          role: 'member',
          joinedAt: new Date().toISOString(),
        }],
        createdAt: new Date().toISOString(),
        ownerId: 'other-user',
      };
      addTeam(team);
      setJoinCode('');
      setShowJoinTeamModal(false);
      setActiveTeam(team.id);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteTeam = (id: string) => {
    removeTeam(id);
    if (activeTeamId === id) setActiveTeam(null);
    setConfirmDeleteId(null);
  };

  /* ── Team Detail View ───────────────────────────────────────── */
  if (activeTeam) {
    const isOwner = activeTeam.ownerId === user?.id;

    return (
      <div className="teams-screen">
        <TopBar />
        <div className="teams-body">
          {/* Team detail header */}
          <div className="teams-detail-header">
            <button className="teams-back-btn" onClick={() => setActiveTeam(null)}>
              <BackIcon /> All Teams
            </button>
          </div>

          <div className="teams-detail-info">
            <div className="teams-detail-avatar">
              {activeTeam.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="teams-detail-name">{activeTeam.name}</h1>
              {activeTeam.description && (
                <p className="teams-detail-desc">{activeTeam.description}</p>
              )}
              <div className="teams-detail-meta">
                {activeTeam.members.length} member{activeTeam.members.length !== 1 ? 's' : ''} &middot; Created {new Date(activeTeam.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Invite code card */}
          <div className="teams-code-card">
            <div className="teams-code-label">
              <CodeIcon /> Invite Code
            </div>
            <div className="teams-code-value">
              <span className="teams-code-mono">{activeTeam.inviteCode}</span>
              <button
                className="teams-code-copy"
                onClick={() => handleCopyCode(activeTeam.inviteCode)}
                title="Copy invite code"
              >
                {copiedCode === activeTeam.inviteCode ? '✓ Copied' : <><CopyIcon /> Copy</>}
              </button>
            </div>
            <p className="teams-code-hint">
              Share this code with others — they can join by entering it in &ldquo;Join Team&rdquo;.
            </p>
          </div>

          {/* Members list */}
          <div className="teams-members-section">
            <h2 className="teams-members-title">Members</h2>
            <div className="teams-members-list">
              {activeTeam.members.map((m) => (
                <div key={m.id} className="teams-member-row">
                  <div className="teams-member-avatar">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.displayName} />
                    ) : (
                      <span>{m.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="teams-member-info">
                    <div className="teams-member-name">
                      {m.displayName}
                      {m.role === 'owner' && <CrownIcon />}
                      <Badge variant={roleBadge[m.role]}>{roleLabel[m.role]}</Badge>
                    </div>
                    <div className="teams-member-email">{m.email}</div>
                  </div>
                  {isOwner && m.role !== 'owner' && (
                    <div className="teams-member-actions">
                      <select
                        value={m.role}
                        onChange={() => {/* updateTeamMemberRole */}}
                        className="teams-role-select"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button className="teams-remove-btn" title="Remove member">
                        <RemoveIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone for owners */}
          {isOwner && (
            <div className="teams-danger-zone">
              <h3>Danger Zone</h3>
              <p>Deleting this team will remove all members and revoke shared access.</p>
              <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(activeTeam.id)}>
                Delete Team
              </Button>
            </div>
          )}

          {/* Encryption info */}
          <div className="collab-info-bar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="6.5" width="8" height="5.5" rx="1.5" stroke="var(--dl-success)" strokeWidth="1.1" />
              <path d="M5 6.5V4.5a2 2 0 0 1 4 0v2" stroke="var(--dl-success)" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span>All sharing uses <strong>X25519 ECDH key exchange</strong> — notes are encrypted before leaving your device.</span>
          </div>
        </div>

        {/* Delete confirm */}
        {confirmDeleteId && (
          <div className="delete-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
            <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>Delete team?</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
                All members will lose access. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteTeam(confirmDeleteId)}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Teams List View (no active team) ───────────────────────── */
  return (
    <div className="teams-screen">
      <TopBar />

      <div className="teams-body">
        {/* Header */}
        <div className="teams-header">
          <div>
            <h1 className="teams-title">
              <TeamGroupIcon /> Teams
            </h1>
            <p className="teams-subtitle">
              {teams.length} team{teams.length !== 1 ? 's' : ''} &middot; Collaborate with encrypted sharing
            </p>
          </div>
          <div className="teams-header-actions">
            <Button variant="ghost" size="sm" onClick={() => setShowJoinTeamModal(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CodeIcon /> Join Team
              </span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateTeamModal(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon /> Create Team
              </span>
            </Button>
          </div>
        </div>

        {/* Teams grid */}
        {teams.length === 0 ? (
          <div className="teams-empty">
            <LockShareIcon />
            <h3>No teams yet</h3>
            <p>Create a team and share the invite code, or join one with a code from a teammate.</p>
            <div className="teams-empty-actions">
              <Button variant="primary" size="sm" onClick={() => setShowCreateTeamModal(true)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlusIcon /> Create Team
                </span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowJoinTeamModal(true)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CodeIcon /> Join with Code
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map((team) => (
              <div key={team.id} className="teams-card" onClick={() => setActiveTeam(team.id)}>
                <div className="teams-card-avatar">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="teams-card-info">
                  <div className="teams-card-name">{team.name}</div>
                  {team.description && (
                    <div className="teams-card-desc">{team.description}</div>
                  )}
                  <div className="teams-card-meta">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="teams-card-code">
                  <span className="teams-card-code-label">Code:</span>
                  <span className="teams-card-code-value">{team.inviteCode}</span>
                </div>
              </div>
            ))}

            {/* Quick-add card */}
            <div className="teams-card teams-card--add" onClick={() => setShowCreateTeamModal(true)}>
              <PlusIcon />
              <span>Create Team</span>
            </div>
          </div>
        )}

        {/* Encryption info */}
        <div className="collab-info-bar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="6.5" width="8" height="5.5" rx="1.5" stroke="var(--dl-success)" strokeWidth="1.1" />
            <path d="M5 6.5V4.5a2 2 0 0 1 4 0v2" stroke="var(--dl-success)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span>All sharing uses <strong>X25519 ECDH key exchange</strong> — notes are encrypted before leaving your device.</span>
        </div>
      </div>

      {/* ── Create Team Modal ─────────────────────────────────── */}
      {showCreateTeamModal && (
        <Modal isOpen={true} title="Create Team" onClose={() => setShowCreateTeamModal(false)} size="sm">
          <div className="modal-form">
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>
              You&apos;ll receive an invite code to share with teammates.
            </p>
            <Input
              label="Team name"
              value={newTeamName}
              autoFocus
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeamName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="e.g. Engineering, Design..."
            />
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--dl-text)' }}>
                Description (optional)
              </label>
              <input
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                placeholder="What's this team for?"
                style={{
                  width: '100%', padding: '8px 14px',
                  background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)',
                  borderRadius: '8px', color: 'var(--dl-text)', fontSize: '13px', outline: 'none',
                }}
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowCreateTeamModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={createLoading || !newTeamName.trim()}>
                {createLoading ? <Spinner size={16} /> : 'Create Team'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Join Team Modal ───────────────────────────────────── */}
      {showJoinTeamModal && (
        <Modal isOpen={true} title="Join Team" onClose={() => setShowJoinTeamModal(false)} size="sm">
          <div className="modal-form">
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>
              Enter the 6-character invite code from your teammate.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                style={{
                  width: '200px', padding: '14px 20px', textAlign: 'center',
                  background: 'var(--dl-bg-surface)', border: '2px solid var(--dl-border)',
                  borderRadius: '12px', color: 'var(--dl-text)', fontSize: '22px',
                  fontFamily: 'monospace', fontWeight: 700, letterSpacing: '6px',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--dl-accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--dl-border)'; }}
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowJoinTeamModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleJoin} disabled={joinLoading || joinCode.trim().length !== 6}>
                {joinLoading ? <Spinner size={16} /> : 'Join Team'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
