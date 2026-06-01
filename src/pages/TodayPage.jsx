import { useState, useEffect, useCallback, useRef } from 'react';
import { getSplits, toggleExercise, saveLog } from '../api';
import DailyShareCard from '../components/DailyShareCard';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TODAY_DOW = new Date().getDay();
const TODAY_STR = new Date().toISOString().slice(0, 10);

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"/>
      <polyline points="8,1 8,10"/>
      <polyline points="5,4 8,1 11,4"/>
    </svg>
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

// ── Completion screen ──────────────────────────────────────────────────────
function CompletionScreen({ log, onClose, onShare, sharing }) {
  const vol = log.totalVolume > 0
    ? log.totalVolume >= 1000
      ? `${(log.totalVolume / 1000).toFixed(1)}k kg`
      : `${log.totalVolume} kg`
    : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 300,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0',
        width: '100%',
        maxWidth: 480,
        padding: '28px 24px 40px',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Trophy */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💪</div>
          <div style={{ fontSize: 26, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--accent)' }}>
            Workout Done!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>
            {log.dayName}{log.dayTag ? ` · ${log.dayTag}` : ''}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
        }}>
          <div style={{
            flex: 1,
            background: 'var(--bg3)',
            borderRadius: 10,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Exercises</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{log.exercises.length}</div>
          </div>
          {vol && (
            <div style={{
              flex: 1,
              background: 'var(--bg3)',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{vol}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1, gap: 8 }}
            onClick={onShare}
            disabled={sharing}
          >
            <ShareIcon />
            {sharing ? 'Sharing…' : 'Share Card'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exercise row ────────────────────────────────────────────────────────────
function ExerciseRow({ ex, splitId, dayId, onToggle }) {
  const [loading, setLoading] = useState(false);
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      opacity: loading ? 0.5 : 1,
      transition: 'opacity 0.15s',
    }}>
      <label className={`checkbox-wrap ${effectiveChecked ? 'checked' : ''}`} onClick={handleToggle}>
        <div className="checkbox-box">{effectiveChecked && <CheckIcon />}</div>
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.01em',
          textDecoration: effectiveChecked ? 'line-through' : 'none',
          color: effectiveChecked ? 'var(--text3)' : 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {ex.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {ex.sets}×{repsLabel}{weightLabel ? ` · ${weightLabel}` : ''}
        </div>
      </div>
    </div>
  );
}

// ── Day card ────────────────────────────────────────────────────────────────
function DayCard({ day, splitId, splitName, isToday, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);
  const [saving, setSaving] = useState(false);
  const [completedLog, setCompletedLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);

  function handleToggle(updated) {
    setExercises((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
  }

  const checkedCount = exercises.filter((e) => e.lastCheckedDate === TODAY_STR && e.checked).length;
  const total = exercises.length;
  const hasChecked = checkedCount > 0;

  async function handleFinish() {
    setSaving(true);
    try {
      const done = exercises.filter((e) => e.lastCheckedDate === TODAY_STR && e.checked);
      const logData = {
        date: TODAY_STR,
        splitName,
        dayName: day.name,
        dayTag: day.tag || '',
        exercises: done.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          weightUnit: e.weightUnit,
        })),
      };
      const saved = await saveLog(logData);
      setCompletedLog(saved);
    } catch (e) {
      alert('Failed to save workout: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      await captureAndShare(shareCardRef, `workout-${TODAY_STR}.png`, `${day.name} — Workout Complete`);
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <div style={{
        margin: '0 16px 12px',
        borderRadius: 10,
        border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
        overflow: 'hidden',
        background: 'var(--bg2)',
      }}>
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
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                background: 'var(--accent)', color: '#0a0a0a',
                padding: '2px 6px', borderRadius: 3, flexShrink: 0,
              }}>TODAY</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 17, fontWeight: 800, letterSpacing: '0.01em',
                color: isToday ? 'var(--accent)' : 'var(--text)',
                textTransform: 'uppercase',
              }}>
                {day.name}
              </div>
              {day.tag && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1, fontWeight: 500 }}>{day.tag}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {day.isRest ? (
              <span className="tag">Rest</span>
            ) : (
              <>
                {total > 0 && (
                  <span style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: checkedCount === total ? 'var(--green)' : 'var(--text2)',
                  }}>
                    {checkedCount}/{total}
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>
                  <polyline points="4,6 8,10 12,6" />
                </svg>
              </>
            )}
          </div>
        </button>

        {open && !day.isRest && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {exercises.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No exercises yet</div>
            ) : (
              exercises.map((ex) => (
                <ExerciseRow key={ex._id} ex={ex} splitId={splitId} dayId={day._id} onToggle={handleToggle} />
              ))
            )}
            {hasChecked && isToday && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-accent"
                  style={{ width: '100%', fontSize: 14, padding: '12px' }}
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : `✓ Finish Workout (${checkedCount} done)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden share card */}
      {completedLog && (
        <DailyShareCard log={completedLog} cardRef={shareCardRef} />
      )}

      {/* Completion screen */}
      {completedLog && (
        <CompletionScreen
          log={completedLog}
          onClose={() => setCompletedLog(null)}
          onShare={handleShare}
          sharing={sharing}
        />
      )}
    </>
  );
}

// ── Today page ──────────────────────────────────────────────────────────────
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

  const days = activeSplit.days || [];
  const todayDow = TODAY_DOW;
  const dayNameMatch = DAY_NAMES[todayDow].toLowerCase();
  let todayIndex = days.findIndex((d) => d.name.toLowerCase().startsWith(dayNameMatch));
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, color: 'var(--accent)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2,
          }}>
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
              splitName={activeSplit.name}
              isToday={i === todayIndex}
              defaultOpen={i === todayIndex && !day.isRest}
            />
          ))
        )}
      </div>
    </div>
  );
}
