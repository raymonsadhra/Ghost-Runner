import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ghost_runner_settings';

const DEFAULTS = {
  distanceUnit: 'km', // 'km' | 'mi'
  weekStartsOn: 'monday', // 'monday' | 'sunday'
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      distanceUnit: parsed.distanceUnit === 'mi' ? 'mi' : 'km',
      weekStartsOn: parsed.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings) {
  const next = {
    distanceUnit: settings.distanceUnit === 'mi' ? 'mi' : 'km',
    weekStartsOn: settings.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export { DEFAULTS };
