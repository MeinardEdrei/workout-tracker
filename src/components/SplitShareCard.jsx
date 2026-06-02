import { MUSCLE_COLORS } from './MusclePill';

// Font scale so large splits still fit on the card
function getScale(split) {
  const totalEx = (split.days || []).reduce((s, d) => s + (d.exercises?.length || 0), 0);
  const items = (split.days?.length || 0) + totalEx;
  if (items <= 25) return 1;
  if (items <= 45) return 0.88;
  return 0.76;
}

// Scaled font size with minimum floor
function fs(base, scale) {
  const s = Math.round(base * scale);
  if (base >= 30) return Math.max(24, s);
  if (base >= 14) return Math.max(12, s);
  if (base >= 12) return Math.max(10, s);
  return Math.max(8, s);
}

function ExerciseRow({ ex, scale }) {
  const stats = [
    ex.sets > 0 && ex.reps > 0 ? `${ex.sets}×${ex.reps}` : ex.sets > 0 ? `${ex.sets} sets` : null,
    ex.weight > 0 ? `${ex.weight}${ex.weightUnit}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', gap: 7, marginBottom: Math.round(5 * scale) }}>
      <span style={{ color: '#c8f55a', fontSize: fs(11, scale), lineHeight: 1.4, flexShrink: 0, marginTop: 1 }}>–</span>
      <div>
        {/* Name + muscle pills on the same line, wrapping naturally */}
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 3, lineHeight: 1.4 }}>
          <span style={{ fontSize: fs(13, scale), color: '#e8e8e8', fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {ex.name}
          </span>
          {(ex.muscleTargets || []).slice(0, 3).map((target) => {
            const c = MUSCLE_COLORS[target] || { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' };
            return (
              <span key={target} style={{
                display: 'inline-block',
                padding: `1px ${Math.round(5 * scale)}px`,
                borderRadius: 8,
                fontSize: fs(9, scale),
                fontWeight: 700,
                letterSpacing: '0.03em',
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.text}30`,
                lineHeight: 1.5,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {target}
              </span>
            );
          })}
        </div>
        {stats && (
          <div style={{ fontSize: fs(10, scale), color: '#555', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {stats}
          </div>
        )}
      </div>
    </div>
  );
}

function DaySection({ day, scale }) {
  const isRest = day.isRest || day.name.toLowerCase() === 'rest';

  return (
    <div style={{ marginBottom: Math.round(16 * scale) }}>
      {/* Day header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: isRest ? 3 : Math.round(8 * scale),
        gap: 8,
      }}>
        <div style={{
          fontSize: fs(14, scale), fontWeight: 800, color: '#c8f55a',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          fontFamily: "'Barlow Condensed', sans-serif",
          flex: 1, minWidth: 0,
        }}>
          {day.name}
        </div>
        {day.tag && !isRest && (
          <div style={{
            fontSize: fs(9, scale), fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#0d0d0d', background: '#c8f55a',
            padding: `2px ${Math.round(8 * scale)}px`,
            borderRadius: 10,
            whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {day.tag}
          </div>
        )}
      </div>

      {isRest ? (
        <div style={{
          fontSize: fs(11, scale), color: '#3a3a3a', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          Rest Day
        </div>
      ) : (
        <div>
          {(day.exercises || []).length === 0 ? (
            <div style={{ fontSize: fs(11, scale), color: '#3a3a3a', fontStyle: 'italic', fontFamily: "'Barlow Condensed', sans-serif" }}>
              No exercises
            </div>
          ) : (
            (day.exercises || []).map((ex, i) => (
              <ExerciseRow key={ex._id || i} ex={ex} scale={scale} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SplitShareCard({ split, cardRef }) {
  const scale = getScale(split);
  const totalEx = (split.days || []).reduce((s, d) => s + (d.exercises?.length || 0), 0);
  const activeDays = (split.days || []).filter(d => !d.isRest && d.name.toLowerCase() !== 'rest').length;
  const month = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: 390,
        backgroundColor: '#0d0d0d',
        borderLeft: '3px solid #c8f55a',
        padding: '22px 24px 20px 24px',
        fontFamily: "'Barlow Condensed', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>
            Workout Tracker
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#3a3a3a', letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {month}
          </div>
        </div>

        <div style={{
          fontSize: fs(38, scale),
          fontWeight: 800,
          color: '#f0f0f0',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {split.name}
        </div>

        <div style={{
          fontSize: fs(12, scale),
          color: '#555',
          marginTop: 6,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {(split.days || []).length} DAYS · {totalEx} EXERCISES
          {activeDays > 0 && activeDays < (split.days || []).length && ` · ${activeDays} TRAINING`}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div style={{ height: 1, background: '#1e1e1e', marginBottom: 16 }} />

      {/* ── Days ──────────────────────────────────────────────────── */}
      {(split.days || []).map((day, i) => (
        <DaySection key={day._id || i} day={day} scale={scale} />
      ))}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: '#1e1e1e', marginTop: 4, marginBottom: 12 }} />
      <div style={{ fontSize: 9, color: '#3a3a3a', fontWeight: 600, letterSpacing: '0.06em', fontFamily: "'Barlow Condensed', sans-serif" }}>
        Created with Workout Tracker
      </div>
    </div>
  );
}
