import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { calculateTotalDistance, haversineDistance } from '../utils/geoUtils';
import { getUserRuns } from './firebaseService';
import { getBossCharacter } from '../config/bossCharacters';
import {
  loadLocalGhosts,
  loadDeletedGhostIds,
  markGhostDeleted,
  deleteLocalGhost,
  mergeGhosts,
  saveLocalGhost,
} from './localGhostStore';
import { loadRunCount } from './localRunStore';

const BOSS_RUN_COUNT = 5;
const DEFAULT_PHASES = [
  { threshold: 0.5, multiplier: 1.08 },
  { threshold: 0.75, multiplier: 1.15 },
];

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

function getRunDistance(run) {
  if (typeof run.distance === 'number') return run.distance;
  if (Array.isArray(run.points)) return calculateTotalDistance(run.points);
  return 0;
}

function getRunDuration(run) {
  return typeof run.duration === 'number' ? run.duration : 0;
}

function computeAveragePace(runs = []) {
  const totals = runs.reduce(
    (acc, run) => {
      const distance = getRunDistance(run);
      const duration = getRunDuration(run);
      if (distance > 0 && duration > 0) {
        acc.distance += distance;
        acc.duration += duration;
      }
      return acc;
    },
    { distance: 0, duration: 0 }
  );

  if (totals.distance <= 0 || totals.duration <= 0) return null;
  return totals.duration / totals.distance;
}

export function buildBossRoute(templatePoints = [], paceSecondsPerMeter) {
  if (!paceSecondsPerMeter || templatePoints.length < 2) return [];
  let elapsedMs = 0;
  const route = [
    {
      ...templatePoints[0],
      timestamp: 0,
    },
  ];

  for (let i = 1; i < templatePoints.length; i += 1) {
    const prev = templatePoints[i - 1];
    const next = templatePoints[i];
    const segmentDistance = haversineDistance(prev, next);
    const segmentMs = segmentDistance * paceSecondsPerMeter * 1000;
    elapsedMs += segmentMs;
    route.push({
      ...next,
      timestamp: Math.round(elapsedMs),
    });
  }

  return route;
}

async function saveBossGhost(ghostData, { timeoutMs = 2500 } = {}) {
  const localGhost = await saveLocalGhost(ghostData);

  if (!hasFirebaseConfig()) {
    return { id: localGhost.id, source: 'local' };
  }

  const remotePromise = addDoc(collection(db, 'ghosts'), {
    ...ghostData,
    userId: ghostData.userId ?? getUserId(),
    localId: localGhost.id,
  }).catch(() => null);

  try {
    const docRef = await withTimeout(remotePromise, timeoutMs);
    if (docRef?.id) {
      return { id: docRef.id, source: 'remote', localId: localGhost.id };
    }
  } catch (error) {
    // Ignore and keep the local ghost.
  }

  return { id: localGhost.id, source: 'local' };
}

export async function getBossGhosts(userId = getUserId(), { max = 3 } = {}) {
  const localGhosts = await loadLocalGhosts();
  const deletedIds = new Set(await loadDeletedGhostIds());
  const filterDeleted = (ghosts = []) =>
    ghosts.filter((ghost) => {
      if (!ghost) return false;
      if (deletedIds.has(ghost.id)) return false;
      if (ghost.localId && deletedIds.has(ghost.localId)) return false;
      return true;
    });
  const localBossGhosts = filterDeleted(
    localGhosts.filter((ghost) => ghost.type === 'boss')
  );

  if (!hasFirebaseConfig()) {
    return localBossGhosts.slice(0, max);
  }

  try {
    const ghostsQuery = query(
      collection(db, 'ghosts'),
      where('userId', '==', userId),
      where('type', '==', 'boss'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snapshot = await getDocs(ghostsQuery);
    const remoteGhosts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return filterDeleted(mergeGhosts(remoteGhosts, localBossGhosts)).slice(0, max);
  } catch (error) {
    return localBossGhosts.slice(0, max);
  }
}

export async function deleteBossGhost(
  ghostId,
  { localId, localOnly, timeoutMs = 2500 } = {}
) {
  const deleteTargets = [ghostId, localId].filter(Boolean);
  try {
    await markGhostDeleted(deleteTargets);
  } catch (error) {
    // Keep going; local storage may be unavailable.
  }

  const localTargets = new Set([ghostId, localId].filter(Boolean));
  try {
    await Promise.all(
      Array.from(localTargets).map((id) => deleteLocalGhost(id))
    );
  } catch (error) {
    // Keep going; remote may still succeed.
  }

  if (localOnly || !hasFirebaseConfig() || ghostId?.startsWith('local-ghost-')) {
    return { deleted: true, source: 'local' };
  }

  try {
    await withTimeout(deleteDoc(doc(db, 'ghosts', ghostId)), timeoutMs);
    return { deleted: true, source: 'remote' };
  } catch (error) {
    return { deleted: true, source: 'local' };
  }
}

export async function createBossGhostIfEligible({ userId = getUserId() } = {}) {
  const runCount = await loadRunCount();
  if (runCount < BOSS_RUN_COUNT || runCount % BOSS_RUN_COUNT !== 0) {
    return null;
  }

  const bossIndex = Math.floor(runCount / BOSS_RUN_COUNT);
  const existingBosses = await getBossGhosts(userId, { max: 1 });
  const latestBoss = existingBosses[0];
  if ((latestBoss?.bossIndex ?? 0) >= bossIndex) {
    return null;
  }

  const runs = await getUserRuns(userId, { max: BOSS_RUN_COUNT });
  if (runs.length < BOSS_RUN_COUNT) return null;

  const recentRuns = runs.slice(0, BOSS_RUN_COUNT);
  const paceSecondsPerMeter = computeAveragePace(recentRuns);
  if (!paceSecondsPerMeter) return null;

  const templatePoints = recentRuns[0].points ?? [];
  if (templatePoints.length < 2) return null;

  const bossRoute = buildBossRoute(templatePoints, paceSecondsPerMeter);
  if (bossRoute.length < 2) return null;

  const distance = calculateTotalDistance(templatePoints);
  const duration = Math.round(distance * paceSecondsPerMeter);
  const basedOnRunIds = recentRuns.map((run) => run.id);

  const character = getBossCharacter(bossIndex);

  const bossGhost = {
    type: 'boss',
    name: character?.name ?? 'Milestone Boss',
    route: bossRoute,
    distance,
    duration,
    createdAt: Date.now(),
    userId,
    basedOnRunIds,
    phases: DEFAULT_PHASES,
    bossIndex,
    character,
  };

  return saveBossGhost(bossGhost);
}
