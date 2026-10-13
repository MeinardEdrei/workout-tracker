// Looking up an exercise across the split and past logs (shared by Today and the split editor).
import { workingSets } from './sets';

export function findMatchingExercise(name, splitDays, pastExercises) {
  if (!name) return null;
  const targetName = name.trim().toLowerCase();
  if (splitDays) {
    for (const d of splitDays) {
      const found = (d.exercises || []).find(e => e.name && e.name.trim().toLowerCase() === targetName);
      if (found) return found;
    }
  }
  if (pastExercises) {
    const found = pastExercises.find(e => e.name && e.name.trim().toLowerCase() === targetName);
    if (found) return found;
  }
  return null;
}

export function getLastExercisePerformance(name, logs, splitDays) {
  if (!name) return null;
  const targetName = name.trim().toLowerCase();

  // 1. Look in logs (most recent first)
  if (logs && logs.length > 0) {
    const sortedLogs = [...logs].sort((a, b) => (b.date > a.date ? 1 : -1));
    for (const log of sortedLogs) {
      const match = (log.exercises || []).find((e) => (e.name || '').trim().toLowerCase() === targetName);
      if (match) {
        let weight = match.weight || 0;
        let reps = match.reps || 10;
        if (match.setLogs && match.setLogs.length > 0) {
          const setsWithWeight = workingSets(match.setLogs).filter((s) => s.weight > 0);
          if (setsWithWeight.length > 0) {
            weight = setsWithWeight[setsWithWeight.length - 1].weight;
          }
          const setsWithReps = workingSets(match.setLogs).filter((s) => s.reps > 0);
          if (setsWithReps.length > 0) {
            reps = setsWithReps[0].reps;
          }
        }
        return {
          name: match.name,
          weight,
          weightUnit: match.weightUnit || 'kg',
          reps,
          sets: match.sets || 3,
          untilFailure: !!match.untilFailure,
          muscleTargets: match.muscleTargets || [],
          imageUrl: match.imageUrl || '',
          notes: match.notes || '',
        };
      }
    }
  }

  // 2. Look in split template days
  if (splitDays) {
    for (const d of splitDays) {
      const found = (d.exercises || []).find(e => e.name && e.name.trim().toLowerCase() === targetName);
      if (found) {
        return {
          name: found.name,
          weight: found.weight || 0,
          weightUnit: found.weightUnit || 'kg',
          reps: found.reps || 10,
          sets: found.sets || 3,
          untilFailure: !!found.untilFailure,
          muscleTargets: found.muscleTargets || [],
          imageUrl: found.imageUrl || '',
          notes: found.notes || '',
        };
      }
    }
  }

  return null;
}
