// Tracks when a workout session actually started (first logged action),
// not when the page was opened — so browsing around before starting doesn't
// inflate the recorded duration. Persisted to localStorage, keyed by
// day id + calendar date, so it survives navigation/backgrounding the same
// way the rest timer does, and so an abandoned session doesn't leak its
// stale start time into the next week's occurrence of the same day.
const KEY = 'wt_session_start_times';

function readStarts() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeStarts(v) { localStorage.setItem(KEY, JSON.stringify(v)); }
function keyFor(dayId, dateStr) { return `${dayId}:${dateStr}`; }

export function ensureSessionStart(dayId, dateStr) {
  const starts = readStarts();
  const key = keyFor(dayId, dateStr);
  if (!starts[key]) {
    starts[key] = Date.now();
    writeStarts(starts);
  }
  return starts[key];
}

export function getSessionStart(dayId, dateStr) {
  return readStarts()[keyFor(dayId, dateStr)] || null;
}

export function setSessionStart(dayId, dateStr, timestamp) {
  const starts = readStarts();
  const key = keyFor(dayId, dateStr);
  starts[key] = timestamp;
  writeStarts(starts);
  return starts[key];
}

export function clearSessionStart(dayId, dateStr) {
  const starts = readStarts();
  delete starts[keyFor(dayId, dateStr)];
  writeStarts(starts);
}

export function formatSessionDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatSessionElapsed(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
