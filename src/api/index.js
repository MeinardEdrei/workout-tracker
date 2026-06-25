const BASE = import.meta.env.VITE_API_URL || '';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = localStorage.getItem('wt_token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401) {
      localStorage.removeItem('wt_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const getMe = () => req('GET', '/api/auth/me');
export const logoutApi = () => req('POST', '/api/auth/logout');

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminUsers = () => req('GET', '/api/admin/users');
export const deleteAdminUser = (id) => req('DELETE', `/api/admin/users/${id}`);
export const getAllowedEmails = () => req('GET', '/api/admin/allowed');
export const addAllowedEmail = (data) => req('POST', '/api/admin/allowed', data);
export const deleteAllowedEmail = (id) => req('DELETE', `/api/admin/allowed/${id}`);

// ─── Splits ───────────────────────────────────────────────────────────────────
export const getSplits = () => req('GET', '/api/splits');
export const createSplit = (name) => req('POST', '/api/splits', { name });
export const renameSplit = (id, name) => req('PUT', `/api/splits/${id}`, { name });
export const deleteSplit = (id) => req('DELETE', `/api/splits/${id}`);
export const activateSplit = (id) => req('PATCH', `/api/splits/${id}/activate`);
export const setSplitVisibility = (id, isPublic) => req('PATCH', `/api/splits/${id}/visibility`, { isPublic });
export const getPublicSplits = (page = 1) => req('GET', `/api/splits/public?page=${page}&limit=20`);
export const copyPublicSplit = (id) => req('POST', `/api/splits/public/${id}/copy`);
export const reapplySplit = (id) => req('POST', `/api/splits/${id}/reapply`);

// ─── Days ─────────────────────────────────────────────────────────────────────
export const getDays = (splitId) => req('GET', `/api/splits/${splitId}/days`);
export const createDay = (splitId, data) => req('POST', `/api/splits/${splitId}/days`, data);
export const updateDay = (splitId, dayId, data) => req('PUT', `/api/splits/${splitId}/days/${dayId}`, data);
export const deleteDay = (splitId, dayId) => req('DELETE', `/api/splits/${splitId}/days/${dayId}`);

// ─── Exercises ────────────────────────────────────────────────────────────────
export const getExercises = (splitId, dayId) =>
  req('GET', `/api/splits/${splitId}/days/${dayId}/exercises`);
export const createExercise = (splitId, dayId, data) =>
  req('POST', `/api/splits/${splitId}/days/${dayId}/exercises`, data);
export const updateExercise = (splitId, dayId, exId, data) =>
  req('PUT', `/api/splits/${splitId}/days/${dayId}/exercises/${exId}`, data);
export const deleteExercise = (splitId, dayId, exId) =>
  req('DELETE', `/api/splits/${splitId}/days/${dayId}/exercises/${exId}`);
export const toggleExercise = (splitId, dayId, exId) =>
  req('PATCH', `/api/splits/${splitId}/days/${dayId}/exercises/${exId}/toggle`);
export const reorderExercises = (splitId, dayId, exercises) =>
  req('PATCH', `/api/splits/${splitId}/days/${dayId}/exercises/reorder`, { exercises });

// ─── Exercise Images ──────────────────────────────────────────────────────────
export const fetchExerciseImage = (exerciseName) =>
  req('POST', '/api/exercises/fetch-image', { exerciseName });
export const suggestExercises = (q) =>
  req('GET', `/api/exercises/suggest?q=${encodeURIComponent(q)}`);
export const uploadExerciseImage = (splitId, dayId, exId, imageData) =>
  req('POST', `/api/splits/${splitId}/days/${dayId}/exercises/${exId}/upload-image`, { imageData });
export const clearExerciseImage = (splitId, dayId, exId) =>
  req('PUT', `/api/splits/${splitId}/days/${dayId}/exercises/${exId}`, { imageUrl: '', imageSource: '', placeholderUsed: false });

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const saveLog = (data) => req('POST', '/api/logs', data);
export const getLogs = () => req('GET', '/api/logs');
export const getWeekLogs = () => req('GET', '/api/logs/week');
export const getLogByDate = (date) => req('GET', `/api/logs/${date}`);
export const deleteLog = (id) => req('DELETE', `/api/logs/${id}`);
export const clearLogs = () => req('DELETE', '/api/logs/clear');
