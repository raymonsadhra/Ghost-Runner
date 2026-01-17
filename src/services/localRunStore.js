import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_RUNS_KEY = 'ghost_runner_runs';
const LOCAL_RUNS_LIMIT = 50;

export async function loadLocalRuns() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function saveLocalRun(runData) {
  const existing = await loadLocalRuns();
  const localRun = {
    id: `local-${Date.now()}`,
    ...runData,
    localOnly: true,
  };
  const next = [localRun, ...existing].slice(0, LOCAL_RUNS_LIMIT);
  await AsyncStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(next));
  return localRun;
}

export function mergeRuns(remoteRuns = [], localRuns = []) {
  const remoteLocalIds = new Set(
    remoteRuns.map((run) => run.localId).filter(Boolean)
  );
  const filteredLocal = localRuns.filter(
    (run) => !remoteLocalIds.has(run.id)
  );
  return [...remoteRuns, ...filteredLocal].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
  );
}
