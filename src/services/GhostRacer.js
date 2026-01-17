import {
  calculateDistanceAtTime,
  calculateTotalDistance,
  findPositionAtTime,
} from '../utils/geoUtils';

export class GhostRacer {
  constructor(ghostRoute = []) {
    this.ghostRoute = ghostRoute;
  }

  getGhostPosition(elapsedMs) {
    return findPositionAtTime(this.ghostRoute, elapsedMs);
  }

  getGhostDistance(elapsedMs) {
    return calculateDistanceAtTime(this.ghostRoute, elapsedMs);
  }

  calculateDelta(currentRoute, elapsedMs) {
    const currentDistance = calculateTotalDistance(currentRoute);
    const ghostDistance = this.getGhostDistance(elapsedMs);
    return currentDistance - ghostDistance;
  }
}
