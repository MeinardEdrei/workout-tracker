// Planned set styles on an exercise: drop-set chains and supersets.

// A drop chain needs at least two steps to be worth running as one.
export function dropChainOf(ex) {
  if (!ex || ex.setStyle !== 'dropset' || ex.duration > 0) return null;
  const chain = (ex.dropChain || []).filter((d) => d && d.reps > 0);
  return chain.length >= 2 ? chain : null;
}

// Members of ex's superset on this day, in day order (A1, A2, …).
// Returns [] when ex isn't in a superset or its partner is gone.
export function supersetMembers(ex, dayExercises = []) {
  if (!ex?.supersetGroup) return [];
  const members = dayExercises.filter((e) => e.supersetGroup === ex.supersetGroup);
  return members.length >= 2 ? members : [];
}

export function supersetTag(ex, dayExercises = []) {
  const members = supersetMembers(ex, dayExercises);
  const i = members.findIndex((e) => e._id === ex._id);
  return i >= 0 ? `${ex.supersetGroup}${i + 1}` : '';
}
