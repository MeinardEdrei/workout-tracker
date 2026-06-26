import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="13" y1="5" x2="5" y2="13" />
      <line x1="5" y1="5" x2="13" y2="13" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/>
      <path d="M3.5 10.5h-1a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 2.5 1.5h6A1.5 1.5 0 0 1 10 3v1"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3"/>
      <polyline points="5 7 8 10 11 7"/>
      <line x1="8" y1="1" x2="8" y2="10"/>
    </svg>
  );
}

function NativeShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.5" cy="3.5" r="2.5"/>
      <circle cx="3.5" cy="8" r="2.5"/>
      <circle cx="12.5" cy="12.5" r="2.5"/>
      <line x1="5.7" y1="9.1" x2="10.3" y2="11.4"/>
      <line x1="10.3" y1="4.6" x2="5.7" y2="6.9"/>
    </svg>
  );
}

export default function StatsShareModal({ logs, onClose }) {
  const [format, setFormat] = useState('1:1'); // '1:1' or '9:16'
  const [background, setBackground] = useState('dark'); // 'dark', 'sunset', 'ocean', 'transparent'
  const [accent, setAccent] = useState('lime'); // 'lime', 'coral', 'cyan', 'white'
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);

  const weekDates = getWeekDates();
  const today = new Date().toISOString().slice(0, 10);
  const logByDate = useMemo(() => {
    const map = {};
    (logs || []).forEach((l) => { map[l.date] = l; });
    return map;
  }, [logs]);

  const totalVolume = useMemo(() => (logs || []).reduce((s, l) => s + (l.totalVolume || 0), 0), [logs]);
  const completed = logs ? logs.length : 0;

  // Find top muscle targeted
  const topTag = useMemo(() => {
    const tagCount = {};
    (logs || []).forEach((l) => {
      if (l.dayTag) {
        l.dayTag.split(/[·+,]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
          tagCount[t] = (tagCount[t] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [logs]);

  const volLabel = totalVolume > 0
    ? totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k kg`
      : `${totalVolume} kg`
    : '—';

  const weekStart = new Date(weekDates[0] + 'T12:00:00');
  const weekEnd = new Date(weekDates[6] + 'T12:00:00');
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Styling maps
  const bgStyles = {
    dark: { background: '#0d0d0d', color: '#ffffff' },
    sunset: { background: 'linear-gradient(135deg, #ff3366 0%, #ff9933 100%)', color: '#ffffff' },
    ocean: { background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', color: '#ffffff' },
    transparent: { background: 'transparent', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' },
  };

  const accentColors = {
    lime: '#e8ff5a',
    coral: '#ff6b6b',
    cyan: '#00f0ff',
    white: '#ffffff',
  };

  const activeAccent = accentColors[accent];

  async function handleExport(action) {
    if (busy) return;
    setBusy(true);
    setStatusMessage('Generating card…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: background === 'transparent' ? null : undefined,
        scale: 3,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Canvas conversion failed');
        }
        const filename = `workout-recap-${format.replace(':', '-')}.png`;

        if (action === 'download') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          setStatusMessage('Downloaded!');
          setTimeout(() => setStatusMessage(''), 2000);
        } else if (action === 'copy') {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setStatusMessage('Copied to clipboard!');
            setTimeout(() => setStatusMessage(''), 2000);
          } catch {
            setStatusMessage('Clipboard copy blocked. Try downloading.');
            setTimeout(() => setStatusMessage(''), 3000);
          }
        } else if (action === 'share') {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'My Weekly Workout Recap',
              text: 'Sharing my weekly workout progress!',
            });
            setStatusMessage('Shared successfully!');
            setTimeout(() => setStatusMessage(''), 2000);
          } else {
            setStatusMessage('Native sharing unsupported. Downloaded instead.');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            setTimeout(() => setStatusMessage(''), 3000);
          }
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setStatusMessage('Export failed. Try again.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setBusy(false);
    }
  }

  // Pre-configured dimensions for previews
  const previewWidth = 320;
  const previewHeight = format === '1:1' ? 320 : 568;

  return createPortal(
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460, maxHeight: '95vh', display: 'flex', flexDirection: 'column', padding: '16px 20px 20px', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'var(--text3)' }}>SHARE STATS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 4 }} title="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Live Preview Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg3)',
          borderRadius: 12,
          padding: 16,
          overflow: 'hidden',
          marginBottom: 16,
          border: '1px solid var(--border2)',
          position: 'relative',
          minHeight: 280,
        }}
        className={background === 'transparent' ? 'transparency-checkerboard' : ''}
        >
          {/* Card to capture */}
          <div
            ref={cardRef}
            style={{
              width: previewWidth,
              height: previewHeight,
              borderRadius: 16,
              padding: format === '1:1' ? '24px 20px' : '32px 24px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily: "'Outfit', 'Inter', sans-serif",
              position: 'relative',
              boxShadow: background !== 'transparent' ? '0 10px 30px rgba(0,0,0,0.4)' : 'none',
              ...bgStyles[background],
              transition: 'background 0.25s, color 0.25s',
            }}
          >
            {/* Header section */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: background === 'dark' ? activeAccent : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                Weekly Recap
              </div>
              <div style={{ fontSize: format === '1:1' ? 26 : 30, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#ffffff' }}>
                {completed} Workout{completed !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, fontWeight: 500, letterSpacing: '0.02em', color: '#ffffff' }}>
                {weekLabel}
              </div>
            </div>

            {/* Middle Stats */}
            <div style={{ margin: format === '1:1' ? '12px 0' : '24px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ffffff' }}>Volume</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: background === 'dark' ? activeAccent : '#ffffff', letterSpacing: '-0.02em' }}>{volLabel}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ffffff' }}>Days Active</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>{completed}/7</div>
                </div>
              </div>

              {/* Active Days check strip */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {weekDates.map((d, i) => {
                  const done = !!logByDate[d];
                  const isToday = d === today;
                  return (
                    <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%',
                        height: 22,
                        borderRadius: 6,
                        background: done ? activeAccent : 'rgba(255,255,255,0.08)',
                        border: isToday && !done ? '1.5px solid rgba(255,255,255,0.3)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: done ? '#000000' : 'rgba(255,255,255,0.3)',
                        fontSize: 9,
                        fontWeight: 800,
                      }}>
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <polyline points="1.5,5 4.5,8 8.5,2" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: 8, fontWeight: 700, opacity: 0.5, color: '#ffffff' }}>{DAYS_SHORT[i].slice(0, 1)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Workouts Completed / Focus */}
              {format === '9:16' && logs && logs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  {logs.slice(0, 3).map((log, i) => (
                    <div key={log._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{log.dayName.split('—')[0].trim()}</div>
                        {log.dayTag && <div style={{ fontSize: 9, opacity: 0.5, color: '#ffffff' }}>{log.dayTag}</div>}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                        {log.totalVolume > 0 ? `${log.totalVolume >= 1000 ? (log.totalVolume/1000).toFixed(1)+'k' : log.totalVolume} kg` : `${log.exercises.length} exercises`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Footer Section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: background === 'dark' ? activeAccent : '#ffffff', textTransform: 'uppercase' }}>💪 WORKOUT TRACKER</span>
              </div>
              {topTag && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 7, opacity: 0.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ffffff' }}>TOP FOCUS</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>{topTag}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customization Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, marginBottom: 14 }}>
          
          {/* Format picker */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>FORMAT</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['1:1', '9:16'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: format === f ? 'var(--accent)' : 'var(--bg3)',
                    color: format === f ? '#0a0a0a' : 'var(--text2)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {f === '1:1' ? 'Post (1:1)' : 'Story (9:16)'}
                </button>
              ))}
            </div>
          </div>

          {/* Background selector */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>BACKGROUND</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {[
                { id: 'dark', label: 'Dark' },
                { id: 'sunset', label: 'Sunset' },
                { id: 'ocean', label: 'Ocean' },
                { id: 'transparent', label: 'Clear' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBackground(bg.id)}
                  style={{
                    padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: background === bg.id ? 'var(--accent)' : 'var(--bg3)',
                    color: background === bg.id ? '#0a0a0a' : 'var(--text2)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent selector (only applies to dark/transparent backgrounds) */}
          {['dark', 'transparent'].includes(background) && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>ACCENT COLOR</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'lime', color: '#e8ff5a', name: 'Lime' },
                  { id: 'coral', color: '#ff6b6b', name: 'Coral' },
                  { id: 'cyan', color: '#00f0ff', name: 'Cyan' },
                  { id: 'white', color: '#ffffff', name: 'White' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: accent === a.id ? 'var(--accent)' : 'var(--bg3)',
                      color: accent === a.id ? '#0a0a0a' : 'var(--text2)',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.1s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexShrink: 0 }}>
          <button
            onClick={() => handleExport('copy')}
            disabled={busy}
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', height: 42 }}
          >
            <CopyIcon /> Copy
          </button>
          <button
            onClick={() => handleExport('download')}
            disabled={busy}
            className="btn btn-accent"
            style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', height: 42 }}
          >
            <DownloadIcon /> Download
          </button>
          <button
            onClick={() => handleExport('share')}
            disabled={busy}
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', height: 42 }}
          >
            <NativeShareIcon /> Share
          </button>
        </div>

        {statusMessage && (
          <div style={{
            position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent)', color: '#0a0a0a', padding: '6px 14px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, zIndex: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.15s ease',
          }}>
            {statusMessage}
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
