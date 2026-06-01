const BASE = import.meta.env.VITE_API_URL || '';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Splits
export const getSplits = () => req('GET', '/api/splits');
export const createSplit = (name) => req('POST', '/api/splits', { name });
export const renameSplit = (id, name) => req('PUT', `/api/splits/${id}`, { name });
export const deleteSplit = (id) => req('DELETE', `/api/splits/${id}`);
export const activateSplit = (id) => req('PATCH', `/api/splits/${id}/activate`);

// Days
export const getDays = (splitId) => req('GET', `/api/splits/${splitId}/days`);
export const createDay = (splitId, data) => req('POST', `/api/splits/${splitId}/days`, data);
export const updateDay = (splitId, dayId, data) => req('PUT', `/api/splits/${splitId}/days/${dayId}`, data);
export const deleteDay = (splitId, dayId) => req('DELETE', `/api/splits/${splitId}/days/${dayId}`);

// Exercises
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

// Logs
export const saveLog = (data) => req('POST', '/api/logs', data);
export const getLogs = () => req('GET', '/api/logs');
export const getWeekLogs = () => req('GET', '/api/logs/week');
export const getLogByDate = (date) => req('GET', `/api/logs/${date}`);
export const deleteLog = (id) => req('DELETE', `/api/logs/${id}`);
export const clearLogs = () => req('DELETE', '/api/logs/clear');
