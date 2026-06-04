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

  try {
    const term = encodeURIComponent(exerciseName.trim());

    // Step 1: search wger for the exercise to get its base_id
    const searchRes = await fetch(
      `https://wger.de/api/v2/exercise/search/?term=${term}&language=english&format=json`
    );
    if (!searchRes.ok) {
      console.error('[fetch-image] wger search failed:', searchRes.status);
      return res.json({ success: false, usePlaceholder: true });
    }

    const searchData = await searchRes.json();
    const suggestions = searchData.suggestions || [];
    console.log('[fetch-image] wger suggestions for', exerciseName, ':', suggestions.length);
    if (!suggestions.length) {
      return res.json({ success: false, usePlaceholder: true });
    }

    // Step 2: find first suggestion that has images
    for (const suggestion of suggestions) {
      const baseId = suggestion.data && suggestion.data.base_id;
      if (!baseId) continue;

      const imgRes = await fetch(
        `https://wger.de/api/v2/exerciseimage/?exercise_base=${baseId}&format=json`
      );
      if (!imgRes.ok) continue;

      const imgData = await imgRes.json();
      const images = imgData.results || [];
      if (!images.length) continue;

      const imageUrl = images[0].image;
      console.log('[fetch-image] found image for', suggestion.value, ':', imageUrl);
      return res.json({ success: true, imageUrl });
    }

    console.log('[fetch-image] no images found across', suggestions.length, 'suggestions');
    return res.json({ success: false, usePlaceholder: true });
  } catch (err) {
    console.error('[fetch-image] error:', err.message);
    return res.json({ success: false, usePlaceholder: true });
  }
});

module.exports = router;
