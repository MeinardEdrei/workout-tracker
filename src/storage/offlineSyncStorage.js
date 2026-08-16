import * as apiStorage from '../api/index.js';
import * as guestStorage from './localStorageApi.js';

// Helper to determine the current logged-in user ID for namespace caching
function getUserId() {
  try {
    const userStr = localStorage.getItem('wt_current_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user._id || 'auth';
    }
  } catch (e) {
    // Ignore error
  }
  return 'auth';
}

// Queue functions
function getQueue() {
  const userId = getUserId();
  const queueKey = `wt_queue_${userId}`;
  try {
    return JSON.parse(localStorage.getItem(queueKey) || '[]');
  } catch (e) {
    return [];
  }
}

function saveQueue(queue) {
  const userId = getUserId();
  const queueKey = `wt_queue_${userId}`;
  localStorage.setItem(queueKey, JSON.stringify(queue));
}

function isQueueEmpty() {
  return getQueue().length === 0;
}

function addToQueue(item) {
  const queue = getQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  });
  saveQueue(queue);
}

// Update local cache from server
export async function updateLocalCacheFromSever() {
  const userId = getUserId();
  try {
    const splits = await apiStorage.getSplits();
    localStorage.setItem(`wt_offline_${userId}_splits`, JSON.stringify(splits));
  } catch (e) {
    console.warn("Failed to update offline splits cache", e);
  }
  try {
    const logs = await apiStorage.getLogs();
    localStorage.setItem(`wt_offline_${userId}_logs`, JSON.stringify(logs));
  } catch (e) {
    console.warn("Failed to update offline logs cache", e);
  }
}

// Sync execution status tracking
let isSyncing = false;

export async function syncOfflineQueue(onStatusChange) {
  if (isSyncing) return;
  const queue = getQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  if (onStatusChange) onStatusChange({ status: 'syncing', count: queue.length });

  const idMap = {};

  function mapArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return idMap[arg] || arg;
      }
      if (Array.isArray(arg)) {
        return mapArgs(arg);
      }
      if (arg && typeof arg === 'object') {
        const mappedObj = {};
        for (const key in arg) {
          mappedObj[key] = idMap[arg[key]] || arg[key];
        }
        return mappedObj;
      }
      return arg;
    });
  }

  let successCount = 0;
  try {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const mappedArgs = mapArgs(item.args);
      const res = await apiStorage[item.action](...mappedArgs);

      // Map client-generated IDs to server-generated IDs
      if (item.tempId && res && res._id) {
        idMap[item.tempId] = res._id;
        
        // Handle nested creations mapping (like in duplicateSplit or importSplit)
        if ((item.action === 'duplicateSplit' || item.action === 'importSplit') && res.days && item.localResult) {
          item.localResult.days.forEach((localDay, dayIdx) => {
            const serverDay = res.days[dayIdx];
            if (serverDay) {
              idMap[localDay._id] = serverDay._id;
              (localDay.exercises || []).forEach((localEx, exIdx) => {
                const serverEx = serverDay.exercises[exIdx];
                if (serverEx) {
                  idMap[localEx._id] = serverEx._id;
                }
              });
            }
          });
        }
      }
      successCount++;
    }

    // All replayed successfully
    localStorage.removeItem(`wt_queue_${getUserId()}`);
    await updateLocalCacheFromSever();
    
    if (onStatusChange) onStatusChange({ status: 'success' });
  } catch (err) {
    console.error("Error replaying offline mutation at index", successCount, err);
    // Remove successful items, keep failed item and subsequent ones in queue
    const remainingQueue = queue.slice(successCount);
    saveQueue(remainingQueue);
    
    if (onStatusChange) onStatusChange({ status: 'error', error: err });
  } finally {
    isSyncing = false;
  }
}

// ─── Intercepted API Wrapper Implementation ───────────────────────────────────

// Auth
export async function getMe() {
  if (navigator.onLine) {
    try {
      const user = await apiStorage.getMe();
      localStorage.setItem('wt_current_user', JSON.stringify(user));
      return user;
    } catch (e) {
      // Fallback to cache below
    }
  }
  const cachedUser = localStorage.getItem('wt_current_user');
  if (cachedUser) return JSON.parse(cachedUser);
  throw new Error('Offline and no user profile cached');
}

export async function logoutApi() {
  localStorage.removeItem('wt_current_user');
  const userId = getUserId();
  localStorage.removeItem(`wt_queue_${userId}`);
  localStorage.removeItem(`wt_offline_${userId}_splits`);
  localStorage.removeItem(`wt_offline_${userId}_logs`);
  if (navigator.onLine) {
    return apiStorage.logoutApi();
  }
  return { success: true };
}

