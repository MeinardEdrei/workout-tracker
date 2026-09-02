const express = require('express');
const router = express.Router();
const Split = require('../models/Split');
const SplitVersion = require('../models/SplitVersion');
const WorkoutLog = require('../models/WorkoutLog');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { normKey } = require('../utils/matchExercise');

router.use(requireAuth);

const MAX_VERSIONS_PER_SPLIT = 50;

// Snapshots a split's pre-change state so it can later be reverted to.
// Call this BEFORE mutating `split` in memory, using the freshly-fetched document.
async function snapshotVersion(split) {
  await SplitVersion.create({
    splitId: split._id,
    userId: split.userId,
    name: split.name,
    days: split.toObject().days,
  });
  const count = await SplitVersion.countDocuments({ splitId: split._id });
  if (count > MAX_VERSIONS_PER_SPLIT) {
    const excess = await SplitVersion.find({ splitId: split._id })
      .sort({ createdAt: 1 })
      .limit(count - MAX_VERSIONS_PER_SPLIT)
      .select('_id');
    await SplitVersion.deleteMany({ _id: { $in: excess.map((v) => v._id) } });
  }
}

const DAY_ORDER_MAP = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6, rest: 7 };
function getDayOrder(name) { return DAY_ORDER_MAP[name.trim().toLowerCase()] ?? 8; }

const CATEGORY_ORDER_MAP = { warmup: 0, workout: 1, cooldown: 2 };
const getCategoryOrder = (cat) => CATEGORY_ORDER_MAP[cat] ?? 1;
const sortExercisesFn = (a, b) => {
  const catA = getCategoryOrder(a.category);
  const catB = getCategoryOrder(b.category);
  if (catA !== catB) return catA - catB;
  return (a.order ?? 0) - (b.order ?? 0);
};

function sortExercises(split) {
  const obj = split.toObject();
  obj.days.sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
  obj.days.forEach((d) => d.exercises.sort(sortExercisesFn));
  return obj;
}

function sortExercisesInDay(day) {
  const obj = day.toObject ? day.toObject() : { ...day };
  obj.exercises = [...(obj.exercises || [])].sort(sortExercisesFn);
  return obj;
}

// ─── SPLITS ──────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const splits = await Split.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(splits.map(sortExercises));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const split = new Split({ name: req.body.name, days: [], userId: req.userId });
    await split.save();
    res.status(201).json(split);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const split = await Split.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(sortExercises(split));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const split = await Split.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/activate', async (req, res) => {
  try {
    await Split.updateMany({ userId: req.userId }, { isActive: false });
    const split = await Split.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isActive: true },
      { new: true }
    );
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VERSION HISTORY ──────────────────────────────────────────────────────────

