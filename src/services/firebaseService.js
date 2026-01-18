import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

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

async function ensureUserExists(userId) {
  const userRef = doc(db, 'Users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create user document if it doesn't exist
    await setDoc(userRef, {
      userId,
      createdAt: serverTimestamp(),
      totalRuns: 0,
      totalDistance: 0,
      lastRunAt: null,
    });
    console.log(`Created new user: ${userId}`);
  }
  return userRef;
}

export async function saveRun(runData, { timeoutMs = 2500 } = {}) {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Cannot save run.');
  }

  const userId = runData.userId ?? getUserId();
  
  // Ensure user document exists
  await ensureUserExists(userId);
  
  // Calculate additional fields
  const distanceKm = (runData.distance ?? 0) / 1000;
  const durationMin = (runData.duration ?? 0) / 60;
  const pace = distanceKm > 0 ? durationMin / distanceKm : 0; // minutes per km
  
  // Prepare run document with all fields
  const runDocument = {
    userId,
    points: runData.points || [],
    distance: runData.distance || 0, // in meters
    distanceKm: distanceKm, // in kilometers
    duration: runData.duration || 0, // in seconds
    durationMin: durationMin, // in minutes
    pace: pace, // minutes per kilometer
    timestamp: runData.timestamp || Date.now(),
    createdAt: serverTimestamp(),
    ghostMeta: runData.ghostMeta || null,
    isGhostRun: !!runData.ghostMeta,
    name: runData.name || null, // run name
  };

  try {
    // Add run to user's Runs subcollection
    const runsCollectionRef = collection(db, 'Users', userId, 'Runs');
    const savePromise = addDoc(runsCollectionRef, runDocument);
    const docRef = await withTimeout(savePromise, timeoutMs);
    
    // Update user stats
    const userRef = doc(db, 'Users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentData = userSnap.data();
      await setDoc(userRef, {
        ...currentData,
        totalRuns: (currentData.totalRuns || 0) + 1,
        totalDistance: (currentData.totalDistance || 0) + runDocument.distance,
        lastRunAt: serverTimestamp(),
      }, { merge: true });
    }
    
    return { id: docRef.id, source: 'remote' };
  } catch (error) {
    console.error('Save error:', error.code, error.message);
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Firestore permission denied. Update your security rules in Firebase Console to allow read/write access to the Users collection and Runs subcollection.');
    }
    throw error;
  }
}

export async function getUser(userId = getUserId()) {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Cannot fetch user.');
  }

  try {
    const userRef = doc(db, 'Users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getUserRuns(userId = getUserId(), { max = 20 } = {}) {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Cannot fetch runs.');
  }

  try {
    // Fetch runs from user's Runs subcollection
    const runsCollectionRef = collection(db, 'Users', userId, 'Runs');
    const runsQuery = query(
      runsCollectionRef,
      orderBy('timestamp', 'desc'),
      limit(max)
    );
    
    const snapshot = await getDocs(runsQuery);
    const runs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(`Fetched ${runs.length} runs for userId: ${userId}`);
    return runs;
  } catch (error) {
    console.error('Error fetching runs:', error);
    // Check for permission errors
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Firestore permission denied. Update security rules in Firebase Console → Firestore → Rules. See FIRESTORE_RULES.md for help.');
    }
    // If it's an index error, try without orderBy as fallback
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn('Index missing, trying without orderBy...');
      try {
        const runsCollectionRef = collection(db, 'Users', userId, 'Runs');
        const fallbackQuery = query(
          runsCollectionRef,
          limit(max)
        );
        const snapshot = await getDocs(fallbackQuery);
        const runs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort manually
        runs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
        console.log(`Fetched ${runs.length} runs (fallback query)`);
        return runs;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function updateRunName(runId, name, { localId = null, localOnly = false } = {}) {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Cannot update run name.');
  }

  const userId = getUserId();
  const trimmedName = name?.trim() || null;

  // If it's a local-only run, we can't update it in Firebase
  if (localOnly && !runId) {
    console.log('Run is local-only, skipping Firebase update');
    return { success: true, localOnly: true };
  }

  try {
    // Update in Firebase if we have a runId
    if (runId) {
      const runRef = doc(db, 'Users', userId, 'Runs', runId);
      await updateDoc(runRef, {
        name: trimmedName,
        updatedAt: serverTimestamp(),
      });
      console.log(`Updated run name in Firebase: ${runId}`);
    }

    // Note: If you have local storage, you might want to update it here too
    // For now, we're only updating Firebase since local storage was removed

    return { success: true, id: runId };
  } catch (error) {
    console.error('Error updating run name:', error);
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      throw new Error('Firestore permission denied. Cannot update run name.');
    }
    throw error;
  }
}

export async function testFirebaseConnection() {
  const dummyRun = {
    points: [
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7750, longitude: -122.4195 },
      { latitude: 37.7751, longitude: -122.4196 },
    ],
    distance: 150.5,
    duration: 120,
    timestamp: Date.now(),
  };

  try {
    console.log('Testing Firebase connection...');
    console.log('Dummy run data:', dummyRun);
    const result = await saveRun(dummyRun);
    console.log('✅ Firebase test successful! Run saved with ID:', result.id);
    console.log('Result:', result);
    
    // Also try to fetch user's runs to verify
    try {
      const userRuns = await getUserRuns();
      console.log(`User has ${userRuns.length} total runs`);
      userRuns.forEach((run) => {
        console.log(`Run ID: ${run.id}, distance: ${run.distanceKm}km, duration: ${run.durationMin}min`);
      });
    } catch (fetchError) {
      console.warn('Could not fetch user runs:', fetchError);
    }
    
    return { success: true, id: result.id };
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    console.error('Error details:', error.message, error.code);
    return { success: false, error: error.message };
  }
}
