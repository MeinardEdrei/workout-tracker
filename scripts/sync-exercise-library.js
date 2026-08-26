// Pulls exercise images/metadata from @bryllim/workout-guide into this repo so the
// app doesn't depend on a live third-party image host. Re-run after bumping the package.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pkgDir = path.join(root, 'node_modules/@bryllim/workout-guide');
const imagesOutDir = path.join(root, 'public/exercise-images');
const manifestOutPath = path.join(root, 'api/_lib/data/exerciseManifest.json');

const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, 'manifest.json'), 'utf8'));

fs.mkdirSync(imagesOutDir, { recursive: true });
fs.mkdirSync(path.dirname(manifestOutPath), { recursive: true });

const trimmed = [];
for (const entry of manifest) {
  const frame1 = entry.frames.find((f) => f.index === 1) || entry.frames[0];
  if (!frame1) continue;
  const srcPath = path.join(pkgDir, frame1.path);
  const destName = `${entry.slug}.${frame1.format}`;
  fs.copyFileSync(srcPath, path.join(imagesOutDir, destName));
  trimmed.push({
    name: entry.name,
    slug: entry.slug,
    image: destName,
    exerciseType: entry.exerciseType,
    equipment: entry.equipment,
    primaryMuscle: entry.primaryMuscle,
    secondaryMuscles: entry.secondaryMuscles || [],
    isStretch: !!entry.isStretch,
  });
}

fs.writeFileSync(manifestOutPath, JSON.stringify(trimmed, null, 2));

// Attribution is required by the CC BY-SA 4.0 asset license.
fs.copyFileSync(
  path.join(pkgDir, 'ATTRIBUTION.md'),
  path.join(imagesOutDir, 'ATTRIBUTION.md')
);

console.log(`Synced ${trimmed.length} exercise images to public/exercise-images/`);
console.log(`Wrote trimmed manifest to api/_lib/data/exerciseManifest.json`);
