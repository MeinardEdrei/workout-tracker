const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const { requireAuth } = require('../middleware/auth');

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

function buildGoogleParams(state) {
  return new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
}

async function exchangeCodeForToken(code) {
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

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  return profileRes.json();
}

async function upsertUser(profile) {
  const email = profile.email.toLowerCase().trim();

  const allowed = await AllowedEmail.findOne({ email });
  if (!allowed) return null;

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
  return user;
}

// GET /api/auth/google — full redirect flow (works when SW has denylist active)
router.get('/google', (_req, res) => {
  const state = jwt.sign({ ts: Date.now() }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${buildGoogleParams(state)}`);
});

// GET /api/auth/google/url — return Google OAuth URL as JSON
// Used by the React app to navigate directly to Google (bypasses SW entirely)
router.get('/google/url', (_req, res) => {
  const state = jwt.sign({ ts: Date.now() }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${buildGoogleParams(state)}` });
});

// GET /api/auth/google/callback — Google redirects here (redirect-based flow)
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) return res.redirect(`${clientUrl()}/?auth_error=oauth_failed`);

  try { jwt.verify(state, process.env.JWT_SECRET); }
  catch { return res.redirect(`${clientUrl()}/?auth_error=oauth_failed`); }

  try {
    const profile = await exchangeCodeForToken(code);
    const user = await upsertUser(profile);
    if (!user) return res.redirect(`${clientUrl()}/?auth_error=not_allowed`);

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

// GET /api/auth/google/exchange — exchange code+state for JWT as JSON
// Called by React when the SW intercepts the callback and serves index.html instead
router.get('/google/exchange', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).json({ error: 'oauth_failed' });

  try { jwt.verify(state, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'oauth_failed' }); }

  try {
    const profile = await exchangeCodeForToken(code);
    const user = await upsertUser(profile);
    if (!user) return res.status(403).json({ error: 'not_allowed' });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    console.error('OAuth exchange error:', err);
    res.status(500).json({ error: 'server_error' });
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
