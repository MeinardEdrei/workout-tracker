// DailyShareCard.jsx
// Rendered off-screen, captured by html2canvas
import BodyMap from './BodyMap';

export default function DailyShareCard({ log, cardRef }) {
  if (!log) return null;

  const date = new Date(log.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const vol = log.totalVolume > 0
    ? log.totalVolume >= 1000
      ? `${(log.totalVolume / 1000).toFixed(1)}k kg`
      : `${log.totalVolume} kg`
    : null;

  const totalSets = (log.exercises || []).reduce((acc, ex) => acc + Number(ex.sets || 0), 0);

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: 390,
        background: '#0a0a0d',
        fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
        padding: 0,
        overflow: 'hidden',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        border: '1px solid #1a1a24',
      }}
    >
      {/* Header stripe */}
      <div style={{
        background: 'linear-gradient(135deg, #e8ff5a 0%, #c5df39 100%)',
        padding: '24px 24px 20px',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#0a0a0a',
          marginBottom: 4,
          opacity: 0.8
        }}>
          Workout Complete
        </div>
        <div style={{
          fontSize: 30,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          color: '#0a0a0a',
          lineHeight: 1.1,
        }}>
          {log.dayName}
        </div>
        {log.dayTag && (
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0a0a0a',
            opacity: 0.7,
            marginTop: 4,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            {log.dayTag}
          </div>
        )}
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid #181820',
        background: '#0f0f14'
      }}>
        <div style={{ fontSize: 12, color: '#9090a2', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {log.splitName || 'Workout Split'}
        </div>
        <div style={{ fontSize: 12, color: '#686878', fontWeight: 600 }}>
          {dateLabel}
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #181820',
        background: '#0a0a0d'
      }}>
        <div style={{
          flex: 1,
          padding: '16px 24px',
          borderRight: '1px solid #181820',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#525262', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Exercises</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e8' }}>{log.exercises.length}</div>
        </div>
        <div style={{
          flex: 1,
          padding: '16px 24px',
          borderRight: vol ? '1px solid #181820' : 'none',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#525262', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Sets</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e8' }}>{totalSets}</div>
        </div>
        {vol && (
          <div style={{ flex: 1, padding: '16px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#525262', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#e8ff5a' }}>{vol}</div>
          </div>
        )}
      </div>

      {/* Cybernetic Muscle Target Map Visual */}
      <div style={{
        background: '#08080a',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'center',
        borderBottom: '1px solid #181820',
      }}>
        <BodyMap exercises={log.exercises} size={110} />
      </div>

      {/* Exercise list */}
      <div style={{ padding: '8px 0 4px', background: '#0a0a0d' }}>
        {log.exercises.map((ex, i) => {
          const wLabel = ex.weight > 0 ? ` · ${ex.weight}${ex.weightUnit}` : '';
          const rLabel = ex.duration > 0
            ? `${ex.duration}${ex.durationUnit || 'sec'}`
            : ((ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Failure' : `${ex.reps} reps`);

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 24px',
              borderBottom: i < log.exercises.length - 1 ? '1px solid #14141a' : 'none',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#d0d0d8', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                {ex.name}
              </div>
              <div style={{ fontSize: 12, color: '#686878', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {ex.sets}×{rLabel}{wLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #181820',
        background: '#0f0f14',
      }}>
        <div style={{ fontSize: 11, color: '#525262', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          💪 Workout Tracker
        </div>
        <div style={{ fontSize: 10, color: '#3d3d4d', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          workout-tracker.vercel.app
        </div>
      </div>
    </div>
  );
}
