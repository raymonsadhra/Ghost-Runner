import { arrayUnion, doc, increment, setDoc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';

function getUserId() {
  return auth?.currentUser?.uid;
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

export async function loadRewards(userId = null) {
  const uid = userId || getUserId();
  if (!uid) {
    return normalizeRewards({});
  }

  try {
    if (hasFirebaseConfig()) {
      const userRef = doc(db, 'Users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return normalizeRewards({
          xp: userData.xp,
          badges: userData.badges,
          unlocks: userData.unlocks,
          bossWins: userData.bossWins,
          runXpRuns: userData.runXpRuns,
        });
      }
    }
    return normalizeRewards({});
  } catch (error) {
    console.error('Error loading rewards:', error);
    return normalizeRewards({});
  }
}

async function saveRewards(next, userId = null) {
  const uid = userId || getUserId();
  if (!uid) {
    return normalizeRewards(next);
  }

  const payload = normalizeRewards(next);
  
  if (hasFirebaseConfig()) {
    try {
      const userRef = doc(db, 'Users', uid);
      await setDoc(userRef, {
        xp: payload.xp,
        badges: payload.badges,
        unlocks: payload.unlocks,
        bossWins: payload.bossWins,
        runXpRuns: payload.runXpRuns,
      }, { merge: true });
    } catch (error) {
      console.error('Error saving rewards:', error);
    }
  }
  
  return payload;
}

function unique(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter(Boolean)));
}

export async function awardRunXp({
  runId,
  localId,
  userId = null,
  xp = 50,
} = {}) {
  const uid = userId || getUserId();
  if (!uid) {
    return normalizeRewards({});
  }

  const existing = normalizeRewards(await loadRewards(uid));
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

  const saved = await saveRewards(next, uid);

  if (hasFirebaseConfig()) {
    try {
      await setDoc(
        doc(db, 'Users', uid),
        {
          xp: increment(xp),
          runXpRuns: arrayUnion(...runKeys),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving run XP to Firestore:', error);
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
  userId = null,
  xp = 200,
  badgeId = 'boss_slayer',
  unlocks = ['boss_theme'],
} = {}) {
  const uid = userId || getUserId();
  if (!uid) {
    return normalizeRewards({});
  }

  const existing = normalizeRewards(await loadRewards(uid));
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

  const saved = await saveRewards(next, uid);

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
      await setDoc(doc(db, 'Users', uid), updates, { merge: true });
    } catch (error) {
      console.error('Error saving boss rewards to Firestore:', error);
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
