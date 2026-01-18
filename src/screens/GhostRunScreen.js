import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { LocationTracker } from '../services/LocationTracker';
import { GhostRacer } from '../services/GhostRacer';
import { AudioManager } from '../services/AudioManager';
import { calculateTotalDistance } from '../utils/geoUtils';
import { generatePowerUps, pickPowerUpInRange } from '../services/powerUpService';
import { theme } from '../theme';
import { audioSources } from '../config/audioSources';
import OutsiderBackground from '../components/OutsiderBackground';

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const GHOST_HEAD_START_MS = 8000;
const PRIMARY_BLUE = theme.colors.neonBlue;
const CARD_BORDER = 'rgba(255, 255, 255, 0.12)';
const MUTED_TEXT = theme.colors.textMuted;
const MILESTONE_FIRST_MILE_METERS = 1609.34;
const MILESTONE_STEP_MILES = 5;
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0B0A0E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#C9C4DA' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0A0E' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#14111B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1A21' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#14111C' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F1B2A' }] },
];
const DEFAULT_BOSS_PHASES = [
  { threshold: 0.5, multiplier: 1.08 },
  { threshold: 0.75, multiplier: 1.15 },
];
const POWER_UP_DESCRIPTIONS = {
  freeze: 'Freezes the ghost timer.',
  slow: 'Slows the ghost by 20%.',
};

function getGhostDurationMs(points = []) {
  if (points.length < 2) return 0;
  const first = points[0].timestamp ?? 0;
  const last = points[points.length - 1].timestamp ?? first;
  return Math.max(0, last - first);
}

