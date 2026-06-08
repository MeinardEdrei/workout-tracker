import { useState, useRef } from 'react';
import './index.css';
import { useAuth } from './context/AuthContext';
import TodayPage from './pages/TodayPage';
import SplitsPage from './pages/SplitsPage';
import EditPage from './pages/EditPage';
import StatsPage from './pages/StatsPage';
import AdminPage from './pages/AdminPage';
import CalculatorPage from './pages/CalculatorPage';

const API = import.meta.env.VITE_API_URL || '';

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'splits', label: 'Splits' },
  { id: 'stats', label: 'Stats' },
  { id: 'edit', label: 'Edit' },
  { id: 'calc', label: 'Calc' },
];

function TodayIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function SplitsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
    </svg>
  );
}
function StatsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function EditIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}
function AdminIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      <polyline points="16,11 17.5,13 21,10" />
    </svg>
  );
}
function CalcIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="8.01" y2="11" strokeWidth="2" />
      <line x1="12" y1="11" x2="12.01" y2="11" strokeWidth="2" />
      <line x1="16" y1="11" x2="16.01" y2="11" strokeWidth="2" />
      <line x1="8" y1="15" x2="8.01" y2="15" strokeWidth="2" />
      <line x1="12" y1="15" x2="12.01" y2="15" strokeWidth="2" />
      <line x1="16" y1="15" x2="16.01" y2="15" strokeWidth="2" />
      <line x1="8" y1="18" x2="8.01" y2="18" strokeWidth="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
      <line x1="16" y1="18" x2="16.01" y2="18" strokeWidth="2" />
    </svg>
  );
}

const ICONS = { today: TodayIcon, splits: SplitsIcon, stats: StatsIcon, edit: EditIcon, calc: CalcIcon, admin: AdminIcon };

// Small spinner for inline use in buttons
function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, flexShrink: 0,
      border: '1.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    }} />
  );
}

// ── Global auth error toast — shown on all tabs ─────────────────────────────
function AuthErrorToast() {
  const { authError, dismissAuthError } = useAuth();
  if (!authError) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg2)', border: '1px solid var(--red)',
      color: 'var(--text)', padding: '12px 16px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, zIndex: 300, maxWidth: 320, textAlign: 'center',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeIn 0.15s ease',
    }}>
      <span style={{ flex: 1 }}>
        {authError === 'not_allowed'
          ? 'Access restricted. You are not on the allowed list.'
          : 'Sign-in failed. Please try again.'}
      </span>
      <button
        onClick={dismissAuthError}
        style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
      >✕</button>
    </div>
  );
}

// ── Auth corner — floating, shown on all tabs except Splits ────────────────
function AuthCorner() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const signInTimer = useRef(null);

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
    <>
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

      {/* Sign in button or avatar */}
      <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 50 }}>
        {isLoggedIn ? (
          <>
            <button
              onClick={() => setShowMenu((v) => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover' }}
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

            {showMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                  onClick={() => setShowMenu(false)}
                />
                <div style={{
                  position: 'absolute', top: 38, right: 0, zIndex: 150,
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
                    {isAdmin && (
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
                        Admin
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowMenu(false); logout(); }}
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
          </>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6,
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              color: 'var(--text2)', cursor: signingIn ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'var(--font-display)', opacity: signingIn ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {signingIn ? (
              <><InlineSpinner /> Redirecting…</>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign in
              </>
            )}
          </button>
        )}
      </div>
    </>
  );
}

export default function App() {
  const { loading, isAdmin } = useAuth();
  const [tab, setTab] = useState('today');

  const nav = isAdmin ? [...NAV, { id: 'admin', label: 'Admin' }] : NAV;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Auth error toast is global — shows on every tab */}
      <AuthErrorToast />
      {/* AuthCorner floats over all tabs except Splits, which owns its header */}
      {tab !== 'splits' && <AuthCorner />}
      <div className="page">
        {tab === 'today' && <TodayPage />}
        {tab === 'splits' && <SplitsPage />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'edit' && <EditPage />}
        {tab === 'calc' && <CalculatorPage />}
        {tab === 'admin' && isAdmin && <AdminPage />}
      </div>
      <nav className="bottom-nav">
        {nav.map((n) => {
          const Icon = ICONS[n.id];
          const active = tab === n.id;
          return (
            <button key={n.id} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <Icon active={active} />
              {n.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
