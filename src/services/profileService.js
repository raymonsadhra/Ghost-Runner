import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_PROFILE_KEY = 'ghost_runner_profile';

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

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      const initial = { ...DEFAULT_PROFILE, createdAt: Date.now() };
      await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    const payload = {
      ...DEFAULT_PROFILE,
      ...parsed,
      createdAt: parsed?.createdAt ?? Date.now(),
      outfit: {
        ...DEFAULT_PROFILE.outfit,
        ...(parsed?.outfit ?? {}),
      },
    };
    if (!parsed?.createdAt) {
      await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(payload));
    }
    return payload;
  } catch (error) {
    return { ...DEFAULT_PROFILE, createdAt: Date.now() };
  }
}

export async function saveProfile(profile) {
  const payload = {
    ...DEFAULT_PROFILE,
    ...profile,
    outfit: {
      ...DEFAULT_PROFILE.outfit,
      ...(profile?.outfit ?? {}),
    },
  };
  await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(payload));
  return payload;
}

export async function updateProfile(patch) {
  const current = await loadProfile();
  return saveProfile({
    ...current,
    ...patch,
  });
}
