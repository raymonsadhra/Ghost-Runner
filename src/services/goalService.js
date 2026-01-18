import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_WEEKLY_GOAL_KEY = 'ghost_runner_weekly_goal_miles';
export const DEFAULT_WEEKLY_GOAL_MILES = 6; // ~10 km in miles

function sanitizeGoal(goalMiles) {
  const numeric = Number(goalMiles);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_WEEKLY_GOAL_MILES;
  }
  const rounded = Math.round(numeric);
  return rounded > 0 ? rounded : DEFAULT_WEEKLY_GOAL_MILES;
}

export async function loadWeeklyGoal() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_WEEKLY_GOAL_KEY);
    if (!raw) return DEFAULT_WEEKLY_GOAL_MILES;
    return sanitizeGoal(raw);
  } catch (error) {
    return DEFAULT_WEEKLY_GOAL_MILES;
  }
}

export async function saveWeeklyGoal(goalMiles) {
  const next = sanitizeGoal(goalMiles);
  await AsyncStorage.setItem(LOCAL_WEEKLY_GOAL_KEY, String(next));
  return next;
}
