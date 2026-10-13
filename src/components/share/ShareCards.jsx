import { fmtKg, fmtNum } from '../../utils/workoutStats';

// Share cards are captured to PNG with html2canvas, so they use literal
// colours (one palette per background) and avoid CSS it can't paint
// (object-fit, aspect-ratio, CSS variables in gradients).

export const CARD_W = 360;
export const CARD_SIZES = { '9:16': 640, '4:5': 450, '1:1': 360 };

const PLATE = ['#ec6650', '#5b8de0', '#e8b53a', '#5fb67f'];
export const PALETTES = {
  dark: { bg: '#121110', text: '#f2eee8', dim: '#a8a29a', surface: '#1b1a18', faint: '#2e2b28', pr: '#ec6650', good: '#5fb67f', shadow: 'none' },
  chalk: { bg: '#f2eee8', text: '#121110', dim: '#5f5a54', surface: '#e4dfd7', faint: '#d6d0c7', pr: '#c4452f', good: '#2f7d4c', shadow: 'none' },
  clear: { bg: 'transparent', text: '#ffffff', dim: 'rgba(255,255,255,0.85)', surface: 'rgba(18,17,16,0.45)', faint: 'rgba(255,255,255,0.25)', pr: '#ff8a75', good: '#7fd69d', shadow: '0 2px 10px rgba(0,0,0,0.55)' },
};

const FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const MONO = "'DM Mono', ui-monospace, monospace";

function Brand({ p, size = 13, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', gap: 3 }}>
          {PLATE.map((c) => <span key={c} style={{ width: 10, height: 4, borderRadius: 2, background: c }} />)}
        </span>
        <span style={{ fontSize: size, fontWeight: 700, letterSpacing: '0.16em', color: p.text }}>WORKOUT TRACKER</span>
      </span>
      {right && <span style={{ fontFamily: MONO, fontSize: 12, color: p.dim }}>{right}</span>}
    </div>
  );
}

function Stat({ p, value, label, color, big = 36 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: big, lineHeight: 1, color: color || p.text }}>{value}</span>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: color || p.dim }}>{label}</span>
    </div>
  );
}

const shortDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
const longDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const setLabel = (b) => (b ? `${fmtNum(b.weight)}${b.unit === 'lbs' ? 'lb' : ''} × ${b.reps}` : '');

// Stats chosen by the TIME / VOLUME / SETS / PRS toggles.
function statList(summary, show, p) {
  return [
    show.time && summary.minutes > 0 && { key: 'time', value: `${summary.minutes}m`, label: 'TIME' },
    show.volume && summary.volumeKg > 0 && { key: 'volume', value: summary.volumeKg.toLocaleString('en-US'), short: fmtKg(summary.volumeKg), label: 'KG MOVED' },
    show.sets && { key: 'sets', value: String(summary.sets), label: 'SETS' },
    show.prs && { key: 'prs', value: String(summary.prs.length), label: summary.prs.length === 1 ? 'NEW PR' : 'NEW PRS', color: summary.prs.length ? p.pr : undefined },
  ].filter(Boolean);
}

function Frame({ p, height, padY, children, style }) {
  return (
    <div style={{ width: CARD_W, height, boxSizing: 'border-box', background: p.bg, color: p.text, fontFamily: FONT, padding: `${padY}px 28px`, display: 'flex', flexDirection: 'column', gap: height >= 600 ? 24 : 16, overflow: 'hidden', textShadow: p.shadow, ...style }}>
      {children}
    </div>
  );
}

const padFor = (h) => (h >= 600 ? 84 : h >= 450 ? 36 : 28);

