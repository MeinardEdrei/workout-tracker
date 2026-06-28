const express = require('express');
const router = express.Router();
const Split = require('../models/Split');
const WorkoutLog = require('../models/WorkoutLog');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

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
          date: { $gte: startDateStr }
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
      const user = await User.findById(entry._id).select('name avatar lastLoginAt');
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
    split.days.pull(req.params.dayId);
    await split.save();
    res.json({ message: 'Deleted' });
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

router.put('/:id/days/:dayId/exercises/:exId', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });
    const fields = ['name', 'sets', 'reps', 'weight', 'weightUnit', 'muscleTargets', 'untilFailure', 'imageUrl', 'imageSource', 'placeholderUsed', 'category'];
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
    if (ex.checked) ex.lastCheckedDate = today;
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
