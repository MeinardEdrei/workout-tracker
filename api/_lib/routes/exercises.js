const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { findBestMatch } = require('../utils/matchExercise');

router.use(requireAuth);

// POST /api/exercises/fetch-image
// Looks up an image for a given exercise name from the bundled exercise
// library (see scripts/sync-exercise-library.js), falling back to wger.de.
// Returns { success, imageUrl } — does NOT persist; caller saves via PUT exercise.
const EXERCISE_IMAGES_BASE = '/exercise-images';
const MANIFEST_PATH = path.join(__dirname, '../data/exerciseManifest.json');

let _exerciseCache = null;
function getExercises() {
  if (_exerciseCache) return _exerciseCache;
  try {
    _exerciseCache = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    console.error('[exercises] failed to load bundled manifest, run `npm run sync-exercises`:', err.message);
    _exerciseCache = [];
  }
  return _exerciseCache;
}

function mapDatabaseMuscle(muscle) {
  if (!muscle) return '';
  const m = muscle.toLowerCase().trim();
  switch (m) {
    case 'back': return 'Upper Back';
    case 'grip': return 'Forearms';
    case 'groin': return 'Adductors';
    case 'hips': return 'Hip Flexors';
    case 'legs': return 'Quads';
    case 'mobility': return 'Full Body';
    case 'posterior chain': return 'Glutes';
    default:
      return muscle.charAt(0).toUpperCase() + muscle.slice(1);
  }
}

// GET /api/exercises/suggest?q=bench
router.get('/suggest', async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);
  try {
    const exercises = getExercises();
    const matches = exercises
      .filter(e => e.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map(e => {
        const imageUrl = e.image ? `${EXERCISE_IMAGES_BASE}/${e.image}` : null;
        const muscleTargets = [...new Set([
          mapDatabaseMuscle(e.primaryMuscle),
          ...(e.secondaryMuscles || []).map(mapDatabaseMuscle)
        ])].filter(Boolean);
        return { name: e.name, imageUrl, muscleTargets };
      });
    return res.json(matches);
  } catch (err) {
    console.error('[suggest] error:', err.message);
    return res.json([]);
  }
});

router.post('/fetch-image', async (req, res) => {
  const { exerciseName } = req.body;
  if (!exerciseName || typeof exerciseName !== 'string') {
    return res.status(400).json({ error: 'exerciseName is required' });
  }

  try {
    const exercises = getExercises();
    const { match: bestMatch, score: bestScore } = findBestMatch(exercises, exerciseName);

    console.log('[fetch-image] query:', exerciseName, '| match:', bestMatch ? bestMatch.name : 'none', '| score:', bestScore);

    if (bestMatch && bestMatch.image) {
      const imageUrl = `${EXERCISE_IMAGES_BASE}/${bestMatch.image}`;
      return res.json({ success: true, imageUrl });
    }

    // Fallback: Query wger API
    try {
      console.log(`[fetch-image] Fallback: Querying wger for: "${exerciseName}"`);
      const searchUrl = `https://wger.de/api/v2/exercise/?search=${encodeURIComponent(exerciseName)}`;
      const wgerRes = await fetch(searchUrl, { headers: { 'Accept': 'application/json' } });
      if (wgerRes.ok) {
        const wgerData = await wgerRes.json();
        if (wgerData.results && wgerData.results.length > 0) {
          // Loop through first 3 search results to find one with an image
          for (const item of wgerData.results.slice(0, 3)) {
            const imgUrl = `https://wger.de/api/v2/exerciseimage/?exercise=${item.id}`;
            const imgRes = await fetch(imgUrl, { headers: { 'Accept': 'application/json' } });
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              if (imgData.results && imgData.results.length > 0) {
                const imageInfo = imgData.results.find(i => i.is_main) || imgData.results[0];
                console.log(`[fetch-image] wger matched ID: ${item.id} | image: ${imageInfo.image}`);
                return res.json({ success: true, imageUrl: imageInfo.image });
              }
            }
          }
        }
      }
    } catch (wgerErr) {
      console.error('[fetch-image] wger fallback error:', wgerErr.message);
    }

    return res.json({ success: false, usePlaceholder: true });
  } catch (err) {
    console.error('[fetch-image] error:', err.message);
    return res.json({ success: false, usePlaceholder: true });
  }
});

module.exports = router;
