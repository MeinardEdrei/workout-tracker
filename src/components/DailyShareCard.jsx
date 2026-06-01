// DailyShareCard.jsx
// Rendered off-screen, captured by html2canvas

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

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: 390,
        background: '#0a0a0a',
        fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
        padding: 0,
        overflow: 'hidden',
        borderRadius: 16,
      }}
    >
      {/* Header stripe */}
      <div style={{
        background: '#e8ff5a',
        padding: '20px 24px 16px',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#0a0a0a',
          marginBottom: 4,
        }}>
          Workout Complete
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
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
            fontWeight: 600,
            color: '#0a0a0a',
            opacity: 0.65,
            marginTop: 3,
            letterSpacing: '0.04em',
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
        padding: '12px 24px',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ fontSize: 12, color: '#666', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {log.splitName}
        </div>
        <div style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>
          {dateLabel}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{
          flex: 1,
          padding: '14px 24px',
          borderRight: '1px solid #1e1e1e',
        }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Exercises</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#e8e8e8' }}>{log.exercises.length}</div>
        </div>
        {vol && (
          <div style={{ flex: 1, padding: '14px 24px' }}>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#e8ff5a' }}>{vol}</div>
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div style={{ padding: '8px 0 4px' }}>
        {log.exercises.map((ex, i) => {
          const wLabel = ex.weight > 0 ? ` · ${ex.weight}${ex.weightUnit}` : '';
          const rLabel = ex.reps > 0 ? `${ex.reps} reps` : 'max';
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 24px',
              borderBottom: i < log.exercises.length - 1 ? '1px solid #141414' : 'none',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0e0', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                {ex.name}
              </div>
              <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                {ex.sets}×{rLabel}{wLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #1a1a1a',
        marginTop: 4,
      }}>
        <div style={{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          💪 Workout Tracker
        </div>
        <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          my-workout-trackerr.vercel.app
        </div>
      </div>
    </div>
  );
}
