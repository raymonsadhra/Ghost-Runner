import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { loadLocalRuns, saveLocalRun, mergeRuns } from './localRunStore';

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

  if (!hasFirebaseConfig()) {
    return localRuns.slice(0, max);
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
    return mergeRuns(remoteRuns, localRuns).slice(0, max);
  } catch (error) {
    return localRuns.slice(0, max);
  }
}
