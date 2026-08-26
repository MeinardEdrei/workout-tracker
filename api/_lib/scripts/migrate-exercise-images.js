// One-time migration: point existing Split exercises at the bundled
// @bryllim/workout-guide images instead of the old free-exercise-db/wger URLs.
//
// Dry-run by default — prints what would change without writing anything.
// Pass --write to actually persist changes.
//
// Usage:
//   node api/_lib/scripts/migrate-exercise-images.js          (dry run)
//   node api/_lib/scripts/migrate-exercise-images.js --write  (apply)

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Split = require('../models/Split');
const { findBestMatch } = require('../utils/matchExercise');
const manifest = require('../data/exerciseManifest.json');

const WRITE = process.argv.includes('--write');
const EXERCISE_IMAGES_BASE = '/exercise-images';
const OLD_URL_PREFIXES = ['https://raw.githubusercontent.com/', 'https://wger.de/'];

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set (expected in api/.env)');
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const splits = await Split.find({});
  let scanned = 0;
  let updated = 0;
  let skippedCustom = 0;
  let skippedAlready = 0;
  let noMatch = 0;
  const unmatched = new Set();
  const dirtySplitIds = new Set();

  for (const split of splits) {
    for (const day of split.days) {
      for (const ex of day.exercises) {
        scanned++;

        if (ex.imageSource === 'custom') {
          skippedCustom++;
          continue;
        }

        const isOldAutoUrl = ex.imageUrl && OLD_URL_PREFIXES.some(p => ex.imageUrl.startsWith(p));
        const isUnset = !ex.imageUrl;
        if (!isOldAutoUrl && !isUnset) {
          skippedAlready++;
          continue;
        }

        // findBestMatch's own threshold (0.6) is too loose for an unattended
        // migration — it happily matches e.g. "Reverse Machine Flyes" to
        // "Smith Machine Reverse Lunge" (2/3 words overlap, wrong exercise
        // entirely). Require a much closer match; anything less falls
        // through to noMatch and keeps its existing imageUrl untouched.
        const MIGRATION_MIN_SCORE = 0.85;
        const { match, score } = findBestMatch(manifest, ex.name);
        if (!match || score < MIGRATION_MIN_SCORE) {
          noMatch++;
          unmatched.add(`${ex.name}${match ? ` (best guess: ${match.name}, score ${score.toFixed(2)})` : ''}`);
          continue;
        }

        const newUrl = `${EXERCISE_IMAGES_BASE}/${match.image}`;
        if (newUrl === ex.imageUrl) {
          skippedAlready++;
          continue;
        }

        console.log(`${WRITE ? '[write]' : '[dry-run]'} "${ex.name}" -> ${match.name} (score ${score.toFixed(2)}, ${newUrl})`);
        updated++;
        if (WRITE) {
          ex.imageUrl = newUrl;
          ex.imageSource = 'auto';
          dirtySplitIds.add(split._id.toString());
        }
      }
    }
    if (WRITE && dirtySplitIds.has(split._id.toString())) {
      await split.save();
    }
  }

  console.log('\n--- summary ---');
  console.log('exercises scanned:', scanned);
  console.log(`${WRITE ? 'updated' : 'would update'}:`, updated);
  console.log('skipped (custom image):', skippedCustom);
  console.log('skipped (already current):', skippedAlready);
  console.log('no match found:', noMatch);
  if (unmatched.size) {
    console.log('unmatched exercise names:', [...unmatched].sort().join(', '));
  }
  if (!WRITE && updated > 0) {
    console.log('\nThis was a dry run. Re-run with --write to apply changes.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
