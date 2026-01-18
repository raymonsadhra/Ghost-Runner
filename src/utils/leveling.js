export function getLevelFromXp(xp = 0) {
  const normalized = Math.max(0, xp);
  return Math.floor(Math.sqrt(normalized / 100)) + 1;
}

export function getXpForLevel(level = 1) {
  const safeLevel = Math.max(1, level);
  return (safeLevel - 1) ** 2 * 100;
}

export function getProgressToNextLevel(xp = 0) {
  const level = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
