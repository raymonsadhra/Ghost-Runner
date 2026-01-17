import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { GhostRacer } from '../services/GhostRacer';
import { AudioManager } from '../services/AudioManager';
import { calculateTotalDistance } from '../utils/geoUtils';
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

  const stopRun = () => {
    trackerRef.current.stop();
    audioManagerRef.current.stopAll();
    setIsRunning(false);

    navigation.navigate('Summary', {
      routePoints: userPointsRef.current,
      distance,
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
        <View style={styles.hudRow}>
          <Text style={styles.hudLabel}>Time</Text>
          <Text style={styles.hudValue}>
            {Math.floor(duration / 60)}:
            {(duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.hudRow}>
          <Text style={styles.hudLabel}>Distance</Text>
          <Text style={styles.hudValue}>{(distance / 1000).toFixed(2)} km</Text>
        </View>
        <View style={styles.deltaChip}>
          <Text style={styles.deltaText}>
            {delta >= 0 ? 'Ahead' : 'Behind'} {Math.abs(delta).toFixed(1)} m
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopRun}
        disabled={!isRunning}
      >
        <Text style={styles.stopText}>STOP</Text>
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
    backgroundColor: 'rgba(15, 20, 27, 0.85)',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    minWidth: 220,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  hudLabel: {
    color: theme.colors.mist,
    opacity: 0.7,
  },
  hudValue: {
    color: theme.colors.mist,
    fontWeight: '700',
  },
  deltaChip: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  deltaText: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  stopButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: theme.colors.danger,
  },
  stopText: {
    color: theme.colors.ink,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
  },
  ghostMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(233, 242, 244, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(233, 242, 244, 0.9)',
  },
});
