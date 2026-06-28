// Guest storage — mirrors the shape of src/api/index.js but uses localStorage.
// All functions return Promises so they're drop-in replacements for fetch calls.

const SPLITS_KEY = 'wt_guest_splits';
const LOGS_KEY = 'wt_guest_logs';
const TODAY = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();

const DAY_ORDER_MAP = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6, rest: 7 };
const getDayOrder = (name) => DAY_ORDER_MAP[name.trim().toLowerCase()] ?? 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readSplits() {
  try { return JSON.parse(localStorage.getItem(SPLITS_KEY) || '[]'); } catch { return []; }
}
function writeSplits(s) { localStorage.setItem(SPLITS_KEY, JSON.stringify(s)); }

function readLogs() {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); } catch { return []; }
}
function writeLogs(l) { localStorage.setItem(LOGS_KEY, JSON.stringify(l)); }

const CATEGORY_ORDER_MAP = { warmup: 0, workout: 1, cooldown: 2 };
const getCategoryOrder = (cat) => CATEGORY_ORDER_MAP[cat] ?? 1;
const sortExercisesFn = (a, b) => {
  const catA = getCategoryOrder(a.category);
  const catB = getCategoryOrder(b.category);
  if (catA !== catB) return catA - catB;
  return (a.order ?? 0) - (b.order ?? 0);
};

function sortExercisesInSplits(splits) {
  return splits.map((s) => ({
    ...s,
    days: s.days
      .map((d) => ({
        ...d,
        exercises: [...(d.exercises || [])].sort(sortExercisesFn),
      }))
      .sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8)),
  }));
}

// ─── Splits ───────────────────────────────────────────────────────────────────

export function getSplits() {
  return Promise.resolve(sortExercisesInSplits(readSplits()));
}

export function createSplit(name) {
  const splits = readSplits();
  const split = {
    _id: uid(), name, isActive: false, days: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  splits.unshift(split);
  writeSplits(splits);
  return Promise.resolve(split);
}

export function renameSplit(id, name) {
  const splits = readSplits();
  const idx = splits.findIndex((s) => s._id === id);
  if (idx === -1) return Promise.reject(new Error('Split not found'));
  splits[idx] = { ...splits[idx], name, updatedAt: new Date().toISOString() };
  writeSplits(splits);
  return Promise.resolve(splits[idx]);
}

export function deleteSplit(id) {
  writeSplits(readSplits().filter((s) => s._id !== id));
  return Promise.resolve({ message: 'Deleted' });
}

export function activateSplit(id) {
  const splits = readSplits().map((s) => ({ ...s, isActive: s._id === id }));
  writeSplits(splits);
  const split = splits.find((s) => s._id === id);
  if (!split) return Promise.reject(new Error('Split not found'));
  return Promise.resolve(split);
}

// ─── Days ─────────────────────────────────────────────────────────────────────

export function getDays(splitId) {
  const split = readSplits().find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  return Promise.resolve(split.days || []);
}

export function createDay(splitId, data) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = {
    _id: uid(),
    name: data.name,
    tag: data.tag || '',
    isRest: data.isRest || false,
    exercises: [],
    dayOrder: getDayOrder(data.name),
  };
  split.days.push(day);
  writeSplits(splits);
  return Promise.resolve(day);
}

export function updateDay(splitId, dayId, data) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  if (data.name !== undefined) day.name = data.name;
  if (data.tag !== undefined) day.tag = data.tag;
  if (data.isRest !== undefined) day.isRest = data.isRest;
  writeSplits(splits);
  return Promise.resolve({ ...day });
}

