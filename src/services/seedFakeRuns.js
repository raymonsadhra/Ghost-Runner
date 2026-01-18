import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { saveRun } from './firebaseService';
import { generateFakeRun } from './fakeRunGenerator';

const LEADERBOARD_USER_IDS = ['1', '2', '3', '4', '5'];
const LEADERBOARD_NAMES = ['Runner 1', 'Runner 2', 'Runner 3', 'Runner 4', 'Runner 5'];

/**
 * Seed fake runs into Firebase.
 *
 * @param {Object} options
 * @param {string[]} [options.userIds] - User IDs to seed. Defaults to ['anon'].
 * @param {number} [options.runsPerUser=10] - Number of runs per user.
 * @param {boolean} [options.withLeaderboardUsers=false] - If true, also seed users '1'–'5' with displayName for leaderboard.
 * @returns {Promise<{ saved: number, failed: number, errors: string[] }>}
 */
export async function seedFakeRuns(options = {}) {
  const {
    userIds = ['anon'],
    runsPerUser = 10,
    withLeaderboardUsers = false,
  } = options;

  const toSeed = withLeaderboardUsers
    ? ['anon', ...LEADERBOARD_USER_IDS]
    : userIds;

  let saved = 0;
  let failed = 0;
  const errors = [];

  for (const userId of toSeed) {
    for (let i = 0; i < runsPerUser; i++) {
      const run = generateFakeRun({ daysAgoMax: 60, nameChance: 0.35 });
      try {
        await saveRun({ ...run, userId }, { timeoutMs: 5000 });
        saved++;
      } catch (e) {
        failed++;
        const msg = e?.message || String(e);
        if (!errors.includes(msg)) errors.push(msg);
      }
    }

    // Set displayName for leaderboard users (for UserRunHistory / leaderboard)
    const idx = LEADERBOARD_USER_IDS.indexOf(userId);
    if (idx >= 0) {
      try {
        await setDoc(
          doc(db, 'Users', userId),
          { displayName: LEADERBOARD_NAMES[idx] },
          { merge: true }
        );
      } catch (e) {
        // Non-fatal; rules may block or field may be unsupported
      }
    }
  }

  return { saved, failed, errors };
}
