export function haversineDistance(point1, point2) {
  if (!point1 || !point2) return 0;
  const R = 6371e3;
  const phi1 = (point1.latitude * Math.PI) / 180;
  const phi2 = (point2.latitude * Math.PI) / 180;
  const deltaPhi = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLambda = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateTotalDistance(points = []) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

export function calculateDistanceAtTime(points = [], elapsedMs) {
  if (points.length < 2) return 0;
  const baseTime = points[0].timestamp ?? 0;
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const prevTime = (prev.timestamp ?? baseTime) - baseTime;
    const nextTime = (next.timestamp ?? baseTime) - baseTime;
    const segment = haversineDistance(prev, next);

    if (elapsedMs >= nextTime) {
      total += segment;
    } else if (elapsedMs > prevTime && nextTime > prevTime) {
      const ratio = (elapsedMs - prevTime) / (nextTime - prevTime);
      total += segment * ratio;
      return total;
    } else {
      return total;
    }
  }

  return total;
}

export function findPositionAtTime(points = [], elapsedMs) {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];

  const baseTime = points[0].timestamp ?? 0;
  const last = points[points.length - 1];
  const lastTime = (last.timestamp ?? baseTime) - baseTime;

  if (elapsedMs >= lastTime) return last;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const prevTime = (prev.timestamp ?? baseTime) - baseTime;
    const nextTime = (next.timestamp ?? baseTime) - baseTime;

    if (elapsedMs <= nextTime && nextTime > prevTime) {
      const ratio = Math.max(0, (elapsedMs - prevTime) / (nextTime - prevTime));
      return {
        latitude: prev.latitude + (next.latitude - prev.latitude) * ratio,
        longitude: prev.longitude + (next.longitude - prev.longitude) * ratio,
        altitude: prev.altitude ?? null,
        speed: prev.speed ?? null,
        accuracy: prev.accuracy ?? null,
        timestamp: baseTime + elapsedMs,
      };
    }
  }

  return last;
}
