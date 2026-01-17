import * as Location from 'expo-location';

export class LocationTracker {
  constructor({ onPoint, timeInterval = 2000, distanceInterval = 5 } = {}) {
    this.points = [];
    this.subscription = null;
    this.onPoint = onPoint;
    this.timeInterval = timeInterval;
    this.distanceInterval = distanceInterval;
  }

  async start() {
    if (this.subscription) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: this.timeInterval,
        distanceInterval: this.distanceInterval,
      },
      (location) => {
        const point = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? null,
          speed: location.coords.speed ?? null,
          accuracy: location.coords.accuracy ?? null,
          timestamp: location.timestamp ?? Date.now(),
        };

        this.points.push(point);
        if (this.onPoint) {
          this.onPoint(point, this.points);
        }
      }
    );
  }

  stop() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  reset() {
    this.points = [];
  }

  getRoute() {
    return this.points;
  }

  setOnPoint(onPoint) {
    this.onPoint = onPoint;
  }
}
