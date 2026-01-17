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
        <Text style={styles.statText}>{(distance / 1000).toFixed(2)} km</Text>
        <Text style={styles.statText}>
          {Math.floor(duration / 60)}:
          {(duration % 60).toString().padStart(2, '0')}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning ? styles.stopButton : styles.startButton]}
        onPress={isRunning ? stopRun : startRun}
        disabled={isSaving}
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
    backgroundColor: 'rgba(15, 20, 27, 0.8)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 220,
  },
  statText: {
    color: theme.colors.mist,
    fontSize: 20,
    fontWeight: '700',
  },
  button: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 999,
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
    letterSpacing: 1,
  },
});
