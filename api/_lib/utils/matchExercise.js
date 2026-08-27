function normalizeName(str) {
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

// Finds the best match for `name` among `exercises` (each with a `.name`).
// Returns { match, score } — score 2 for an exact match, else a 0-1 token
// overlap ratio (only returned when >= 0.6).
function findBestMatch(exercises, name) {
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

// Trim + lowercase — the single source of truth for "exact match" semantics
// used by the rename-cascade/merge endpoints (see api/_lib/routes/splits.js).
function normKey(name) {
  return (name || '').trim().toLowerCase();
}

// Pairwise scan over a flat list of exercise names, flagging likely
// duplicates (e.g. "DB Curl" / "Dumbbell Curl") for the merge-review UI.
// Skips pairs that are already normKey-identical — those already aggregate
// as the same exercise, nothing to suggest merging.
function findDuplicatePairs(names) {
  const list = [...new Set(names.map((n) => (n || '').trim()).filter(Boolean))];
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (normKey(a) === normKey(b)) continue;
      const { score } = findBestMatch([{ name: b }], a);
      if (score >= 0.6) pairs.push({ a, b, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

module.exports = { normalizeName, findBestMatch, normKey, findDuplicatePairs };
