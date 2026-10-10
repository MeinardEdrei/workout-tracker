// Plate math for a loaded barbell.

export const PLATE_SETS = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lbs: [45, 35, 25, 10, 5, 2.5],
};

export const BAR_OPTIONS = {
  kg: [20, 15, 10, 0],
  lbs: [45, 35, 25, 0],
};

// Competition bumper colours (kg); lb plates follow the same order by size.
const KG_COLORS = { 25: 'var(--red)', 20: 'var(--blue)', 15: 'var(--yellow)', 10: 'var(--green)', 5: 'var(--text)', 2.5: 'var(--red)', 1.25: 'var(--text2)' };
const LB_COLORS = { 45: 'var(--blue)', 35: 'var(--yellow)', 25: 'var(--green)', 10: 'var(--text)', 5: 'var(--text2)', 2.5: 'var(--iron)' };
export function plateColor(weight, unit) {
  return (unit === 'lbs' ? LB_COLORS : KG_COLORS)[weight] || 'var(--text2)';
}

// Greedy fill of one side. Returns the plates (largest first), the weight
// that can't be made with the available plates, and the total actually loaded.
export function platesPerSide(target, bar, available) {
  const perSide = Math.max(0, (target - bar) / 2);
  const plates = [];
  let left = Math.round(perSide * 1000) / 1000;
  for (const p of [...available].sort((a, b) => b - a)) {
    while (left + 1e-9 >= p) {
      plates.push(p);
      left = Math.round((left - p) * 1000) / 1000;
    }
  }
  const loaded = bar + plates.reduce((a, b) => a + b, 0) * 2;
  return { plates, remainder: left, loaded, perSide };
}

const PREFS_KEY = 'wt_plate_prefs';
export function loadPlatePrefs(unit) {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    const p = all[unit] || {};
    return { bar: p.bar ?? BAR_OPTIONS[unit][0], available: Array.isArray(p.available) ? p.available : PLATE_SETS[unit] };
  } catch {
    return { bar: BAR_OPTIONS[unit][0], available: PLATE_SETS[unit] };
  }
}
export function savePlatePrefs(unit, prefs) {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    all[unit] = prefs;
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}
