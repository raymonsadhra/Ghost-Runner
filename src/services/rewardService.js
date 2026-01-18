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
  return Array.from(new Set(list.filter(Boolean)));
}

export async function awardRunXp({
  runId,
  localId,
  userId = getUserId(),
  xp = 50,
} = {}) {
  const existing = await loadRewards();
  const runKeys = unique([runId, localId]);
  const hasAwarded = runKeys.some((key) => existing.runXpRuns.includes(key));
  if (hasAwarded) {
    return { ...existing, awarded: false };
  }

  const next = {
    ...existing,
    xp: existing.xp + xp,
    runXpRuns: unique([...existing.runXpRuns, ...runKeys]),
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
  const existing = await loadRewards();
  if (bossId && existing.bossWins.includes(bossId)) {
    return { ...existing, awarded: false };
  }

  const next = {
    xp: existing.xp + xp,
    badges: unique([...existing.badges, badgeId]),
    unlocks: unique([...existing.unlocks, ...unlocks]),
    bossWins: unique([...existing.bossWins, bossId]),
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
