function normalizeName(str) {
  return str.toLowerCase()
    .replace(/\bdb\b/g, 'dumbbell')
    .replace(/\bbb\b/g, 'barbell')
    .replace(/\brdl\b/g, 'romanian deadlift')
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

module.exports = { normalizeName, findBestMatch };
