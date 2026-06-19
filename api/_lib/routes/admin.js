const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const Split = require('../models/Split');
const WorkoutLog = require('../models/WorkoutLog');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-__v');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Split.deleteMany({ userId: req.params.id });
    await WorkoutLog.deleteMany({ userId: req.params.id });
    res.json({ message: 'User and all their data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/allowed
router.get('/allowed', async (_req, res) => {
  try {
    const list = await AllowedEmail.find().sort({ addedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/allowed
router.post('/allowed', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email required' });
    const entry = await AllowedEmail.create({
      email,
      addedBy: req.userEmail,
      note: req.body.note?.trim() || '',
    });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in allowed list' });
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/allowed/:id
router.delete('/allowed/:id', async (req, res) => {
  try {
    await AllowedEmail.findByIdAndDelete(req.params.id);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
