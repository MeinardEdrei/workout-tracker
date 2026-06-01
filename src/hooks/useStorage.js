import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as apiStorage from '../api/index.js';
import * as guestStorage from '../storage/localStorageApi.js';

/**
 * Returns { storage, storageKey }.
 *
 * storage — object of async functions matching src/api/index.js exports.
 *   Routes to MongoDB via API when logged in, localStorage when guest.
 *
 * storageKey — unique string per identity ('guest' or userId).
 *   Include in React Query keys so guest and logged-in caches stay separate:
 *   useQuery({ queryKey: ['splits', storageKey], queryFn: storage.getSplits })
 */
export function useStorage() {
  const { isLoggedIn, user } = useAuth();

  const storage = useMemo(
    () => (isLoggedIn ? apiStorage : guestStorage),
    [isLoggedIn]
  );

  const storageKey = isLoggedIn ? (user?._id || 'auth') : 'guest';

  return { storage, storageKey };
}
