import { useEffect } from 'react';

// Keeps the screen on while `active` (e.g. a workout is in progress), so the
// phone doesn't lock between sets. The browser drops the lock whenever the
// page is hidden, so it's re-requested on return. Silently does nothing
// where the Screen Wake Lock API isn't available.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch { /* denied (e.g. battery saver) — nothing to do */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock && !lock.released) lock.release().catch(() => {});
    };
  }, [active]);
}
