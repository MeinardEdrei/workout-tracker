import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import StatsShareModal from '../components/StatsShareModal';
import { createPortal } from 'react-dom';
import { capitalizeWords, formatRelativeDate } from '../utils/textFormat';
import { normKey, findDuplicatePairs } from '../utils/matchExercise';
import { X, TrendingUp, TrendingDown, ArrowRight, RotateCcw, BarChart3, FolderOpen, Download, Tag, Pencil, Check, Flame, Minus, Trophy } from 'lucide-react';
import { computeStreak } from '../utils/streaks';

function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'kg' && toUnit === 'lbs') return weight * 2.20462;
  if (fromUnit === 'lbs' && toUnit === 'kg') return weight / 2.20462;
  return weight;
}

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

  const minYear = logs.length > 0 ? Math.min(...logs.map((l) => +l.date.slice(0, 4))) : today.getFullYear();

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
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

// Returns the last `n` Monday-Sunday week ranges, oldest first, ending on the current week.
function getLastNWeeks(n) {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMon);

  return Array.from({ length: n }, (_, i) => {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - (n - 1 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      startStr: weekStart.toISOString().slice(0, 10),
      endStr: weekEnd.toISOString().slice(0, 10),
      isCurrent: i === n - 1,
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
    };
  });
}

