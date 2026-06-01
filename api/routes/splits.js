const express = require('express');
const router = express.Router();
const Split = require('../models/Split');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function sortExercises(split) {
  const obj = split.toObject();
  obj.days.forEach((d) => d.exercises.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  return obj;
}

function sortExercisesInDay(day) {
  const obj = day.toObject ? day.toObject() : { ...day };
  obj.exercises = [...(obj.exercises || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

// ─── DAYS ─────────────────────────────────────────────────────────────────────

router.get('/:id/days', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(split.days.map(sortExercisesInDay));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days', async (req, res) => {
  try {
    const split = await Split.findOne({ _id: req.params.id, userId: req.userId });
    if (!split) return res.status(404).json({ error: 'Split not found' });
    split.days.push({ name: req.body.name, tag: req.body.tag || '', isRest: req.body.isRest || false, exercises: [] });
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
    if (req.body.name !== undefined) day.name = req.body.name;
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
    day.exercises.push({
      name: req.body.name,
      sets: req.body.sets || 3,
      reps: req.body.reps || 10,
      weight: req.body.weight || 0,
      weightUnit: req.body.weightUnit || 'kg',
      checked: false,
      lastCheckedDate: '',
      order: maxOrder + 1,
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
    const fields = ['name', 'sets', 'reps', 'weight', 'weightUnit'];
    fields.forEach((f) => { if (req.body[f] !== undefined) ex[f] = req.body[f]; });
    await split.save();
    res.json(ex);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
