import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { useAuth } from '../context/AuthContext';
import SplitShareModal from '../components/SplitShareModal';

const API = import.meta.env.VITE_API_URL || '';

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, flexShrink: 0,
      border: '1.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    }} />
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function SplitModal({ title, initial = '', onConfirm, onClose }) {
  const [value, setValue] = useState(initial);
  function submit(e) { e.preventDefault(); if (!value.trim()) return; onConfirm(value.trim()); }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        <form onSubmit={submit}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Split name…" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save</button>
          </div>
        </form>
      </div>
    </div>
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

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const { user, isLoggedIn, logout } = useAuth();
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const signInTimer = useRef(null);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['splits'] });

  const activateMutation = useMutation({ mutationFn: (id) => storage.activateSplit(id), onSuccess: invalidate });
  const createMutation = useMutation({ mutationFn: (name) => storage.createSplit(name), onSuccess: invalidate });
  const renameMutation = useMutation({ mutationFn: ({ id, name }) => storage.renameSplit(id, name), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id) => storage.deleteSplit(id), onSuccess: invalidate });

  async function handleActivate(split) {
    if (split.isActive || actionLoading) return;
    setActionLoading(split._id);
    try { await activateMutation.mutateAsync(split._id); }
    finally { setActionLoading(null); }
  }
  async function handleCreate(name) { setModal(null); await createMutation.mutateAsync(name); }
  async function handleRename(name) { const id = modal.split._id; setModal(null); await renameMutation.mutateAsync({ id, name }); }
  async function handleDelete() { const id = modal.split._id; setModal(null); await deleteMutation.mutateAsync(id); }

  function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    setSignInFailed(false);
    signInTimer.current = setTimeout(() => {
      setSigningIn(false);
      setSignInFailed(true);
    }, 5000);
    fetch(`${API}/api/auth/google/url`)
      .then((r) => r.json())
      .then(({ url }) => {
        clearTimeout(signInTimer.current);
        window.location.href = url;
      })
      .catch(() => {
        clearTimeout(signInTimer.current);
        setSigningIn(false);
        window.location.href = `${API}/api/auth/google`;
      });
  }

  return (
    <div>
      {/* Sign-in status toast */}
      {signingIn && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--text3)', padding: '8px 14px', borderRadius: 20,
          fontSize: 12, fontWeight: 500, zIndex: 200, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 7,
          animation: 'fadeIn 0.15s ease',
        }}>
          <InlineSpinner /> Opening Google Sign In…
        </div>
      )}

      {/* Sign-in timeout error toast */}
      {signInFailed && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg2)', border: '1px solid var(--red)',
          color: 'var(--text)', padding: '10px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, zIndex: 300, maxWidth: 300,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.15s ease',
        }}>
          <span style={{ flex: 1 }}>Sign in failed. Please try again.</span>
          <button onClick={() => setSignInFailed(false)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      {/* Override the global 80px right padding — auth lives inside this header */}
      <div className="page-header" style={{ padding: '16px 20px' }}>
        {/* Left: title + count */}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Splits</h1>
          <div className="page-subtitle">{splits.length} programs</div>
        </div>

        {/* Right: auth control + primary action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Auth: avatar (logged in) or ghost sign-in button (guest) */}
          {isLoggedIn ? (
            <div style={{ position: 'relative' }}>
              {/* 44×44 tap target: 30px avatar + 7px padding on each side */}
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 7, borderRadius: '50%', display: 'flex',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Account menu"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#0a0a0a',
                  }}>
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 150,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '8px 0', minWidth: 180,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.12s ease',
                  }}>
                    <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      style={{
                        width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left', color: 'var(--red)',
                        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Ghost sign-in — intentionally secondary to + New */
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border2)',
                color: 'var(--text3)', cursor: signingIn ? 'default' : 'pointer',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                opacity: signingIn ? 0.5 : 1, transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {signingIn ? (
                <><InlineSpinner /> Redirecting…</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign in
                </>
              )}
            </button>
          )}

          {/* Primary action: always accent, always prominent */}
          <button className="btn btn-accent" onClick={() => setModal({ type: 'add' })}>
            <PlusIcon /> New
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="empty-state">No splits yet.<br />Tap New to create one.</div>
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {splits.map((split) => (
            <div
              key={split._id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10,
                borderRadius: 10, border: `1px solid ${split.isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: split.isActive ? 'rgba(232,255,90,0.04)' : 'var(--bg2)',
                opacity: actionLoading === split._id ? 0.5 : 1, transition: 'opacity 0.15s',
              }}
            >
              <button
                onClick={() => handleActivate(split)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${split.isActive ? 'var(--accent)' : 'var(--border2)'}`,
                  background: split.isActive ? 'var(--accent)' : 'transparent',
                  flexShrink: 0, cursor: split.isActive ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}
              >
                {split.isActive && <CheckIcon />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em',
                  color: split.isActive ? 'var(--accent)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {split.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>
                  {split.days?.length || 0} days
                  {split.isActive && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', fontSize: 10, textTransform: 'uppercase' }}>● Active</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-icon" onClick={() => setModal({ type: 'rename', split })} title="Rename">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5Z" />
                  </svg>
                </button>
                <button className="btn-icon" onClick={() => setShareModal(split)} title="Share">
                  <ShareIcon />
                </button>
                <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setModal({ type: 'delete', split })} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
                    <line x1="6.5" y1="7" x2="6.5" y2="11" /><line x1="9.5" y1="7" x2="9.5" y2="11" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'add' && <SplitModal title="New Split" onConfirm={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'rename' && <SplitModal title="Rename Split" initial={modal.split.name} onConfirm={handleRename} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <ConfirmModal message={`Delete "${modal.split.name}"? This cannot be undone.`} onConfirm={handleDelete} onClose={() => setModal(null)} />}
      {shareModal && <SplitShareModal split={shareModal} onClose={() => setShareModal(null)} />}
    </div>
  );
}
