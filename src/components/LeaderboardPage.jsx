import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '../api/index';
import { isOnline, formatPresence } from '../utils/presence';
import UserStatsModal from './UserStatsModal';

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="9,3 5,7 9,11" />
    </svg>
  );
}

function TrophyIcon({ rank }) {
  const colors = {
    1: '#ffd700', // Gold
    2: '#c0c0c0', // Silver
    3: '#cd7f32', // Bronze
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[rank]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
      <path d="M12 2a8 8 0 0 0-8 8h16a8 8 0 0 0-8-8z"/>
    </svg>
  );
}

export default function LeaderboardPage({ onBack }) {
  const [filter, setFilter] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: ranking = [], isLoading, error } = useQuery({
    queryKey: ['ranking', filter],
    queryFn: () => getRanking(filter),
    staleTime: 60 * 1000, // cache for 1 minute
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 4 }}>
            <ChevronLeftIcon /> Splits
          </button>
          <h1 className="page-title">Leaderboard</h1>
          <div className="page-subtitle">Top Active Users</div>
        </div>
      </div>

      <div style={{ padding: '24px 16px 80px' }}>
        
        {/* Filter Segmented Control */}
        <div style={{
          display: 'flex',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16
        }}>
          {['weekly', 'monthly', 'yearly'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? '#0a0a0a' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Leaderboard Rankings */}
        {isLoading ? (
          <div className="spinner" style={{ margin: '40px auto' }} />
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, padding: '24px 0' }}>
            Failed to load rankings. Please try again.
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '40px 0' }}>
            No workouts logged in this period yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ranking.map((row, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const rankBadgeColor = rank === 1 ? 'rgba(255, 215, 0, 0.15)' 
                : rank === 2 ? 'rgba(192, 192, 192, 0.15)' 
                : rank === 3 ? 'rgba(205, 127, 50, 0.15)' 
                : 'var(--bg3)';
              const rankBorderColor = rank === 1 ? 'rgba(255, 215, 0, 0.3)' 
                : rank === 2 ? 'rgba(192, 192, 192, 0.3)' 
                : rank === 3 ? 'rgba(205, 127, 50, 0.3)' 
                : 'var(--border)';
              
              const totalVolText = row.totalVolume >= 1000 ? `${(row.totalVolume / 1000).toFixed(1)}k kg` : `${row.totalVolume} kg`;

              return (
                <div
                  key={row.userId}
                  onClick={() => setSelectedUser(row)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'transform 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                >
                  {/* Rank Badge */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: rankBadgeColor,
                    border: `1px solid ${rankBorderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    color: rank === 1 ? '#ffd700' : rank === 2 ? '#e0e0e0' : rank === 3 ? '#cd7f32' : 'var(--text3)',
                    flexShrink: 0
                  }}>
                    {isTop3 ? <TrophyIcon rank={rank} /> : rank}
                  </div>

                  {/* Avatar */}
                  {row.avatar ? (
                    <img
                      src={row.avatar}
                      alt={row.name}
                      style={{ width: 36, height: 36, borderRadius: '50%', border: isTop3 ? `1.5px solid ${rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32'}` : '1px solid var(--border)', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text2)',
                      flexShrink: 0
                    }}>
                      {row.name[0].toUpperCase()}
                    </div>
                  )}

                  {/* Name + Active Split info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </div>
                      {isOnline(row.lastActiveAt) && (
                        <span title="Online" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Split: <span style={{ color: 'var(--text2)' }}>{row.activeSplitName}</span>
                      <span style={{ color: 'var(--border2)' }}> · </span>
                      <span style={{ color: isOnline(row.lastActiveAt) ? 'var(--green)' : 'var(--text3)' }}>{formatPresence(row.lastActiveAt)}</span>
                    </div>
                  </div>

                  {/* Workout logs count / volume */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                      {row.workoutCount}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {totalVolText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User detailed stats modal */}
      {selectedUser && (
        <UserStatsModal
          user={selectedUser}
          filter={filter}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
