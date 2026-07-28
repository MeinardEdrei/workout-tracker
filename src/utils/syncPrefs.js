// Per-exercise-name opt-out for the cross-day / cross-split weight-sync prompt.
// Stored client-side (applies regardless of guest vs. logged-in mode) since it's a UI preference, not workout data.
const KEY = 'wt_sync_excluded_names';

function readExcluded() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function isSyncExcluded(name) {
  if (!name) return false;
  return readExcluded().includes(name.trim().toLowerCase());
}

export function excludeFromSync(name) {
  if (!name) return;
  const key = name.trim().toLowerCase();
  const excluded = readExcluded();
  if (!excluded.includes(key)) {
    excluded.push(key);
    localStorage.setItem(KEY, JSON.stringify(excluded));
  }
}

export function reincludeInSync(name) {
  if (!name) return;
  const key = name.trim().toLowerCase();
  localStorage.setItem(KEY, JSON.stringify(readExcluded().filter((n) => n !== key)));
}

export function getExcludedSyncNames() {
  return readExcluded();
}