export function SummaryCard({ log, summary, show, p, height }) {
  const stats = statList(summary, show, p);
  const rows = height >= 600 ? 5 : height >= 450 ? 3 : 0;
  const list = [...summary.exercises].sort((a, b) => b.isPR - a.isPR).slice(0, rows);
  const more = summary.exercises.length - list.length;
  return (
    <Frame p={p} height={height} padY={padFor(height)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: p.dim, letterSpacing: '0.16em' }}>WORKOUT #{summary.number} · {shortDate(log.date)}</span>
        <span style={{ fontSize: height >= 450 ? 64 : 52, fontWeight: 700, lineHeight: 0.88, textTransform: 'uppercase' }}>{log.dayName}</span>
      </div>
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', rowGap: 18, columnGap: 12 }}>
          {stats.map((s) => <Stat key={s.key} p={p} value={s.value} label={s.label} color={s.color} big={height >= 450 ? 36 : 30} />)}
        </div>
      )}
      {show.muscles && summary.muscles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {summary.muscles.slice(0, 6).map((m) => (
            <span key={m} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 12, background: p.surface, textTransform: 'uppercase' }}>{m}</span>
          ))}
        </div>
      )}
      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((e) => (
            <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 15, flexShrink: 0, color: e.isPR && show.prs ? p.pr : p.text }}>{setLabel(e.best)}{e.isPR && show.prs ? ' PR' : ''}</span>
            </div>
          ))}
          {more > 0 && <span style={{ fontSize: 15, color: p.dim }}>+{more} more</span>}
        </div>
      )}
      <div style={{ marginTop: 'auto' }}><Brand p={p} /></div>
    </Frame>
  );
}

export function PRCard({ log, summary, prIndex = 0, p, height }) {
  const pr = summary.prs[prIndex];
  // No PR today → feature the heaviest lift instead, honestly labelled.
  const top = pr || summary.exercises.filter((e) => e.best).sort((a, b) => b.best.weight - a.best.weight)[0];
  const best = pr || top?.best;
  const pts = pr?.history || [];
  const big = height >= 600 ? 120 : height >= 450 ? 96 : 80;
  let spark = null;
  if (pts.length >= 2 && height >= 450) {
    const lo = Math.min(...pts); const hi = Math.max(...pts); const span = hi - lo || 1;
    const xy = pts.map((v, i) => [4 + (i * 296) / (pts.length - 1), 52 - ((v - lo) / span) * 44]);
    spark = (
      <svg width="304" height="60" viewBox="0 0 304 60" style={{ display: 'block' }}>
        <polyline points={xy.map((q) => q.join(',')).join(' ')} fill="none" stroke={p.dim} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="6" fill={p.pr} />
      </svg>
    );
  }
  return (
    <Frame p={p} height={height} padY={padFor(height)} style={{ gap: height >= 600 ? 20 : 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pr ? p.pr : p.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: pr ? p.pr : p.dim, letterSpacing: '0.16em' }}>{pr ? 'NEW PERSONAL RECORD' : 'TOP SET TODAY'}</span>
      </span>
      <span style={{ fontSize: height >= 450 ? 44 : 36, fontWeight: 700, lineHeight: 0.92, textTransform: 'uppercase' }}>{pr?.name || top?.name || log.dayName}</span>
      {best && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: MONO, fontSize: big, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{fmtNum(best.weight)}</span>
          <span style={{ fontFamily: MONO, fontSize: 24, color: p.dim }}>{best.unit} × {best.reps} reps</span>
        </div>
      )}
      {pr && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ background: p.surface, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 24, color: p.good }}>+{fmtNum(pr.diff)} {pr.unit}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.dim, letterSpacing: '0.14em' }}>VS LAST BEST</span>
          </div>
          <div style={{ background: p.surface, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 24 }}>{pr.e1rm} {pr.unit}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.dim, letterSpacing: '0.14em' }}>EST. 1RM</span>
          </div>
        </div>
      )}
      {spark}
      <div style={{ marginTop: 'auto' }}><Brand p={p} right={longDate(log.date)} /></div>
    </Frame>
  );
}

