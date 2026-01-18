import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { calculateTotalDistance } from '../utils/geoUtils';
import { saveRun } from '../services/firebaseService';
import { theme } from '../theme';

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function getInitialRegion(points) {
  if (!points.length) return DEFAULT_REGION;
  const last = points[points.length - 1];
  return {
    latitude: last.latitude,
    longitude: last.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

export default function RunScreen({ navigation }) {
  const trackerRef = useRef(new LocationTracker());
  const startTimeRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handlePoint = useCallback((point, allPoints) => {
    setPoints([...allPoints]);
  }, []);

  useEffect(() => {
    trackerRef.current.setOnPoint(handlePoint);
  }, [handlePoint]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setDuration(elapsedSeconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    setDistance(calculateTotalDistance(points));
  }, [points]);

  const startRun = async () => {
    try {
      trackerRef.current.reset();
      setPoints([]);
      setDistance(0);
      setDuration(0);
      startTimeRef.current = Date.now();
      await trackerRef.current.start();
      setIsRunning(true);
    } catch (error) {
      setIsRunning(false);
    }
  };

  const stopRun = async () => {
    trackerRef.current.stop();
    setIsRunning(false);
    setIsSaving(true);

    const route = trackerRef.current.getRoute();
    const routeDistance = calculateTotalDistance(route);
    const payload = {
      points: route,
      distance: routeDistance,
      duration,
      timestamp: Date.now(),
    };

    try {
      await saveRun(payload);
    } catch (error) {
      // Swallow for now; summary will still render locally.
    } finally {
      setIsSaving(false);
    }

    navigation.navigate('Summary', {
      routePoints: route,
      distance: routeDistance,
      duration,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        initialRegion={getInitialRegion(points)}
      >
        <Polyline
          coordinates={points}
          strokeColor={theme.colors.secondary}
          strokeWidth={4}
        />
      </MapView>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={styles.statUnit}>km</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning ? styles.stopButton : styles.startButton]}
        onPress={isRunning ? stopRun : startRun}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isSaving ? 'SAVING...' : isRunning ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  map: {
    flex: 1,
  },
  stats: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 20, 27, 0.95)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 280,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.slate,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.mist,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statUnit: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.slate,
    marginHorizontal: theme.spacing.md,
  },
  button: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    paddingHorizontal: 80,
    paddingVertical: 20,
    borderRadius: 999,
    ...theme.shadows.lg,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
  },
  stopButton: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
