import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

const DEFAULT_PROFILE = {
  name: 'Runner',
  base: 'street',
  outfit: {
    head: 'cap_basic',
    top: 'tee_basic',
    bottom: 'shorts_basic',
    shoes: 'shoes_basic',
    accessory: 'band_basic',
  },
};

function getUserId() {
  return auth?.currentUser?.uid;
}

export async function loadProfile(userId = null) {
  const uid = userId || getUserId();
  if (!uid) {
    return { ...DEFAULT_PROFILE };
  }

  try {
    const userRef = doc(db, 'Users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        ...DEFAULT_PROFILE,
        name: userData.name || userData.displayName || DEFAULT_PROFILE.name,
        base: userData.base || DEFAULT_PROFILE.base,
        outfit: {
          ...DEFAULT_PROFILE.outfit,
          ...(userData.outfit ?? {}),
        },
      };
    }
    
    // If user document doesn't exist, return default
    return { ...DEFAULT_PROFILE };
  } catch (error) {
    console.error('Error loading profile:', error);
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile, userId = null) {
  const uid = userId || getUserId();
  if (!uid) {
    throw new Error('User not authenticated');
  }

  try {
    const userRef = doc(db, 'Users', uid);
    const userSnap = await getDoc(userRef);
    
    const payload = {
      ...DEFAULT_PROFILE,
      ...profile,
      outfit: {
        ...DEFAULT_PROFILE.outfit,
        ...(profile?.outfit ?? {}),
      },
    };

    // Merge with existing user data
    const existingData = userSnap.exists() ? userSnap.data() : {};
    
    await setDoc(userRef, {
      ...existingData,
      name: payload.name,
      displayName: payload.name,
      base: payload.base,
      outfit: payload.outfit,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return payload;
  } catch (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
}

export async function updateProfile(patch, userId = null) {
  const current = await loadProfile(userId);
  return saveProfile({
    ...current,
    ...patch,
  }, userId);
}
