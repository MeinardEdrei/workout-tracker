import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { isOnline, formatPresence } from '../utils/presence';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="13" y1="5" x2="5" y2="13" />
      <line x1="5" y1="5" x2="13" y2="13" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

export default function UserStatsModal({ user, filter, onClose }) {
  const workoutCount = user.workoutCount || 0;
  const totalVolume = user.totalVolume || 0;
  const volLabel = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k kg` : `${totalVolume} kg`;

  // Format last active time — from real presence (lastActiveAt, kept fresh by
  // a heartbeat while the app is open), not lastLoginAt (only updates on OAuth
  // login, so it can be stale for days into a still-valid session).
  const online = isOnline(user.lastActiveAt);
  const lastActiveStr = useMemo(() => {
    const presence = formatPresence(user.lastActiveAt);
    return presence === 'Online' ? 'Online now' : `Active ${presence}`;
  }, [user.lastActiveAt]);

  // Format last workout message
  const lastWorkoutStr = useMemo(() => {
    if (!user.latestWorkout || !user.latestWorkout.date) return null;
    const date = new Date(user.latestWorkout.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Logged "${user.latestWorkout.dayName.split('—')[0].trim()}" on ${dateStr}`;
  }, [user.latestWorkout]);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 900, color: '#0a0a0a'
              }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                {user.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: online ? 'var(--green)' : 'var(--text3)', marginTop: 2, fontWeight: online ? 700 : 400 }}>
                {online && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />}
                {lastActiveStr}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 4 }} title="Close">
            <CloseIcon />
          </button>
        </div>

        {/* User Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Workouts ({filter})</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
              {workoutCount} completed
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Est. Volume ({filter})</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {volLabel}
            </div>
          </div>
        </div>

        {/* Latest Activity */}
        {lastWorkoutStr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)', background: 'rgba(232,255,90,0.03)', border: '1px solid rgba(232,255,90,0.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
            <CalendarIcon />
            <span style={{ fontWeight: 600 }}>{lastWorkoutStr}</span>
          </div>
        )}

        {/* Active Split Structure */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Current Program: <span style={{ color: 'var(--text)' }}>{user.activeSplitName}</span>
          </div>

          {user.activeSplitDays && user.activeSplitDays.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {user.activeSplitDays.map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: day.isRest ? 'transparent' : 'var(--bg2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                      {day.name}
                    </span>
                    {day.isRest ? (
                      <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3 }}>
                        REST
                      </span>
                    ) : day.tag ? (
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', background: 'rgba(232,255,90,0.06)', padding: '1px 6px', borderRadius: 4 }}>
                        {day.tag}
                      </span>
                    ) : null}
                  </div>
                  {!day.isRest && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                      {day.exerciseCount} exercise{day.exerciseCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
              No active training days defined.
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
