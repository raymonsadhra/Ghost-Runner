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
import MapView, { Polyline } from 'react-native-maps';

import { theme } from '../theme';
import { updateRunName } from '../services/firebaseService';
import { awardBossRewards } from '../services/rewardService';

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
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={getInitialRegion(routePoints)}>
        <Polyline
          coordinates={routePoints}
          strokeColor={theme.colors.secondary}
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
              <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.floor(duration / 60)}:
                {(duration % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={styles.statLabel}>time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pace.toFixed(2)}</Text>
              <Text style={styles.statLabel}>min/km</Text>
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
            placeholderTextColor="rgba(233, 242, 244, 0.5)"
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
        >
          <Text style={styles.primaryText}>Race This Ghost</Text>
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
  panelWrapper: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  panel: {
    backgroundColor: 'rgba(15, 20, 27, 0.92)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.mist,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#121A2A',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.mist,
    fontWeight: '700',
    fontSize: 18,
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.6,
    marginTop: 4,
  },
  ghostCard: {
    backgroundColor: 'rgba(47, 107, 255, 0.12)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(47, 107, 255, 0.4)',
  },
  ghostTitle: {
    color: theme.colors.mist,
    fontWeight: '700',
    fontSize: 16,
  },
  ghostMeta: {
    color: theme.colors.mist,
    opacity: 0.75,
    marginTop: 6,
  },
  rewardList: {
    marginTop: theme.spacing.sm,
  },
  rewardItem: {
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  rewardNote: {
    color: theme.colors.mist,
    opacity: 0.6,
    marginTop: theme.spacing.xs,
    fontSize: 12,
  },
  nameCard: {
    backgroundColor: '#121A2A',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  nameLabel: {
    color: theme.colors.mist,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#1E2A3C',
    borderRadius: theme.radius.md,
    color: theme.colors.mist,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#0F1626',
  },
  nameButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  nameButtonDisabled: {
    opacity: 0.5,
  },
  nameButtonText: {
    color: theme.colors.mist,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryText: {
    color: theme.colors.mist,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: theme.colors.mist,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryText: {
    color: theme.colors.mist,
    fontWeight: '600',
    fontSize: 16,
  },
});
