const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // tolerant of a missed heartbeat or two

export function isOnline(lastActiveAt, thresholdMs = ONLINE_THRESHOLD_MS) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < thresholdMs;
}

// Minute-granular relative-time label for presence — distinct from
// textFormat.js's formatRelativeDate, which only has day granularity.
export function formatPresence(lastActiveAt) {
  if (!lastActiveAt) return 'Never active';
  if (isOnline(lastActiveAt)) return 'Online';

  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}
