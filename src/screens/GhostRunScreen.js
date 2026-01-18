import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { GhostRacer } from '../services/GhostRacer';
import { AudioManager } from '../services/AudioManager';
import { calculateTotalDistance } from '../utils/geoUtils';
import { saveRun } from '../services/firebaseService';
import { theme } from '../theme';
import { audioSources } from '../config/audioSources';

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const GHOST_HEAD_START_MS = 10000;

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

export default function GhostRunScreen({ navigation, route }) {
  const ghostRoute = route.params?.ghostRoute ?? [];

  const trackerRef = useRef(new LocationTracker());
  const ghostRacerRef = useRef(new GhostRacer(ghostRoute));
  const audioManagerRef = useRef(
    new AudioManager(route.params?.audioSources ?? audioSources)
  );

  const startTimeRef = useRef(0);
  const userPointsRef = useRef([]);

  const [userPoints, setUserPoints] = useState([]);
  const [ghostPosition, setGhostPosition] = useState(null);
  const [delta, setDelta] = useState(0);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const ghostActive = duration >= GHOST_HEAD_START_MS / 1000;

  const handlePoint = useCallback((point, allPoints) => {
    const nextPoints = [...allPoints];
    userPointsRef.current = nextPoints;
    setUserPoints(nextPoints);
    setDistance(calculateTotalDistance(nextPoints));
  }, []);

  useEffect(() => {
    trackerRef.current.setOnPoint(handlePoint);
  }, [handlePoint]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        startTimeRef.current = Date.now();
        await trackerRef.current.start();
        if (active) {
          setIsRunning(true);
        }
      } catch (error) {
        if (active) {
          setIsRunning(false);
        }
      }
    };

    start();

    return () => {
      active = false;
      trackerRef.current.stop();
      audioManagerRef.current.stopAll();
      audioManagerRef.current.unload();
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setDuration(elapsedSeconds);

      const ghostElapsedMs = Math.max(0, elapsedMs - GHOST_HEAD_START_MS);
      const ghostActive = elapsedMs >= GHOST_HEAD_START_MS;

      const ghostPos = ghostActive
        ? ghostRacerRef.current.getGhostPosition(ghostElapsedMs)
        : null;
      setGhostPosition(ghostPos);

      if (ghostActive) {
        audioManagerRef.current.setAlwaysOn(true);
        const currentDelta = ghostRacerRef.current.calculateDelta(
          userPointsRef.current,
          ghostElapsedMs
        );
        setDelta(currentDelta);
        audioManagerRef.current.updateAudio(currentDelta, { forceAmbient: true });
      } else {
        setDelta(0);
        audioManagerRef.current.setAlwaysOn(false);
        audioManagerRef.current.stopAll();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const stopRun = async () => {
    trackerRef.current.stop();
    audioManagerRef.current.stopAll();
    setIsRunning(false);
    setIsSaving(true);

    const routePoints = userPointsRef.current;
    const routeDistance = calculateTotalDistance(routePoints);
    const payload = {
      points: routePoints,
      distance: routeDistance,
      duration,
      timestamp: Date.now(),
      ghostMeta: route.params?.ghostMeta ?? null,
    };

    try {
      await saveRun(payload);
    } catch (error) {
      // Swallow for now; summary will still render locally.
    } finally {
      setIsSaving(false);
    }

    navigation.navigate('Summary', {
      routePoints: routePoints,
      distance: routeDistance,
      duration,
      ghostMeta: route.params?.ghostMeta ?? null,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        initialRegion={getInitialRegion(ghostRoute)}
      >
        {ghostActive && (
          <Polyline
            coordinates={ghostRoute}
            strokeColor={theme.colors.danger}
            strokeWidth={3}
            lineDashPattern={[10, 8]}
          />
        )}
        <Polyline
          coordinates={userPoints}
          strokeColor={theme.colors.secondary}
          strokeWidth={4}
        />
        {ghostActive && ghostPosition && (
          <Marker coordinate={ghostPosition} title="Ghost">
            <View style={styles.ghostMarker} />
          </Marker>
        )}
      </MapView>

      <View style={styles.hud}>
        <View style={styles.hudHeader}>
          <Text style={styles.hudTitle}>Ghost Race</Text>
          {ghostActive && (
            <View style={styles.ghostActiveBadge}>
              <Text style={styles.ghostActiveText}>👻 Active</Text>
            </View>
          )}
        </View>
        <View style={styles.hudStats}>
          <View style={styles.hudStatItem}>
            <Text style={styles.hudStatLabel}>Time</Text>
            <Text style={styles.hudStatValue}>
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.hudStatDivider} />
          <View style={styles.hudStatItem}>
            <Text style={styles.hudStatLabel}>Distance</Text>
            <Text style={styles.hudStatValue}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.hudStatUnit}>km</Text>
          </View>
        </View>
        {ghostActive && (
          <View style={[styles.deltaChip, delta >= 0 ? styles.deltaChipAhead : styles.deltaChipBehind]}>
            <Text style={styles.deltaIcon}>{delta >= 0 ? '↑' : '↓'}</Text>
            <Text style={styles.deltaText}>
              {delta >= 0 ? 'Ahead' : 'Behind'} {Math.abs(delta).toFixed(1)}m
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopRun}
        disabled={!isRunning || isSaving}
        activeOpacity={0.8}
      >
        <Text style={styles.stopText}>
          {isSaving ? 'SAVING...' : 'STOP'}
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
  hud: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 20, 27, 0.95)',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    minWidth: 300,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.slate,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate,
  },
  hudTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  ghostActiveBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  ghostActiveText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  hudStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hudStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudStatLabel: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  hudStatValue: {
    color: theme.colors.mist,
    fontSize: 22,
    fontWeight: '800',
  },
  hudStatUnit: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 2,
  },
  hudStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: theme.colors.slate,
    marginHorizontal: theme.spacing.md,
  },
  deltaChip: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  deltaChipAhead: {
    backgroundColor: theme.colors.secondary,
  },
  deltaChipBehind: {
    backgroundColor: theme.colors.danger,
  },
  deltaIcon: {
    fontSize: 16,
    color: theme.colors.ink,
  },
  deltaText: {
    color: theme.colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  stopButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    paddingHorizontal: 80,
    paddingVertical: 20,
    borderRadius: 999,
    backgroundColor: theme.colors.danger,
    ...theme.shadows.lg,
  },
  stopText: {
    color: theme.colors.ink,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
  },
  ghostMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 209, 102, 0.9)',
    borderWidth: 3,
    borderColor: theme.colors.accent,
    ...theme.shadows.md,
  },
});
