/**
 * Seed fake runs into Firebase from the command line.
 *
 * Prerequisites:
 *   - .env (or .env.local) with EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
 *     EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
 *     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, EXPO_PUBLIC_FIREBASE_APP_ID
 *   - Firestore rules that allow writes (e.g. Option A or B in FIRESTORE_RULES.md)
 *
 * Run: node scripts/seed-firebase-runs.js
 * Or:  npm run seed:runs
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} = require('firebase/firestore');

const BASE_LAT = 37.7749;
const BASE_LNG = -122.4194;

const LEADERBOARD_IDS = ['anon', '1', '2', '3', '4', '5'];
const LEADERBOARD_NAMES = { 1: 'Runner 1', 2: 'Runner 2', 3: 'Runner 3', 4: 'Runner 4', 5: 'Runner 5' };
const RUN_NAMES = ['Morning Loop', 'Evening Jog', 'Park Run', 'Weekend Long', 'Tempo Tuesday', 'Recovery Run', 'Trail Run', 'Sunset 5K', null, null];

function generateFakePoints(distanceMeters) {
  const stepM = 8;
  const numPoints = Math.max(10, Math.floor(distanceMeters / stepM));
  const half = Math.floor(numPoints / 2);
  const points = [];
  let lat = BASE_LAT;
  let lng = BASE_LNG;
  const dLat = (0.00008 * (0.5 + Math.random())) / 2;
  const dLng = (0.0001 * (0.5 + Math.random())) / 2;
  for (let i = 0; i < numPoints; i++) {
    points.push({ latitude: lat, longitude: lng });
    if (i < half) { lat += dLat; lng += dLng; } else { lat -= dLat; lng -= dLng; }
  }
  return points;
}

function generateFakeRun() {
  const distanceMeters = 800 + Math.random() * 11200;
  const paceMinPerKm = 5 + Math.random() * 2.5;
  const distanceKm = distanceMeters / 1000;
  const duration = Math.round(distanceKm * paceMinPerKm * 60);
  const now = Date.now();
  const maxAgo = 60 * 24 * 60 * 60 * 1000;
  const timestamp = now - Math.floor(Math.random() * maxAgo);
  const points = generateFakePoints(distanceMeters);
  const name = Math.random() < 0.35 ? (RUN_NAMES[Math.floor(Math.random() * RUN_NAMES.length)] || null) : null;
  const distanceKmR = distanceMeters / 1000;
  const durationMin = duration / 60;
  const pace = distanceKmR > 0 ? durationMin / distanceKmR : 0;
  return {
    userId: null, // set per user
    points,
    distance: Math.round(distanceMeters),
    distanceKm: Math.round(distanceKmR * 100) / 100,
    duration,
    durationMin: Math.round(durationMin * 100) / 100,
    pace: Math.round(pace * 100) / 100,
    timestamp,
    ghostMeta: null,
    isGhostRun: false,
    name: name || null,
  };
}

async function ensureUser(db, userId) {
  const ref = doc(db, 'Users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      userId,
      createdAt: serverTimestamp(),
      totalRuns: 0,
      totalDistance: 0,
      lastRunAt: null,
    });
    console.log(`  Created user: ${userId}`);
  }
}

async function main() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error('Missing EXPO_PUBLIC_FIREBASE_API_KEY or EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env');
    process.exit(1);
  }

  const app = initializeApp({
    apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  });
  const db = getFirestore(app);

  const runsPerUser = 10;
  let saved = 0;
  let failed = 0;

  for (const userId of LEADERBOARD_IDS) {
    await ensureUser(db, userId);
    for (let i = 0; i < runsPerUser; i++) {
      const run = generateFakeRun();
      const runDoc = {
        userId,
        points: run.points,
        distance: run.distance,
        distanceKm: run.distanceKm,
        duration: run.duration,
        durationMin: run.durationMin,
        pace: run.pace,
        timestamp: run.timestamp,
        createdAt: serverTimestamp(),
        ghostMeta: run.ghostMeta,
        isGhostRun: run.isGhostRun,
        name: run.name,
      };
      try {
        await addDoc(collection(db, 'Users', userId, 'Runs'), runDoc);
        saved++;
        const userRef = doc(db, 'Users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const d = userSnap.data();
          await setDoc(userRef, {
            ...d,
            totalRuns: (d.totalRuns || 0) + 1,
            totalDistance: (d.totalDistance || 0) + run.distance,
            lastRunAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (e) {
        failed++;
        console.error(`  Failed to add run for ${userId}:`, e.message);
      }
    }
    if (LEADERBOARD_NAMES[userId]) {
      try {
        await setDoc(doc(db, 'Users', userId), { displayName: LEADERBOARD_NAMES[userId] }, { merge: true });
      } catch (_) {}
    }
  }

  console.log(`\nDone. Saved: ${saved}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
