const express = require('express');
const router = express.Router();
const WorkoutLog = require('../models/WorkoutLog');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/logs
router.post('/', async (req, res) => {
  try {
    const { date, splitName, dayName, dayTag, exercises, skipped } = req.body;

    // Check if a log for this date and user already exists
    const existingLog = await WorkoutLog.findOne({ userId: req.userId, date });

    const totalVolume = Math.round((exercises || []).reduce((sum, ex) => {
      const w = ex.weight || 0;
      const weightInKg = (ex.weightUnit === 'lbs') ? (w / 2.20462) : w;
      return sum + (ex.sets || 0) * (ex.reps || 0) * weightInKg;
    }, 0));

    if (existingLog) {
      existingLog.splitName = splitName || existingLog.splitName;
      existingLog.dayName = dayName || existingLog.dayName;
      existingLog.dayTag = dayTag || existingLog.dayTag;
      existingLog.exercises = exercises;
      existingLog.totalVolume = totalVolume;
      existingLog.skipped = !!skipped;
      await existingLog.save();
      return res.status(200).json(existingLog);
    }

    const log = new WorkoutLog({ date, splitName, dayName, dayTag, exercises, totalVolume, skipped: !!skipped, userId: req.userId });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/logs
router.get('/', async (req, res) => {
  try {
    const logs = await WorkoutLog.find({ userId: req.userId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/week
router.get('/week', async (req, res) => {
  try {
    const now = new Date();
    const dow = now.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const monStr = mon.toISOString().slice(0, 10);
    const sunStr = sun.toISOString().slice(0, 10);

    const logs = await WorkoutLog.find({
      userId: req.userId,
      date: { $gte: monStr, $lte: sunStr },
    }).sort({ date: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:date
router.get('/:date', async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const logs = await WorkoutLog.find({ userId: req.userId, date: req.params.date });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/clear
router.delete('/clear', async (req, res) => {
  try {
    await WorkoutLog.deleteMany({ userId: req.userId });
    res.json({ message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id
router.delete('/:id', async (req, res) => {
  try {
    await WorkoutLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
