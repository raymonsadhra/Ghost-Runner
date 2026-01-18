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
import { useSettings } from '../contexts/SettingsContext';
import { theme } from '../theme';

export default function GhostSelectScreen({ navigation }) {
  const { formatDistance, formatPace } = useSettings();
  const [runs, setRuns] = useState([]);
  const [bossGhosts, setBossGhosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadRuns = async () => {
        setIsLoading(true);
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
          if (active) {
            setIsLoading(false);
          }
        }
      };

      loadRuns();
      return () => {
        active = false;
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
    const distanceM = item.distance ?? (item.distanceKm ?? 0) * 1000;
    const durationMin = item.durationMin ?? Math.floor((item.duration ?? 0) / 60);
    const paceMinPerKm = typeof item.pace === 'number' ? item.pace : (distanceM > 0 && durationMin > 0 ? durationMin / (distanceM / 1000) : 0);
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
          {formatDistance(distanceM)} • {durationMin} min
        </Text>
        <Text style={styles.cardMeta}>
          Pace {formatPace(paceMinPerKm)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
    paddingTop: theme.spacing.lg,
  },
  title: {
    color: theme.colors.mist,
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  loading: {
    color: theme.colors.mist,
    opacity: 0.7,
    paddingHorizontal: theme.spacing.lg,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: '#121A2A',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#1E2A3C',
  },
  bossCard: {
    borderWidth: 1,
    borderColor: 'rgba(47, 107, 255, 0.6)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBadge: {
    color: theme.colors.mist,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    fontWeight: '700',
    fontSize: 12,
  },
  bossBadge: {
    backgroundColor: theme.colors.primary,
  },
  cardMeta: {
    color: theme.colors.mist,
    opacity: 0.7,
    marginTop: 4,
  },
  bossMeta: {
    color: theme.colors.accent,
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
    color: theme.colors.mist,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#121A2A',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#1E2A3C',
  },
  emptyText: {
    color: theme.colors.mist,
    opacity: 0.7,
  },
});
