import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteRun, getUserRuns } from '../services/firebaseService';
import {
  createBossGhostIfEligible,
  deleteBossGhost,
  getBossGhosts,
} from '../services/bossGhostService';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceKmToMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const POLL_INTERVAL_MS = 10000;

export default function GhostSelectScreen({ navigation }) {
  const [runs, setRuns] = useState([]);
  const [bossGhosts, setBossGhosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let inFlight = false;
      const loadRuns = async ({ showLoading = false } = {}) => {
        if (inFlight) return;
        inFlight = true;
        if (showLoading) {
          setIsLoading(true);
        }
        try {
          const [runsData, bossData] = await Promise.all([
            getUserRuns(),
            getBossGhosts(),
          ]);
          let nextBossData = bossData;
          if (bossData.length === 0 && runsData.length >= 5) {
            await createBossGhostIfEligible();
            nextBossData = await getBossGhosts();
          }
          if (active) {
            setRuns(runsData);
            setBossGhosts(nextBossData);
          }
        } catch (error) {
          console.error('Error loading runs:', error);
          if (active) {
            setRuns([]);
            setBossGhosts([]);
          }
        } finally {
          if (active && showLoading) {
            setIsLoading(false);
          }
          inFlight = false;
        }
      };

      loadRuns({ showLoading: true });
      const intervalId = setInterval(() => {
        void loadRuns();
      }, POLL_INTERVAL_MS);
      return () => {
        active = false;
        clearInterval(intervalId);
      };
    }, [])
  );

  const handleDelete = (item) => {
    Alert.alert(
      'Delete this ghost?',
      item.type === 'boss'
        ? 'This boss ghost will be removed.'
        : 'This run will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.type === 'boss') {
              await deleteBossGhost(item.id, {
                localId: item.localId,
                localOnly: item.localOnly,
              });
              setBossGhosts((prev) => prev.filter((ghost) => ghost.id !== item.id));
            } else {
              await deleteRun(item.id, {
                localId: item.localId,
                localOnly: item.localOnly,
              });
              setRuns((prev) => prev.filter((run) => run.id !== item.id));
            }
          },
        },
      ]
    );
  };

  const renderRun = ({ item }) => {
    // Use Firebase fields if available, otherwise calculate
    const distanceMeters = item.distance ?? (item.distanceKm ? item.distanceKm * 1000 : 0);
    const durationSeconds = item.duration ?? (item.durationMin ?? 0) * 60;
    const pace = calculatePacePerMile(durationSeconds, distanceMeters);
    const distanceMiles = distanceMeters * 0.000621371;
    const isBoss = item.type === 'boss';
    const bossPalette = item.character?.palette;
    const bossAccent = bossPalette?.primary ?? theme.colors.primary;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isBoss && styles.bossCard,
          isBoss && bossPalette?.secondary
            ? { backgroundColor: bossPalette.secondary }
            : null,
        ]}
        onPress={() =>
          navigation.navigate('GhostRun', {
            ghostRoute: item.route ?? item.points ?? [],
            ghostMeta: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.cardTitle,
              isBoss ? { color: theme.colors.mist } : null,
            ]}
          >
            {item.name?.trim() ||
              new Date(item.timestamp ?? Date.now()).toLocaleDateString()}
          </Text>
          <Text
            style={[
              styles.cardBadge,
              isBoss && styles.bossBadge,
              isBoss && bossPalette?.primary
                ? { backgroundColor: bossPalette.primary }
                : null,
            ]}
          >
            {isBoss ? 'Boss' : 'Ghost'}
          </Text>
        </View>
        <Text style={styles.cardMeta}>
          {distanceMiles.toFixed(2)} mi • {formatDurationCompact(durationSeconds)}
        </Text>
        <Text style={styles.cardMeta}>
          Pace {pace.toFixed(2)} min/mi
        </Text>
        {isBoss && (
          <Text style={[styles.bossMeta, { color: bossAccent }]}>
            {item.character?.title ?? 'Milestone boss battle'}
          </Text>
        )}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ghostOptions = [...bossGhosts, ...runs];

  return (
    <OutsiderBackground accent="purple">
      <View style={styles.container}>
        <Text style={styles.title}>Choose Your Ghost</Text>
        {isLoading ? (
          <Text style={styles.loading}>Loading runs...</Text>
        ) : (
          <FlatList
            data={ghostOptions}
            renderItem={renderRun}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No runs yet. Record a run to create your first ghost.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </OutsiderBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  loading: {
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.lg,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bossCard: {
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.6)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBadge: {
    color: theme.colors.text,
    backgroundColor: theme.colors.neonPurple,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    fontWeight: '700',
    fontSize: 12,
  },
  bossBadge: {
    backgroundColor: theme.colors.neonPink,
  },
  cardMeta: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  bossMeta: {
    color: theme.colors.neonBlue,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  cardActions: {
    marginTop: theme.spacing.md,
  },
  actionButton: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
});
