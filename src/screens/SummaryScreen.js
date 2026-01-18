import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline } from 'react-native-maps';

import { theme } from '../theme';
import { updateRunName } from '../services/firebaseService';
import { awardBossRewards } from '../services/rewardService';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceMiles, calculatePacePerMile } from '../utils/distanceUtils';
import OutsiderBackground from '../components/OutsiderBackground';

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

export default function SummaryScreen({ navigation, route }) {
  const routePoints = route.params?.routePoints ?? [];
  const distance = route.params?.distance ?? 0;
  const duration = route.params?.duration ?? 0;
  const pace = distance > 0 ? (duration / 60) / (distance / 1000) : 0;
  const runId = route.params?.runId ?? null;
  const runLocalId = route.params?.runLocalId ?? null;
  const runLocalOnly = route.params?.runLocalOnly ?? false;
  const ghostMeta = route.params?.ghostMeta ?? null;
  const ghostResult = route.params?.ghostResult ?? null;
  const isBoss = ghostMeta?.type === 'boss';
  const defaultName = useMemo(
    () => route.params?.runName ?? `Run on ${new Date().toLocaleDateString()}`,
    [route.params?.runName]
  );
  const [runName, setRunName] = useState(defaultName);
  const [savedName, setSavedName] = useState(defaultName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [rewardState, setRewardState] = useState(null);
  const [rewardApplied, setRewardApplied] = useState(false);

  const cleanedName = runName.trim();
  const pendingName = cleanedName || savedName;
  const isDirty = pendingName !== savedName;

  const handleSaveName = async () => {
    if (!isDirty) return;
    if (!runId && !runLocalId) {
      setSavedName(pendingName);
      setRunName(pendingName);
      return;
    }

    setIsSavingName(true);
    try {
      await updateRunName(runId, pendingName, {
        localId: runLocalId,
        localOnly: runLocalOnly,
      });
      setSavedName(pendingName);
      setRunName(pendingName);
    } finally {
      setIsSavingName(false);
    }
  };

  useEffect(() => {
    if (!isBoss || !ghostResult?.won || rewardApplied) return;
    let active = true;

    const applyRewards = async () => {
      try {
        const reward = await awardBossRewards({ bossId: ghostMeta?.id });
        if (active) {
          setRewardState(reward);
          setRewardApplied(true);
        }
      } catch (error) {
        if (active) {
          setRewardApplied(true);
        }
      }
    };

    applyRewards();
    return () => {
      active = false;
    };
  }, [ghostMeta?.id, ghostResult?.won, isBoss, rewardApplied]);

  return (
    <OutsiderBackground accent="pink">
      <View style={styles.container}>
        <MapView style={styles.map} initialRegion={getInitialRegion(routePoints)}>
          <Polyline
            coordinates={routePoints}
            strokeColor={theme.colors.neonPink}
            strokeWidth={4}
          />
        </MapView>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 80}
          style={styles.panelWrapper}
        >
          <View style={styles.panel}>
            <Text style={styles.title}>Run Complete</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatDistanceMiles(distance).replace(' mi', '')}</Text>
              <Text style={styles.statLabel}>mi</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDurationCompact(duration)}
              </Text>
              <Text style={styles.statLabel}>time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pace.toFixed(2)}</Text>
              <Text style={styles.statLabel}>min/mi</Text>
            </View>
          </View>

          {ghostMeta && (
            <View style={styles.ghostCard}>
              <Text style={styles.ghostTitle}>
                {ghostResult?.won
                  ? isBoss
                    ? 'Boss Defeated'
                    : 'Ghost Beaten'
                  : isBoss
                  ? 'Boss Escaped'
                  : 'Ghost Escaped'}
              </Text>
            <Text style={styles.ghostMeta}>
              {ghostResult?.won
                ? 'You outran the ghost.'
                : 'Run it back and take the win.'}
            </Text>
            {ghostMeta?.name && (
              <Text style={styles.ghostMeta}>
                {ghostMeta.name}
                {ghostMeta.character?.title
                  ? ` • ${ghostMeta.character.title}`
                  : ''}
              </Text>
            )}
              {isBoss && ghostResult?.won && (
                <View style={styles.rewardList}>
                  <Text style={styles.rewardItem}>
                    +{rewardState?.xpAwarded ?? 200} XP
                  </Text>
                  <Text style={styles.rewardItem}>
                    Badge: {rewardState?.badgeAwarded ?? 'boss_slayer'}
                  </Text>
                  <Text style={styles.rewardItem}>
                    Unlock:{' '}
                    {(rewardState?.unlocksAwarded ?? ['boss_theme']).join(', ')}
                  </Text>
                  {rewardState?.awarded === false && (
                    <Text style={styles.rewardNote}>
                      Rewards already claimed.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

            <View style={styles.nameCard}>
              <Text style={styles.nameLabel}>Name this run</Text>
              <TextInput
                value={runName}
                onChangeText={setRunName}
                placeholder="Run name"
                placeholderTextColor="rgba(245, 242, 255, 0.5)"
                style={styles.nameInput}
              />
              <TouchableOpacity
                style={[
                  styles.nameButton,
                  (!isDirty || isSavingName) && styles.nameButtonDisabled,
                ]}
                onPress={handleSaveName}
                disabled={!isDirty || isSavingName}
              >
                <Text style={styles.nameButtonText}>
                  {isSavingName ? 'Saving...' : 'Save Name'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.navigate('GhostRun', {
                  ghostRoute: routePoints,
                })
              }
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.neonPink, theme.colors.neonPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonInner}
              >
                <Text style={styles.primaryText}>Race This Ghost</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.secondaryText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  panelWrapper: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  panel: {
    backgroundColor: 'rgba(21, 19, 28, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: theme.spacing.lg,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(29, 26, 38, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  statLabel: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  ghostCard: {
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.45)',
  },
  ghostTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  ghostMeta: {
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  rewardList: {
    marginTop: theme.spacing.sm,
  },
  rewardItem: {
    color: theme.colors.neonGreen,
    fontWeight: '600',
    marginTop: 2,
  },
  rewardNote: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontSize: 12,
  },
  nameCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  nameLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: 'rgba(11, 10, 14, 0.7)',
  },
  nameButton: {
    backgroundColor: theme.colors.neonPurple,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  nameButtonDisabled: {
    opacity: 0.5,
  },
  nameButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 18,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonInner: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  secondaryText: {
    color: theme.colors.neonBlue,
    fontWeight: '700',
    fontSize: 16,
  },
});
