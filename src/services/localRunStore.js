import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_RUNS_KEY = 'ghost_runner_runs';
const LOCAL_RUNS_LIMIT = 50;
const LOCAL_DELETED_RUNS_KEY = 'ghost_runner_deleted_runs';
const LOCAL_RUN_COUNT_KEY = 'ghost_runner_run_count';

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
  await incrementRunCount();
  return localRun;
}

export async function loadRunCount() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_RUN_COUNT_KEY);
    if (!raw) {
      const runs = await loadLocalRuns();
      return runs.length;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (error) {
    return 0;
  }
}

export async function incrementRunCount() {
  try {
    const current = await loadRunCount();
    const next = current + 1;
    await AsyncStorage.setItem(LOCAL_RUN_COUNT_KEY, String(next));
    return next;
  } catch (error) {
    return 0;
  }
}

export async function loadDeletedRunIds() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DELETED_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function markRunDeleted(ids = []) {
  const filteredIds = ids.filter(Boolean);
  if (filteredIds.length === 0) return;
  const existing = await loadDeletedRunIds();
  const next = new Set([...existing, ...filteredIds]);
  await AsyncStorage.setItem(
    LOCAL_DELETED_RUNS_KEY,
    JSON.stringify(Array.from(next))
  );
}

export async function updateLocalRun(id, updates) {
  if (!id) return false;
  const existing = await loadLocalRuns();
  let updated = false;
  const next = existing.map((run) => {
    if (run.id !== id) return run;
    updated = true;
    return {
      ...run,
      ...updates,
      id: run.id,
    };
  });
  if (updated) {
    await AsyncStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(next));
  }
  return updated;
}

export async function deleteLocalRun(id) {
  if (!id) return false;
  const existing = await loadLocalRuns();
  const next = existing.filter((run) => run.id !== id);
  if (next.length !== existing.length) {
    await AsyncStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(next));
    return true;
  }
  return false;
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