function getBossPhase(progress, phases = []) {
  let multiplier = 1;
  let phaseIndex = 1;
  phases.forEach((phase, index) => {
    if (progress >= phase.threshold) {
      multiplier = phase.multiplier ?? multiplier;
      phaseIndex = index + 2;
    }
  });
  return { multiplier, phaseIndex };
}

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
  const ghostMeta = route.params?.ghostMeta ?? null;
  const isBoss = ghostMeta?.type === 'boss';
  const bossPalette = ghostMeta?.character?.palette ?? null;
  const bossPhases = useMemo(() => {
    const phases =
      Array.isArray(ghostMeta?.phases) && ghostMeta.phases.length
        ? ghostMeta.phases
        : DEFAULT_BOSS_PHASES;
    return [...phases].sort(
      (a, b) => (a.threshold ?? 0) - (b.threshold ?? 0)
    );
  }, [ghostMeta]);
  const ghostDurationMs = useMemo(
    () => getGhostDurationMs(ghostRoute),
    [ghostRoute]
  );
  const totalGhostDistance = useMemo(
    () => calculateTotalDistance(ghostRoute),
    [ghostRoute]
  );
  const bossTrailColor = bossPalette?.trail ?? PRIMARY_BLUE;
  const bossAccent = bossPalette?.primary ?? PRIMARY_BLUE;
  const pace = distance > 0 ? (duration / 60) / (distance / 1000) : 0;

  const trackerRef = useRef(new LocationTracker());
  const ghostRacerRef = useRef(new GhostRacer(ghostRoute));
  const audioManagerRef = useRef(
    new AudioManager(route.params?.audioSources ?? audioSources)
  );

  const startTimeRef = useRef(0);
  const lastTickRef = useRef(0);
  const ghostTimeRef = useRef(0);
  const userPointsRef = useRef([]);
  const powerUpsRef = useRef([]);
  const powerUpEffectsRef = useRef({ freezeUntil: 0, slowUntil: 0 });
  const primedAudioRef = useRef(false);
  const lastAudioLogRef = useRef(0);
  const nextMilestoneRef = useRef(MILESTONE_FIRST_MILE_METERS);
  const milestoneTimeoutRef = useRef(null);

  const [userPoints, setUserPoints] = useState([]);
  const [ghostPosition, setGhostPosition] = useState(null);
  const [delta, setDelta] = useState(0);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [bossHealth, setBossHealth] = useState(1);
  const [bossPhase, setBossPhase] = useState(1);
  const [powerUps, setPowerUps] = useState([]);
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [milestoneToast, setMilestoneToast] = useState(null);
  const ghostActive = duration >= GHOST_HEAD_START_MS / 1000;

  useEffect(() => {
    const spawns = generatePowerUps(ghostRoute, 3);
    setPowerUps(spawns);
  }, [ghostRoute]);

  useEffect(() => {
    powerUpsRef.current = powerUps;
  }, [powerUps]);

  const applyPowerUp = useCallback((powerUp) => {
    if (!powerUp) return;
    const now = Date.now();
    const effects = powerUpEffectsRef.current;
    if (powerUp.effect === 'freeze') {
      effects.freezeUntil = Math.max(
        effects.freezeUntil,
        now + powerUp.durationMs
      );
    }
    if (powerUp.effect === 'slow') {
      effects.slowUntil = Math.max(
        effects.slowUntil,
        now + powerUp.durationMs
      );
    }

    setPowerUps((prev) =>
      prev.map((item) =>
        item.id === powerUp.id ? { ...item, collected: true } : item
      )
    );
  }, []);

  const handlePoint = useCallback((point, allPoints) => {
    const nextPoints = [...allPoints];
    userPointsRef.current = nextPoints;
    setUserPoints(nextPoints);
    const nextDistance = calculateTotalDistance(nextPoints);
    setDistance(nextDistance);

    const nearby = pickPowerUpInRange(point, powerUpsRef.current);
    if (nearby) {
      applyPowerUp(nearby);
    }

    if (nextDistance >= nextMilestoneRef.current) {
      const nextMiles = nextMilestoneRef.current / 1609.34;
      setMilestoneToast(`${nextMiles.toFixed(0)} mile milestone reached!`);
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }
      milestoneTimeoutRef.current = setTimeout(() => {
        setMilestoneToast(null);
      }, 3500);
      nextMilestoneRef.current += MILESTONE_STEP_MILES * 1609.34;
    }
  }, [applyPowerUp]);

  useEffect(() => {
    trackerRef.current.setOnPoint(handlePoint);
  }, [handlePoint]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const now = Date.now();
        startTimeRef.current = now;
        lastTickRef.current = now;
        ghostTimeRef.current = 0;
        powerUpEffectsRef.current = { freezeUntil: 0, slowUntil: 0 };
        setActivePowerUp(null);
        setMilestoneToast(null);
        nextMilestoneRef.current = MILESTONE_FIRST_MILE_METERS;
        if (milestoneTimeoutRef.current) {
          clearTimeout(milestoneTimeoutRef.current);
          milestoneTimeoutRef.current = null;
        }
        await trackerRef.current.start();
        if (active) {
          setIsRunning(true);
          const sourceFlags = Object.fromEntries(
            Object.entries(audioManagerRef.current.sources || {}).map(
              ([key, value]) => [key, Boolean(value)]
            )
          );
          console.log('[Audio] ghost run start', {
            enabled: audioManagerRef.current.enabled,
            sources: sourceFlags,
          });
          audioManagerRef.current.setAlwaysOn(true);
          try {
            await audioManagerRef.current.ready;
            await audioManagerRef.current.playBreathing(0.6, 0);
            await audioManagerRef.current.playFootsteps(0.4, 0);
            primedAudioRef.current = true;
            console.log('[Audio] ghost run primed');
          } catch (error) {
            primedAudioRef.current = false;
            console.log('[Audio] ghost run prime failed', error?.message ?? error);
          }
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
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setDuration(elapsedSeconds);

      const ghostActiveNow = elapsedMs >= GHOST_HEAD_START_MS;
      if (!ghostActiveNow) {
        setGhostPosition(null);
        setDelta(0);
        setActivePowerUp(null);
        audioManagerRef.current.setAlwaysOn(true);
        if (!primedAudioRef.current) {
          void audioManagerRef.current.updateAudio(-60, { forceAmbient: true });
          primedAudioRef.current = true;
        }
        ghostTimeRef.current = 0;
        lastTickRef.current = now;
        if (isBoss) {
          setBossHealth(1);
          setBossPhase(1);
        }
        return;
      }

      if (!lastTickRef.current) {
        lastTickRef.current = now;
      }
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;

      const effects = powerUpEffectsRef.current;
      const freezeRemaining = Math.max(0, effects.freezeUntil - now);
      const slowRemaining = Math.max(0, effects.slowUntil - now);
      let powerMultiplier = 1;
      let powerLabel = null;
      let powerDescription = null;
      let powerRemaining = 0;

      if (freezeRemaining > 0) {
        powerMultiplier = 0;
        powerLabel = 'Time Warp';
        powerDescription = POWER_UP_DESCRIPTIONS.freeze;
        powerRemaining = freezeRemaining;
      } else if (slowRemaining > 0) {
        powerMultiplier = 0.8;
        powerLabel = 'Adrenaline Rush';
        powerDescription = POWER_UP_DESCRIPTIONS.slow;
        powerRemaining = slowRemaining;
      }

      const progress =
        ghostDurationMs > 0 ? ghostTimeRef.current / ghostDurationMs : 0;
      const phaseData = isBoss
        ? getBossPhase(Math.min(1, progress), bossPhases)
        : { multiplier: 1, phaseIndex: 1 };
      const effectiveMultiplier = powerMultiplier * phaseData.multiplier;

      ghostTimeRef.current += deltaMs * effectiveMultiplier;
      const ghostTimeMs = ghostTimeRef.current;

      const ghostPos = ghostRacerRef.current.getGhostPosition(ghostTimeMs);
      setGhostPosition(ghostPos);

      audioManagerRef.current.setAlwaysOn(true);
      const currentDelta = ghostRacerRef.current.calculateDelta(
        userPointsRef.current,
        ghostTimeMs
      );
      setDelta(currentDelta);
      void audioManagerRef.current
        .updateAudio(currentDelta, { forceAmbient: true })
        .catch((error) => {
          console.log('[Audio] updateAudio error', error?.message ?? error);
        });
      if (now - lastAudioLogRef.current > 5000) {
        lastAudioLogRef.current = now;
        console.log('[Audio] updateAudio tick', {
          delta: Number(currentDelta.toFixed(1)),
          boss: isBoss,
          power: powerLabel,
        });
      }

      if (isBoss) {
        const ghostDistance =
          ghostRacerRef.current.getGhostDistance(ghostTimeMs);
        const health =
          totalGhostDistance > 0
            ? Math.max(0, 1 - ghostDistance / totalGhostDistance)
            : 1;
        setBossHealth(health);
        setBossPhase(phaseData.phaseIndex);
        void audioManagerRef.current.playHeartbeat(0.95);
        void audioManagerRef.current.playBossTheme(0.5);
      }

      if (powerLabel) {
        setActivePowerUp({
          label: powerLabel,
          description: powerDescription,
          remainingSec: Math.ceil(powerRemaining / 1000),
        });
      } else {
        setActivePowerUp(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bossPhases, ghostDurationMs, isBoss, isRunning, totalGhostDistance]);

  const stopRun = () => {
    trackerRef.current.stop();
    setIsRunning(false);

    const ghostTimeMs = ghostTimeRef.current;
    const ghostDistance = ghostRacerRef.current.getGhostDistance(ghostTimeMs);
    const targetDistance = totalGhostDistance || ghostDistance;
    const ghostResult = {
      won: distance >= targetDistance,
      delta: distance - ghostDistance,
    };

    audioManagerRef.current.stopAll();
    if (isBoss && ghostResult.won) {
      void audioManagerRef.current.playCheer();
    }

    navigation.navigate('Summary', {
      routePoints: userPointsRef.current,
      distance,
      duration,
      ghostMeta,
      ghostResult,
    });
  };

  return (
    <OutsiderBackground accent="purple">
      <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        initialRegion={getInitialRegion(ghostRoute)}
        customMapStyle={MAP_STYLE}
      >
        {ghostActive && (
          <Polyline
            coordinates={ghostRoute}
            strokeColor={isBoss ? bossTrailColor : PRIMARY_BLUE}
            strokeWidth={3}
            lineDashPattern={[10, 8]}
            lineCap="round"
          />
        )}
        <Polyline
          coordinates={userPoints}
          strokeColor="rgba(255, 45, 122, 0.25)"
          strokeWidth={8}
          lineCap="round"
        />
        <Polyline
          coordinates={userPoints}
          strokeColor={theme.colors.neonPink}
          strokeWidth={4}
          lineCap="round"
        />
        {ghostActive && ghostPosition && (
          <Marker coordinate={ghostPosition} title="Ghost">
            <View
              style={[
                styles.ghostMarker,
                isBoss && bossPalette?.primary
                  ? { backgroundColor: bossPalette.primary }
                  : null,
              ]}
            >
              <Text style={styles.ghostIcon}>
                {isBoss ? '👹' : '👻'}
              </Text>
            </View>
          </Marker>
        )}
        {powerUps
          .filter((powerUp) => !powerUp.collected)
          .map((powerUp) => (
            <Marker key={powerUp.id} coordinate={powerUp.coordinate}>
              <View style={styles.powerUpMarker}>
                <View
                  style={[
                    styles.powerUpCore,
                    { backgroundColor: powerUp.color },
                  ]}
                />
                <Text style={styles.powerUpIcon}>
                  {powerUp.type === 'adrenaline_rush' ? '⚡' : '⏳'}
                </Text>
              </View>
            </Marker>
          ))}
      </MapView>

      <View style={styles.hud}>
        {isBoss && (
          <View
            style={[
              styles.bossHud,
              bossPalette?.secondary
                ? { backgroundColor: bossPalette.secondary }
                : null,
              bossPalette?.primary
                ? { borderColor: bossPalette.primary }
                : null,
            ]}
          >
            <View style={styles.bossHeader}>
              <Text style={styles.bossTitle}>
                {ghostMeta?.character?.title ?? 'Boss Battle'}
              </Text>
              <Text style={styles.bossPhase}>Phase {bossPhase}</Text>
            </View>
            <View style={styles.bossBar}>
              <View
                style={[
                  styles.bossBarFill,
                  { backgroundColor: bossAccent },
                  { width: `${Math.round(bossHealth * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.bossMeta}>
              {ghostMeta?.name ?? 'Milestone Boss'} • HP{' '}
              {Math.round(bossHealth * 100)}%
            </Text>
          </View>
        )}
        <View style={styles.hudStats}>
          <View style={styles.hudStatBlock}>
            <Text style={styles.hudLabel}>Time</Text>
            <Text style={styles.hudValue}>
              {Math.floor(duration / 60)}:
              {(duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.hudStatBlock}>
            <Text style={styles.hudLabel}>Distance</Text>
            <Text style={styles.hudValue}>
              {(distance / 1000).toFixed(2)} km
            </Text>
          </View>
          <View style={styles.hudStatBlock}>
            <Text style={styles.hudLabel}>Pace</Text>
            <Text style={styles.hudValue}>
              {pace > 0 ? pace.toFixed(2) : '0.00'} /km
            </Text>
          </View>
        </View>
        <View style={styles.deltaChip}>
          <Text style={styles.deltaText}>
            {delta >= 0 ? 'Ahead' : 'Behind'} {Math.abs(delta).toFixed(1)} m
          </Text>
        </View>
        {activePowerUp && (
          <View style={styles.powerUpChip}>
            <Text style={styles.powerUpText}>
              {activePowerUp.label} • {activePowerUp.remainingSec}s
            </Text>
            {activePowerUp.description ? (
              <Text style={styles.powerUpDescription}>
                {activePowerUp.description}
              </Text>
            ) : null}
          </View>
        )}
        {milestoneToast && (
          <View style={styles.milestoneChip}>
            <Text style={styles.milestoneText}>{milestoneToast}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopRun}
        disabled={!isRunning}
        activeOpacity={0.85}
      >
        <Text style={styles.stopText}>STOP</Text>
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
  hud: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(21, 19, 28, 0.88)',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    minWidth: 280,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  bossHud: {
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.45)',
  },
  bossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  bossTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  bossPhase: {
    color: theme.colors.textMuted,
    opacity: 0.8,
    fontSize: 12,
  },
  bossBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 20, 27, 0.6)',
    overflow: 'hidden',
  },
  bossBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  bossMeta: {
    color: theme.colors.textMuted,
    opacity: 0.75,
    marginTop: theme.spacing.xs,
    fontSize: 12,
  },
  hudStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  hudLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginBottom: 4,
  },
  hudValue: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  deltaChip: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.neonPink,
    borderRadius: theme.radius.md,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  deltaText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  stopButton: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: theme.colors.danger,
  },
  stopText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1,
  },
  ghostMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(85, 215, 255, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(245, 242, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostIcon: {
    fontSize: 16,
  },
  powerUpMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(21, 19, 28, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 242, 255, 0.4)',
  },
  powerUpCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.9,
    position: 'absolute',
  },
  powerUpIcon: {
    fontSize: 14,
  },
  powerUpChip: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.neonPurple,
    borderRadius: theme.radius.md,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  powerUpText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  powerUpDescription: {
    color: theme.colors.text,
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2,
  },
  milestoneChip: {
    marginTop: theme.spacing.sm,
    backgroundColor: 'rgba(255, 90, 175, 0.2)',
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 175, 0.45)',
    alignSelf: 'flex-start',
  },
  milestoneText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
