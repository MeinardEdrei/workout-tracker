// Guest storage — mirrors the shape of src/api/index.js but uses localStorage.
// All functions return Promises so they're drop-in replacements for fetch calls.

let currentPrefix = 'wt_guest';
export function setStoragePrefix(prefix) {
  currentPrefix = prefix;
}

const SPLITS_KEY = () => `${currentPrefix}_splits`;
const LOGS_KEY = () => `${currentPrefix}_logs`;
const VERSIONS_KEY = () => `${currentPrefix}_versions`;
const MAX_VERSIONS_PER_SPLIT = 50;
const TODAY = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();

function readVersions() {
  try { return JSON.parse(localStorage.getItem(VERSIONS_KEY()) || '{}'); } catch { return {}; }
}
function writeVersions(v) { localStorage.setItem(VERSIONS_KEY(), JSON.stringify(v)); }

// Snapshots a split's pre-change state so it can later be reverted to.
function snapshotVersion(split) {
  const all = readVersions();
  const list = all[split._id] || [];
  list.unshift({
    _id: uid(),
    name: split.name,
    days: JSON.parse(JSON.stringify(split.days || [])),
    createdAt: new Date().toISOString(),
  });
  all[split._id] = list.slice(0, MAX_VERSIONS_PER_SPLIT);
  writeVersions(all);
}

const DAY_ORDER_MAP = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6, rest: 7 };
const getDayOrder = (name) => DAY_ORDER_MAP[name.trim().toLowerCase()] ?? 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readSplits() {
  try { return JSON.parse(localStorage.getItem(SPLITS_KEY()) || '[]'); } catch { return []; }
}
function writeSplits(s) { localStorage.setItem(SPLITS_KEY(), JSON.stringify(s)); }

function readLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY()) || '[]');
    // Run migration if not already migrated
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && !localStorage.getItem(`${currentPrefix}_logs_migrated_vol_v1`) && logs.length > 0) {
      let migrated = false;
      const migratedLogs = logs.map(log => {
        const correctVol = Math.round((log.exercises || []).reduce((sum, ex) => {
          const w = ex.weight || 0;
          const weightInKg = (ex.weightUnit === 'lbs') ? (w / 2.20462) : w;
          return sum + (ex.sets || 0) * (ex.reps || 0) * weightInKg;
        }, 0));
        if (log.totalVolume !== correctVol) {
          migrated = true;
          return { ...log, totalVolume: correctVol };
        }
        return log;
      });
      if (migrated) {
        localStorage.setItem(LOGS_KEY(), JSON.stringify(migratedLogs));
        localStorage.setItem(`${currentPrefix}_logs_migrated_vol_v1`, 'true');
        return migratedLogs;
      }
      localStorage.setItem(`${currentPrefix}_logs_migrated_vol_v1`, 'true');
    }
    return logs;
  } catch {
    return [];
  }
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

// ─── Version History ──────────────────────────────────────────────────────────

export function getSplitVersions(splitId) {
  const list = readVersions()[splitId] || [];
  return Promise.resolve(list.map((v) => ({
    _id: v._id,
    name: v.name,
    createdAt: v.createdAt,
    days: v.days || [],
    dayCount: (v.days || []).length,
    exerciseCount: (v.days || []).reduce((sum, d) => sum + (d.exercises || []).length, 0),
  })));
}

