// Calendar dates in the user's own timezone.
//
// Day keys (log dates, lastCheckedDate, week ranges…) must be the local
// calendar date. Date#toISOString() is UTC, so in Manila (UTC+8) anything
// before 8am used to land on the previous day.

// YYYY-MM-DD for the local calendar day of `d`.
export function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parses a YYYY-MM-DD key as local midnight (new Date('YYYY-MM-DD') is UTC).
export function parseLocalDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
