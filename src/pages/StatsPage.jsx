import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import WeeklyShareCard from '../components/WeeklyShareCard';
import { createPortal } from 'react-dom';

const LOGS_STALE = 2 * 60 * 1000;
const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"/>
      <polyline points="8,1 8,10"/><polyline points="5,4 8,1 11,4"/>
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
function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
      <polyline points="3,5 7,9 11,5"/>
    </svg>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Confirm</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

async function captureAndShare(ref, filename, title) {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(ref.current, { backgroundColor: '#0a0a0a', scale: 2, useCORS: true, logging: false });
  canvas.toBlob(async (blob) => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

/* ─── Activity Tracker (Monthly + Yearly) ─── */
function ChevronLeftSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9,3 5,7 9,11" />
    </svg>
  );
}
function ChevronRightSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="5,3 9,7 5,11" />
    </svg>
  );
}

function MonthCalendar({ year, month, logDates }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1);
  // Monday-first: convert Sunday(0) → 6, Monday(1) → 0, etc.
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', paddingBottom: 4 }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hasLog = logDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: hasLog ? 900 : 500,
                background: hasLog ? 'var(--accent)' : isToday ? 'rgba(232,255,90,0.1)' : 'var(--bg3)',
                color: hasLog ? '#0a0a0a' : isToday ? 'var(--accent)' : isFuture ? 'var(--text3)' : 'var(--text2)',
                border: isToday && !hasLog ? '1px solid rgba(232,255,90,0.35)' : '1px solid transparent',
                opacity: isFuture ? 0.35 : 1,
                transition: 'background 0.12s',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearHeatmap({ year, logDates }) {
  const today = new Date();
  // Build 52 complete weeks ending at current week (or end of year if past)
  const endDate = new Date(Math.min(today, new Date(year, 11, 31)));
  // Snap endDate to end of its week (Sunday)
  const dayOfWeek = endDate.getDay(); // 0=Sun
  endDate.setDate(endDate.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 52 * 7 + 1);

  // Build grid: columns = weeks, rows = days Mon–Sun
  const weeks = [];
  let cursor = new Date(startDate);
  // Snap cursor to Monday
  const curDow = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - curDow);

  while (cursor <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      week.push({ dateStr, inYear: cursor.getFullYear() === year });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels: find which week column each month starts in
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstOfWeek = new Date(week[0].dateStr + 'T12:00:00');
    if (firstOfWeek.getDate() <= 7 && firstOfWeek.getMonth() !== new Date(weeks[wi > 0 ? wi - 1 : 0][0].dateStr + 'T12:00:00').getMonth()) {
      monthLabels.push({ wi, label: MONTH_SHORT[firstOfWeek.getMonth()] });
    }
  });

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      {/* Month labels row */}
      <div style={{ display: 'flex', marginBottom: 4, paddingLeft: 0 }}>
        {weeks.map((_, wi) => {
          const label = monthLabels.find((m) => m.wi === wi);
          return (
            <div key={wi} style={{ width: 12, flexShrink: 0, marginRight: 2, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'visible' }}>
              {label ? label.label : ''}
            </div>
          );
        })}
      </div>
      {/* Grid */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            {week.map(({ dateStr, inYear }, di) => {
              const hasLog = logDates.has(dateStr);
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={di}
                  title={dateStr}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: hasLog ? 'var(--accent)' : isToday ? 'rgba(232,255,90,0.15)' : 'var(--bg3)',
                    border: isToday && !hasLog ? '1px solid rgba(232,255,90,0.4)' : '1px solid transparent',
                    opacity: isFuture || !inYear ? 0.25 : 1,
                    transition: 'background 0.1s',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTracker({ logs }) {
  const today = new Date();
  const [view, setView] = useState('month');
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const logDates = new Set(logs.map((l) => l.date));

  const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const displayYear = displayDate.getFullYear();
  const displayMonth = displayDate.getMonth();

  const sessionCountMonth = logs.filter((l) => {
    const d = new Date(l.date + 'T12:00:00');
    return d.getFullYear() === displayYear && d.getMonth() === displayMonth;
  }).length;

  const sessionCountYear = logs.filter((l) => l.date.startsWith(String(viewYear))).length;

  const minYear = logs.length > 0 ? Math.min(...logs.map((l) => +l.date.slice(0, 4))) : today.getFullYear();

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['month', 'year'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                background: view === v ? 'var(--accent)' : 'var(--bg3)',
                color: view === v ? '#0a0a0a' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
          {view === 'month' ? `${sessionCountMonth} session${sessionCountMonth !== 1 ? 's' : ''}` : `${sessionCountYear} sessions`}
        </div>
      </div>

      {view === 'month' ? (
        <>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex' }}
            >
              <ChevronLeftSmall />
            </button>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>
              {MONTH_NAMES[displayMonth]} {displayYear}
            </div>
            <button
              onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              style={{ background: 'none', border: 'none', cursor: monthOffset >= 0 ? 'default' : 'pointer', color: monthOffset >= 0 ? 'var(--bg3)' : 'var(--text3)', padding: 4, display: 'flex' }}
            >
              <ChevronRightSmall />
            </button>
          </div>
          <MonthCalendar year={displayYear} month={displayMonth} logDates={logDates} />
        </>
      ) : (
        <>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => setViewYear((y) => Math.max(y - 1, minYear))}
              disabled={viewYear <= minYear}
              style={{ background: 'none', border: 'none', cursor: viewYear <= minYear ? 'default' : 'pointer', color: viewYear <= minYear ? 'var(--bg3)' : 'var(--text3)', padding: 4, display: 'flex' }}
            >
              <ChevronLeftSmall />
            </button>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', color: 'var(--text)' }}>
              {viewYear}
            </div>
            <button
              onClick={() => setViewYear((y) => Math.min(y + 1, today.getFullYear()))}
              disabled={viewYear >= today.getFullYear()}
              style={{ background: 'none', border: 'none', cursor: viewYear >= today.getFullYear() ? 'default' : 'pointer', color: viewYear >= today.getFullYear() ? 'var(--bg3)' : 'var(--text3)', padding: 4, display: 'flex' }}
            >
              <ChevronRightSmall />
            </button>
          </div>
          <YearHeatmap year={viewYear} logDates={logDates} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>Less</div>
            {[0.1, 0.3, 0.6, 1].map((op, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: i === 3 ? 'var(--accent)' : `rgba(232,255,90,${op})` }} />
            ))}
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>More</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 7-day activity strip ─── */
function WeekStrip({ weekLogs }) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const logged = weekLogs.some((l) => l.date === dateStr);
    const isToday = dateStr === now.toISOString().slice(0, 10);
    return { label: DOW_LABELS[i], logged, isToday };
  });

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
      {days.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: '100%', height: 28, borderRadius: 4,
            background: d.logged ? 'var(--accent)' : d.isToday ? 'rgba(232,255,90,0.12)' : 'var(--bg3)',
            border: d.isToday && !d.logged ? '1px solid rgba(232,255,90,0.3)' : '1px solid transparent',
            transition: 'background 0.15s',
          }} />
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.isToday ? 'var(--accent)' : 'var(--text3)', letterSpacing: '0.05em' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Exercise progression section ─── */
function buildProgressionMap(logs) {
  const map = {};
  // logs are sorted newest-first; iterate so earliest entries win on dedupe
  [...logs].reverse().forEach((log) => {
    (log.exercises || []).forEach((ex) => {
      if (!ex.name) return;
      const key = ex.name.trim().toLowerCase();
      if (!map[key]) map[key] = { name: ex.name.trim(), sessions: [] };
      // dedupe by date — keep last entry per date
      const existing = map[key].sessions.findIndex((s) => s.date === log.date);
      const entry = { date: log.date, weight: ex.weight ?? 0, weightUnit: ex.weightUnit || 'kg', sets: ex.sets || 0, reps: ex.reps || 0 };
      if (existing >= 0) map[key].sessions[existing] = entry;
      else map[key].sessions.push(entry);
    });
  });
  return Object.values(map)
    .map((e) => ({
      ...e,
      sessions: e.sessions.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .filter((e) => {
      const uniqueDates = new Set(e.sessions.map((s) => s.date));
      return uniqueDates.size >= 2 && e.sessions.some((s) => s.weight > 0);
    })
    .sort((a, b) => {
      const la = a.sessions[a.sessions.length - 1]?.date || '';
      const lb = b.sessions[b.sessions.length - 1]?.date || '';
      return lb.localeCompare(la);
    });
}

function ProgressionCard({ exercise }) {
  const [expanded, setExpanded] = useState(false);
  const sessions = exercise.sessions;
  // Only use sessions with actual weight for the chart — 0-weight sessions are rest/unlogged
  const weightedSessions = sessions.filter((s) => s.weight > 0);
  const last6 = weightedSessions.slice(-6);
  const first = weightedSessions[0];
  const last = weightedSessions[weightedSessions.length - 1];

  const trend = !first || !last ? '→'
    : last.weight > first.weight ? '↑'
    : last.weight < first.weight ? '↓' : '→';
  const trendColor = trend === '↑' ? 'var(--green)' : trend === '↓' ? 'var(--red)' : 'var(--text3)';

  const maxW = Math.max(...last6.map((s) => s.weight || 0), 1);

  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
      >
        {/* Name + trend */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {exercise.name}
          </div>
          {first && last && (
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginTop: 3 }}>
              <span>{first.weight}{first.weightUnit}</span>
              <span style={{ color: trendColor, margin: '0 5px', fontWeight: 700 }}>{trend}</span>
              <span style={{ color: last.weight > first.weight ? 'var(--green)' : 'var(--text2)', fontWeight: 700 }}>{last.weight}{last.weightUnit}</span>
            </div>
          )}
        </div>

        {/* Mini weight dots */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28, flexShrink: 0 }}>
          {last6.map((s, i) => {
            const h = maxW > 0 ? Math.max(4, Math.round((s.weight / maxW) * 28)) : 4;
            const isLast = i === last6.length - 1;
            return (
              <div key={i} style={{ width: 6, height: h, borderRadius: 2, background: isLast ? 'var(--accent)' : 'var(--border2)', transition: 'height 0.2s' }} />
            );
          })}
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {sessions.map((s, i) => {
            const d = new Date(s.date + 'T12:00:00');
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const prev = sessions[i - 1];
            const delta = prev && prev.weight > 0 && s.weight > 0 ? s.weight - prev.weight : null;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {delta !== null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--font-mono)', color: s.weight > 0 ? 'var(--accent)' : 'var(--text3)' }}>
                    {s.weight > 0 ? `${s.weight}${s.weightUnit}` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Derive volume unit from a log's exercises (returns 'kg', 'lbs', or 'mixed') ─── */
function volUnit(exercises) {
  const units = [...new Set((exercises || []).filter((e) => e.weight > 0).map((e) => e.weightUnit || 'kg'))];
  if (units.length === 0) return 'kg';
  if (units.length === 1) return units[0];
  return 'mixed';
}

/* ─── Log history card ─── */
function LogCard({ log, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(log.date + 'T12:00:00');
  const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateFull = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const unit = volUnit(log.exercises);
  // Recompute volume from exercises to avoid stale stored values
  const computedVol = (log.exercises || []).reduce((s, ex) => s + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0), 0);
  const vol = computedVol > 0
    ? computedVol >= 1000 ? `${(computedVol / 1000).toFixed(1)}k` : `${computedVol}`
    : null;

  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', overflow: 'hidden' }}>
      <button onClick={() => setExpanded((e) => !e)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        {/* Date badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border2)', flexShrink: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{dayAbbr}</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{date.getDate()}</div>
          <div style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{dateFull.split(' ')[0]}</div>
        </div>

        {/* Name / tag */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.dayName}</div>
          {log.dayTag && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{log.dayTag}</div>}
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{log.exercises.length} exercises</div>
        </div>

        {/* Volume */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {vol && (
            <>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>{vol}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{unit !== 'mixed' ? unit : 'vol'}</div>
            </>
          )}
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {log.exercises.map((ex, i) => {
            const wLabel = ex.weight > 0 ? `${ex.weight}${ex.weightUnit}` : '—';
            const rLabel = ex.reps > 0 ? ex.reps : 'max';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < log.exercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '0.01em' }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 8 }}>
                  <span>{ex.sets}×{rLabel}</span>
                  <span style={{ color: ex.weight > 0 ? 'var(--accent)' : 'var(--text3)', fontWeight: 700 }}>{wLabel}</span>
                </div>
              </div>
            );
          })}
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => onDelete(log._id)}><TrashIcon /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function StatsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [sharing, setSharing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [progressionSearch, setProgressionSearch] = useState('');
  const weekCardRef = useRef(null);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['logs', storageKey], queryFn: storage.getLogs, staleTime: LOGS_STALE });
  const { data: weekLogs = [] } = useQuery({ queryKey: ['logs', 'week', storageKey], queryFn: storage.getWeekLogs, staleTime: LOGS_STALE });

  const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: ['logs'] });
  const deleteMutation = useMutation({ mutationFn: (id) => storage.deleteLog(id), onSuccess: invalidateLogs });
  const clearMutation = useMutation({ mutationFn: () => storage.clearLogs(), onSuccess: invalidateLogs });

  async function handleShare() {
    setSharing(true);
    try { await captureAndShare(weekCardRef, 'weekly-recap.png', 'My Weekly Workout Recap'); }
    finally { setSharing(false); }
  }

  // Recompute from exercises so the unit is always correct
  const allWeekExercises = weekLogs.flatMap((l) => l.exercises || []);
  const totalVolume = allWeekExercises.reduce((s, ex) => s + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0), 0);
  const volLabel = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${totalVolume || 0}`;
  const weekVolUnit = volUnit(allWeekExercises);

  const progressionData = buildProgressionMap(logs);
  const filteredProgression = progressionSearch.trim()
    ? progressionData.filter((e) => e.name.toLowerCase().includes(progressionSearch.toLowerCase()))
    : progressionData;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stats</h1>
          <div className="page-subtitle">{logs.length} total workouts</div>
        </div>
        {logs.length > 0 && (
          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setConfirm('clear')}><TrashIcon /></button>
        )}
      </div>

      {isLoading ? <div className="spinner" /> : (
        <div style={{ padding: '16px 16px 0' }}>

          {/* ── This Week ── */}
          <SectionLabel>This Week</SectionLabel>
          <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Sessions</div>
                <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.01em' }}>{weekLogs.length}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>this week</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
                <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12, gap: 6 }} onClick={handleShare} disabled={sharing}>
                  <ShareIcon />{sharing ? 'Sharing…' : 'Share'}
                </button>
                {totalVolume > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' }}>Volume</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {volLabel}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 3 }}>{weekVolUnit !== 'mixed' ? weekVolUnit : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <WeekStrip weekLogs={weekLogs} />
          </div>

          {/* ── Activity Tracker ── */}
          {logs.length > 0 && (
            <>
              <SectionLabel>Activity</SectionLabel>
              <ActivityTracker logs={logs} />
            </>
          )}

          {/* ── Progression ── */}
          {progressionData.length > 0 && (
            <>
              <SectionLabel>Progression</SectionLabel>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Search exercise..."
                  value={progressionSearch}
                  onChange={(e) => setProgressionSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border2)', background: 'var(--bg3)',
                    color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)',
                    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
                  }}
                />
                {filteredProgression.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>No results</div>
                ) : (
                  filteredProgression.map((ex) => <ProgressionCard key={ex.name} exercise={ex} />)
                )}
              </div>
            </>
          )}

          {/* ── History ── */}
          <SectionLabel>History</SectionLabel>
          {logs.length === 0 ? (
            <div className="empty-state">No workouts logged yet.<br />Finish a workout to see it here.</div>
          ) : (
            logs.map((log) => <LogCard key={log._id} log={log} onDelete={(id) => deleteMutation.mutate(id)} />)
          )}

          <div style={{ height: 24 }} />
        </div>
      )}

      <WeeklyShareCard logs={weekLogs} cardRef={weekCardRef} />

      {confirm === 'clear' && (
        <ConfirmModal
          message="Delete all workout logs? This cannot be undone."
          onConfirm={() => { setConfirm(null); clearMutation.mutate(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