export function deleteDay(splitId, dayId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  split.days = split.days.filter((d) => d._id !== dayId);
  writeSplits(splits);
  return Promise.resolve({ message: 'Deleted' });
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export function getExercises(splitId, dayId) {
  const split = readSplits().find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  return Promise.resolve([...(day.exercises || [])].sort(sortExercisesFn));
}

export function createExercise(splitId, dayId, data) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  const maxOrder = (day.exercises || []).reduce((m, e) => Math.max(m, e.order ?? 0), -1);
  const ex = {
    _id: uid(),
    name: data.name,
    sets: data.sets ?? 3,
    reps: data.reps ?? 10,
    weight: data.weight ?? 0,
    weightUnit: data.weightUnit || 'kg',
    checked: false,
    lastCheckedDate: '',
    order: maxOrder + 1,
    muscleTargets: data.muscleTargets || [],
    imageUrl: data.imageUrl || '',
    imageSource: data.imageUrl ? 'auto' : '',
    placeholderUsed: data.placeholderUsed || false,
    category: data.category || 'workout',
  };
  if (!day.exercises) day.exercises = [];
  day.exercises.push(ex);
  writeSplits(splits);
  return Promise.resolve(ex);
}

export function updateExercise(splitId, dayId, exId, data) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  const ex = (day.exercises || []).find((e) => e._id === exId);
  if (!ex) return Promise.reject(new Error('Exercise not found'));
  ['name', 'sets', 'reps', 'weight', 'weightUnit', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category'].forEach((f) => {
    if (data[f] !== undefined) ex[f] = data[f];
  });
  writeSplits(splits);
  return Promise.resolve({ ...ex });
}

export function deleteExercise(splitId, dayId, exId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  day.exercises = (day.exercises || []).filter((e) => e._id !== exId);
  writeSplits(splits);
  return Promise.resolve({ message: 'Deleted' });
}

export function toggleExercise(splitId, dayId, exId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  const ex = (day.exercises || []).find((e) => e._id === exId);
  if (!ex) return Promise.reject(new Error('Exercise not found'));

  const today = TODAY();
  if (ex.lastCheckedDate !== today) {
    ex.checked = false;
    ex.lastCheckedDate = today;
  }
  ex.checked = !ex.checked;
  if (ex.checked) ex.lastCheckedDate = today;
  writeSplits(splits);
  return Promise.resolve({ ...ex });
}

export function reorderExercises(splitId, dayId, exercises) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  exercises.forEach(({ _id, order }) => {
    const ex = (day.exercises || []).find((e) => e._id === _id);
    if (ex) ex.order = order;
  });
  writeSplits(splits);
  return Promise.resolve({ message: 'Reordered' });
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function saveLog(data) {
  const logs = readLogs();
  const totalVolume = (data.exercises || []).reduce(
    (sum, ex) => sum + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0), 0
  );
  const log = {
    _id: uid(),
    date: data.date,
    splitName: data.splitName || '',
    dayName: data.dayName || '',
    dayTag: data.dayTag || '',
    exercises: data.exercises || [],
    totalVolume,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(log);
  writeLogs(logs);
  return Promise.resolve(log);
}

export function getLogs() {
  const logs = readLogs();
  logs.sort((a, b) => (b.date > a.date ? 1 : -1));
  return Promise.resolve(logs);
}

export function getWeekLogs() {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const monStr = mon.toISOString().slice(0, 10);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const sunStr = sun.toISOString().slice(0, 10);
  const logs = readLogs()
    .filter((l) => l.date >= monStr && l.date <= sunStr)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return Promise.resolve(logs);
}

export function getLogByDate(date) {
  return Promise.resolve(readLogs().filter((l) => l.date === date));
}

export function deleteLog(id) {
  writeLogs(readLogs().filter((l) => l._id !== id));
  return Promise.resolve({ message: 'Deleted' });
}

export function clearLogs() {
  writeLogs([]);
  return Promise.resolve({ message: 'Cleared' });
}

// ─── Exercise Images (guest stubs — image features require sign-in) ──────────
export function fetchExerciseImage() {
  return Promise.resolve({ success: false, usePlaceholder: true });
}
export function uploadExerciseImage(splitId, dayId, exId, imageData) {
  return updateExercise(splitId, dayId, exId, { imageUrl: imageData, imageSource: 'custom', placeholderUsed: false });
}
export function clearExerciseImage(splitId, dayId, exId) {
  return updateExercise(splitId, dayId, exId, { imageUrl: '', imageSource: '', placeholderUsed: false });
}
