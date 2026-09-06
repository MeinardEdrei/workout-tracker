// Rest timer state lives in localStorage (not component state) so it
// survives page navigation and app backgrounding. It's stored as a wall-clock
// deadline (restEndsAt), not a decrementing counter, so remaining time is
// always recomputed fresh from Date.now() — no drift, no reliance on a
// setInterval actually firing while the tab/app is hidden or throttled.
const KEY = 'wt_active_rest_timer';

export function getActiveRestTimer() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.restEndsAt !== 'number') return null;
    return rec;
  } catch {
    return null;
  }
}

export function setActiveRestTimer(rec) {
  localStorage.setItem(KEY, JSON.stringify(rec));
}

// Only clears if the stored record still belongs to the given exercise —
// prevents one exercise's finished/dismissed timer from wiping out a
// different exercise's rest that was started more recently.
export function clearActiveRestTimer(exerciseId) {
  if (exerciseId != null) {
    const rec = getActiveRestTimer();
    if (!rec || rec.exerciseId !== exerciseId) return;
  }
  localStorage.removeItem(KEY);
}

export function secondsRemaining(restEndsAt, now = Date.now()) {
  return Math.max(0, Math.round((restEndsAt - now) / 1000));
}
