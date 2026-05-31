import { useState, useEffect, useCallback } from 'react';
import { getSplits, toggleExercise } from '../api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TODAY_DOW = new Date().getDay(); // 0=Sun
const TODAY_STR = new Date().toISOString().slice(0, 10);

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExerciseRow({ ex, splitId, dayId, onToggle }) {
  const [loading, setLoading] = useState(false);

  // Auto-reset logic: if lastCheckedDate != today, treat as unchecked
  const effectiveChecked = ex.lastCheckedDate === TODAY_STR ? ex.checked : false;

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const updated = await toggleExercise(splitId, dayId, ex._id);
      onToggle(updated);
    } finally {
      setLoading(false);
    }
  }

  const weightLabel = ex.weight > 0 ? `${ex.weight}${ex.weightUnit}` : '';
  const repsLabel = ex.reps > 0 ? `${ex.reps} reps` : 'max reps';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <label
        className={`checkbox-wrap ${effectiveChecked ? 'checked' : ''}`}
        onClick={handleToggle}
      >
        <div className="checkbox-box">{effectiveChecked && <CheckIcon />}</div>
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.01em',
            textDecoration: effectiveChecked ? 'line-through' : 'none',
            color: effectiveChecked ? 'var(--text3)' : 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ex.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text2)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}
        >
          {ex.sets}×{repsLabel}{weightLabel ? ` · ${weightLabel}` : ''}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, splitId, isToday, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);

  function handleToggle(updated) {
    setExercises((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
  }

  const total = exercises.length;
  const done = exercises.filter(
    (e) => e.lastCheckedDate === TODAY_STR && e.checked
  ).length;

  return (
    <div
      style={{
        margin: '0 16px 12px',
        borderRadius: 10,
        border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
        overflow: 'hidden',
        background: 'var(--bg2)',
      }}
    >
      <button
        onClick={() => !day.isRest && setOpen((o) => !o)}
        style={{
          width: '100%',
          background: isToday ? 'rgba(232,255,90,0.05)' : 'transparent',
          border: 'none',
          cursor: day.isRest ? 'default' : 'pointer',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {isToday && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.1em',
                background: 'var(--accent)',
                color: '#0a0a0a',
                padding: '2px 6px',
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              TODAY
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '0.01em',
                color: isToday ? 'var(--accent)' : 'var(--text)',
                textTransform: 'uppercase',
              }}
            >
              {day.name}
            </div>
            {day.tag && (
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1, fontWeight: 500 }}>
                {day.tag}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {day.isRest ? (
            <span className="tag">Rest</span>
          ) : (
            <>
              {total > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: done === total ? 'var(--green)' : 'var(--text2)',
                  }}
                >
                  {done}/{total}
                </span>
              )}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--text3)"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
              >
                <polyline points="4,6 8,10 12,6" />
              </svg>
            </>
          )}
        </div>
      </button>

      {open && !day.isRest && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {exercises.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              No exercises yet
            </div>
          ) : (
            exercises.map((ex) => (
              <ExerciseRow
                key={ex._id}
                ex={ex}
                splitId={splitId}
                dayId={day._id}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  const [activeSplit, setActiveSplit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const splits = await getSplits();
      const active = splits.find((s) => s.isActive) || splits[0] || null;
      setActiveSplit(active);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="empty-state">Error: {error}</div>;
  if (!activeSplit) return (
    <div>
      <div className="page-header"><h1 className="page-title">Today</h1></div>
      <div className="empty-state">No active split.<br />Go to Splits tab to activate one.</div>
    </div>
  );

  // Figure out which day maps to today
  const days = activeSplit.days || [];
  // Try to match by day name to day-of-week
  const todayDow = TODAY_DOW; // 0=Sun
  const dayNameMatch = DAY_NAMES[todayDow].toLowerCase();
  let todayIndex = days.findIndex((d) => d.name.toLowerCase().startsWith(dayNameMatch));
  // Fallback: use modulo index
  if (todayIndex === -1) todayIndex = todayDow % days.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today</h1>
          <div className="page-subtitle">{DAY_NAMES[TODAY_DOW]}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {activeSplit.name}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            Active
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 16 }}>
        {days.length === 0 ? (
          <div className="empty-state">This split has no days yet</div>
        ) : (
          days.map((day, i) => (
            <DayCard
              key={day._id}
              day={day}
              splitId={activeSplit._id}
              isToday={i === todayIndex}
              defaultOpen={i === todayIndex && !day.isRest}
            />
          ))
        )}
      </div>
    </div>
  );
}
