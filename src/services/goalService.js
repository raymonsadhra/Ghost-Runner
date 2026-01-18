import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_WEEKLY_GOAL_KEY = 'ghost_runner_weekly_goal_km';
export const DEFAULT_WEEKLY_GOAL_KM = 10;

function sanitizeGoal(goalKm) {
  const numeric = Number(goalKm);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_WEEKLY_GOAL_KM;
  }
  const rounded = Math.round(numeric);
  return rounded > 0 ? rounded : DEFAULT_WEEKLY_GOAL_KM;
}

export async function loadWeeklyGoal() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_WEEKLY_GOAL_KEY);
    if (!raw) return DEFAULT_WEEKLY_GOAL_KM;
    return sanitizeGoal(raw);
  } catch (error) {
    return DEFAULT_WEEKLY_GOAL_KM;
  }
}

export async function saveWeeklyGoal(goalKm) {
  const next = sanitizeGoal(goalKm);
  await AsyncStorage.setItem(LOCAL_WEEKLY_GOAL_KEY, String(next));
  return next;
}
