const express = require('express');
const router = express.Router();
const InviteToken = require('../models/InviteToken');
const AllowedEmail = require('../models/AllowedEmail');

// GET /api/invite/:token — validate (check it exists, not expired, not used)
router.get('/:token', async (req, res) => {
  try {
    const invite = await InviteToken.findOne({ token: req.params.token });
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.usedAt) return res.status(410).json({ error: 'This invite has already been used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'This invite has expired' });
    res.json({ valid: true, expiresAt: invite.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invite/:token/claim — submit email, adds to allowed list, marks token used
router.post('/:token/claim', async (req, res) => {
  try {
    const invite = await InviteToken.findOne({ token: req.params.token });
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.usedAt) return res.status(410).json({ error: 'This invite has already been used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'This invite link has expired' });

    const email = req.body.email?.toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    await AllowedEmail.create({ email, addedBy: 'invite', note: 'Via invite link' }).catch((err) => {
      if (err.code !== 11000) throw err; // ignore duplicate — email already allowed, still consume token
    });

    invite.usedAt = new Date();
    invite.usedByEmail = email;
    await invite.save();

    res.json({ message: 'Access granted! You can now sign in with Google.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
