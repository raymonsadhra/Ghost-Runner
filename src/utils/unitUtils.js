/**
 * Distance and pace formatting with support for km and miles.
 * All storage is in meters and min/km; these helpers convert for display.
 */

const M_TO_KM = 1 / 1000;
const KM_TO_MI = 0.621371;
const M_TO_MI = M_TO_KM * KM_TO_MI;
const MIN_PER_KM_TO_MIN_PER_MI = 1 / KM_TO_MI; // 1.609344

/**
 * @param {number} meters
 * @param {'km'|'mi'} unit
 * @returns {string} e.g. "5.23 km" or "3.25 mi"
 */
export function formatDistance(meters, unit = 'km') {
  if (meters == null || Number.isNaN(meters)) return '0.00';
  const m = Number(meters);
  if (unit === 'mi') {
    const mi = m * M_TO_MI;
    return `${mi.toFixed(2)} mi`;
  }
  const km = m * M_TO_KM;
  return `${km.toFixed(2)} km`;
}

/**
 * @param {number} meters
 * @param {'km'|'mi'} unit
 * @returns {{ value: number, unit: string }} for custom layout, e.g. { value: 5.23, unit: 'km' }
 */
export function formatDistanceParts(meters, unit = 'km') {
  if (meters == null || Number.isNaN(meters)) return { value: 0, unit: unit === 'mi' ? 'mi' : 'km' };
  const m = Number(meters);
  if (unit === 'mi') {
    return { value: parseFloat((m * M_TO_MI).toFixed(2)), unit: 'mi' };
  }
  return { value: parseFloat((m * M_TO_KM).toFixed(2)), unit: 'km' };
}

/**
 * Pace: input is min per km (e.g. 5.5). Output is min/km or min/mi.
 * @param {number} minPerKm
 * @param {'km'|'mi'} unit
 * @returns {string} e.g. "5:30 /km" or "8:51 /mi"
 */
export function formatPace(minPerKm, unit = 'km') {
  if (minPerKm == null || Number.isNaN(minPerKm) || minPerKm <= 0) return '—';
  const m = Number(minPerKm);
  const minPerUnit = unit === 'mi' ? m * MIN_PER_KM_TO_MIN_PER_MI : m;
  const whole = Math.floor(minPerUnit);
  const frac = minPerUnit - whole;
  const sec = Math.round(frac * 60);
  const suf = unit === 'mi' ? '/mi' : '/km';
  if (sec >= 60) return `${whole + 1}:00 ${suf}`;
  return `${whole}:${sec.toString().padStart(2, '0')} ${suf}`;
}

/**
 * @param {number} minPerKm
 * @param {'km'|'mi'} unit
 * @returns {string} numeric only, e.g. "5.50" or "8.85" (for "X.XX /km" or "X.XX /mi" when you render the unit separately)
 */
export function formatPaceValue(minPerKm, unit = 'km') {
  if (minPerKm == null || Number.isNaN(minPerKm) || minPerKm <= 0) return '0.00';
  const m = Number(minPerKm);
  const v = unit === 'mi' ? m * MIN_PER_KM_TO_MIN_PER_MI : m;
  return v.toFixed(2);
}

/** @param {number} meters */
export function metersToKm(meters) {
  return (meters ?? 0) * M_TO_KM;
}

/** @param {number} meters */
export function metersToMiles(meters) {
  return (meters ?? 0) * M_TO_MI;
}

/** @param {number} km */
export function kmToMiles(km) {
  return (km ?? 0) * KM_TO_MI;
}

/**
 * Start of week (00:00:00) for a given timestamp.
 * @param {number} timestamp - ms
 * @param {'monday'|'sunday'} weekStartsOn
 * @returns {number} ms
 */
export function getWeekStart(timestamp, weekStartsOn = 'monday') {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  if (weekStartsOn === 'sunday') {
    d.setDate(d.getDate() - d.getDay());
  } else {
    const daysBack = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - daysBack);
  }
  return d.getTime();
}
