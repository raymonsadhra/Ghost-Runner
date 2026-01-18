/**
 * Generates fake run data for seeding Firebase.
 * Pure functions, no Firebase dependency.
 */

const BASE_LAT = 37.7749;
const BASE_LNG = -122.4194;
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = 88800; // ~111320 * cos(37.77°)

const RUN_NAMES = [
  'Morning Loop',
  'Evening Jog',
  'Park Run',
  'Weekend Long',
  'Tempo Tuesday',
  'Recovery Run',
  'Trail Run',
  'Sunset 5K',
  null,
  null,
];

/**
 * Generate a polyline of { latitude, longitude } points for a run.
 * Simulates an out-and-back route.
 */
export function generateFakePoints(distanceMeters) {
  const stepM = 8;
  const numPoints = Math.max(10, Math.floor(distanceMeters / stepM));
  const half = Math.floor(numPoints / 2);
  const points = [];
  let lat = BASE_LAT;
  let lng = BASE_LNG;
  // Direction: slight northeast
  const dLat = (0.00008 * (0.5 + Math.random())) / 2;
  const dLng = (0.0001 * (0.5 + Math.random())) / 2;

  for (let i = 0; i < numPoints; i++) {
    points.push({ latitude: lat, longitude: lng });
    if (i < half) {
      lat += dLat;
      lng += dLng;
    } else {
      lat -= dLat;
      lng -= dLng;
    }
  }
  return points;
}

/**
 * Generate one fake run object: { points, distance, duration, timestamp, name? }
 * Ready to pass to saveRun (with optional userId).
 */
export function generateFakeRun(options = {}) {
  const { daysAgoMax = 30, nameChance = 0.3 } = options;
  // Distance: 0.8 km to 12 km
  const distanceMeters = 800 + Math.random() * 11200;
  // Pace: 5:00–7:30 min/km
  const paceMinPerKm = 5 + Math.random() * 2.5;
  const distanceKm = distanceMeters / 1000;
  const duration = Math.round(distanceKm * paceMinPerKm * 60); // seconds

  const now = Date.now();
  const maxAgo = daysAgoMax * 24 * 60 * 60 * 1000;
  const timestamp = now - Math.floor(Math.random() * maxAgo);

  const points = generateFakePoints(distanceMeters);
  const name = Math.random() < nameChance
    ? (RUN_NAMES[Math.floor(Math.random() * RUN_NAMES.length)] || null)
    : null;

  return {
    points,
    distance: Math.round(distanceMeters),
    duration,
    timestamp,
    name: name || undefined,
  };
}

/**
 * Generate multiple fake runs with varied timestamps.
 */
export function generateFakeRuns(count, options = {}) {
  const runs = [];
  for (let i = 0; i < count; i++) {
    runs.push(generateFakeRun(options));
  }
  return runs;
}
