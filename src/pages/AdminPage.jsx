import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Check } from 'lucide-react';
import {
  getAdminUsers, deleteAdminUser,
  getAllowedEmails, addAllowedEmail, deleteAllowedEmail,
  generateInvite, getInvites, deleteInvite,
} from '../api';

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Confirm</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [confirmUser, setConfirmUser] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addError, setAddError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  if (!isAdmin) {
    return <div className="empty-state">Access denied.</div>;
  }

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
  });
  const { data: allowed = [], isLoading: allowedLoading } = useQuery({
    queryKey: ['admin', 'allowed'],
    queryFn: getAllowedEmails,
  });
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: getInvites,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteUserMutation = useMutation({
    mutationFn: (id) => deleteAdminUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const addEmailMutation = useMutation({
    mutationFn: (data) => addAllowedEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'allowed'] });
      setNewEmail('');
      setNewNote('');
      setAddError('');
    },
    onError: (e) => setAddError(e.message),
  });
  const deleteEmailMutation = useMutation({
    mutationFn: (id) => deleteAllowedEmail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed'] }),
  });
  const generateInviteMutation = useMutation({
    mutationFn: generateInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  });
  const deleteInviteMutation = useMutation({
    mutationFn: (id) => deleteInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  });

  async function handleAddEmail(e) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    addEmailMutation.mutate({ email: newEmail.trim(), note: newNote.trim() });
  }

  function copyLink(invite) {
    const url = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite._id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const labelStyle = {
    fontSize: 10, fontWeight: 800, color: 'var(--text3)',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
  };
  const cellStyle = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid var(--border)' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <div className="page-subtitle">Access control</div>
        </div>
      </div>

      {/* ── Allowed Emails ──────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={labelStyle}>Allowed Emails</div>

        {/* Add form */}
        <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
            style={{ flex: 2 }}
          />
          <input
            className="input"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Note (optional)"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-accent" style={{ flexShrink: 0, gap: 4 }} disabled={addEmailMutation.isPending}>
            <PlusIcon />
          </button>
        </form>
        {addError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{addError}</div>}

        {allowedLoading ? <div className="spinner" /> : (
          <div style={{ background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
            {allowed.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No emails yet</div>
            ) : (
              allowed.map((entry) => (
                <div key={entry._id} style={{ display: 'flex', alignItems: 'center', ...cellStyle }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.email}
                    </div>
                    {entry.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{entry.note}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginRight: 8, flexShrink: 0 }}>
                    {new Date(entry.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--red)', flexShrink: 0 }}
                    onClick={() => setConfirmEmail(entry)}
                    disabled={deleteEmailMutation.isPending}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Invite Links ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={labelStyle}>Invite Links</div>
          <button
            className="btn btn-accent"
            style={{ gap: 5, fontSize: 11, padding: '5px 10px', marginBottom: 10 }}
            onClick={() => generateInviteMutation.mutate()}
            disabled={generateInviteMutation.isPending}
          >
            <LinkIcon /> {generateInviteMutation.isPending ? 'Generating…' : 'New Invite'}
          </button>
        </div>

        {invitesLoading ? <div className="spinner" /> : (
          <div style={{ background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
            {invites.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No invite links yet</div>
            ) : (
              invites.map((inv) => {
                const expired = new Date(inv.expiresAt) < new Date();
                const used = !!inv.usedAt;
                return (
                  <div key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: 8, ...cellStyle }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: used || expired ? 'var(--text3)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        /invite/{inv.token.slice(0, 12)}…
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {used
                          ? <span style={{ color: 'var(--accent)' }}>Used by {inv.usedByEmail}</span>
                          : expired
                          ? <span style={{ color: 'var(--red)' }}>Expired</span>
                          : <span>Expires {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        }
                      </div>
                    </div>
                    {!used && !expired && (
                      <button
                        className="btn-icon"
                        onClick={() => copyLink(inv)}
                        style={{ color: copiedId === inv._id ? 'var(--accent)' : 'var(--text2)', flexShrink: 0 }}
                        title="Copy link"
                      >
                        {copiedId === inv._id ? <Check size={14} /> : <CopyIcon />}
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--red)', flexShrink: 0 }}
                      onClick={() => deleteInviteMutation.mutate(inv._id)}
                      disabled={deleteInviteMutation.isPending}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Registered Users ──────────────────────────────────────────────── */}
        <div style={labelStyle}>Registered Users</div>

        {usersLoading ? <div className="spinner" /> : (
          <div style={{ background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
            {users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No users yet</div>
            ) : (
              users.map((user) => (
                <div key={user._id} style={{ display: 'flex', alignItems: 'center', ...cellStyle }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginRight: 10, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0a0a0a', marginRight: 10, flexShrink: 0 }}>
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name || '(no name)'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginRight: 8, flexShrink: 0, textAlign: 'right' }}>
                    <div>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div>Last in {new Date(user.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--red)', flexShrink: 0 }}
                    onClick={() => setConfirmUser(user)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {confirmEmail && (
        <ConfirmModal
          message={`Remove ${confirmEmail.email} from the allowed list?`}
          onConfirm={() => { deleteEmailMutation.mutate(confirmEmail._id); setConfirmEmail(null); }}
          onClose={() => setConfirmEmail(null)}
        />
      )}
      {confirmUser && (
        <ConfirmModal
          message={`Delete user ${confirmUser.email} and ALL their splits and logs? This cannot be undone.`}
          onConfirm={() => { deleteUserMutation.mutate(confirmUser._id); setConfirmUser(null); }}
          onClose={() => setConfirmUser(null)}
        />
      )}
    </div>
  );
}
