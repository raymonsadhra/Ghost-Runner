import { haversineDistance } from '../utils/geoUtils';

export const POWER_UPS = [
  {
    id: 'adrenaline_rush',
    label: 'Adrenaline Rush',
    effect: 'slow',
    durationMs: 30000,
    multiplier: 0.8,
    color: '#2F6BFF',
  },
  {
    id: 'time_warp',
    label: 'Time Warp',
    effect: 'freeze',
    durationMs: 10000,
    multiplier: 0,
    color: '#3BA4FF',
  },
];

export function generatePowerUps(routePoints = [], count = 3) {
  if (routePoints.length < 2) return [];
  const step = Math.max(1, Math.floor(routePoints.length / (count + 1)));
  const spawns = [];

  for (let i = 1; i <= count; i += 1) {
    const index = Math.min(routePoints.length - 1, i * step);
    const type = POWER_UPS[(i - 1) % POWER_UPS.length];
    spawns.push({
      id: `${type.id}-${index}-${i}`,
      type: type.id,
      label: type.label,
      effect: type.effect,
      durationMs: type.durationMs,
      multiplier: type.multiplier,
      color: type.color,
      coordinate: {
        latitude: routePoints[index].latitude,
        longitude: routePoints[index].longitude,
      },
      collected: false,
    });
  }

  return spawns;
}

export function pickPowerUpInRange(
  currentPoint,
  powerUps = [],
  radiusMeters = 18
) {
  if (!currentPoint) return null;
  return powerUps.find((powerUp) => {
    if (powerUp.collected) return false;
    const distance = haversineDistance(currentPoint, powerUp.coordinate);
    return distance <= radiusMeters;
  });
}