export function revertSplitVersion(splitId, versionId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const list = readVersions()[splitId] || [];
  const version = list.find((v) => v._id === versionId);
  if (!version) return Promise.reject(new Error('Version not found'));
  snapshotVersion(split);
  split.name = version.name;
  split.days = JSON.parse(JSON.stringify(version.days));
  split.updatedAt = new Date().toISOString();
  writeSplits(splits);
  return Promise.resolve({ ...split });
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export function duplicateSplit(splitId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const copy = {
    _id: uid(),
    name: `${split.name} (copy)`,
    isActive: false,
    duplicatedFrom: split._id,
    days: JSON.parse(JSON.stringify(split.days || [])).map((d) => ({
      ...d,
      _id: uid(),
      exercises: (d.exercises || []).map((e) => ({ ...e, _id: uid() })),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  splits.unshift(copy);
  writeSplits(splits);
  return Promise.resolve(copy);
}

export function importSplit(data) {
  const splits = readSplits();
  const split = {
    _id: uid(),
    name: data.name || 'Imported Split',
    isActive: false,
    days: (data.days || []).map((d) => ({
      _id: uid(),
      name: d.name || '',
      tag: d.tag || '',
      isRest: !!d.isRest,
      dayOrder: getDayOrder(d.name || ''),
      exercises: (d.exercises || []).map((e, i) => ({
        _id: uid(),
        name: e.name || '',
        sets: e.sets ?? 3,
        reps: e.reps ?? 10,
        untilFailure: !!e.untilFailure,
        weight: e.weight ?? 0,
        weightUnit: e.weightUnit || 'kg',
        checked: false,
        lastCheckedDate: '',
        order: i,
        muscleTargets: e.muscleTargets || [],
        imageUrl: '',
        imageSource: '',
        placeholderUsed: false,
        category: e.category || 'workout',
        notes: e.notes || '',
        duration: e.duration ?? 0,
        durationUnit: e.durationUnit || 'sec',
      })),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  splits.unshift(split);
  writeSplits(splits);
  return Promise.resolve(split);
}

// ─── Cross-Split Sync ─────────────────────────────────────────────────────────

export function getSyncMatches(name, excludeSplitId) {
  if (!name) return Promise.resolve([]);
  const targetName = name.trim().toLowerCase();
  const matches = [];
  readSplits().forEach((s) => {
    if (s._id === excludeSplitId) return;
    (s.days || []).forEach((d) => {
      if (d.isRest) return;
      (d.exercises || []).forEach((e) => {
        if (e.name && e.name.trim().toLowerCase() === targetName) {
          matches.push({ splitId: s._id, splitName: s.name, dayId: d._id, dayName: d.name, exId: e._id });
        }
      });
    });
  });
  return Promise.resolve(matches);
}

export function applySync(fields, targets) {
  const splits = readSplits();
  const bySplit = new Map();
  targets.forEach((t) => {
    if (!bySplit.has(t.splitId)) bySplit.set(t.splitId, []);
    bySplit.get(t.splitId).push(t);
  });
  bySplit.forEach((splitTargets, splitId) => {
    const split = splits.find((s) => s._id === splitId);
    if (!split) return;
    snapshotVersion(split);
    splitTargets.forEach(({ dayId, exId }) => {
      const day = (split.days || []).find((d) => d._id === dayId);
      const ex = day && (day.exercises || []).find((e) => e._id === exId);
      if (!ex) return;
      Object.keys(fields).forEach((f) => { ex[f] = fields[f]; });
    });
  });
  writeSplits(splits);
  return Promise.resolve({ message: 'Synced' });
}

// ─── Exercise History Rename / Merge ───────────────────────────────────────────

export function getHistoryUsage(name) {
  if (!name) return Promise.resolve({ logCount: 0, occurrences: 0 });
  const targetKey = name.trim().toLowerCase();
  let logCount = 0;
  let occurrences = 0;
  readLogs().forEach((log) => {
    const matches = (log.exercises || []).filter((e) => e.name && e.name.trim().toLowerCase() === targetKey).length;
    if (matches > 0) {
      logCount++;
      occurrences += matches;
    }
  });
  return Promise.resolve({ logCount, occurrences });
}

export function renameHistory(oldName, newName, scope) {
  const targetKey = oldName.trim().toLowerCase();

  let logsChanged = 0;
  let exercisesChanged = 0;
  const logs = readLogs();
  logs.forEach((log) => {
    let touched = false;
    (log.exercises || []).forEach((ex) => {
      if (ex.name && ex.name.trim().toLowerCase() === targetKey) {
        ex.name = newName;
        exercisesChanged++;
        touched = true;
      }
    });
    if (touched) logsChanged++;
  });
  writeLogs(logs);

  let splitsChanged = 0;
  if (scope === 'all') {
    const splits = readSplits();
    splits.forEach((split) => {
      let touched = false;
      (split.days || []).forEach((d) => {
        (d.exercises || []).forEach((ex) => {
          if (ex.name && ex.name.trim().toLowerCase() === targetKey) {
            ex.name = newName;
            touched = true;
          }
        });
      });
      if (touched) {
        snapshotVersion(split);
        splitsChanged++;
      }
    });
    writeSplits(splits);
  }

  return Promise.resolve({ logsChanged, exercisesChanged, splitsChanged });
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
  snapshotVersion(split);
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
  snapshotVersion(split);
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
  snapshotVersion(split);
  split.days = split.days.filter((d) => d._id !== dayId);
  writeSplits(splits);
  return Promise.resolve({ message: 'Deleted' });
}

export function swapDays(splitId, dayId, targetDayId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const dayA = split.days.find((d) => d._id === dayId);
  const dayB = split.days.find((d) => d._id === targetDayId);
  if (!dayA || !dayB) return Promise.reject(new Error('Day not found'));
  if (dayA._id === dayB._id) return Promise.reject(new Error('Cannot swap a day with itself'));
  snapshotVersion(split);
  const exA = dayA.exercises;
  dayA.exercises = dayB.exercises;
  dayB.exercises = exA;
  writeSplits(splits);
  return Promise.resolve({ ...split });
}

export function copyDayTo(splitId, dayId, targetDayId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const sourceDay = split.days.find((d) => d._id === dayId);
  const targetDay = split.days.find((d) => d._id === targetDayId);
  if (!sourceDay || !targetDay) return Promise.reject(new Error('Day not found'));
  if (sourceDay._id === targetDay._id) return Promise.reject(new Error('Cannot copy a day into itself'));
  snapshotVersion(split);
  targetDay.exercises = (sourceDay.exercises || []).map((e) => ({
    ...e,
    _id: uid(),
    checked: false,
    lastCheckedDate: '',
  }));
  writeSplits(splits);
  return Promise.resolve({ ...split });
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
  snapshotVersion(split);
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
    duration: data.duration ?? 0,
    durationUnit: data.durationUnit || 'sec',
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
  const structuralFields = ['name', 'sets', 'reps', 'weight', 'weightUnit', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category', 'notes', 'duration', 'durationUnit'];
  // Only real template/structure edits get a version snapshot (for revert) —
  // weight/notes/duration are routine in-workout tracking edits made many
  // times per session and don't need a full split-tree copy each time.
  const snapshotTriggerFields = ['name', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category'];
  if (snapshotTriggerFields.some((f) => data[f] !== undefined)) snapshotVersion(split);
  [...structuralFields, 'todaySetLogs', 'todaySetLogsDate'].forEach((f) => {
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
  snapshotVersion(split);
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
  if (ex.checked) {
    ex.lastCheckedDate = today;
    ex.skipped = false; // mutually exclusive with skip
  }
  writeSplits(splits);
  return Promise.resolve({ ...ex });
}

export function toggleSkipExercise(splitId, dayId, exId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  const ex = (day.exercises || []).find((e) => e._id === exId);
  if (!ex) return Promise.reject(new Error('Exercise not found'));

  const today = TODAY();
  if (ex.lastSkippedDate !== today) {
    ex.skipped = false;
    ex.lastSkippedDate = today;
  }
  ex.skipped = !ex.skipped;
  if (ex.skipped) {
    ex.lastSkippedDate = today;
    ex.checked = false; // mutually exclusive with done
  }
  writeSplits(splits);
  return Promise.resolve({ ...ex });
}

export function reorderExercises(splitId, dayId, exercises) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const day = split.days.find((d) => d._id === dayId);
  if (!day) return Promise.reject(new Error('Day not found'));
  snapshotVersion(split);
  exercises.forEach(({ _id, order }) => {
    const ex = (day.exercises || []).find((e) => e._id === _id);
    if (ex) ex.order = order;
  });
  writeSplits(splits);
  return Promise.resolve({ message: 'Reordered' });
}

export function moveExercise(splitId, dayId, exId, targetDayId) {
  const splits = readSplits();
  const split = splits.find((s) => s._id === splitId);
  if (!split) return Promise.reject(new Error('Split not found'));
  const fromDay = split.days.find((d) => d._id === dayId);
  const toDay = split.days.find((d) => d._id === targetDayId);
  if (!fromDay || !toDay) return Promise.reject(new Error('Day not found'));
  const ex = (fromDay.exercises || []).find((e) => e._id === exId);
  if (!ex) return Promise.reject(new Error('Exercise not found'));
  if (fromDay._id === toDay._id) return Promise.reject(new Error('Already on that day'));
  snapshotVersion(split);
  const maxOrder = (toDay.exercises || []).reduce((m, e) => Math.max(m, e.order ?? 0), -1);
  ex.order = maxOrder + 1;
  toDay.exercises = [...(toDay.exercises || []), ex];
  fromDay.exercises = (fromDay.exercises || []).filter((e) => e._id !== exId);
  writeSplits(splits);
  return Promise.resolve({ ...split });
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function saveLog(data) {
  const logs = readLogs();
  const totalVolume = Math.round((data.exercises || []).reduce(
    (sum, ex) => {
      const w = ex.weight || 0;
      const weightInKg = (ex.weightUnit === 'lbs') ? (w / 2.20462) : w;
      return sum + (ex.sets || 0) * (ex.reps || 0) * weightInKg;
    }, 0
  ));
  const log = {
    _id: uid(),
    date: data.date,
    splitName: data.splitName || '',
    dayName: data.dayName || '',
    dayTag: data.dayTag || '',
    exercises: data.exercises || [],
    totalVolume,
    skipped: !!data.skipped,
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
