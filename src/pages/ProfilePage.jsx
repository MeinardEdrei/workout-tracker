import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../hooks/useStorage';
import { getRanking } from '../api/index';
import { computeStreak } from '../utils/streaks';
import { isOnline, formatPresence } from '../utils/presence';
import UserStatsModal from '../components/UserStatsModal';

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="9,3 5,7 9,11" />
    </svg>
  );
}

export default function ProfilePage({ onBack }) {
  const { user } = useAuth();
  const { storage, storageKey } = useStorage();
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: logs = [] } = useQuery({ queryKey: ['logs', storageKey], queryFn: storage.getLogs });
  const { data: splits = [] } = useQuery({ queryKey: ['splits', storageKey], queryFn: storage.getSplits });
  const { data: ranking = [], isLoading: rankingLoading } = useQuery({
    queryKey: ['ranking', 'weekly'],
    queryFn: () => getRanking('weekly'),
    staleTime: 60 * 1000,
  });

  const activeSplit = splits.find((s) => s.isActive) || splits[0] || null;
  const { streakDays, streakWeeks } = computeStreak(logs, activeSplit);
  const streakLabel = streakWeeks > 0 ? `${streakWeeks}w` : `${streakDays}d`;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;

  // Online users first, then most-recently-active — this is the "who's
  // online" roster; it reuses the same weekly ranking data the leaderboard
  // already fetches rather than adding a second endpoint.
  const community = [...ranking]
    .filter((row) => row.userId !== user?._id)
    .sort((a, b) => {
      const aOnline = isOnline(a.lastActiveAt);
      const bOnline = isOnline(b.lastActiveAt);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0);
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 4 }}>
            <ChevronLeftIcon /> Back
          </button>
          <h1 className="page-title">Profile</h1>
        </div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        {/* ── Me ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)',
          padding: 16, marginBottom: 16,
        }}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#0a0a0a', flexShrink: 0 }}>
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              Online now
              {memberSince && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> · Member since {memberSince}</span>}
            </div>
          </div>
        </div>

        {/* ── My Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { value: streakLabel, label: 'streak' },
            { value: logs.length, label: 'workouts' },
            { value: splits.length, label: 'splits' },
          ].map((t, i) => (
            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{t.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* ── Community ── */}
        <div style={{ fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Community
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {rankingLoading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : community.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
            No other active users this week.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {community.map((row) => {
              const online = isOnline(row.lastActiveAt);
              return (
                <div
                  key={row.userId}
                  onClick={() => setSelectedUser(row)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  {row.avatar ? (
                    <img src={row.avatar} alt={row.name} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text2)', flexShrink: 0 }}>
                      {row.name[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{row.activeSplitName}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: online ? 700 : 400, color: online ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }}>
                    {online && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />}
                    {formatPresence(row.lastActiveAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedUser && (
        <UserStatsModal user={selectedUser} filter="weekly" onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
