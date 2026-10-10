import { useState, useRef, useEffect } from 'react';
import { X, CalendarDays, List, BarChart3, Calculator, UserCog } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQueryClient } from '@tanstack/react-query';
import './index.css';
import '@ncdai/react-wheel-picker/style.css';
import './styles/wheelPicker.css';
import { useAuth } from './context/AuthContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { syncOfflineQueue } from './storage/offlineSyncStorage';
import InvitePage from './pages/InvitePage';
import TodayPage from './pages/TodayPage';
import SplitsPage from './pages/SplitsPage';
import StatsPage from './pages/StatsPage';
import AdminPage from './pages/AdminPage';
import CalculatorPage from './pages/CalculatorPage';
import ProfilePage from './pages/ProfilePage';
import { getPrimaryActiveRestTimer, setActiveRestTimer, clearActiveRestTimer, clearAllActiveRestTimers, secondsRemaining } from './utils/restTimer';
import Toast from './components/Toast';
import { useBackClose } from './hooks/useBackClose';

const API = import.meta.env.VITE_API_URL || '';

function playRestChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Two-tone pleasant notification chime: D5 (587Hz) then A5 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.65);
  } catch {}
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([120, 80, 200]); } catch {}
  }
}

// Primary rest timer banner fixed above the bottom nav.
// Acts as the single source of truth for active rest across all views.
function ActiveRestBanner({ onJumpToToday }) {
  const [rec, setRec] = useState(() => getPrimaryActiveRestTimer());
  const [now, setNow] = useState(Date.now());
  const chimedEndsAtRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const currentNow = Date.now();
      setNow(currentNow);
      setRec(getPrimaryActiveRestTimer(currentNow));
    };
    const timer = setInterval(update, 1000);
    window.addEventListener('wt_rest_timer_change', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('wt_rest_timer_change', update);
    };
  }, []);

  useEffect(() => {
    if (!rec) return;
    const remaining = secondsRemaining(rec.restEndsAt, now);
    if (remaining <= 0 && chimedEndsAtRef.current !== rec.restEndsAt) {
      chimedEndsAtRef.current = rec.restEndsAt;
      playRestChime();
    }
  }, [rec, now]);

  if (!rec) return null;
  const remaining = secondsRemaining(rec.restEndsAt, now);

  const addTime = (e) => {
    e.stopPropagation();
    const newEndsAt = Math.max(Date.now(), rec.restEndsAt) + 30 * 1000;
    chimedEndsAtRef.current = null;
    setActiveRestTimer({ ...rec, restEndsAt: newEndsAt });
    setRec({ ...rec, restEndsAt: newEndsAt });
    setNow(Date.now());
  };

  const subtractTime = (e) => {
    e.stopPropagation();
    const currentNow = Date.now();
    const newEndsAt = Math.max(currentNow, rec.restEndsAt - 15 * 1000);
    setActiveRestTimer({ ...rec, restEndsAt: newEndsAt });
    setRec({ ...rec, restEndsAt: newEndsAt });
    setNow(currentNow);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    if (rec.exerciseId) {
      clearActiveRestTimer(rec.exerciseId);
    } else {
      clearAllActiveRestTimers();
    }
    setRec(null);
  };

  const handleBannerClick = () => {
    onJumpToToday();
    if (rec.exerciseId && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wt_focus_exercise', { detail: { exerciseId: rec.exerciseId } }));
    }
  };

  return (
    <div
      onClick={handleBannerClick}
      style={{
        position: 'fixed',
        bottom: 'var(--above-nav)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 456,
        zIndex: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', cursor: 'pointer',
        background: 'rgba(17, 17, 17, 0.95)',
        backdropFilter: 'blur(10px)',
        border: remaining > 0 ? '1.5px solid var(--accent)' : '1.5px solid var(--green)',
        borderRadius: 12,
        boxShadow: remaining > 0
          ? '0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(var(--accent-rgb), 0.18)'
          : '0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(74,222,128,0.25)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: remaining > 0 ? 'var(--accent)' : 'var(--green)',
          animation: remaining > 0 ? 'pulse 1.5s infinite' : 'none',
          boxShadow: remaining > 0 ? '0 0 8px var(--accent)' : '0 0 8px var(--green)',
          flexShrink: 0
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {remaining > 0 ? `Resting · ${rec.exerciseName || 'Exercise'}` : `Rest complete · ${rec.exerciseName || 'Exercise'}`}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-mono)',
            color: remaining > 0 ? 'var(--accent)' : 'var(--green)', lineHeight: 1.1
          }}>
            {remaining > 0 ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}` : 'Ready for next set!'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {remaining > 15 && (
          <button
            type="button"
            onClick={subtractTime}
            title="Subtract 15 seconds"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border2)',
              borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
              color: 'var(--text2)', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)'
            }}
          >
            -15s
          </button>
        )}
        <button
          type="button"
          onClick={addTime}
          title="Add 30 seconds"
          style={{
            background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.35)',
            borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
            color: 'var(--accent)', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)'
          }}
        >
          +30s
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: remaining > 0 ? 'none' : 'rgba(74,222,128,0.15)',
            border: remaining > 0 ? '1px solid var(--border2)' : '1px solid var(--green)',
            borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
            color: remaining > 0 ? 'var(--text2)' : 'var(--green)',
            fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)'
          }}
        >
          {remaining > 0 ? 'Skip' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'splits', label: 'Splits' },
  { id: 'stats', label: 'Stats' },
  { id: 'calc', label: 'Calc' },
];

// Nav icons: lucide glyphs, with a heavier stroke on the active tab.
const navIcon = (Glyph) => function NavIcon({ active }) {
  return <Glyph size={22} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />;
};
const ICONS = { today: navIcon(CalendarDays), splits: navIcon(List), stats: navIcon(BarChart3), calc: navIcon(Calculator), admin: navIcon(UserCog) };

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
    <Toast tone="error" onDismiss={dismissAuthError}>
      {authError === 'not_allowed'
        ? 'Access restricted. You are not on the allowed list.'
        : 'Sign-in failed. Please try again.'}
    </Toast>
  );
}

// ── Auth corner — floating, shown on all tabs except Splits ────────────────
function AuthCorner({ onOpenProfile }) {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const cornerRef = useRef(null);
  // Reserve exactly this corner's width (plus its 14px inset and an 8px gap)
  // as the right padding of page headers, so header buttons never sit under
  // it — the "Sign in" pill and the avatar are different widths.
  useEffect(() => {
    const el = cornerRef.current;
    if (!el) return undefined;
    const root = document.documentElement.style;
    const update = () => root.setProperty('--auth-corner-space', `${Math.ceil(el.getBoundingClientRect().width) + 14 + 8}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); root.setProperty('--auth-corner-space', '20px'); };
  }, []);
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
        <Toast tone="loading">Opening Google Sign In…</Toast>
      )}

      {/* Sign-in timeout error toast */}
      {signInFailed && (
        <Toast tone="error" onDismiss={() => setSignInFailed(false)}>Sign in failed. Please try again.</Toast>
      )}

      {/* Sign in button or avatar */}
      <div ref={cornerRef} style={{ position: 'absolute', top: 12, right: 14, zIndex: 50 }}>
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
                  fontSize: 13, fontWeight: 800, color: 'var(--bg)',
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
                    onClick={() => { setShowMenu(false); onOpenProfile(); }}
                    style={{
                      width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
                      fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                  >
                    My Profile
                  </button>
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

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Proactively check for updates every 5 minutes
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--above-nav)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 448,
      background: 'var(--bg2)',
      border: '1px solid var(--accent)',
      borderRadius: 12,
      padding: '12px 16px',
      zIndex: 250,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: 'var(--accent)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Update Available
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text2)',
          fontFamily: 'var(--font-mono)',
        }}>
          New features and improvements are ready.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 0.85}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
        >
          Refresh
        </button>
        <button
          onClick={close}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text3)',
            cursor: 'pointer',
            fontSize: 14,
            padding: 4,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text2)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const inviteMatch = window.location.pathname.match(/^\/invite\/([a-f0-9]+)$/i);
  if (inviteMatch) return <InvitePage token={inviteMatch[1]} />;

  const queryClient = useQueryClient();
  const { isOnline, wasOffline, setWasOffline } = useOnlineStatus();
  const { loading, isAdmin, isLoggedIn } = useAuth();
  const [syncState, setSyncState] = useState(null);

  useEffect(() => {
    if (isOnline && isLoggedIn) {
      syncOfflineQueue(({ status, count }) => {
        if (status === 'syncing') {
          setSyncState({ status: 'syncing', count });
        } else if (status === 'success') {
          setSyncState({ status: 'success' });
          queryClient.invalidateQueries();
          setWasOffline(false);
          setTimeout(() => setSyncState(null), 3000);
        } else if (status === 'error') {
          setSyncState({ status: 'error' });
          setTimeout(() => setSyncState(null), 3000);
        }
      });
    }
  }, [isOnline, isLoggedIn, queryClient, setWasOffline]);

  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem('wt_active_tab');
    if (saved && ['today', 'splits', 'stats', 'calc', 'admin'].includes(saved)) {
      return saved;
    }
    return 'today';
  });
  const [showProfile, setShowProfile] = useState(false);
  useBackClose(showProfile, () => setShowProfile(false));

  useEffect(() => {
    if (tab === 'admin' && !isAdmin && !loading) {
      setTab('today');
    } else if (!loading) {
      localStorage.setItem('wt_active_tab', tab);
    }
  }, [tab, isAdmin, loading]);

  const nav = isAdmin ? [...NAV, { id: 'admin', label: 'Admin' }] : NAV;

  if (loading) {
    return (
      <>
        <AuthErrorToast />
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
        <nav className="bottom-nav" style={{ opacity: 0.6, pointerEvents: 'none' }}>
          {NAV.map((n) => {
            const Icon = ICONS[n.id];
            const active = tab === n.id;
            return (
              <button key={n.id} className={`nav-btn ${active ? 'active' : ''}`} disabled>
                <Icon active={active} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div style={{
          background: 'rgba(25, 20, 5, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(var(--accent-rgb),  0.3)',
          color: 'var(--accent)',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent)',
            animation: 'pulse 1.5s infinite',
          }} />
          Working Offline — Syncs on Connection
        </div>
      )}

      {/* Sync Status Toast */}
      {syncState?.status === 'syncing' && (
        <Toast tone="loading">Syncing {syncState.count} offline changes…</Toast>
      )}

      {syncState?.status === 'success' && (
        <Toast tone="success">All changes synced.</Toast>
      )}

      {syncState?.status === 'error' && (
        <Toast tone="error">Sync failed. Retrying later.</Toast>
      )}

      {/* Auth error toast is global — shows on every tab */}
      <AuthErrorToast />
      <ReloadPrompt />
      {/* AuthCorner floats over all tabs except Splits, which owns its header */}
      {tab !== 'splits' && !showProfile && <AuthCorner onOpenProfile={() => setShowProfile(true)} />}
      <div className="page">
        {showProfile ? (
          <ProfilePage onBack={() => setShowProfile(false)} />
        ) : (
          <>
            {tab === 'today' && <TodayPage />}
            {tab === 'splits' && <SplitsPage />}
            {tab === 'stats' && <StatsPage />}
            {tab === 'calc' && <CalculatorPage />}
            {tab === 'admin' && isAdmin && <AdminPage />}
          </>
        )}
      </div>
      {!showProfile && <ActiveRestBanner onJumpToToday={() => { setShowProfile(false); setTab('today'); }} />}
      <nav className="bottom-nav">
        {nav.map((n) => {
          const Icon = ICONS[n.id];
          const active = tab === n.id && !showProfile;
          return (
            <button key={n.id} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => { setShowProfile(false); setTab(n.id); }}>
              <Icon active={active} />
              {n.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
