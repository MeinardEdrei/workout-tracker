// Rest timer state lives in localStorage (not component state) so it
// survives page navigation and app backgrounding. It's stored as a wall-clock
// deadline (restEndsAt), not a decrementing counter, so remaining time is
// always recomputed fresh from Date.now() — no drift, no reliance on a
// setInterval actually firing while the tab/app is hidden or throttled.
//
// Keyed by exerciseId so starting a rest timer on one exercise doesn't
// clobber another exercise's still-running timer — multiple rests can be
// active at once (e.g. supersetting, or moving on before a rest finishes).
const KEY = 'wt_active_rest_timers';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
function writeAll(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getActiveRestTimer(exerciseId) {
  if (exerciseId == null) return null;
  const rec = readAll()[exerciseId];
  if (!rec || typeof rec.restEndsAt !== 'number') return null;
  return rec;
}

export function getAllActiveRestTimers() {
  return Object.values(readAll()).filter((rec) => rec && typeof rec.restEndsAt === 'number');
}

export function setActiveRestTimer(rec) {
  if (!rec || rec.exerciseId == null) return;
  const all = readAll();
  all[rec.exerciseId] = rec;
  writeAll(all);
}

export function clearActiveRestTimer(exerciseId) {
  if (exerciseId == null) return;
  const all = readAll();
  delete all[exerciseId];
  writeAll(all);
}

export function secondsRemaining(restEndsAt, now = Date.now()) {
  return Math.max(0, Math.round((restEndsAt - now) / 1000));
}
