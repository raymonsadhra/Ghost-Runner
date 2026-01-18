import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_GHOSTS_KEY = 'ghost_runner_ghosts';
const LOCAL_GHOSTS_LIMIT = 5;
const LOCAL_DELETED_GHOSTS_KEY = 'ghost_runner_deleted_ghosts';

export async function loadLocalGhosts() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_GHOSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function loadDeletedGhostIds() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DELETED_GHOSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function markGhostDeleted(ids = []) {
  const filteredIds = ids.filter(Boolean);
  if (filteredIds.length === 0) return;
  const existing = await loadDeletedGhostIds();
  const next = new Set([...existing, ...filteredIds]);
  await AsyncStorage.setItem(
    LOCAL_DELETED_GHOSTS_KEY,
    JSON.stringify(Array.from(next))
  );
}

export async function saveLocalGhost(ghostData) {
  const existing = await loadLocalGhosts();
  const localGhost = {
    id: `local-ghost-${Date.now()}`,
    ...ghostData,
    localOnly: true,
  };
  const next = [localGhost, ...existing].slice(0, LOCAL_GHOSTS_LIMIT);
  await AsyncStorage.setItem(LOCAL_GHOSTS_KEY, JSON.stringify(next));
  return localGhost;
}

export async function deleteLocalGhost(id) {
  if (!id) return false;
  const existing = await loadLocalGhosts();
  const next = existing.filter((ghost) => ghost.id !== id);
  if (next.length !== existing.length) {
    await AsyncStorage.setItem(LOCAL_GHOSTS_KEY, JSON.stringify(next));
    return true;
  }
  return false;
}

export function mergeGhosts(remoteGhosts = [], localGhosts = []) {
  const remoteLocalIds = new Set(
    remoteGhosts.map((ghost) => ghost.localId).filter(Boolean)
  );
  const filteredLocal = localGhosts.filter(
    (ghost) => !remoteLocalIds.has(ghost.id)
  );
  return [...remoteGhosts, ...filteredLocal].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}
