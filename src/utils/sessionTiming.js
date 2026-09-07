// Tracks when a workout session actually started (first logged action),
// not when the page was opened — so browsing around before starting doesn't
// inflate the recorded duration. Persisted to localStorage, keyed by day id,
// so it survives navigation/backgrounding the same way the rest timer does.
const KEY = 'wt_session_start_times';

function readStarts() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeStarts(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function ensureSessionStart(dayId) {
  const starts = readStarts();
  if (!starts[dayId]) {
    starts[dayId] = Date.now();
    writeStarts(starts);
  }
  return starts[dayId];
}

export function getSessionStart(dayId) {
  return readStarts()[dayId] || null;
}

export function clearSessionStart(dayId) {
  const starts = readStarts();
  delete starts[dayId];
  writeStarts(starts);
}
