import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  loadLocalRuns,
  saveLocalRun,
  mergeRuns,
  updateLocalRun,
  deleteLocalRun,
  loadDeletedRunIds,
  markRunDeleted,
} from './localRunStore';

function getUserId() {
  return auth?.currentUser?.uid ?? 'anon';
}

function hasFirebaseConfig() {
  const options = db?.app?.options ?? {};
  return Boolean(options.apiKey && options.projectId);
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function saveRun(runData, { timeoutMs = 2500 } = {}) {
  const localRun = await saveLocalRun(runData);

  if (!hasFirebaseConfig()) {
    return { id: localRun.id, source: 'local' };
  }

  const remotePromise = addDoc(collection(db, 'runs'), {
    ...runData,
    userId: runData.userId ?? getUserId(),
    localId: localRun.id,
  }).catch(() => null);

  try {
    const docRef = await withTimeout(remotePromise, timeoutMs);
    if (docRef?.id) {
      return { id: docRef.id, source: 'remote', localId: localRun.id };
    }
  } catch (error) {
    // Ignore and keep the local run.
  }

  return { id: localRun.id, source: 'local' };
}

export async function getUserRuns(userId = getUserId(), { max = 20 } = {}) {
  const localRuns = await loadLocalRuns();
  const deletedIds = new Set(await loadDeletedRunIds());

  const filterDeleted = (runs = []) =>
    runs.filter((run) => {
      if (!run) return false;
      if (deletedIds.has(run.id)) return false;
      if (run.localId && deletedIds.has(run.localId)) return false;
      return true;
    });

  if (!hasFirebaseConfig()) {
    return filterDeleted(localRuns).slice(0, max);
  }

  try {
    const runsQuery = query(
      collection(db, 'runs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(max)
    );
    const snapshot = await getDocs(runsQuery);
    const remoteRuns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return filterDeleted(mergeRuns(remoteRuns, localRuns)).slice(0, max);
  } catch (error) {
    return filterDeleted(localRuns).slice(0, max);
  }
}

export async function updateRunName(
  runId,
  name,
  { localId, localOnly, timeoutMs = 2500 } = {}
) {
  const trimmedName = name?.trim();
  if (!trimmedName) return { updated: false, source: 'local' };

  const localTargets = new Set([runId, localId].filter(Boolean));
  try {
    await Promise.all(
      Array.from(localTargets).map((id) =>
        updateLocalRun(id, { name: trimmedName })
      )
    );
  } catch (error) {
    // Keep going; remote may still succeed.
  }

  if (localOnly || !hasFirebaseConfig() || runId?.startsWith('local-')) {
    return { updated: true, source: 'local' };
  }

  try {
    await withTimeout(
      updateDoc(doc(db, 'runs', runId), { name: trimmedName }),
      timeoutMs
    );
    return { updated: true, source: 'remote' };
  } catch (error) {
    return { updated: true, source: 'local' };
  }
}

export async function deleteRun(
  runId,
  { localId, localOnly, timeoutMs = 2500 } = {}
) {
  const deleteTargets = [runId, localId].filter(Boolean);
  try {
    await markRunDeleted(deleteTargets);
  } catch (error) {
    // Keep going; local storage may be unavailable.
  }

  const localTargets = new Set([runId, localId].filter(Boolean));
  try {
    await Promise.all(
      Array.from(localTargets).map((id) => deleteLocalRun(id))
    );
  } catch (error) {
    // Keep going; remote may still succeed.
  }

  if (localOnly || !hasFirebaseConfig() || runId?.startsWith('local-')) {
    return { deleted: true, source: 'local' };
  }

  try {
    await withTimeout(deleteDoc(doc(db, 'runs', runId)), timeoutMs);
    return { deleted: true, source: 'remote' };
  } catch (error) {
    return { deleted: true, source: 'local' };
  }
}
