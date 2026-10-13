// The bundled 302-exercise library, searched on the device so name
// suggestions work for guests and offline. Same data and result shape as
// GET /api/exercises/suggest (api/_lib/routes/exercises.js).

const IMAGES_BASE = '/exercise-images';

// Keep in step with mapDatabaseMuscle in api/_lib/routes/exercises.js.
function mapMuscle(muscle) {
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
    default: return muscle.charAt(0).toUpperCase() + muscle.slice(1);
  }
}

let library = null;
function loadLibrary() {
  // Separate chunk, precached by the service worker like the rest of the app.
  library ||= import('../../api/_lib/data/exerciseManifest.json').then((m) => m.default.map((e) => ({
    name: e.name,
    lower: e.name.toLowerCase(),
    imageUrl: e.image ? `${IMAGES_BASE}/${e.image}` : null,
    muscleTargets: [...new Set([mapMuscle(e.primaryMuscle), ...(e.secondaryMuscles || []).map(mapMuscle)])].filter(Boolean),
  })));
  return library;
}

export async function searchExerciseLibrary(q, limit = 8) {
  const query = (q || '').toLowerCase().trim();
  if (query.length < 2) return [];
  const all = await loadLibrary();
  // Names starting with the query first ("row" → "Row…" before "Barbell Row").
  const starts = [];
  const contains = [];
  for (const e of all) {
    if (e.lower.startsWith(query)) starts.push(e);
    else if (e.lower.includes(query)) contains.push(e);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit).map(({ name, imageUrl, muscleTargets }) => ({ name, imageUrl, muscleTargets }));
}
