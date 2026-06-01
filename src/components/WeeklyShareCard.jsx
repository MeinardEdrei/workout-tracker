// WeeklyShareCard.jsx

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates() {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function WeeklyShareCard({ logs, cardRef }) {
  const weekDates = getWeekDates();
  const today = new Date().toISOString().slice(0, 10);

  const logByDate = {};
  (logs || []).forEach((l) => { logByDate[l.date] = l; });

  const totalVolume = (logs || []).reduce((s, l) => s + (l.totalVolume || 0), 0);
  const completed = (logs || []).length;

  // Most trained tag
  const tagCount = {};
  (logs || []).forEach((l) => {
    if (l.dayTag) {
      l.dayTag.split(/[·+,]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    }
  });
  const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const volLabel = totalVolume > 0
    ? totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k kg`
      : `${totalVolume} kg`
    : '—';

  const weekStart = new Date(weekDates[0] + 'T12:00:00');
  const weekEnd = new Date(weekDates[6] + 'T12:00:00');
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

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
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ background: '#e8ff5a', padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0a0a', marginBottom: 4 }}>
          Weekly Recap
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, textTransform: 'uppercase', color: '#0a0a0a', lineHeight: 1.1 }}>
          {completed} Workout{completed !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 13, color: '#0a0a0a', opacity: 0.6, marginTop: 3, fontWeight: 600, letterSpacing: '0.04em' }}>
          {weekLabel}
        </div>
      </div>

      {/* Day strip */}
      <div style={{
        display: 'flex',
        padding: '16px 20px',
        gap: 6,
        borderBottom: '1px solid #1e1e1e',
      }}>
        {weekDates.map((d, i) => {
          const log = logByDate[d];
          const isPast = d < today;
          const isToday = d === today;
          const done = !!log;
          return (
            <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: isToday ? '#e8ff5a' : '#444',
                textTransform: 'uppercase',
              }}>
                {DAYS[i]}
              </div>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: done ? '#e8ff5a' : isPast ? '#161616' : '#111',
                border: isToday && !done ? '2px solid #333' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {done && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {!done && isPast && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2a2a2a' }} />
                )}
              </div>
              {log && (
                <div style={{
                  fontSize: 9,
                  color: '#555',
                  fontWeight: 600,
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  maxWidth: 40,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {log.dayName.split('—')[0].trim().split(' ')[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ flex: 1, padding: '14px 20px', borderRight: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#e8ff5a' }}>{volLabel}</div>
        </div>
        <div style={{ flex: 1, padding: '14px 20px', borderRight: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Sessions</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#e8e8e8' }}>{completed}/7</div>
        </div>
        {topTag && (
          <div style={{ flex: 1, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Top Muscle</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e8e8e8', textTransform: 'uppercase', lineHeight: 1.2 }}>{topTag}</div>
          </div>
        )}
      </div>

      {/* Workout list */}
      {logs && logs.length > 0 && (
        <div style={{ padding: '8px 0 4px' }}>
          {logs.slice(0, 5).map((log, i) => (
            <div key={log._id || i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 24px',
              borderBottom: i < Math.min(logs.length, 5) - 1 ? '1px solid #111' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e0e0e0', textTransform: 'uppercase' }}>{log.dayName}</div>
                {log.dayTag && <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>{log.dayTag}</div>}
              </div>
              <div style={{ fontSize: 12, color: '#444', fontFamily: 'monospace' }}>
                {log.totalVolume > 0 ? `${log.totalVolume >= 1000 ? (log.totalVolume/1000).toFixed(1)+'k' : log.totalVolume} kg` : `${log.exercises.length} ex`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '12px 24px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid #141414',
        marginTop: 4,
      }}>
        <div style={{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>💪 Workout Tracker</div>
        <div style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>my-workout-trackerr.vercel.app</div>
      </div>
    </div>
  );
}
