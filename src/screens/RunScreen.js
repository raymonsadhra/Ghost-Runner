import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { calculateTotalDistance } from '../utils/geoUtils';
import { saveRun } from '../services/firebaseService';
import { createBossGhostIfEligible } from '../services/bossGhostService';
import { awardRunXp } from '../services/rewardService';
import { useSettings } from '../contexts/SettingsContext';
import { theme } from '../theme';

const PRIMARY_BLUE = '#2F6BFF';
const CARD_BG = '#121A2A';
const CARD_BORDER = '#1E2A3C';
const MUTED_TEXT = '#8FA4BF';
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0B0F17' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8FA4BF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0F17' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B2239' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#101826' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1B2A40' }] },
];

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
  const { formatDistance, formatPace } = useSettings();
  const trackerRef = useRef(new LocationTracker());
  const startTimeRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const paceMinPerKm = distance > 0 ? (duration / 60) / (distance / 1000) : 0;

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
    const runName = `Run on ${new Date().toLocaleDateString()}`;
    const payload = {
      points: route,
      distance: routeDistance,
      duration,
      timestamp: Date.now(),
      name: runName,
    };

    try {
      const saveResult = await saveRun(payload);
      awardRunXp({
        runId: saveResult?.id,
        localId: saveResult?.localId,
      }).catch(() => null);
      createBossGhostIfEligible().catch(() => null);
      navigation.navigate('Summary', {
        routePoints: route,
        distance: routeDistance,
        duration,
        runId: saveResult?.id ?? null,
        runLocalId: saveResult?.localId ?? null,
        runLocalOnly: saveResult?.source === 'local',
        runName,
      });
      return;
    } catch (error) {
      // Swallow for now; summary will still render locally.
    } finally {
      setIsSaving(false);
    }

    navigation.navigate('Summary', {
      routePoints: route,
      distance: routeDistance,
      duration,
      runName,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        initialRegion={getInitialRegion(points)}
        customMapStyle={MAP_STYLE}
      >
        <Polyline
          coordinates={points}
          strokeColor="rgba(47, 107, 255, 0.25)"
          strokeWidth={8}
          lineCap="round"
        />
        <Polyline
          coordinates={points}
          strokeColor={PRIMARY_BLUE}
          strokeWidth={4}
          lineCap="round"
        />
      </MapView>

      <View style={styles.stats}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(distance)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>
            {Math.floor(duration / 60)}:
            {(duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>{formatPace(paceMinPerKm)}</Text>
        </View>
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
    backgroundColor: CARD_BG,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    minWidth: 260,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.mist,
    fontSize: 16,
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
    backgroundColor: PRIMARY_BLUE,
  },
  stopButton: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
