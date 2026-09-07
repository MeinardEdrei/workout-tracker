// "Do this workout early" / "Retake a past day" flags used to live in
// DayCard's local component state, which unmounts (and silently resets)
// whenever the pager/overview view toggles, or the Today tab is switched
// away from and back — reading as an unexplained auto-cancel. Persisting to
// localStorage, keyed by day id, survives all of that the same way the
// active rest timer does.
const KEY = 'wt_early_session_flags';

function readFlags() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeFlags(flags) { localStorage.setItem(KEY, JSON.stringify(flags)); }

export function getDayFlags(dayId) {
  return readFlags()[dayId] || { isRetaking: false, isAdvancing: false };
}

export function setDayFlag(dayId, flag, value) {
  const flags = readFlags();
  const current = flags[dayId] || { isRetaking: false, isAdvancing: false };
  const next = { ...current, [flag]: value };
  if (!next.isRetaking && !next.isAdvancing) {
    delete flags[dayId]; // nothing left worth remembering for this day
  } else {
    flags[dayId] = next;
  }
  writeFlags(flags);
}