function WeeklySessionsChart({ logs }) {
  const weeks = getLastNWeeks(8).map((w) => ({
    ...w,
    count: logs.filter((l) => l.date >= w.startStr && l.date <= w.endStr).length,
  }));

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
        Sessions / Week
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {weeks.map((w, i) => {
          const h = w.count > 0 ? Math.max(6, Math.round((w.count / maxCount) * 72)) : 3;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
              {w.count > 0 && (
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: w.isCurrent ? 'var(--accent)' : 'var(--text3)' }}>{w.count}</div>
              )}
              <div style={{
                width: '100%', height: h, borderRadius: 3,
                background: w.isCurrent ? 'var(--accent)' : 'var(--bg3)',
                transition: 'height 0.2s',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            {w.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyVolumeChart({ logs }) {
  // Standardise to kg across weeks so the trend line is comparable even if
  // the user logged in mixed units at different points in their history.
  const weeks = getLastNWeeks(8).map((w) => {
    const weekLogs = logs.filter((l) => l.date >= w.startStr && l.date <= w.endStr);
    const volumeKg = weekLogs.reduce((sum, l) => sum + (l.exercises || []).reduce((s, ex) => {
      const weightKg = convertWeight(ex.weight || 0, ex.weightUnit || 'kg', 'kg');
      return s + (ex.sets || 0) * (ex.reps || 0) * weightKg;
    }, 0), 0);
    return { ...w, volume: Math.round(volumeKg) };
  });

  const fmtVol = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`);

  let linePath = '';
  let areaPath = '';
  let lastPointPct = null;
  let maxVal = 0;
  let minVal = 0;
  const hasData = weeks.some((w) => w.volume > 0);
  if (hasData) {
    const vals = weeks.map((w) => w.volume);
    minVal = Math.min(...vals);
    maxVal = Math.max(...vals);
    const range = maxVal - minVal || 1;
    const points = weeks.map((w, i) => {
      const x = (i / (weeks.length - 1)) * 300;
      const y = 90 - ((w.volume - minVal) / range) * 80;
      return [x, y];
    });
    linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    areaPath = `${linePath} L300,100 L0,100 Z`;
    const [lx, ly] = points[points.length - 1];
    lastPointPct = { left: (lx / 300) * 100, top: ly };
  }

  const currentWeekVolume = weeks[weeks.length - 1].volume;

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Volume / Week
        </div>
        {hasData && (
          <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {fmtVol(currentWeekVolume)}<span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 3 }}>kg this week</span>
          </div>
        )}
      </div>
      {hasData ? (
        <>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{fmtVol(maxVal)}kg</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{fmtVol(minVal)}kg</div>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ width: '100%', height: 100, display: 'block' }}>
              <defs>
                <linearGradient id="grad-weekly-volume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#grad-weekly-volume)" />
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            {lastPointPct && (
              <div style={{
                position: 'absolute', left: `${lastPointPct.left}%`, top: lastPointPct.top,
                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 3px rgba(232,255,90,0.2)',
              }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {w.label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>No weighted volume logged yet</div>
      )}
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

// Compares the average of the last 3 sessions' estimated 1RM against the
// 3 before that (falling back to the earliest sessions if there aren't 6
// yet) — a real recent-trend window, unlike a naive first-vs-last compare
// which stays "improving" forever once early gains happened.
function computeProgressStatus(weightedSessionsInKg) {
  if (weightedSessionsInKg.length < 4) return null;
  const recent = weightedSessionsInKg.slice(-3);
  const prior = weightedSessionsInKg.slice(-6, -3).length ? weightedSessionsInKg.slice(-6, -3) : weightedSessionsInKg.slice(0, -3);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  if (recentAvg > priorAvg * 1.02) return 'improving';
  if (recentAvg < priorAvg * 0.98) return 'declining';
  return 'plateaued';
}

function ProgressionCard({ exercise }) {
  const [expanded, setExpanded] = useState(false);
  const [use1RM, setUse1RM] = useState(false);
  const sessions = exercise.sessions;
  // Only use sessions with actual weight for the chart — 0-weight sessions are rest/unlogged
  const weightedSessions = sessions.filter((s) => s.weight > 0);
  const last6 = weightedSessions.slice(-6);
  const first = weightedSessions[0];
  const last = weightedSessions[weightedSessions.length - 1];

  function calc1RM(s) {
    if (!s || s.weight <= 0) return 0;
    const reps = (s.untilFailure || s.reps === 0) ? 10 : (s.reps || 1);
    return Math.round(s.weight * (1 + reps / 30) * 10) / 10;
  }

  // e1RM series converted to the most recent session's unit so the trend
  // comparison isn't skewed by a kg/lbs switch mid-history.
  const e1RMSeries = last ? weightedSessions.map((s) => convertWeight(calc1RM(s), s.weightUnit, last.weightUnit)) : [];
  const progressStatus = computeProgressStatus(e1RMSeries);
  let sessionsSinceLastPR = 0;
  if (progressStatus === 'plateaued' && e1RMSeries.length > 0) {
    const maxE1RM = Math.max(...e1RMSeries);
    const lastPRIdx = e1RMSeries.lastIndexOf(maxE1RM);
    sessionsSinceLastPR = e1RMSeries.length - 1 - lastPRIdx;
  }

  const firstVal = first ? (use1RM ? calc1RM(first) : first.weight) : 0;
  const lastVal = last ? (use1RM ? calc1RM(last) : last.weight) : 0;
  const firstConverted = first && last ? convertWeight(firstVal, first.weightUnit, last.weightUnit) : 0;

  const TrendIcon = (!first || !last) ? ArrowRight
    : lastVal > firstConverted ? TrendingUp
    : lastVal < firstConverted ? TrendingDown : ArrowRight;
  const trendColor = TrendIcon === TrendingUp ? 'var(--green)' : TrendIcon === TrendingDown ? 'var(--red)' : 'var(--text3)';

  const allConverted = last ? weightedSessions.map(s => {
    const rawVal = use1RM ? calc1RM(s) : s.weight;
    return {
      ...s,
      displayVal: convertWeight(rawVal, s.weightUnit, last.weightUnit)
    };
  }) : [];
  const last6Converted = allConverted.slice(-6);
  const maxW = Math.max(...last6Converted.map((s) => s.displayVal || 0), 1);

  let linePath = '';
  let areaPath = '';
  let chartMin = 0;
  let chartMax = 0;
  let lastPointPct = null;
  if (allConverted.length >= 3) {
    const vals = allConverted.map((s) => s.displayVal);
    chartMin = Math.min(...vals);
    chartMax = Math.max(...vals);
    const range = chartMax - chartMin || 1;
    const points = allConverted.map((s, i) => {
      const x = (i / (allConverted.length - 1)) * 300;
      const y = 90 - ((s.displayVal - chartMin) / range) * 80;
      return [x, y];
    });
    linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    areaPath = `${linePath} L300,100 L0,100 Z`;
    const [lx, ly] = points[points.length - 1];
    lastPointPct = { left: (lx / 300) * 100, top: ly };
  }
  const chartUnit = last ? last.weightUnit : '';

  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
      >
        {/* Name + trend */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {exercise.name}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setUse1RM(v => !v); }}
              style={{
                fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                border: use1RM ? '1px solid var(--accent)' : '1px solid var(--border2)',
                background: use1RM ? 'rgba(232,255,90,0.12)' : 'var(--bg3)',
                color: use1RM ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer'
              }}
              title="Toggle Weight / Est 1RM"
            >
              {use1RM ? 'Est 1RM' : 'Weight'}
            </button>
          </div>
          {progressStatus ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {progressStatus === 'improving' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <TrendingUp size={12} /> Improving
                </span>
              )}
              {progressStatus === 'declining' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <TrendingDown size={12} /> Declining
                </span>
              )}
              {progressStatus === 'plateaued' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Minus size={12} /> Plateaued{sessionsSinceLastPR > 0 ? ` · no PR in ${sessionsSinceLastPR} session${sessionsSinceLastPR === 1 ? '' : 's'}` : ''}
                </span>
              )}
            </div>
          ) : first && last && (
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginTop: 3 }}>
              <span>{Math.round(firstVal * 10) / 10}{first.weightUnit}</span>
              <span style={{ color: trendColor, margin: '0 5px', display: 'inline-flex', verticalAlign: 'middle' }}><TrendIcon size={13} /></span>
              <span style={{ color: lastVal > firstConverted ? 'var(--green)' : 'var(--text2)', fontWeight: 700 }}>{Math.round(lastVal * 10) / 10}{last.weightUnit}</span>
            </div>
          )}
        </div>

        {/* Mini weight dots */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28, flexShrink: 0 }}>
          {last6Converted.map((s, i) => {
            const h = maxW > 0 ? Math.max(4, Math.round((s.displayVal / maxW) * 28)) : 4;
            const isLast = i === last6Converted.length - 1;
            return (
              <div key={i} style={{ width: 6, height: h, borderRadius: 2, background: isLast ? 'var(--accent)' : 'var(--border2)', transition: 'height 0.2s' }} />
            );
          })}
        </div>

        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {allConverted.length >= 3 && (
            <div style={{ padding: '14px 14px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {use1RM ? 'Est. 1RM' : 'Weight'} trend
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  {Math.round(allConverted[allConverted.length - 1].displayVal * 10) / 10}{chartUnit}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{Math.round(chartMax * 10) / 10}{chartUnit}</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{Math.round(chartMin * 10) / 10}{chartUnit}</div>
                <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ width: '100%', height: 100, display: 'block' }}>
                  <defs>
                    <linearGradient id={`grad-${normKey(exercise.name)}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill={`url(#grad-${normKey(exercise.name)})`} />
                  <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                {lastPointPct && (
                  <div style={{
                    position: 'absolute', left: `${lastPointPct.left}%`, top: lastPointPct.top,
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                    transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 3px rgba(232,255,90,0.2)',
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                <span>{formatRelativeDate(allConverted[0].date)}</span>
                <span>{allConverted.length} sessions</span>
                <span>{formatRelativeDate(allConverted[allConverted.length - 1].date)}</span>
              </div>
            </div>
          )}
          <div style={{ padding: '8px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button
              onClick={() => setUse1RM(false)}
              style={{
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4,
                border: !use1RM ? '1px solid var(--accent)' : '1px solid var(--border2)',
                background: !use1RM ? 'rgba(232,255,90,0.1)' : 'transparent',
                color: !use1RM ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer'
              }}
            >
              Weight
            </button>
            <button
              onClick={() => setUse1RM(true)}
              style={{
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4,
                border: use1RM ? '1px solid var(--accent)' : '1px solid var(--border2)',
                background: use1RM ? 'rgba(232,255,90,0.1)' : 'transparent',
                color: use1RM ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer'
              }}
            >
              Est. 1RM
            </button>
          </div>
          {sessions.map((s, i) => {
            const d = new Date(s.date + 'T12:00:00');
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const prev = sessions[i - 1];
            
            let deltaFormatted = null;
            let deltaColor = 'var(--text3)';
            if (prev && prev.weight > 0 && s.weight > 0) {
              const prevWConverted = convertWeight(prev.weight, prev.weightUnit, s.weightUnit);
              const delta = s.weight - prevWConverted;
              if (Math.abs(delta) >= 0.05) {
                const roundedDelta = parseFloat(delta.toFixed(1));
                deltaFormatted = roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;
                deltaColor = roundedDelta > 0 ? 'var(--green)' : 'var(--red)';
              }
            }
            
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {deltaFormatted !== null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: deltaColor, fontFamily: 'var(--font-mono)' }}>
                      {deltaFormatted}
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

/* ─── Derive volume unit and convert/recalculate volume accurately ─── */

function getExercisesVolumeAndUnit(exercises) {
  if (!exercises || exercises.length === 0) return { volume: 0, unit: 'kg' };
  const activeExs = exercises.filter((e) => e.weight > 0);
  const units = [...new Set(activeExs.map((e) => e.weightUnit || 'kg'))];
  
  if (units.length === 0) return { volume: 0, unit: 'kg' };
  if (units.length === 1) {
    const unit = units[0];
    const volume = exercises.reduce((sum, ex) => sum + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0), 0);
    return { volume: Math.round(volume), unit };
  }
  
  // Mixed units: standardise to kg
  const volumeInKg = exercises.reduce((sum, ex) => {
    const w = ex.weight || 0;
    const weightInKg = (ex.weightUnit === 'lbs') ? (w / 2.20462) : w;
    return sum + (ex.sets || 0) * (ex.reps || 0) * weightInKg;
  }, 0);
  return { volume: Math.round(volumeInKg), unit: 'kg' };
}

/* ─── Log history card ─── */
function LogCard({ log, onDelete, hasPR }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(log.date + 'T12:00:00');
  const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateFull = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const { volume: computedVol, unit } = getExercisesVolumeAndUnit(log.exercises);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.dayName}</div>
            {hasPR && (
              <span style={{
                fontSize: 8, fontWeight: 900, color: 'var(--accent)', background: 'rgba(232, 255, 90, 0.1)',
                border: '1px solid var(--accent)', padding: '1px 5px', borderRadius: 4,
                textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <Trophy size={9} /> PR
              </span>
            )}
          </div>
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
            const rLabel = (ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Failure' : ex.reps;
            let prefix = "";
            let nameStyle = { fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '0.01em' };
            if (ex.category === 'warmup') {
              prefix = "[WU] ";
              nameStyle.color = '#ff9f43';
            } else if (ex.category === 'cooldown') {
              prefix = "[CD] ";
              nameStyle.color = 'var(--blue)';
            }
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < log.exercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  <div style={nameStyle}>{prefix}{ex.name}</div>
                  {ex.isLastWeekWorkout && (
                    <span style={{
                      fontSize: 8,
                      fontWeight: 900,
                      color: 'var(--accent)',
                      background: 'rgba(232, 255, 90, 0.1)',
                      border: '1px solid var(--accent)',
                      padding: '1px 5px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3
                    }}>
                      <RotateCcw size={9} /> Last Week
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 8, flexShrink: 0 }}>
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

function groupLogsByMonth(logsArr) {
  const groups = [];
  let currentKey = null;
  logsArr.forEach((log) => {
    const d = new Date(log.date + 'T12:00:00');
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== currentKey) {
      groups.push({ label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), logs: [] });
      currentKey = key;
    }
    groups[groups.length - 1].logs.push(log);
  });
  return groups;
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function BackupModal({ logs, splits, storage, queryClient, onClose }) {
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  function exportCSV() {
    let csv = 'Date,Split Name,Day Name,Day Tag,Exercise Name,Category,Sets,Reps,Weight,Unit,Total Volume (kg),Notes\n';
    
    (logs || []).forEach(log => {
      (log.exercises || []).forEach(ex => {
        const wKg = convertWeight(ex.weight, ex.weightUnit || 'kg', 'kg');
        const volKg = Math.round((ex.sets || 0) * (ex.reps || 0) * wKg);
        const date = log.date || '';
        const split = (log.splitName || '').replace(/,/g, ' ');
        const day = (log.dayName || '').replace(/,/g, ' ');
        const tag = (log.dayTag || '').replace(/,/g, ' ');
        const exName = (ex.name || '').replace(/,/g, ' ');
        const cat = ex.category || 'workout';
        const sets = ex.sets || 0;
        const reps = (ex.untilFailure || ex.reps === 0) ? 'Failure' : (ex.reps || 0);
        const weight = ex.weight || 0;
        const unit = ex.weightUnit || 'kg';
        const notes = (ex.notes || '').replace(/,/g, ' ');

        csv += `${date},${split},${day},${tag},${exName},${cat},${sets},${reps},${weight},${unit},${volKg},"${notes}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `workout_logs_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMsg({ text: 'CSV workout log exported successfully!', type: 'success' });
  }

  async function exportJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      splits: splits || [],
      logs: logs || [],
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `workout_tracker_backup_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMsg({ text: 'JSON backup file exported successfully!', type: 'success' });
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.logs && !json.splits) {
          throw new Error('Invalid backup file structure.');
        }
        
        if (json.logs && Array.isArray(json.logs)) {
          for (const l of json.logs) {
            await storage.saveLog(l);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['logs'] });
        queryClient.invalidateQueries({ queryKey: ['splits'] });
        setMsg({ text: `Imported successfully! Restored backup data.`, type: 'success' });
      } catch (err) {
        setMsg({ text: `Import failed: ${err.message}`, type: 'error' });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ fontSize: 18, margin: 0 }}>Data & Backups</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
              <BarChart3 size={15} /> Export Workout History (CSV)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              Download your complete workout logs as a spreadsheet compatible with Excel and Google Sheets.
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, width: '100%' }} onClick={exportCSV}>
              Download CSV
            </button>
          </div>

          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
              <FolderOpen size={15} /> Export Full Backup (JSON)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              Export all your custom splits, exercise routines, and workout history as a JSON backup file.
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, width: '100%' }} onClick={exportJSON}>
              Download JSON Backup
            </button>
          </div>

          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
              <Download size={15} /> Restore / Import Backup (JSON)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              Upload a `.json` backup file to restore past workouts and split programs.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <button
              className="btn btn-accent"
              style={{ fontSize: 12, width: '100%' }}
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Select Backup File'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 6,
            background: msg.type === 'error' ? 'rgba(255,68,68,0.12)' : 'rgba(232,255,90,0.12)',
            color: msg.type === 'error' ? 'var(--red)' : 'var(--accent)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,68,68,0.3)' : 'rgba(232,255,90,0.3)'}`,
            marginBottom: 12,
          }}>
            {msg.text}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ManageExercisesModal({ logs, storage, storageKey, queryClient, onClose }) {
  const [mergeTarget, setMergeTarget] = useState(null); // { a: stat, b: stat }
  const [survivor, setSurvivor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selectedNames, setSelectedNames] = useState([]); // manual merge picks, max 2
  const [renamingName, setRenamingName] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const exerciseStats = useMemo(() => {
    const map = new Map(); // normKey -> { name, logCount, lastLoggedDate }
    (logs || []).forEach((log) => {
      (log.exercises || []).forEach((ex) => {
        if (!ex.name) return;
        const key = normKey(ex.name);
        const existing = map.get(key);
        if (existing) {
          existing.logCount++;
          if (!existing.lastLoggedDate || (log.date || '') > existing.lastLoggedDate) {
            existing.lastLoggedDate = log.date || '';
            existing.name = ex.name.trim();
          }
        } else {
          map.set(key, { name: ex.name.trim(), logCount: 1, lastLoggedDate: log.date || '' });
        }
      });
    });
    return [...map.values()].sort((a, b) => b.logCount - a.logCount);
  }, [logs]);

  const duplicatePairs = useMemo(
    () => findDuplicatePairs(exerciseStats.map((e) => e.name)),
    [exerciseStats]
  );

  function statFor(name) {
    return exerciseStats.find((e) => normKey(e.name) === normKey(name));
  }

  function openMerge(nameA, nameB) {
    const a = statFor(nameA);
    const b = statFor(nameB);
    if (!a || !b) return;
    setMergeTarget({ a, b });
    setSurvivor((b.logCount > a.logCount) ? b.name : a.name);
    setMsg(null);
    setSelectedNames([]);
  }

  function toggleSelect(name) {
    setSelectedNames((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= 2) return prev;
      return [...prev, name];
    });
  }

  function startRename(stat) {
    setRenamingName(stat.name);
    setRenameValue(stat.name);
    setMsg(null);
  }

  async function confirmRename() {
    const oldName = renamingName;
    const newName = renameValue.trim();
    if (!oldName || !newName || newName.toLowerCase() === oldName.toLowerCase()) {
      setRenamingName(null);
      return;
    }
    setBusy(true);
    try {
      await storage.renameHistory(oldName, newName, 'all');
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      queryClient.invalidateQueries({ queryKey: ['logs', storageKey] });
      setMsg({ text: `Renamed "${oldName}" to "${newName}".`, type: 'success' });
      setRenamingName(null);
    } catch (err) {
      setMsg({ text: err.message || 'Rename failed', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmMerge() {
    if (!mergeTarget || !survivor) return;
    const losing = survivor === mergeTarget.a.name ? mergeTarget.b.name : mergeTarget.a.name;
    setBusy(true);
    try {
      await storage.renameHistory(losing, survivor, 'all');
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      queryClient.invalidateQueries({ queryKey: ['logs', storageKey] });
      setMsg({ text: `Merged "${losing}" into "${survivor}".`, type: 'success' });
      setMergeTarget(null);
    } catch (err) {
      setMsg({ text: err.message || 'Merge failed', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ fontSize: 18, margin: 0 }}>Manage Exercises</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {mergeTarget ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
              These look like the same exercise. Pick which name should keep the combined history:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[mergeTarget.a, mergeTarget.b].map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSurvivor(s.name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                    background: survivor === s.name ? 'rgba(232,255,90,0.08)' : 'var(--bg3)',
                    border: `1px solid ${survivor === s.name ? 'var(--accent)' : 'var(--border2)'}`,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {s.logCount} log{s.logCount === 1 ? '' : 's'}
                    {s.lastLoggedDate ? ` · ${formatRelativeDate(s.lastLoggedDate)}` : ''}
                  </span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setMergeTarget(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-accent" onClick={confirmMerge} disabled={busy}>
                {busy ? 'Merging…' : 'Merge'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {duplicatePairs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Possible duplicates
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {duplicatePairs.map((pair) => (
                    <div
                      key={`${pair.a}::${pair.b}`}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 8, background: 'rgba(232,255,90,0.06)',
                        border: '1px solid rgba(232,255,90,0.2)',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text)', minWidth: 0 }}>
                        "{pair.a}" and "{pair.b}"
                      </span>
                      <button className="btn btn-accent" style={{ fontSize: 11, padding: '5px 10px', flexShrink: 0 }} onClick={() => openMerge(pair.a, pair.b)}>
                        Merge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                All exercises ({exerciseStats.length})
              </div>
              {selectedNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{selectedNames.length}/2 selected</span>
                  {selectedNames.length === 2 && (
                    <button className="btn btn-accent" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => openMerge(selectedNames[0], selectedNames[1])}>
                      Merge Selected
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => setSelectedNames([])}>
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              Tap two exercises to select them for a manual merge, or use the pencil to rename one.
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exerciseStats.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No logged exercises yet.</div>
              ) : exerciseStats.map((s) => {
                const isSelected = selectedNames.includes(s.name);
                const isRenaming = renamingName === s.name;
                return (
                  <div
                    key={s.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6,
                      background: isSelected ? 'rgba(232,255,90,0.08)' : 'var(--bg3)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    }}
                  >
                    {isRenaming ? (
                      <>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingName(null); }}
                          autoFocus
                          style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '4px 7px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }}
                        />
                        <button onClick={confirmRename} disabled={busy} title="Save" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><Check size={14} /></button>
                        <button onClick={() => setRenamingName(null)} disabled={busy} title="Cancel" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleSelect(s.name)}
                          title={isSelected ? 'Deselect' : 'Select for merge'}
                          style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, padding: 0, cursor: 'pointer',
                            border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`,
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {isSelected && <Check size={11} color="#0a0a0a" />}
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                          {s.logCount} log{s.logCount === 1 ? '' : 's'}
                        </span>
                        <button onClick={() => startRename(s)} title="Rename" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {msg && (
          <div style={{
            fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 6, marginTop: 12,
            background: msg.type === 'error' ? 'rgba(255,68,68,0.12)' : 'rgba(232,255,90,0.12)',
            color: msg.type === 'error' ? 'var(--red)' : 'var(--accent)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,68,68,0.3)' : 'rgba(232,255,90,0.3)'}`,
          }}>
            {msg.text}
          </div>
        )}

        {!mergeTarget && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function StatsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [progressionSearch, setProgressionSearch] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [showAllPRs, setShowAllPRs] = useState(false);
  const [showAllProgression, setShowAllProgression] = useState(false);
  const TABS = ['Overview', 'Progress', 'History'];
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [trackHeight, setTrackHeight] = useState(undefined);
  const trackRef = useRef(null);
  const panelRefs = useRef({});

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['logs', storageKey], queryFn: storage.getLogs, staleTime: LOGS_STALE });
  const { data: weekLogs = [] } = useQuery({ queryKey: ['logs', 'week', storageKey], queryFn: storage.getWeekLogs, staleTime: LOGS_STALE });
  const { data: splits = [] } = useQuery({ queryKey: ['splits', storageKey], queryFn: storage.getSplits, staleTime: LOGS_STALE });
  const activeSplit = splits.find((s) => s.isActive) || splits[0] || null;

  // Track which panel is active from the track's own scroll position — panels
  // are full-width with no gap, so scrollLeft / clientWidth gives an exact
  // index directly, more reliable here than IntersectionObserver ratios
  // (which get noisy while the track's height is mid-transition). Depends on
  // isLoading because the track only mounts once the loading spinner is
  // replaced by real content — attaching on an empty-deps mount would run
  // while trackRef.current is still null and never re-attach.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (!el.clientWidth) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActiveTabIndex((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isLoading]);

  // Keep the track's height matched to the active panel's natural height
  useEffect(() => {
    const el = panelRefs.current[activeTabIndex];
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setTrackHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTabIndex, isLoading]);

  const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: ['logs'] });
  const deleteMutation = useMutation({ mutationFn: (id) => storage.deleteLog(id), onSuccess: invalidateLogs });
  const clearMutation = useMutation({ mutationFn: () => storage.clearLogs(), onSuccess: invalidateLogs });

  // Recompute from exercises so the unit is always correct
  const allWeekExercises = weekLogs.flatMap((l) => l.exercises || []);
  const { volume: totalVolume, unit: weekVolUnit } = getExercisesVolumeAndUnit(allWeekExercises);
  const volLabel = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${totalVolume || 0}`;

  const progressionData = buildProgressionMap(logs);
  const filteredProgression = progressionSearch.trim()
    ? progressionData.filter((e) => e.name.toLowerCase().includes(progressionSearch.toLowerCase()))
    : progressionData;

  // ── All-time stat tiles ──
  const { streakDays, streakWeeks } = computeStreak(logs, activeSplit);
  const streakLabel = streakWeeks > 0 ? `${streakWeeks}w` : `${streakDays}d`;
  const { volume: allTimeVolume, unit: allTimeVolUnit } = getExercisesVolumeAndUnit(logs.flatMap((l) => l.exercises || []));
  const allTimeVolLabel = allTimeVolume >= 1000 ? `${(allTimeVolume / 1000).toFixed(1)}k` : `${allTimeVolume || 0}`;
  const earliestLogDate = logs.length > 0 ? logs.reduce((min, l) => (l.date < min ? l.date : min), logs[0].date) : null;
  const weeksSinceFirstLog = earliestLogDate
    ? Math.max(1, (Date.now() - new Date(earliestLogDate + 'T00:00:00').getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1;
  const avgPerWeek = logs.length > 0 ? (logs.length / weeksSinceFirstLog).toFixed(1) : '0';

  // ── All-time personal records ──
  const personalRecords = progressionData
    .map((e) => {
      const weighted = e.sessions.filter((s) => s.weight > 0);
      if (weighted.length === 0) return null;
      const commonUnit = weighted[weighted.length - 1].weightUnit;
      let best = weighted[0];
      let bestConverted = convertWeight(best.weight, best.weightUnit, commonUnit);
      weighted.forEach((s) => {
        const converted = convertWeight(s.weight, s.weightUnit, commonUnit);
        if (converted > bestConverted) { best = s; bestConverted = converted; }
      });
      return { name: e.name, weight: best.weight, unit: best.weightUnit, date: best.date };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));
  const prDates = new Set(personalRecords.map((pr) => pr.date));

  // ── History search/filter ──
  const filteredLogs = historySearch.trim()
    ? logs.filter((log) => {
        const q = historySearch.trim().toLowerCase();
        return log.dayName?.toLowerCase().includes(q)
          || log.dayTag?.toLowerCase().includes(q)
          || (log.exercises || []).some((ex) => ex.name?.toLowerCase().includes(q));
      })
    : logs;
  const displayedLogs = historySearch.trim() ? filteredLogs : (showAllHistory ? filteredLogs : filteredLogs.slice(0, 10));
  const historyGroups = groupLogsByMonth(displayedLogs);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stats</h1>
          <div className="page-subtitle">{logs.length} total workouts</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '5px 10px', gap: 5 }}
            onClick={() => setShowBackupModal(true)}
          >
            <FolderOpen size={13} /> Backups
          </button>
          {logs.length > 0 && (
            <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setConfirm('clear')}><TrashIcon /></button>
          )}
        </div>
      </div>

      {isLoading ? <div className="spinner" /> : (
        <div style={{ padding: '16px 16px 0' }}>

          {/* ── Tab control ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => panelRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                  background: activeTabIndex === i ? 'var(--accent)' : 'var(--bg3)',
                  color: activeTabIndex === i ? '#0a0a0a' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            ref={trackRef}
            className="stats-tab-track"
            style={{
              display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch', height: trackHeight, overflowY: 'hidden',
              transition: 'height 0.2s ease',
            }}
          >
          <div
            ref={(el) => { panelRefs.current[0] = el; }}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', minWidth: 0 }}
          >
              {/* ── This Week ── */}
              <SectionLabel>This Week</SectionLabel>
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Sessions</div>
                    <div style={{ fontSize: 'clamp(34px, 12vw, 52px)', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.01em' }}>{weekLogs.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>this week</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end', minWidth: 0 }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12, gap: 6 }} onClick={() => setShowShareModal(true)}>
                      <ShareIcon /> Share
                    </button>
                    {totalVolume > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' }}>Volume</div>
                        <div style={{ fontSize: 'clamp(18px, 6vw, 24px)', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                          {volLabel}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 3 }}>{weekVolUnit !== 'mixed' ? weekVolUnit : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <WeekStrip weekLogs={weekLogs} />
              </div>

              {/* ── All-time stat tiles ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                {[
                  { icon: <Flame size={14} />, value: streakLabel, label: 'streak' },
                  { icon: null, value: logs.length, label: 'workouts' },
                  { icon: null, value: allTimeVolLabel, label: allTimeVolUnit !== 'mixed' ? allTimeVolUnit : 'volume' },
                  { icon: null, value: avgPerWeek, label: 'avg/week' },
                ].map((t, i) => (
                  <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {t.icon}{t.value}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{t.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Weekly sessions chart ── */}
              {logs.length > 0 && <WeeklySessionsChart logs={logs} />}
              {logs.length > 0 && <WeeklyVolumeChart logs={logs} />}
          </div>

          <div
            ref={(el) => { panelRefs.current[1] = el; }}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', minWidth: 0 }}
          >
              {/* ── Activity Tracker ── */}
              {logs.length > 0 && (
                <>
                  <SectionLabel>Activity</SectionLabel>
                  <ActivityTracker logs={logs} />
                </>
              )}

              {/* ── Manage Exercises ── */}
              <SectionLabel>Exercises</SectionLabel>
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(232,255,90,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <Tag size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Manage Exercises</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, lineHeight: 1.4 }}>
                    Rename an exercise, or merge duplicates like "DB Curl" and "Dumbbell Curl" so their history stays connected.
                  </div>
                </div>
                <button className="btn btn-accent" style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }} onClick={() => setShowManageExercises(true)}>
                  Open
                </button>
              </div>

              {/* ── Personal Records ── */}
              {personalRecords.length > 0 && (
                <>
                  <SectionLabel>Personal Records</SectionLabel>
                  <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', marginBottom: 10, overflow: 'hidden' }}>
                    {(showAllPRs ? personalRecords : personalRecords.slice(0, 5)).map((pr, i, arr) => (
                      <div key={pr.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <Trophy size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pr.name}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)', flexShrink: 0 }}>{pr.weight}{pr.unit}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', flexShrink: 0, width: 56, textAlign: 'right' }}>{formatRelativeDate(pr.date)}</div>
                      </div>
                    ))}
                  </div>
                  {!showAllPRs && personalRecords.length > 5 && (
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', fontSize: 12, marginBottom: 24 }}
                      onClick={() => setShowAllPRs(true)}
                    >
                      Show all {personalRecords.length} records
                    </button>
                  )}
                  {(showAllPRs || personalRecords.length <= 5) && <div style={{ marginBottom: 14 }} />}
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
                      <>
                        {(progressionSearch.trim() || showAllProgression ? filteredProgression : filteredProgression.slice(0, 5)).map((ex) => (
                          <ProgressionCard key={ex.name} exercise={ex} />
                        ))}
                        {!progressionSearch.trim() && !showAllProgression && filteredProgression.length > 5 && (
                          <button
                            className="btn btn-ghost"
                            style={{ width: '100%', fontSize: 12, marginTop: 4 }}
                            onClick={() => setShowAllProgression(true)}
                          >
                            Show all {filteredProgression.length} exercises
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
          </div>

          <div
            ref={(el) => { panelRefs.current[2] = el; }}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', minWidth: 0 }}
          >
              {/* ── History ── */}
              <SectionLabel>History</SectionLabel>
              {logs.length === 0 ? (
                <div className="empty-state">No workouts logged yet.<br />Finish a workout to see it here.</div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search by exercise or day name..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid var(--border2)', background: 'var(--bg3)',
                      color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)',
                      outline: 'none', boxSizing: 'border-box', marginBottom: 14,
                    }}
                  />
                  {filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>No results</div>
                  ) : (
                    historyGroups.map((group) => (
                      <div key={group.label} style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '10px 2px 8px' }}>
                          {group.label}
                        </div>
                        {group.logs.map((log) => (
                          <LogCard key={log._id} log={log} onDelete={(id) => setConfirm(id)} hasPR={prDates.has(log.date)} />
                        ))}
                      </div>
                    ))
                  )}
                  {!historySearch.trim() && !showAllHistory && filteredLogs.length > 10 && (
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', fontSize: 12, marginTop: 4 }}
                      onClick={() => setShowAllHistory(true)}
                    >
                      Show all {filteredLogs.length} workouts
                    </button>
                  )}
                </>
              )}
          </div>
          </div>

          <div style={{ height: 24 }} />
        </div>
      )}

      {showShareModal && (
        <StatsShareModal
          logs={weekLogs}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showBackupModal && (
        <BackupModal
          logs={logs}
          splits={splits}
          storage={storage}
          queryClient={queryClient}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {showManageExercises && (
        <ManageExercisesModal
          logs={logs}
          storage={storage}
          storageKey={storageKey}
          queryClient={queryClient}
          onClose={() => setShowManageExercises(false)}
        />
      )}

      {confirm === 'clear' && (
        <ConfirmModal
          message="Delete all workout logs? This cannot be undone."
          onConfirm={() => { setConfirm(null); clearMutation.mutate(); }}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm && confirm !== 'clear' && (
        <ConfirmModal
          message="Delete this workout log? This cannot be undone."
          onConfirm={() => { deleteMutation.mutate(confirm); setConfirm(null); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
