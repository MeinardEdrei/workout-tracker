const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const { requireAuth } = require('../middleware/auth');

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// GET /api/auth/google — start OAuth flow
router.get('/google', (_req, res) => {
  const state = jwt.sign({ ts: Date.now() }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback — Google redirects here
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`${clientUrl()}/?auth_error=oauth_failed`);
  }

  try {
    jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    return res.redirect(`${clientUrl()}/?auth_error=oauth_failed`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token returned');

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    const email = profile.email.toLowerCase().trim();
    const allowed = await AllowedEmail.findOne({ email });
    if (!allowed) return res.redirect(`${clientUrl()}/?auth_error=not_allowed`);

    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
      user = await User.create({
        googleId: profile.sub,
        email,
        name: profile.name || '',
        avatar: profile.picture || '',
      });
    } else {
      user.lastLoginAt = new Date();
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${clientUrl()}/?token=${token}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${clientUrl()}/?auth_error=server_error`);
  }
});

// GET /api/auth/me — validate token and return user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = router;
