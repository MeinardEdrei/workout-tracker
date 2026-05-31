const express = require('express');
const router = express.Router();
const Split = require('../models/Split');

// ─── SPLITS ──────────────────────────────────────────────────────────────────

// GET /api/splits
router.get('/', async (_req, res) => {
  try {
    const splits = await Split.find().sort({ createdAt: -1 });
    res.json(splits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/splits
router.post('/', async (req, res) => {
  try {
    const split = new Split({ name: req.body.name, days: [] });
    await split.save();
    res.status(201).json(split);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/splits/:id  (rename)
router.put('/:id', async (req, res) => {
  try {
    const split = await Split.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(split);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/splits/:id
router.delete('/:id', async (req, res) => {
  try {
    const split = await Split.findByIdAndDelete(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/splits/:id/activate
router.patch('/:id/activate', async (req, res) => {
  try {
    await Split.updateMany({}, { isActive: false });
    const split = await Split.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(split);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DAYS ─────────────────────────────────────────────────────────────────────

// GET /api/splits/:id/days
router.get('/:id/days', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    res.json(split.days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/splits/:id/days
router.post('/:id/days', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    split.days.push({ name: req.body.name, tag: req.body.tag || '', isRest: req.body.isRest || false, exercises: [] });
    await split.save();
    res.status(201).json(split.days[split.days.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/splits/:id/days/:dayId
router.put('/:id/days/:dayId', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    if (req.body.name !== undefined) day.name = req.body.name;
    if (req.body.tag !== undefined) day.tag = req.body.tag;
    if (req.body.isRest !== undefined) day.isRest = req.body.isRest;
    await split.save();
    res.json(day);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/splits/:id/days/:dayId
router.delete('/:id/days/:dayId', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    split.days.pull(req.params.dayId);
    await split.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXERCISES ────────────────────────────────────────────────────────────────

// GET /api/splits/:id/days/:dayId/exercises
router.get('/:id/days/:dayId/exercises', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    res.json(day.exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/splits/:id/days/:dayId/exercises
router.post('/:id/days/:dayId/exercises', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    day.exercises.push({
      name: req.body.name,
      sets: req.body.sets || 3,
      reps: req.body.reps || 10,
      weight: req.body.weight || 0,
      weightUnit: req.body.weightUnit || 'kg',
      checked: false,
      lastCheckedDate: '',
    });
    await split.save();
    res.status(201).json(day.exercises[day.exercises.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/splits/:id/days/:dayId/exercises/:exId
router.put('/:id/days/:dayId/exercises/:exId', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
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

// DELETE /api/splits/:id/days/:dayId/exercises/:exId
router.delete('/:id/days/:dayId/exercises/:exId', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
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

// PATCH /api/splits/:id/days/:dayId/exercises/:exId/toggle
router.patch('/:id/days/:dayId/exercises/:exId/toggle', async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    const day = split.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ error: 'Day not found' });
    const ex = day.exercises.id(req.params.exId);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // Auto-reset if last checked was a different day
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
