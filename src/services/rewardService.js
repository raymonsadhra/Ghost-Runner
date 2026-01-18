import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayUnion, doc, increment, setDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';

const LOCAL_REWARDS_KEY = 'ghost_runner_rewards';

function getUserId() {
  return auth?.currentUser?.uid ?? 'anon';
}

function hasFirebaseConfig() {
  const options = db?.app?.options ?? {};
  return Boolean(options.apiKey && options.projectId);
}

function normalizeRewards(raw) {
  return {
    xp: typeof raw?.xp === 'number' ? raw.xp : 0,
    badges: Array.isArray(raw?.badges) ? raw.badges : [],
    unlocks: Array.isArray(raw?.unlocks) ? raw.unlocks : [],
    bossWins: Array.isArray(raw?.bossWins) ? raw.bossWins : [],
    runXpRuns: Array.isArray(raw?.runXpRuns) ? raw.runXpRuns : [],
  };
}

export async function loadRewards() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_REWARDS_KEY);
    if (!raw) return normalizeRewards({});
    return normalizeRewards(JSON.parse(raw));
  } catch (error) {
    return normalizeRewards({});
  }
}

async function saveRewards(next) {
  const payload = normalizeRewards(next);
  await AsyncStorage.setItem(LOCAL_REWARDS_KEY, JSON.stringify(payload));
  return payload;
}

function unique(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter(Boolean)));
}

export async function awardRunXp({
  runId,
  localId,
  userId = getUserId(),
  xp = 50,
} = {}) {
  const existing = normalizeRewards(await loadRewards());
  const runKeys = unique([runId, localId].filter(Boolean));
  const runXpRuns = Array.isArray(existing?.runXpRuns) ? existing.runXpRuns : [];
  const hasAwarded = runKeys.length > 0 && runXpRuns && Array.isArray(runXpRuns) && runKeys.some((key) => runXpRuns.includes(key));
  if (hasAwarded) {
    return { ...existing, awarded: false };
  }

  const next = {
    ...existing,
    xp: (existing.xp || 0) + xp,
    runXpRuns: unique([...runXpRuns, ...runKeys]),
  };

  const saved = await saveRewards(next);

  if (hasFirebaseConfig()) {
    try {
      await setDoc(
        doc(db, 'users', userId),
        {
          xp: increment(xp),
        },
        { merge: true }
      );
    } catch (error) {
      // Keep local rewards if remote fails.
    }
  }

  return {
    ...saved,
    awarded: true,
    xpAwarded: xp,
  };
}

export async function awardBossRewards({
  bossId,
  userId = getUserId(),
  xp = 200,
  badgeId = 'boss_slayer',
  unlocks = ['boss_theme'],
} = {}) {
  const existing = normalizeRewards(await loadRewards());
  const bossWins = Array.isArray(existing?.bossWins) ? existing.bossWins : [];
  const existingBadges = Array.isArray(existing?.badges) ? existing.badges : [];
  const existingUnlocks = Array.isArray(existing?.unlocks) ? existing.unlocks : [];
  if (bossId && bossWins && Array.isArray(bossWins) && bossWins.includes(bossId)) {
    return { ...existing, awarded: false };
  }

  const next = {
    xp: (existing.xp || 0) + xp,
    badges: unique([...existingBadges, badgeId]),
    unlocks: unique([...existingUnlocks, ...unlocks]),
    bossWins: unique([...bossWins, bossId]),
  };

  const saved = await saveRewards(next);

  if (hasFirebaseConfig()) {
    try {
      const updates = {
        xp: increment(xp),
        badges: arrayUnion(badgeId),
      };
      if (bossId) {
        updates.bossWins = arrayUnion(bossId);
      }
      if (unlocks.length) {
        updates.unlocks = arrayUnion(...unlocks);
      }
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
    } catch (error) {
      // Keep local rewards if remote fails.
    }
  }

  return {
    ...saved,
    awarded: true,
    xpAwarded: xp,
    badgeAwarded: badgeId,
    unlocksAwarded: unlocks,
  };
}
