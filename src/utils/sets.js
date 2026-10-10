// Logged sets can include warm-up sets (isWarmup: true). They're kept in the
// record but never count toward volume, PRs, targets or "last time".
export function workingSets(setLogs) {
  return (setLogs || []).filter((s) => !s.isWarmup);
}
