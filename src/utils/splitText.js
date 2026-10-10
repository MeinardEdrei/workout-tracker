// Plain-text renderings of a split for the clipboard — the plan alone, or the
// plan plus the logged sessions that were performed under it.

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

function formatLogDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatPerformance(ex) {
  const unit = ex.weightUnit || 'kg';
  if (ex.setLogs?.length) {
    const sets = ex.setLogs.map((s) => {
      const w = s.weight || ex.weight || 0;
      let str = w > 0 ? `${s.reps || 0}×${w}${unit}` : `${s.reps || 0} reps`;
      if (s.rir != null && s.rir !== '') str += ` RIR ${s.rir}`;
      if (s.isDropSet) str += ' (drop)';
      return str;
    });
    return sets.join(', ');
  }
  if (ex.duration > 0) return `${ex.sets || 1} × ${ex.duration}${ex.durationUnit || 'sec'}`;
  const reps = ex.untilFailure || !ex.reps ? 'failure' : ex.reps;
  const w = ex.weight > 0 ? ` @ ${ex.weight}${unit}` : '';
  return `${ex.sets || 0}×${reps}${w}`;
}

function formatSession(log) {
  const header = [formatLogDate(log.date)];
  if (log.skipped) {
    header.push('Skipped day');
    return `  ${header.join(' · ')}\n`;
  }
  const dur = formatDuration(log.durationSeconds);
  if (dur) header.push(dur);
  let text = `  ${header.join(' · ')}\n`;
  (log.exercises || []).forEach((ex) => {
    const label = ex.swappedFrom ? `${ex.swappedFrom} → swapped to ${ex.name}` : ex.name;
    text += `   - ${label}: ${ex.skipped ? 'skipped' : formatPerformance(ex)}\n`;
  });
  return text;
}

// `weeks` = null means all history.
export function formatSplitWithHistory(split, logs, { weeks = 4 } = {}) {
  let cutoff = '';
  if (weeks) {
    const d = new Date();
    d.setDate(d.getDate() - weeks * 7);
    cutoff = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const splitLogs = (logs || [])
    .filter((l) => l.splitName === split.name && (!cutoff || l.date >= cutoff))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const rangeLabel = weeks ? `last ${weeks} weeks` : 'all time';
  const sessionCount = splitLogs.filter((l) => !l.skipped).length;
  let text = `🏋️ ${split.name}\nHistory: ${rangeLabel} · ${sessionCount} session${sessionCount === 1 ? '' : 's'} logged\n\n`;

  const days = sortDays(split);
  const knownDayNames = new Set(days.map((d) => d.name));
  days.forEach((day, idx) => {
    text += formatDayHeader(day, idx) + formatPlanExercises(day);
    if (!day.isRest) {
      const dayLogs = splitLogs.filter((l) => l.dayName === day.name);
      text += dayLogs.length ? `  History:\n${dayLogs.map(formatSession).join('')}` : `  History: none in range\n`;
    }
    text += '\n';
  });

  // Sessions logged under a day that has since been renamed or removed.
  const orphans = splitLogs.filter((l) => !knownDayNames.has(l.dayName));
  if (orphans.length) {
    text += `OTHER SESSIONS (day renamed or removed)\n`;
    orphans.forEach((l) => {
      text += `  [${l.dayName || 'Unknown day'}]\n${formatSession(l)}`;
    });
  }
  return text.trim();
}
