export function capitalizeWords(str) {
  return str.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const then = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(then.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - then) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatLastUsed(entry) {
  if (!entry) return '';
  const parts = [];
  if (entry.duration) {
    parts.push(`${entry.duration}${entry.durationUnit || 'sec'}`);
  } else if (entry.weight) {
    parts.push(`${entry.weight}${entry.weightUnit || 'kg'} × ${entry.untilFailure ? 'failure' : entry.reps}`);
  } else if (entry.reps) {
    parts.push(`${entry.sets || 3}×${entry.untilFailure ? 'failure' : entry.reps}`);
  }
  const rel = formatRelativeDate(entry.date);
  if (rel) parts.push(rel);
  return parts.join(' · ');
}
