import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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

    // Clean the URL immediately for any recognized param
    if (token || error || (code && state)) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      setAuthError(error);
      setLoading(false);
      return;
    }

    // SW intercepted the OAuth callback and served index.html instead — exchange the
    // code here in the client so sign-in works regardless of which SW version is active
    if (code && state) {
      fetch(`${API}/api/auth/google/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.json())))
        .then((data) => {
          if (data.error) {
            setAuthError(data.error);
            return null;
          }
          localStorage.setItem('wt_token', data.token);
          return fetch(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${data.token}` },
          }).then((r) => (r.ok ? r.json() : null));
        })
        .then((u) => { if (u) setUser(u); })
        .catch(() => setAuthError('oauth_failed'))
        .finally(() => setLoading(false));
      return;
    }

    const storedToken = token || localStorage.getItem('wt_token');
    if (token) localStorage.setItem('wt_token', token);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Validate token by fetching /api/auth/me
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) setUser(u);
        else localStorage.removeItem('wt_token');
      })
      .catch(() => localStorage.removeItem('wt_token'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for 401 events from the API layer
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const isLoggedIn = !!user;
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