// Compact block for laying over a photo or pasting into a story.
export function StickerBlock({ log, summary, show, p }) {
  // Three fit; a PR outranks the set count.
  let stats = statList(summary, show, p);
  if (stats.length > 3 && summary.prs.length) stats = stats.filter((x) => x.key !== 'sets');
  stats = stats.slice(0, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: p.text, fontFamily: FONT, textShadow: p.shadow }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{log.dayName} · {shortDate(log.date)}</span>
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, gap: 12 }}>
          {stats.map((s) => <Stat key={s.key} p={p} value={s.short || s.value} label={s.key === 'volume' ? 'KG' : s.key === 'prs' ? 'PRS' : s.label} color={s.color} big={34} />)}
        </div>
      )}
      <Brand p={p} size={12} />
    </div>
  );
}

export function StickerCard({ log, summary, show, p }) {
  return (
    <div style={{ width: CARD_W, boxSizing: 'border-box', padding: 24, background: p.bg, borderRadius: p.bg === 'transparent' ? 0 : 20 }}>
      <StickerBlock log={log} summary={summary} show={show} p={p} />
    </div>
  );
}

export function PhotoCard({ log, summary, show, photoUrl, stickerY, height }) {
  const p = PALETTES.clear;
  return (
    <div style={{ width: CARD_W, height, position: 'relative', overflow: 'hidden', background: '#34302c', fontFamily: FONT }}>
      {photoUrl && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
      <div style={{ position: 'absolute', left: 24, right: 24, top: Math.round(stickerY * (height - 170)) + 10 }}>
        <StickerBlock log={log} summary={summary} show={show} p={p} />
      </div>
    </div>
  );
}

export function RecapCard({ recap, p, height }) {
  const cell = height >= 600 ? 40 : height >= 450 ? 30 : 24;
  const cells = [...Array(recap.firstWeekday).fill(null), ...Array.from({ length: recap.daysInMonth }, (_, i) => i + 1)];
  return (
    <Frame p={p} height={height} padY={height >= 600 ? 80 : 28} style={{ gap: height >= 600 ? 16 : 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: p.dim, letterSpacing: '0.16em' }}>MONTHLY RECAP · {recap.year}</span>
        <span style={{ fontSize: height >= 450 ? 56 : 44, fontWeight: 700, lineHeight: 0.9, textTransform: 'uppercase' }}>{recap.monthName}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Stat p={p} value={String(recap.workouts)} label="WORKOUTS" big={30} />
        <Stat p={p} value={fmtKg(recap.volumeKg)} label="KG MOVED" big={30} />
        <Stat p={p} value={String(recap.prs)} label="PRS" color={recap.prs ? p.pr : undefined} big={30} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ width: cell, textAlign: 'center', fontSize: 12, fontWeight: 700, color: p.dim }}>{d}</span>)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: cell * 7 + 24 }}>
          {cells.map((d, i) => {
            const day = d && recap.days[d];
            return (
              <span key={i} style={{ position: 'relative', width: cell, height: cell, borderRadius: cell / 5, background: !d ? 'transparent' : day ? p.text : p.surface, color: day ? p.bg === 'transparent' ? '#121110' : p.bg : p.dim, fontFamily: MONO, fontSize: cell >= 30 ? 12 : 10, display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: 'none' }}>
                {d || ''}
                {day?.pr && <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, background: p.pr }} />}
              </span>
            );
          })}
        </div>
      </div>
      {recap.vsPrev && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span style={{ color: p.dim }}>vs {recap.prevLabel}</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: recap.vsPrev.workouts >= 0 ? p.good : p.dim }}>
            {recap.vsPrev.workouts >= 0 ? '+' : ''}{recap.vsPrev.workouts} workouts{recap.vsPrev.volumePct != null ? ` · ${recap.vsPrev.volumePct >= 0 ? '+' : ''}${recap.vsPrev.volumePct}% kg` : ''}
          </span>
        </div>
      )}
      <div style={{ marginTop: 'auto' }}><Brand p={p} /></div>
    </Frame>
  );
}
