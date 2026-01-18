import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { getUserRuns } from '../services/firebaseService';
import { theme } from '../theme';

export default function GhostSelectScreen({ navigation }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRuns = async () => {
      try {
        const data = await getUserRuns();
        if (active) {
          setRuns(data);
        }
      } catch (error) {
        if (active) {
          setRuns([]);
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
  }, []);

  const renderRun = ({ item }) => {
    const distanceKm = item.distanceKm || (item.distance ?? 0) / 1000;
    const durationMin = item.durationMin || Math.floor((item.duration ?? 0) / 60);
    const pace = item.pace || (distanceKm > 0 ? (item.duration / 60) / distanceKm : 0);
    const runDate = new Date(item.timestamp ?? Date.now());

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('GhostRun', {
            ghostRoute: item.points,
            ghostMeta: item,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <View style={styles.ghostIconContainer}>
              <Text style={styles.ghostIcon}>👻</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardDate}>
                {runDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              <Text style={styles.cardDistance}>
                {distanceKm.toFixed(2)} km
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.cardStats}>
              <Text style={styles.cardStatLabel}>Time</Text>
              <Text style={styles.cardStatValue}>
                {Math.floor((item.duration ?? 0) / 60)}:{(item.duration ?? 0) % 60}
              </Text>
            </View>
            <View style={styles.cardStats}>
              <Text style={styles.cardStatLabel}>Pace</Text>
              <Text style={styles.cardStatValue}>{pace.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardArrow}>
          <Text style={styles.cardArrowText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Ghost</Text>
        <Text style={styles.subtitle}>Select a run to race against</Text>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loading}>Loading runs...</Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          renderItem={renderRun}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👻</Text>
              <Text style={styles.emptyText}>
                No runs yet
              </Text>
              <Text style={styles.emptySubtext}>
                Record a run to create your first ghost
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
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.mist,
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ghostIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  ghostIcon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardDate: {
    color: theme.colors.mist,
    fontSize: 14,
    opacity: 0.7,
    marginBottom: theme.spacing.xs,
  },
  cardDistance: {
    color: theme.colors.mist,
    fontSize: 20,
    fontWeight: '700',
  },
  cardRight: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cardStats: {
    alignItems: 'flex-end',
  },
  cardStatLabel: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  cardStatValue: {
    color: theme.colors.mist,
    fontSize: 16,
    fontWeight: '700',
  },
  cardArrow: {
    marginLeft: theme.spacing.sm,
  },
  cardArrowText: {
    color: theme.colors.mist,
    opacity: 0.5,
    fontSize: 20,
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 14,
    textAlign: 'center',
  },
});
