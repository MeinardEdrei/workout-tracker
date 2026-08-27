// Client-side copy of api/_lib/utils/matchExercise.js — kept in sync by hand.
// Used for the reactive "looks like a duplicate" warning and the Manage
// Exercises review screen, both of which need to run against data already
// loaded in memory (no network round-trip).

export function normalizeName(str) {
  return str.toLowerCase()
    .replace(/\bdb\b/g, 'dumbbell')
    .replace(/\bbb\b/g, 'barbell')
    .replace(/\brdl\b/g, 'romanian deadlift')
    .replace(/\bsldl\b/g, 'romanian deadlift')
    .replace(/\bstiff[\s-]?legg?(?:ed)?\s+deadlift\b/g, 'romanian deadlift')
    .replace(/\bdecline crunch\b/g, 'decline sit up')
    .replace(/\bohp\b/g, 'overhead press')
    .replace(/\bpushups?\b/g, 'push up')
    .replace(/\bpullups?\b/g, 'pull up')
    .replace(/\bchinups?\b/g, 'chin up')
    .replace(/\bups\b/g, 'up')
    .replace(/[\(\)\-\+,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normKey(name) {
  return (name || '').trim().toLowerCase();
}

// Finds the best match for `name` among `exercises` (each with a `.name`).
// Returns { match, score } — score 2 for an exact match, else a 0-1 token
// overlap ratio (only returned when >= 0.6).
export function findBestMatch(exercises, name) {
  const query = normalizeName(name);
  let bestMatch = null;
  let bestScore = 0;

  for (const e of exercises) {
    const target = normalizeName(e.name);

    if (target === query) {
      return { match: e, score: 2 };
    }

    const queryWords = query.split(' ').filter(w => w.length > 1);
    if (queryWords.length === 0) continue;

    let matchedWords = 0;
    for (const qw of queryWords) {
      if (target.includes(qw)) matchedWords++;
    }

    const score = matchedWords / queryWords.length;
    if (score >= 0.6 && score > bestScore) {
      bestMatch = e;
      bestScore = score;
    }
  }

  return { match: bestMatch, score: bestScore };
}

// Pairwise scan over a flat list of exercise names, flagging likely
// duplicates (e.g. "DB Curl" / "Dumbbell Curl") for the merge-review UI.
// Skips pairs that are already normKey-identical — those already aggregate
// as the same exercise, nothing to suggest merging.
//
// Uses a symmetric (Jaccard) word-overlap score rather than findBestMatch's
// one-directional ratio — that one divides by the *query's* word count only,
// so a short name like "Squat" scores a perfect match against "Front Squat"
// or "Bulgarian Split Squat" (1/1 of its own words found), flooding real
// exercise lists with false positives for any common shared word (Press,
// Curl, Row, Raise...). Requiring overlap relative to the *combined* word
// set means both names have to be substantially the same, not just one a
// subset of the other.
export function findDuplicatePairs(names) {
  const list = [...new Set(names.map((n) => (n || '').trim()).filter(Boolean))];
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (normKey(a) === normKey(b)) continue;
      const normA = normalizeName(a);
      const normB = normalizeName(b);
      let score;
      if (normA === normB) {
        score = 2;
      } else {
        const wordsA = new Set(normA.split(' ').filter((w) => w.length > 1));
        const wordsB = new Set(normB.split(' ').filter((w) => w.length > 1));
        const union = new Set([...wordsA, ...wordsB]);
        if (union.size === 0) continue;
        let intersectionCount = 0;
        wordsA.forEach((w) => { if (wordsB.has(w)) intersectionCount++; });
        score = intersectionCount / union.size;
      }
      if (score >= 0.6) pairs.push({ a, b, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}
