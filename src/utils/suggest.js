// Next-set suggestion: double progression steered by reps-in-reserve.
//
// Within a session, the previous set decides: easy (hit target with RIR 2+)
// → add weight; hit target near failure → hold; well short at failure → drop.
// For the first working set, last session decides: every set hit the target
// → add weight; otherwise hold and aim to beat last time's reps.
// When one weight step is a big jump (>10%, e.g. light dumbbells), add reps
// before adding weight.

const round = (w, step) => Math.round(w / step) * step;

export function suggestNextSet({ targetReps, targetSets, step, plannedWeight, todaySets = [], lastSets = [] }) {
  if (!targetReps || targetReps <= 0) return null;
  const bigJump = (w) => w > 0 && step / w > 0.1;
  const repCap = targetReps + 4;

  const prev = todaySets[todaySets.length - 1];
  if (prev && prev.weight > 0) {
    const rir = prev.rir;
    const n = todaySets.length;
    if (prev.reps >= targetReps && rir != null && rir >= 2) {
      if (bigJump(prev.weight)) {
        return { weight: prev.weight, reps: Math.min(prev.reps + 1, repCap), reason: `Set ${n} felt easy — add a rep (the next weight is a big jump)` };
      }
      return { weight: round(prev.weight + step, step), reps: targetReps, reason: `Set ${n} hit ${prev.reps} with ${rir}+ in reserve — go up` };
    }
    if (prev.reps < targetReps - 2 && rir === 0 && prev.weight - step > 0) {
      return { weight: round(prev.weight - step, step), reps: targetReps, reason: `Set ${n} fell short at failure — drop a step` };
    }
    return { weight: prev.weight, reps: targetReps, reason: `Set ${n} hit ${prev.reps}${rir != null ? ` at RIR ${rir}` : ''} — hold the weight` };
  }

  const last = lastSets.filter((s) => s.weight > 0);
  if (last.length > 0) {
    const top = Math.max(...last.map((s) => s.weight));
    const atTop = last.filter((s) => s.weight === top);
    const allHit = atTop.length >= (targetSets || 1) && atTop.every((s) => s.reps >= targetReps);
    if (allHit) {
      if (bigJump(top)) {
        return { weight: top, reps: Math.min(targetReps + 1, repCap), reason: `Last time you hit ${targetReps} on every set — add a rep first` };
      }
      return { weight: round(top + step, step), reps: targetReps, reason: `Last time you hit ${targetReps} on every set — go up` };
    }
    const firstReps = atTop[0].reps;
    const lastStr = atTop.map((s) => s.reps).join(' / ');
    if (firstReps >= targetReps) {
      return { weight: top, reps: targetReps, reason: `Get ${targetReps} on every set to move up (last time ${lastStr})` };
    }
    return { weight: top, reps: Math.min(firstReps + 1, targetReps), reason: `Beat last time's ${lastStr} at ${top}` };
  }

  if (plannedWeight > 0) return { weight: plannedWeight, reps: targetReps, reason: 'From your plan' };
  return null;
}
