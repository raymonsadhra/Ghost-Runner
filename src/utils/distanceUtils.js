/**
 * Convert meters to miles
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in miles
 */
export function metersToMiles(meters) {
  return meters * 0.000621371;
}

/**
 * Convert kilometers to miles
 * @param {number} km - Distance in kilometers
 * @returns {number} Distance in miles
 */
export function kmToMiles(km) {
  return km * 0.621371;
}

/**
 * Convert miles to meters
 * @param {number} miles - Distance in miles
 * @returns {number} Distance in meters
 */
export function milesToMeters(miles) {
  return miles * 1609.34;
}

/**
 * Format distance in meters to miles with 2 decimal places
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string (e.g., "3.25 mi")
 */
export function formatDistanceMiles(meters) {
  const miles = metersToMiles(meters);
  return `${miles.toFixed(2)} mi`;
}

/**
 * Format distance in kilometers to miles with 2 decimal places
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string (e.g., "3.25 mi")
 */
export function formatDistanceKmToMiles(km) {
  const miles = kmToMiles(km);
  return `${miles.toFixed(2)} mi`;
}

/**
 * Calculate pace in minutes per mile
 * @param {number} durationSeconds - Duration in seconds
 * @param {number} distanceMeters - Distance in meters
 * @returns {number} Pace in minutes per mile
 */
export function calculatePacePerMile(durationSeconds, distanceMeters) {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  const miles = metersToMiles(distanceMeters);
  if (miles <= 0) return 0;
  const minutes = durationSeconds / 60;
  return minutes / miles;
}