router.get('/:id/versions', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId }).select('_id');
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const versions = await SplitVersion.find({ splitId: split._id })
      .sort({ createdAt: -1 })
      .select('_id name createdAt days');
    res.json(versions.map((v) => ({
      _id: v._id,
      name: v.name,
      createdAt: v.createdAt,
      days: v.days || [],
      dayCount: (v.days || []).length,
      exerciseCount: (v.days || []).reduce((sum, d) => sum + (d.exercises || []).length, 0),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/revert', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const version = await SplitVersion.findOne({ _id: req.body.versionId, splitId: split._id });
    if (!version) return res.status(404).json({ error: 'Version not found' });

    // Preserve the current state as a version too, so this revert itself can be undone (redo).
    await snapshotVersion(split);

    split.name = version.name;
    split.days = version.days;
    await split.save();
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DUPLICATE ────────────────────────────────────────────────────────────────

router.post('/:id/duplicate', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const copy = new Split({
      name: `${split.name} (copy)`,
      days: split.toObject().days.map((d) => {
        const { _id, ...day } = d;
        return { ...day, exercises: (day.exercises || []).map((e) => { const { _id: exId, ...ex } = e; return ex; }) };
      }),
      userId: req.userId,
      isActive: false,
      isPublic: false,
      duplicatedFrom: split._id,
    });
    await copy.save();
    res.status(201).json(sortExercises(copy));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── IMPORT / EXPORT ──────────────────────────────────────────────────────────

const EXERCISE_IMPORT_FIELDS = [
  'name', 'sets', 'reps', 'untilFailure', 'weight', 'weightUnit', 'muscleTargets',
  'category', 'notes', 'duration', 'durationUnit', 'exerciseType', 'restSeconds', 'warmupRamp',
];
const DAY_IMPORT_FIELDS = ['name', 'tag', 'isRest'];

router.post('/import', async (req, res) => {
  try {
    const { name, days } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(days)) return res.status(400).json({ error: 'days must be an array' });

    const sanitizedDays = days.map((d) => {
      const day = {};
      DAY_IMPORT_FIELDS.forEach((f) => { if (d[f] !== undefined) day[f] = d[f]; });
      day.dayOrder = getDayOrder(day.name || '');
      day.exercises = Array.isArray(d.exercises)
        ? d.exercises.map((e, i) => {
            const ex = { order: i };
            EXERCISE_IMPORT_FIELDS.forEach((f) => { if (e[f] !== undefined) ex[f] = e[f]; });
            return ex;
          })
        : [];
      return day;
    });

    const split = new Split({ name, days: sanitizedDays, userId: req.userId });
    await split.save();
    res.status(201).json(sortExercises(split));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── CROSS-SPLIT SYNC ─────────────────────────────────────────────────────────

router.get('/sync-matches', async (req, res) => {
  try {
    const { name, excludeSplitId } = req.query;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const targetName = name.trim().toLowerCase();
    const splits = await Split.find({ userId: req.userId, _id: { $ne: excludeSplitId || null } });
    const matches = [];
    splits.forEach((s) => {
      s.days.forEach((d) => {
        if (d.isRest) return;
        d.exercises.forEach((e) => {
          if (e.name && e.name.trim().toLowerCase() === targetName) {
            matches.push({ splitId: s._id, splitName: s.name, dayId: d._id, dayName: d.name, exId: e._id });
          }
        });
      });
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-apply', async (req, res) => {
  try {
    const { fields, targets } = req.body;
    if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'fields is required' });
    if (!Array.isArray(targets)) return res.status(400).json({ error: 'targets must be an array' });

    const bySplit = new Map();
    targets.forEach((t) => {
      if (!bySplit.has(t.splitId)) bySplit.set(t.splitId, []);
      bySplit.get(t.splitId).push(t);
    });

    for (const [splitId, splitTargets] of bySplit) {
      const split = await Split.findOne({ _id: splitId, userId: req.userId });
      if (!split) continue;
      await snapshotVersion(split);
      splitTargets.forEach(({ dayId, exId }) => {
        const day = split.days.id(dayId);
        const ex = day && day.exercises.id(exId);
        if (!ex) return;
        Object.keys(fields).forEach((f) => { ex[f] = fields[f]; });
      });
      await split.save();
    }
    res.json({ message: 'Synced' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXERCISE HISTORY RENAME / MERGE ──────────────────────────────────────────
// A rename cascades to WorkoutLog entries (and optionally other Split days)
// that share the old exercise name, so progression history stays attached.
// A "merge" of two near-duplicate names (e.g. "DB Curl" / "Dumbbell Curl")
// is just this same rename applied with scope 'all'.

router.get('/history-usage', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const targetKey = normKey(name);
    const logs = await WorkoutLog.find({ userId: req.userId });
    let logCount = 0;
    let occurrences = 0;
    logs.forEach((log) => {
      const matches = (log.exercises || []).filter((e) => normKey(e.name) === targetKey).length;
      if (matches > 0) {
        logCount++;
        occurrences += matches;
      }
    });
    res.json({ logCount, occurrences });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rename-cascade', async (req, res) => {
  try {
    const { oldName, newName, scope } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'oldName and newName are required' });
    if (!['logsOnly', 'all'].includes(scope)) return res.status(400).json({ error: 'scope must be logsOnly or all' });
    const targetKey = normKey(oldName);

    let logsChanged = 0;
    let exercisesChanged = 0;
    const logs = await WorkoutLog.find({ userId: req.userId });
    for (const log of logs) {
      let touched = false;
      (log.exercises || []).forEach((ex) => {
        if (normKey(ex.name) === targetKey) {
          ex.name = newName;
          exercisesChanged++;
          touched = true;
        }
      });
      if (touched) {
        await log.save();
        logsChanged++;
      }
    }

    let splitsChanged = 0;
    if (scope === 'all') {
      const splits = await Split.find({ userId: req.userId });
      for (const split of splits) {
        let touched = false;
        split.days.forEach((d) => {
          d.exercises.forEach((ex) => {
            if (normKey(ex.name) === targetKey) {
              ex.name = newName;
              touched = true;
            }
          });
        });
        if (touched) {
          await snapshotVersion(split);
          await split.save();
          splitsChanged++;
        }
      }
    }

    res.json({ logsChanged, exercisesChanged, splitsChanged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC SPLITS ────────────────────────────────────────────────────────────

router.get('/public', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const splits = await Split.find({ isPublic: true, userId: { $ne: req.userId } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar');
    const total = await Split.countDocuments({ isPublic: true, userId: { $ne: req.userId } });
    const result = splits.map((s) => {
      const obj = sortExercises(s);
      obj.days = obj.days.map((d) => ({
        ...d,
        exercises: d.exercises.map(({ name, sets, reps, untilFailure, muscleTargets, order, category }) => ({
          name, sets, reps, untilFailure, muscleTargets, order, category,
        })),
      }));
      return obj;
    });
    res.json({ splits: result, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ACTIVE USERS RANKING ──────────────────────────────────────────────────────

router.get('/ranking', async (req, res) => {
  try {
    const filter = req.query.filter || 'weekly'; // 'weekly', 'monthly', 'yearly'
    
    // Calculate start date based on filter
    const now = new Date();
    let startDateStr = '';

    if (filter === 'weekly') {
      const dow = now.getDay(); // 0=Sun, 1=Mon, etc.
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      mon.setHours(0, 0, 0, 0);
      startDateStr = mon.toISOString().slice(0, 10);
    } else if (filter === 'monthly') {
      const mon = new Date(now.getFullYear(), now.getMonth(), 1);
      startDateStr = mon.toISOString().slice(0, 10);
    } else if (filter === 'yearly') {
      const yr = new Date(now.getFullYear(), 0, 1);
      startDateStr = yr.toISOString().slice(0, 10);
    } else {
      return res.status(400).json({ error: 'Invalid filter type' });
    }

    // 1. Aggregate from WorkoutLog
    const rankingAgg = await WorkoutLog.aggregate([
      {
        $match: {
          date: { $gte: startDateStr },
          skipped: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$userId',
          workoutCount: { $sum: 1 },
          totalVolume: { $sum: '$totalVolume' },
          latestLog: {
            $max: {
              date: '$date',
              dayName: '$dayName',
              updatedAt: '$updatedAt'
            }
          }
        }
      },
      {
        $sort: { workoutCount: -1, totalVolume: -1 }
      },
      {
        $limit: 50
      }
    ]);

    // 2. Fetch User profiles & Active Splits for these users
    const results = [];
    for (const entry of rankingAgg) {
      if (!entry._id) continue;
      const user = await User.findById(entry._id).select('name avatar lastLoginAt lastActiveAt');
      if (!user) continue;

      let activeSplit = await Split.findOne({ userId: entry._id, isActive: true }).select('name days');
      if (!activeSplit) {
        // Fallback to user's latest updated split, matching frontend behavior
        activeSplit = await Split.findOne({ userId: entry._id }).sort({ updatedAt: -1 }).select('name days');
      }
      
      results.push({
        userId: entry._id,
        name: user.name || 'Anonymous User',
        avatar: user.avatar || '',
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt,
        workoutCount: entry.workoutCount,
        totalVolume: entry.totalVolume,
        latestWorkout: entry.latestLog,
        activeSplitName: activeSplit ? activeSplit.name : 'No Active Split',
        activeSplitDaysCount: activeSplit ? activeSplit.days.length : 0,
        activeSplitDays: activeSplit ? activeSplit.days.map((d) => ({
          name: d.name,
          tag: d.tag,
          isRest: d.isRest,
          exerciseCount: d.exercises ? d.exercises.length : 0
        })) : [],
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/public/:id/copy', async (req, res) => {
  try {
    const source = await Split.findOne({ _id: req.params.id, isPublic: true });
    if (!source) return res.status(404).json({ error: 'Public split not found' });
    const copiedDays = source.days.map((d) => ({
      name: d.name,
      tag: d.tag,
      isRest: d.isRest,
      dayOrder: d.dayOrder,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        untilFailure: e.untilFailure,
        weight: 0,
        weightUnit: 'kg',
        checked: false,
        lastCheckedDate: '',
        order: e.order,
        muscleTargets: e.muscleTargets || [],
        category: e.category || 'workout',
        exerciseType: e.exerciseType || 'compound',
        restSeconds: e.restSeconds || 0,
      })),
    }));
    // Check if the user already has any active split. If not, make this copied one active.
    const activeCount = await Split.countDocuments({ userId: req.userId, isActive: true });
    const newSplit = new Split({
      name: source.name,
      days: copiedDays,
      userId: req.userId,
      isPublic: false,
      sourceId: source._id,
      isActive: activeCount === 0,
    });
    await newSplit.save();
    res.status(201).json(sortExercises(newSplit));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/visibility', async (req, res) => {
  try {
    const split = await Split.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isPublic: !!req.body.isPublic },
      { new: true }
    );
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(sortExercises(split));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/reapply', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    if (!split.sourceId) return res.status(400).json({ error: 'This split has no source to reapply from' });
    const source = await Split.findOne({ _id: split.sourceId, isPublic: true });
    if (!source) return res.status(404).json({ error: 'Source split is no longer public' });

    await snapshotVersion(split);

    // Build a map of existing exercise weights by name for preservation
    const weightMap = {};
    split.days.forEach((d) => {
      d.exercises.forEach((e) => {
        if (!weightMap[e.name]) weightMap[e.name] = { weight: e.weight, weightUnit: e.weightUnit, imageUrl: e.imageUrl, imageSource: e.imageSource };
      });
    });

    split.days = source.days.map((d) => ({
      name: d.name,
      tag: d.tag,
      isRest: d.isRest,
      dayOrder: d.dayOrder,
      exercises: d.exercises.map((e) => {
        const saved = weightMap[e.name] || {};
        return {
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          untilFailure: e.untilFailure,
          weight: saved.weight ?? 0,
          weightUnit: saved.weightUnit ?? 'kg',
          checked: false,
          lastCheckedDate: '',
          order: e.order,
          muscleTargets: e.muscleTargets || [],
          imageUrl: saved.imageUrl ?? '',
          imageSource: saved.imageSource ?? '',
          category: e.category || 'workout',
          exerciseType: e.exerciseType || 'compound',
          restSeconds: e.restSeconds || 0,
        };
      }),
    }));
    await split.save();
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DAYS ─────────────────────────────────────────────────────────────────────

router.get('/:id/days', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const days = split.days
      .map(sortExercisesInDay)
      .sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    await snapshotVersion(split);
    split.days.push({
      name: req.body.name,
      tag: req.body.tag || '',
      isRest: req.body.isRest || false,
      exercises: [],
      dayOrder: getDayOrder(req.body.name),
    });
    await split.save();
    res.status(201).json(split.days[split.days.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/days/:dayId', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    await snapshotVersion(split);
    if (req.body.name !== undefined) { day.name = req.body.name; day.dayOrder = getDayOrder(req.body.name); }
    if (req.body.tag !== undefined) day.tag = req.body.tag;
    if (req.body.isRest !== undefined) day.isRest = req.body.isRest;
    await split.save();
    res.json(sortExercisesInDay(day));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/days/:dayId', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    await snapshotVersion(split);
    split.days.pull(req.params.dayId);
    await split.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days/:dayId/swap-with', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const dayA = split.days.id(req.params.dayId);
    const dayB = split.days.id(req.body.targetDayId);
    if (!dayA || !dayB) return res.status(404).json({ error: 'Day not found' });
    if (dayA._id.equals(dayB._id)) return res.status(400).json({ error: 'Cannot swap a day with itself' });

    await snapshotVersion(split);
    const exA = dayA.toObject().exercises;
    const exB = dayB.toObject().exercises;
    dayA.exercises = exB;
    dayB.exercises = exA;
    await split.save();
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Copies a day's exercises into another day, replacing that day's current
// exercises. Unlike swap-with, the source day is left untouched.
router.post('/:id/days/:dayId/copy-to', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const sourceDay = split.days.id(req.params.dayId);
    const targetDay = split.days.id(req.body.targetDayId);
    if (!sourceDay || !targetDay) return res.status(404).json({ error: 'Day not found' });
    if (sourceDay._id.equals(targetDay._id)) return res.status(400).json({ error: 'Cannot copy a day into itself' });

    await snapshotVersion(split);
    targetDay.exercises = sourceDay.toObject().exercises.map(({ _id, ...e }) => ({
      ...e,
      checked: false,
      lastCheckedDate: '',
    }));
    await split.save();
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXERCISES ────────────────────────────────────────────────────────────────

router.get('/:id/days/:dayId/exercises', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const exercises = day.exercises.map((e) => e.toObject()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days/:dayId/exercises', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    await snapshotVersion(split);
    const maxOrder = day.exercises.reduce((m, e) => Math.max(m, e.order ?? 0), -1);
    const untilFailure = req.body.untilFailure === true;
    day.exercises.push({
      name: req.body.name,
      sets: req.body.sets || 3,
      reps: untilFailure ? null : (req.body.reps ?? 10),
      untilFailure,
      weight: req.body.weight || 0,
      weightUnit: req.body.weightUnit || 'kg',
      checked: false,
      lastCheckedDate: '',
      order: maxOrder + 1,
      muscleTargets: req.body.muscleTargets || [],
      imageUrl: req.body.imageUrl || '',
      imageSource: req.body.imageUrl ? 'auto' : '',
      placeholderUsed: req.body.placeholderUsed === true,
      category: req.body.category || 'workout',
      exerciseType: req.body.exerciseType || 'compound',
      restSeconds: req.body.restSeconds || 0,
      warmupRamp: req.body.warmupRamp || [],
    });
    await split.save();
    res.status(201).json(day.exercises[day.exercises.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH reorder must come before /:exId routes
router.patch('/:id/days/:dayId/exercises/reorder', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const updates = req.body.exercises;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'exercises must be an array' });
    await snapshotVersion(split);
    updates.forEach(({ _id, order }) => {
      const ex = day.exercises.id(_id);
      if (ex) ex.order = order;
    });
    await split.save();
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days/:dayId/exercises/:exId/move', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const fromDay = split.days.id(req.params.dayId);
    const toDay = split.days.id(req.body.targetDayId);
    if (!fromDay || !toDay) return res.status(404).json({ error: 'Day not found' });
    const ex = fromDay.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });
    if (fromDay._id.equals(toDay._id)) return res.status(400).json({ error: 'Already on that day' });

    await snapshotVersion(split);
    const exObj = ex.toObject();
    const maxOrder = toDay.exercises.reduce((m, e) => Math.max(m, e.order ?? 0), -1);
    exObj.order = maxOrder + 1;
    toDay.exercises.push(exObj);
    fromDay.exercises.pull(req.params.exId);
    await split.save();
    res.json(sortExercises(split));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/days/:dayId/exercises/:exId', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });
    const structuralFields = ['name', 'sets', 'reps', 'weight', 'weightUnit', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category', 'notes', 'exerciseType', 'restSeconds', 'warmupRamp'];
    // Only real template/structure edits get a version snapshot (for revert)
    // — weight/notes/duration are routine in-workout tracking edits made many
    // times per session and don't need a full split-tree copy each time.
    const snapshotTriggerFields = ['name', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category', 'exerciseType'];
    if (snapshotTriggerFields.some((f) => req.body[f] !== undefined)) await snapshotVersion(split);
    const fields = [...structuralFields, 'todaySetLogs', 'todaySetLogsDate'];
    fields.forEach((f) => { if (req.body[f] !== undefined) ex[f] = req.body[f]; });
    if (req.body.untilFailure === true) ex.reps = null;
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/days/:dayId/exercises/:exId/upload-image', async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'imageData is required' });
    }
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Must be a data URL.' });
    }
    // ~300 000 chars ≈ 225 KB decoded — keeps split documents manageable
    if (imageData.length > 300000) {
      return res.status(400).json({ error: 'Image too large. Max ~200KB.' });
    }

    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });

    ex.imageUrl = imageData;
    ex.imageSource = 'custom';
    ex.placeholderUsed = false;
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/days/:dayId/exercises/:exId', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    await snapshotVersion(split);
    day.exercises.pull(req.params.exId);
    await split.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/days/:dayId/exercises/:exId/toggle', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });

    const today = new Date().toISOString().slice(0, 10);
    if (ex.lastCheckedDate !== today) {
      ex.checked = false;
      ex.lastCheckedDate = today;
    }
    ex.checked = !ex.checked;
    if (ex.checked) {
      ex.lastCheckedDate = today;
      ex.skipped = false; // mutually exclusive with skip
    }
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/days/:dayId/exercises/:exId/skip', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });

    const today = new Date().toISOString().slice(0, 10);
    if (ex.lastSkippedDate !== today) {
      ex.skipped = false;
      ex.lastSkippedDate = today;
    }
    ex.skipped = !ex.skipped;
    if (ex.skipped) {
      ex.lastSkippedDate = today;
      ex.checked = false; // mutually exclusive with done
    }
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
