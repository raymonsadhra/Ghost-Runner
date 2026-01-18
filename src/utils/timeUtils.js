/**
 * Format duration in seconds to a compact format like "10m23s", "45s", or "1h20m14s"
 * Truncates to 2 digits for hours, minutes, and seconds
 * @param {number} durationSeconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "45s", "10m23s", "1h20m14s")
 */
export function formatDurationCompact(durationSeconds) {
  if (!durationSeconds || durationSeconds < 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Truncate to 2 digits for each part
  const truncatedHours = hours % 100;
  const truncatedMinutes = minutes % 100;
  const truncatedSeconds = seconds % 100;

  // If less than a minute, show only seconds
  if (truncatedHours === 0 && truncatedMinutes === 0) {
    return `${truncatedSeconds}s`;
  }

  // Build the formatted string
  const parts = [];
  
  // Add hours if > 0
  if (truncatedHours > 0) {
    parts.push(`${truncatedHours}h`);
  }
  
  // Add minutes if > 0 OR if there are hours (to show "1h0m" instead of "1h")
  if (truncatedMinutes > 0 || truncatedHours > 0) {
    parts.push(`${truncatedMinutes.toString().padStart(2, '0')}m`);
  }
  
  // Always add seconds
  parts.push(`${truncatedSeconds.toString().padStart(2, '0')}s`);

  return parts.join('');
}

/**
 * Format duration in seconds to MM:SS format (for backwards compatibility)
 * @param {number} durationSeconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "10:23")
 */
export function formatDurationMMSS(durationSeconds) {
  if (!durationSeconds || durationSeconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Truncate to 2 digits for minutes
  const truncatedMinutes = minutes % 100;

  return `${truncatedMinutes}:${seconds.toString().padStart(2, '0')}`;
}
