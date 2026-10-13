// Numbers for the finish summary and share cards, derived from saved logs.
import { workingSets } from './sets';

const LB = 2.20462;
const toKg = (w, unit) => (unit === 'lbs' ? w / LB : w);
const fromKg = (kg, unit) => (unit === 'lbs' ? kg * LB : kg);
const keyOf = (name) => (name || '').trim().toLowerCase();
const round1 = (n) => Math.round(n * 10) / 10;

// Same formula as the 1RM calculator: Brzycki up to 10 reps, Epley above.
export function estimate1RM(w, r) {
  if (!(w > 0) || !(r > 0)) return 0;
  return r === 1 ? w : r <= 10 ? w * (36 / (37 - r)) : w * (1 + r / 30);
}

// Heaviest working set of one logged exercise (ties → more reps).
export function bestSet(ex) {
  const unit = ex.weightUnit || 'kg';
  const sets = workingSets(ex.setLogs).filter((s) => s.weight > 0);
  if (sets.length) {
    const top = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
    return { weight: top.weight, reps: top.reps || 0, unit };
  }
  if (ex.weight > 0 && !ex.skipped) return { weight: ex.weight, reps: ex.reps || 0, unit };
  return null;
}

export function workingSetCount(log) {
  return (log.exercises || []).reduce((n, ex) => {
    if (ex.skipped) return n;
    const sets = workingSets(ex.setLogs);
    return n + (sets.length || Number(ex.sets || 0));
  }, 0);
}

const sortedDone = (logs) => (logs || []).filter((l) => !l.skipped).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// PRs per log date, walking history in order: a PR is a heavier top set
// than any earlier session of the same exercise. First-ever sessions
// set the baseline and don't count.
export function prsByDate(logs) {
  const best = {};
  const out = {};
  for (const log of sortedDone(logs)) {
    const prs = [];
    for (const ex of log.exercises || []) {
      const top = bestSet(ex);
      if (!top) continue;
      const key = keyOf(ex.name);
      const kg = toKg(top.weight, top.unit);
      const prev = best[key];
      if (prev && kg > prev.kg + 1e-6) {
        prs.push({ name: ex.name, ...top, diff: round1(top.weight - fromKg(prev.kg, top.unit)) });
      }
      if (!prev || kg > prev.kg) best[key] = { kg };
    }
    out[log.date] = prs;
  }
  return out;
}

// Top-set weight for an exercise over its last n sessions up to `date`.
export function topSetHistory(logs, name, date, n = 8) {
  const key = keyOf(name);
  const points = [];
  for (const log of sortedDone(logs)) {
    if (log.date > date) break;
    const ex = (log.exercises || []).find((e) => keyOf(e.name) === key);
    const top = ex && bestSet(ex);
    if (top) points.push(toKg(top.weight, top.unit));
  }
  return points.slice(-n);
}

export function summarizeLog(log, logs) {
  const all = sortedDone([...(logs || []).filter((l) => l.date !== log.date), log]);
  const number = all.filter((l) => l.date <= log.date).length;
  const prs = prsByDate(all)[log.date] || [];
  const prNames = new Set(prs.map((p) => keyOf(p.name)));
  const exercises = (log.exercises || []).filter((e) => !e.skipped).map((e) => ({
    name: e.name, best: bestSet(e), isPR: prNames.has(keyOf(e.name)), muscles: e.muscleTargets || [],
  }));
  const prev = [...all].reverse().find((l) => l.date < log.date && l.dayName === log.dayName);
  let vsLast = null;
  if (prev) {
    vsLast = {
      dayName: log.dayName,
      volumePct: prev.totalVolume > 0 && log.totalVolume > 0 ? Math.round(((log.totalVolume - prev.totalVolume) / prev.totalVolume) * 100) : null,
      timeDiffMin: prev.durationSeconds > 0 && log.durationSeconds > 0 ? Math.round((log.durationSeconds - prev.durationSeconds) / 60) : null,
    };
  }
  const swaps = (log.exercises || []).filter((e) => e.swappedFrom && !e.skipped).map((e) => ({ from: e.swappedFrom, to: e.name }));
  const muscles = [...new Set(exercises.flatMap((e) => e.muscles))];
  return {
    number,
    minutes: log.durationSeconds > 0 ? Math.round(log.durationSeconds / 60) : 0,
    volumeKg: log.totalVolume || 0,
    sets: workingSetCount(log),
    prs: prs.map((p) => ({ ...p, e1rm: Math.round(estimate1RM(p.weight, p.reps)), history: topSetHistory(all, p.name, log.date) })),
    exercises,
    vsLast,
    swaps,
    muscles,
  };
}

// Month recap for the month containing `dateStr` (YYYY-MM-DD).
export function monthRecap(logs, dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const prefix = `${y}-${String(m).padStart(2, '0')}`;
  const prevDate = new Date(y, m - 2, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const done = sortedDone(logs);
  const prsMap = prsByDate(done);
  // Up to dateStr, against the same stretch of last month, so a recap
  // shared mid-month isn't compared with a whole month.
  const upTo = Number(dateStr.slice(8, 10));
  const inMonth = done.filter((l) => l.date.startsWith(prefix) && l.date <= dateStr);
  const inPrev = done.filter((l) => l.date.startsWith(prevPrefix) && Number(l.date.slice(8, 10)) <= upTo);
  const vol = (arr) => arr.reduce((s, l) => s + (l.totalVolume || 0), 0);
  const days = {};
  for (const l of inMonth) days[Number(l.date.slice(8, 10))] = { pr: (prsMap[l.date] || []).length > 0 };
  const volume = vol(inMonth);
  const prevVolume = vol(inPrev);
  return {
    year: y,
    monthIndex: m - 1,
    monthName: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
    prevMonthName: prevDate.toLocaleDateString('en-US', { month: 'long' }),
    prevLabel: upTo >= new Date(y, m, 0).getDate() ? prevDate.toLocaleDateString('en-US', { month: 'long' }) : `${prevDate.toLocaleDateString('en-US', { month: 'short' })} 1–${Math.min(upTo, new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate())}`,
    daysInMonth: new Date(y, m, 0).getDate(),
    firstWeekday: (new Date(y, m - 1, 1).getDay() + 6) % 7, // Monday = 0
    workouts: inMonth.length,
    volumeKg: volume,
    prs: inMonth.reduce((n, l) => n + (prsMap[l.date] || []).length, 0),
    days,
    vsPrev: inPrev.length ? { workouts: inMonth.length - inPrev.length, volumePct: prevVolume > 0 ? Math.round(((volume - prevVolume) / prevVolume) * 100) : null } : null,
  };
}

export function fmtKg(kg) {
  if (kg >= 10000) return `${Math.round(kg / 1000)}k`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(kg));
}
export const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(round1(n)));
