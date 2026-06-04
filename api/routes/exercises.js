const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/exercises/fetch-image
// Proxies ExerciseDB to find an image for a given exercise name.
// Returns { success, imageUrl } — does NOT persist; caller saves via PUT exercise.
router.post('/fetch-image', async (req, res) => {
  const { exerciseName } = req.body;
  if (!exerciseName || typeof exerciseName !== 'string') {
    return res.status(400).json({ error: 'exerciseName is required' });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com';

  if (!apiKey) {
    console.error('[fetch-image] RAPIDAPI_KEY not configured');
    return res.json({ success: false, usePlaceholder: true });
  }

  try {
    const encoded = encodeURIComponent(exerciseName.toLowerCase().trim());
    const url = `https://${apiHost}/exercises/name/${encoded}?limit=1&offset=0`;
    console.log('[fetch-image] searching:', exerciseName, '→', url);

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
    });

    console.log('[fetch-image] status:', response.status);

    if (response.status === 429) {
      console.error('[fetch-image] rate limit hit');
      return res.json({ success: false, usePlaceholder: true, reason: 'rate_limit' });
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[fetch-image] non-ok response:', response.status, body.slice(0, 200));
      return res.json({ success: false, usePlaceholder: true });
    }

    const data = await response.json();
    console.log('[fetch-image] results count:', Array.isArray(data) ? data.length : typeof data);
    if (!Array.isArray(data) || data.length === 0) {
      return res.json({ success: false, usePlaceholder: true });
    }

    const exercise = data[0];
    const imageUrl = exercise.gifUrl || (exercise.images && exercise.images[0]) || null;
    console.log('[fetch-image] first result name:', exercise.name, '| gifUrl:', exercise.gifUrl ? 'present' : 'missing');

    if (!imageUrl) {
      return res.json({ success: false, usePlaceholder: true });
    }

    return res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('[fetch-image] error:', err.message);
    return res.json({ success: false, usePlaceholder: true });
  }
});

module.exports = router;
