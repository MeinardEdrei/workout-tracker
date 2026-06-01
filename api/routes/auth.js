const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const { requireAuth } = require('../middleware/auth');

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// GET /api/auth/google — start OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback — Google redirects here
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${clientUrl()}/?auth_error=oauth_failed` }),
  async (req, res) => {
    try {
      const profile = req.user;
      const email = profile.emails[0].value.toLowerCase().trim();

      const allowed = await AllowedEmail.findOne({ email });
      if (!allowed) {
        return res.redirect(`${clientUrl()}/?auth_error=not_allowed`);
      }

      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email,
          name: profile.displayName || '',
          avatar: profile.photos?.[0]?.value || '',
        });
      } else {
        user.lastLoginAt = new Date();
        if (!user.avatar && profile.photos?.[0]?.value) user.avatar = profile.photos[0].value;
        await user.save();
      }

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Destroy the OAuth session — JWT takes over from here
      if (req.session) req.session.destroy(() => {});

      res.redirect(`${clientUrl()}/?token=${token}`);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.redirect(`${clientUrl()}/?auth_error=server_error`);
    }
  }
);

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
router.post('/logout', (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.json({ message: 'Logged out' });
});

module.exports = router;
