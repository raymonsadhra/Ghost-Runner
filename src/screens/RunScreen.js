import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { calculateTotalDistance } from '../utils/geoUtils';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { saveRun } from '../services/firebaseService';
import { createBossGhostIfEligible } from '../services/bossGhostService';
import { awardRunXp } from '../services/rewardService';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const ROUTE_COLOR = theme.colors.neonPink;
const ROUTE_GLOW = 'rgba(255, 45, 122, 0.25)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.1)';
const MUTED_TEXT = theme.colors.textMuted;
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0B0A0E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#C9C4DA' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0A0E' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#14111B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1A21' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#14111C' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F1B2A' }] },
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
  const trackerRef = useRef(new LocationTracker());
  const startTimeRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const pace = calculatePacePerMile(duration, distance);

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
    <OutsiderBackground accent="blue">
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
            strokeColor={ROUTE_GLOW}
            strokeWidth={8}
            lineCap="round"
          />
          <Polyline
            coordinates={points}
            strokeColor={ROUTE_COLOR}
            strokeWidth={4}
            lineCap="round"
          />
        </MapView>

        <View style={styles.stats}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{formatDistanceMiles(distance).replace(' mi', '')}</Text>
            <Text style={styles.statLabel}>mi</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>
              {formatDurationCompact(duration)}
            </Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Pace</Text>
            <Text style={styles.statValue}>
              {pace > 0 ? pace.toFixed(2) : '0.00'} /mi
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.stopButton]}
          onPress={isRunning ? stopRun : startRun}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isRunning ? (
            <View style={styles.stopButtonInner}>
              <Text style={styles.buttonText}>
                {isSaving ? 'SAVING...' : 'STOP'}
              </Text>
            </View>
          ) : (
            <LinearGradient
              colors={[theme.colors.neonPink, theme.colors.neonPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButton}
            >
              <Text style={styles.buttonText}>START</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </OutsiderBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  map: {
    flex: 1,
  },
  stats: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(21, 19, 28, 0.88)',
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
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  startButton: {
    paddingHorizontal: 60,
    paddingVertical: 18,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.danger,
  },
  stopButtonInner: {
    paddingHorizontal: 60,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
