const express = require('express');
const router = express.Router();
const WorkoutLog = require('../models/WorkoutLog');

// POST /api/logs
router.post('/', async (req, res) => {
  try {
    const { date, splitName, dayName, dayTag, exercises } = req.body;
    const totalVolume = (exercises || []).reduce((sum, ex) => {
      return sum + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
    }, 0);
    const log = new WorkoutLog({ date, splitName, dayName, dayTag, exercises, totalVolume });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/logs
router.get('/', async (_req, res) => {
  try {
    const logs = await WorkoutLog.find().sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/week  — current Mon-Sun
router.get('/week', async (_req, res) => {
  try {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun
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
      date: { $gte: monStr, $lte: sunStr },
    }).sort({ date: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:date  — specific date YYYY-MM-DD
router.get('/:date', async (req, res) => {
  try {
    // Only match if param looks like a date, not an ObjectId
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const logs = await WorkoutLog.find({ date: req.params.date });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/clear
router.delete('/clear', async (_req, res) => {
  try {
    await WorkoutLog.deleteMany({});
    res.json({ message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id
router.delete('/:id', async (req, res) => {
  try {
    await WorkoutLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