// Admin (always network only, fails gracefully offline)
export const getAdminUsers = () => apiStorage.getAdminUsers();
export const deleteAdminUser = (id) => apiStorage.deleteAdminUser(id);
export const getAllowedEmails = () => apiStorage.getAllowedEmails();
export const addAllowedEmail = (data) => apiStorage.addAllowedEmail(data);
export const deleteAllowedEmail = (id) => apiStorage.deleteAllowedEmail(id);
export const generateInvite = () => apiStorage.generateInvite();
export const getInvites = () => apiStorage.getInvites();
export const deleteInvite = (id) => apiStorage.deleteInvite(id);
export const validateInviteToken = (token) => apiStorage.validateInviteToken(token);
export const claimInviteToken = (token, email) => apiStorage.claimInviteToken(token, email);

// Splits
export async function getSplits() {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    try {
      const data = await apiStorage.getSplits();
      localStorage.setItem(`wt_offline_${userId}_splits`, JSON.stringify(data));
      return data;
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getSplits();
}

export async function createSplit(name) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.createSplit(name);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.createSplit(name);
  addToQueue({ action: 'createSplit', args: [name], tempId: localRes._id });
  return localRes;
}

export async function renameSplit(id, name) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.renameSplit(id, name);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.renameSplit(id, name);
  addToQueue({ action: 'renameSplit', args: [id, name] });
  return localRes;
}

export async function deleteSplit(id) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.deleteSplit(id);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.deleteSplit(id);
  addToQueue({ action: 'deleteSplit', args: [id] });
  return localRes;
}

export async function activateSplit(id) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.activateSplit(id);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.activateSplit(id);
  addToQueue({ action: 'activateSplit', args: [id] });
  return localRes;
}

export async function setSplitVisibility(id, isPublic) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.setSplitVisibility(id, isPublic);
    await updateLocalCacheFromSever();
    return res;
  }
  // Local storage mock
  addToQueue({ action: 'setSplitVisibility', args: [id, isPublic] });
  return { _id: id, isPublic };
}

export const getPublicSplits = (page = 1) => apiStorage.getPublicSplits(page);
export const copyPublicSplit = (id) => apiStorage.copyPublicSplit(id);

export async function reapplySplit(id) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.reapplySplit(id);
    await updateLocalCacheFromSever();
    return res;
  }
  // Local storage mock
  addToQueue({ action: 'reapplySplit', args: [id] });
  return { _id: id };
}

export const getRanking = (filter = 'weekly') => apiStorage.getRanking(filter);

