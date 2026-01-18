import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../theme';
import { getUserRuns } from '../services/firebaseService';

function getWeekStart(timestamp) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function HomeScreen({ navigation }) {
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

  const summary = useMemo(() => {
    const weekStart = getWeekStart(Date.now());
    const weekRuns = runs.filter((run) => (run.timestamp ?? 0) >= weekStart);
    const distance = weekRuns.reduce((sum, run) => sum + (run.distance ?? 0), 0);
    return {
      distanceKm: distance / 1000,
      count: weekRuns.length,
      prs: 0,
    };
  }, [runs]);

  const recentRuns = runs.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View style={[styles.orb, styles.orbOne]} />
        <View style={[styles.orb, styles.orbTwo]} />
        <View style={[styles.orb, styles.orbThree]} />
      </View>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>GHOST RUNNER</Text>
          <Text style={styles.title}>Race your past</Text>
          <Text style={styles.subtitle}>Challenge yourself to beat your best</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryCard]}
            onPress={() => navigation.navigate('Run')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.actionIconText}>▶</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Start New Run</Text>
            <Text style={styles.actionSubtitle}>Track a fresh route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={() => navigation.navigate('GhostSelect')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.actionIconText}>👻</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Race a Ghost</Text>
            <Text style={styles.actionSubtitle}>Chase your fastest self</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Text style={styles.statValue}>
                {summary.distanceKm.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>kilometers</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSecondary]}>
              <Text style={styles.statValue}>{summary.count}</Text>
              <Text style={styles.statLabel}>runs</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={styles.statValue}>{summary.prs}</Text>
              <Text style={styles.statLabel}>PRs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Runs</Text>
            <Text style={styles.sectionMeta}>
              {isLoading ? 'Loading...' : `${runs.length} total`}
            </Text>
          </View>
          {recentRuns.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No runs yet. Start a run to build your ghost.
              </Text>
            </View>
          ) : (
            recentRuns.map((run) => {
              const runDate = new Date(run.timestamp ?? Date.now());
              const distanceKm = run.distanceKm || (run.distance ?? 0) / 1000;
              const durationMin = run.durationMin || (run.duration ?? 0) / 60;
              const pace = distanceKm > 0 && durationMin > 0 
                ? (durationMin / distanceKm).toFixed(2) 
                : '0.00';
              return (
                <TouchableOpacity 
                  key={run.id} 
                  style={styles.runCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.runCardHeader}>
                    <View style={styles.runDateContainer}>
                      <Text style={styles.runDateDay}>
                        {runDate.toLocaleDateString('en-US', { day: 'numeric' })}
                      </Text>
                      <Text style={styles.runDateMonth}>
                        {runDate.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.runStatsContainer}>
                      <Text style={styles.runTitle}>
                        {distanceKm.toFixed(2)} km
                      </Text>
                      <Text style={styles.runMeta}>
                        {Math.floor((run.duration ?? 0) / 60)}:{((run.duration ?? 0) % 60).toString().padStart(2, '0')} • {pace} min/km
                      </Text>
                    </View>
                    {run.isGhostRun && (
                      <View style={styles.ghostBadge}>
                        <Text style={styles.ghostBadgeText}>👻</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.2,
  },
  orbOne: {
    width: 260,
    height: 260,
    backgroundColor: theme.colors.secondary,
    top: -80,
    left: -40,
  },
  orbTwo: {
    width: 320,
    height: 320,
    backgroundColor: theme.colors.primary,
    bottom: -120,
    right: -80,
  },
  orbThree: {
    width: 180,
    height: 180,
    backgroundColor: theme.colors.accent,
    top: 220,
    right: -60,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.mist,
    ...theme.typography.h1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 16,
    marginTop: theme.spacing.xs,
  },
  actions: {
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  primaryCard: {
    backgroundColor: theme.colors.primary,
  },
  secondaryCard: {
    backgroundColor: theme.colors.secondary,
  },
  actionIconContainer: {
    marginBottom: theme.spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 20,
    color: theme.colors.ink,
  },
  actionTitle: {
    color: theme.colors.ink,
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  actionSubtitle: {
    color: theme.colors.ink,
    opacity: 0.85,
    fontSize: 14,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.mist,
    ...theme.typography.h2,
    marginBottom: theme.spacing.md,
  },
  sectionMeta: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statCardPrimary: {
    backgroundColor: theme.colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  statCardSecondary: {
    backgroundColor: theme.colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  statCardAccent: {
    backgroundColor: theme.colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  statValue: {
    color: theme.colors.mist,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  runCard: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  runCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runDateContainer: {
    width: 60,
    alignItems: 'center',
    marginRight: theme.spacing.md,
    paddingRight: theme.spacing.md,
    borderRightWidth: 1,
    borderRightColor: theme.colors.slate,
  },
  runDateDay: {
    color: theme.colors.mist,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  runDateMonth: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  runStatsContainer: {
    flex: 1,
  },
  runTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  runMeta: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 14,
  },
  ghostBadge: {
    marginLeft: theme.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostBadgeText: {
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#1B222A',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.mist,
    opacity: 0.7,
  },
});
