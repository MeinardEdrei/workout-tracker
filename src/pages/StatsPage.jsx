import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLogs, getWeekLogs, deleteLog, clearLogs } from '../api';
import WeeklyShareCard from '../components/WeeklyShareCard';

const LOGS_STALE = 2 * 60 * 1000; // 2 minutes

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"/>
      <polyline points="8,1 8,10"/>
      <polyline points="5,4 8,1 11,4"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10h8l1-10"/>
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

async function captureAndShare(ref, filename, title) {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(ref.current, {
    backgroundColor: '#0a0a0a',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  canvas.toBlob(async (blob) => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

function LogCard({ log, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(log.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const vol = log.totalVolume > 0
    ? log.totalVolume >= 1000
      ? `${(log.totalVolume / 1000).toFixed(1)}k kg`
      : `${log.totalVolume} kg`
    : null;

  return (
    <div style={{
      marginBottom: 8,
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--bg2)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 14, fontWeight: 800, color: '#0a0a0a',
        }}>
          {date.getDate()}
        </div>
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em',
            color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {log.dayName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
            {dateLabel}{log.dayTag ? ` · ${log.dayTag}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {vol && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{vol}</div>}
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{log.exercises.length} ex</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
          <polyline points="3,5 7,9 11,5"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {log.exercises.map((ex, i) => {
            const wLabel = ex.weight > 0 ? ` · ${ex.weight}${ex.weightUnit}` : '';
            const rLabel = ex.reps > 0 ? `${ex.reps} reps` : 'max';
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 16px',
                borderBottom: i < log.exercises.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                  {ex.sets}×{rLabel}{wLabel}
                </div>
              </div>
            );
          })}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => onDelete(log._id)}>
              <TrashIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const queryClient = useQueryClient();
  const [sharing, setSharing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const weekCardRef = useRef(null);

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: getLogs,
    staleTime: LOGS_STALE,
  });

  const { data: weekLogs = [] } = useQuery({
    queryKey: ['logs', 'week'],
    queryFn: getWeekLogs,
    staleTime: LOGS_STALE,
  });

  const invalidateLogs = () => {
    queryClient.invalidateQueries({ queryKey: ['logs'] });
    queryClient.invalidateQueries({ queryKey: ['logs', 'week'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteLog(id),
    onSuccess: invalidateLogs,
  });

  const clearMutation = useMutation({
    mutationFn: clearLogs,
    onSuccess: invalidateLogs,
  });

  async function handleShare() {
    setSharing(true);
    try {
      await captureAndShare(weekCardRef, 'weekly-recap.png', 'My Weekly Workout Recap');
    } finally {
      setSharing(false);
    }
  }

  async function handleDelete(id) {
    await deleteMutation.mutateAsync(id);
  }

  async function handleClear() {
    setConfirm(null);
    await clearMutation.mutateAsync();
  }

  const totalVolume = weekLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
  const volLabel = totalVolume > 0
    ? totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${totalVolume}`
    : '0';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stats</h1>
          <div className="page-subtitle">{logs.length} total workouts</div>
        </div>
        {logs.length > 0 && (
          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setConfirm('clear')}>
            <TrashIcon />
          </button>
        )}
      </div>

      {logsLoading ? (
        <div className="spinner" />
      ) : (
        <>
          <div style={{ margin: '16px 16px 0' }}>
            <div style={{
              borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--accent)', padding: '14px 16px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0a0a0a', opacity: 0.6, marginBottom: 2 }}>This Week</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0a0a0a', textTransform: 'uppercase' }}>
                    {weekLogs.length} Workout{weekLogs.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ background: '#0a0a0a', color: 'var(--accent)', fontSize: 12, gap: 6 }}
                  onClick={handleShare}
                  disabled={sharing}
                >
                  <ShareIcon />
                  {sharing ? 'Sharing…' : 'Share'}
                </button>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{volLabel} <span style={{ fontSize: 13, color: 'var(--text2)' }}>kg</span></div>
                </div>
                <div style={{ flex: 1, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Sessions</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{weekLogs.length}<span style={{ fontSize: 13, color: 'var(--text2)' }}>/7</span></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              History
            </div>
            {logs.length === 0 ? (
              <div className="empty-state">No workouts logged yet.<br/>Finish a workout to see it here.</div>
            ) : (
              logs.map((log) => (
                <LogCard key={log._id} log={log} onDelete={handleDelete} />
              ))
            )}
          </div>
        </>
      )}

      <WeeklyShareCard logs={weekLogs} cardRef={weekCardRef} />

      {confirm === 'clear' && (
        <ConfirmModal
          message="Delete all workout logs? This cannot be undone."
          onConfirm={handleClear}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