export async function getSplitVersions(id) {
  const userId = getUserId();
  if (navigator.onLine) {
    try {
      return await apiStorage.getSplitVersions(id);
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getSplitVersions(id);
}

export async function revertSplitVersion(id, versionId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.revertSplitVersion(id, versionId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.revertSplitVersion(id, versionId);
  addToQueue({ action: 'revertSplitVersion', args: [id, versionId] });
  return localRes;
}

export async function duplicateSplit(id) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.duplicateSplit(id);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.duplicateSplit(id);
  addToQueue({ action: 'duplicateSplit', args: [id], tempId: localRes._id, localResult: localRes });
  return localRes;
}

export async function importSplit(data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.importSplit(data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.importSplit(data);
  addToQueue({ action: 'importSplit', args: [data], tempId: localRes._id, localResult: localRes });
  return localRes;
}

export async function getSyncMatches(name, excludeSplitId) {
  const userId = getUserId();
  if (navigator.onLine) {
    try {
      return await apiStorage.getSyncMatches(name, excludeSplitId);
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getSyncMatches(name, excludeSplitId);
}

export async function applySync(fields, targets) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.applySync(fields, targets);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.applySync(fields, targets);
  addToQueue({ action: 'applySync', args: [fields, targets] });
  return localRes;
}

// Days
export async function getDays(splitId) {
  const userId = getUserId();
  if (navigator.onLine) {
    try {
      return await apiStorage.getDays(splitId);
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getDays(splitId);
}

export async function createDay(splitId, data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.createDay(splitId, data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.createDay(splitId, data);
  addToQueue({ action: 'createDay', args: [splitId, data], tempId: localRes._id });
  return localRes;
}

export async function updateDay(splitId, dayId, data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.updateDay(splitId, dayId, data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.updateDay(splitId, dayId, data);
  addToQueue({ action: 'updateDay', args: [splitId, dayId, data] });
  return localRes;
}

export async function deleteDay(splitId, dayId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.deleteDay(splitId, dayId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.deleteDay(splitId, dayId);
  addToQueue({ action: 'deleteDay', args: [splitId, dayId] });
  return localRes;
}

export async function swapDays(splitId, dayId, targetDayId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.swapDays(splitId, dayId, targetDayId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.swapDays(splitId, dayId, targetDayId);
  addToQueue({ action: 'swapDays', args: [splitId, dayId, targetDayId] });
  return localRes;
}

// Exercises
export async function getExercises(splitId, dayId) {
  const userId = getUserId();
  if (navigator.onLine) {
    try {
      return await apiStorage.getExercises(splitId, dayId);
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getExercises(splitId, dayId);
}

export async function createExercise(splitId, dayId, data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.createExercise(splitId, dayId, data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.createExercise(splitId, dayId, data);
  addToQueue({ action: 'createExercise', args: [splitId, dayId, data], tempId: localRes._id });
  return localRes;
}

export async function updateExercise(splitId, dayId, exId, data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.updateExercise(splitId, dayId, exId, data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.updateExercise(splitId, dayId, exId, data);
  addToQueue({ action: 'updateExercise', args: [splitId, dayId, exId, data] });
  return localRes;
}

export async function deleteExercise(splitId, dayId, exId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.deleteExercise(splitId, dayId, exId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.deleteExercise(splitId, dayId, exId);
  addToQueue({ action: 'deleteExercise', args: [splitId, dayId, exId] });
  return localRes;
}

export async function toggleExercise(splitId, dayId, exId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.toggleExercise(splitId, dayId, exId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.toggleExercise(splitId, dayId, exId);
  addToQueue({ action: 'toggleExercise', args: [splitId, dayId, exId] });
  return localRes;
}

export async function reorderExercises(splitId, dayId, exercises) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.reorderExercises(splitId, dayId, exercises);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.reorderExercises(splitId, dayId, exercises);
  addToQueue({ action: 'reorderExercises', args: [splitId, dayId, exercises] });
  return localRes;
}

export async function moveExercise(splitId, dayId, exId, targetDayId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.moveExercise(splitId, dayId, exId, targetDayId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.moveExercise(splitId, dayId, exId, targetDayId);
  addToQueue({ action: 'moveExercise', args: [splitId, dayId, exId, targetDayId] });
  return localRes;
}

// Exercise Images (Stub offline)
export const fetchExerciseImage = (exerciseName) => {
  if (navigator.onLine) return apiStorage.fetchExerciseImage(exerciseName);
  return Promise.resolve({ success: false, usePlaceholder: true });
};

export const suggestExercises = (q) => {
  if (navigator.onLine) return apiStorage.suggestExercises(q);
  return Promise.resolve([]);
};

export async function uploadExerciseImage(splitId, dayId, exId, imageData) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.uploadExerciseImage(splitId, dayId, exId, imageData);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.uploadExerciseImage(splitId, dayId, exId, imageData);
  addToQueue({ action: 'uploadExerciseImage', args: [splitId, dayId, exId, imageData] });
  return localRes;
}

export async function clearExerciseImage(splitId, dayId, exId) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.clearExerciseImage(splitId, dayId, exId);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.clearExerciseImage(splitId, dayId, exId);
  addToQueue({ action: 'clearExerciseImage', args: [splitId, dayId, exId] });
  return localRes;
}

// Logs
export async function getLogs() {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    try {
      const data = await apiStorage.getLogs();
      localStorage.setItem(`wt_offline_${userId}_logs`, JSON.stringify(data));
      return data;
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getLogs();
}

export async function getWeekLogs() {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    try {
      const data = await apiStorage.getWeekLogs();
      return data;
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getWeekLogs();
}

export async function getLogByDate(date) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    try {
      return await apiStorage.getLogByDate(date);
    } catch (e) {
      // Fallback
    }
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  return guestStorage.getLogByDate(date);
}

export async function saveLog(data) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.saveLog(data);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.saveLog(data);
  addToQueue({ action: 'saveLog', args: [data], tempId: localRes._id });
  return localRes;
}

export async function deleteLog(id) {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.deleteLog(id);
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.deleteLog(id);
  addToQueue({ action: 'deleteLog', args: [id] });
  return localRes;
}

export async function clearLogs() {
  const userId = getUserId();
  if (navigator.onLine && isQueueEmpty()) {
    const res = await apiStorage.clearLogs();
    await updateLocalCacheFromSever();
    return res;
  }
  guestStorage.setStoragePrefix(`wt_offline_${userId}`);
  const localRes = await guestStorage.clearLogs();
  addToQueue({ action: 'clearLogs', args: [] });
  return localRes;
}
