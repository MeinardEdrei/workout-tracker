const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/exercises/fetch-image
// Proxies ExerciseDB to find an image for a given exercise name.
// Returns { success, imageUrl } — does NOT persist; caller saves via PUT exercise.
const FREE_EXERCISE_DB = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FREE_EXERCISE_IMAGES = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

router.post('/fetch-image', async (req, res) => {
  const { exerciseName } = req.body;
  if (!exerciseName || typeof exerciseName !== 'string') {
    return res.status(400).json({ error: 'exerciseName is required' });
  }

  try {
    const query = exerciseName.toLowerCase().trim();

    const dbRes = await fetch(FREE_EXERCISE_DB);
    if (!dbRes.ok) {
      console.error('[fetch-image] failed to fetch exercise db:', dbRes.status);
      return res.json({ success: false, usePlaceholder: true });
    }

    const exercises = await dbRes.json();

    // Prefer exact name match, fall back to contains
    const exact = exercises.find(e => e.name.toLowerCase() === query);
    const contains = exercises.find(e => e.name.toLowerCase().includes(query) || query.includes(e.name.toLowerCase()));
    const match = exact || contains;

    console.log('[fetch-image] query:', query, '| match:', match ? match.name : 'none');

    if (!match || !match.images || !match.images.length) {
      return res.json({ success: false, usePlaceholder: true });
    }

    const imageUrl = `${FREE_EXERCISE_IMAGES}/${match.images[0]}`;
    return res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('[fetch-image] error:', err.message);
    return res.json({ success: false, usePlaceholder: true });
  }
});

module.exports = router;
