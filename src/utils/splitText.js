// Plain-text renderings of a split for the clipboard.

function sortDays(split) {
  return [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
}

function formatDayHeader(day, idx) {
  return `DAY ${idx + 1}: ${day.name.toUpperCase()}${day.tag ? ` (${day.tag})` : ''}\n`;
}

function formatPlanExercises(day) {
  if (day.isRest) return `• Rest Day\n`;
  const exercises = day.exercises || [];
  if (exercises.length === 0) return `• No exercises\n`;
  let text = '';
  exercises.forEach((ex) => {
    const rStr = ex.duration > 0 ? `${ex.duration}${ex.durationUnit || 'sec'}` : (ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Failure' : `${ex.reps} reps`;
    const wStr = ex.weight > 0 ? ` @ ${ex.weight} ${ex.weightUnit || 'kg'}` : '';
    const catPrefix = ex.category === 'warmup' ? '[Warm-up] ' : ex.category === 'cooldown' ? '[Cool-down] ' : '';
    const muscleStr = ex.muscleTargets && ex.muscleTargets.length > 0 ? ` (${ex.muscleTargets.join(', ')})` : '';
    text += `• ${catPrefix}${ex.name} — ${ex.sets} sets × ${rStr}${wStr}${muscleStr}\n`;
    if (ex.notes) text += `  Note: ${ex.notes}\n`;
  });
  return text;
}

export function formatSplitAsText(split) {
  let text = `🏋️ ${split.name}\n\n`;
  sortDays(split).forEach((day, idx) => {
    text += formatDayHeader(day, idx) + formatPlanExercises(day) + '\n';
  });
  return text.trim();
}
