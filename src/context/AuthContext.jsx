import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendHeartbeat } from '../api/index';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // 'not_allowed' | 'oauth_failed' | 'server_error'

  const logout = useCallback(() => {
    localStorage.removeItem('wt_token');
    setUser(null);
    queryClient.clear();
    // Notify API layer
    window.dispatchEvent(new Event('auth:logout'));
  }, [queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('auth_error');
    const code = params.get('code');
    const state = params.get('state');

    // Clean the URL for token/error params — safe because these come from our own redirect
    if (token || error) {
      try { window.history.replaceState({}, '', window.location.pathname); } catch {}
    }

    if (error) {
      setAuthError(error);
      setLoading(false);
      return;
    }

    // SW intercepted the OAuth callback and served index.html instead — exchange the
    // code here in the client so sign-in works regardless of which SW version is active.
    // Do NOT call history.replaceState before the fetch — Firefox throws SecurityError
    // after cross-origin redirects, which would halt the effect and leave loading=true.
    if (code && state) {
      fetch(`${API}/api/auth/google/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          localStorage.setItem('wt_token', data.token);
          // Navigate to root: cleans the URL and lets the normal token path handle login
          window.location.replace('/');
        })
        .catch(() => {
          try { window.history.replaceState({}, '', '/'); } catch {}
          setAuthError('oauth_failed');
          setLoading(false);
        });
      return;
    }

    const storedToken = token || localStorage.getItem('wt_token');
    if (token) localStorage.setItem('wt_token', token);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Validate token by fetching /api/auth/me. A single transient failure
    // right after login (cold-start hiccup, brief network blip) shouldn't
    // permanently clear a freshly-issued, otherwise-valid token — retry a
    // couple times with backoff before giving up.
    function validate(attempt = 0) {
      return fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('auth check failed'))))
        .then((u) => setUser(u))
        .catch((err) => {
          if (attempt < 2) {
            return new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))).then(() => validate(attempt + 1));
          }
          localStorage.removeItem('wt_token');
          throw err;
        });
    }
    validate().catch(() => {}).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for 401 events from the API layer
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const isLoggedIn = !!user;

  // Presence heartbeat — pings periodically while the app is actually open and
  // visible, so other users' "Online" status reflects real activity instead of
  // just last login. No websockets (this app is a single serverless function);
  // "online" is derived elsewhere as "lastActiveAt within the last few minutes".
  useEffect(() => {
    if (!isLoggedIn) return;

    const ping = () => { if (document.visibilityState === 'visible') sendHeartbeat().catch(() => {}); };
    ping();

    const interval = setInterval(ping, 90 * 1000);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [isLoggedIn]);
  const isAdmin = isLoggedIn && user.email === import.meta.env.VITE_ADMIN_EMAIL;

  const value = {
    user,
    loading,
    isLoggedIn,
    isGuest: !isLoggedIn,
    isAdmin,
    authError,
    dismissAuthError: () => setAuthError(null),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
