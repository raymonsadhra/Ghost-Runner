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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Ghost Runner</Text>
        <Text style={styles.title}>Race your past.</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryCard]}
            onPress={() => navigation.navigate('Run')}
          >
            <Text style={styles.actionTitle}>Start New Run</Text>
            <Text style={styles.actionSubtitle}>Track a fresh route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={() => navigation.navigate('GhostSelect')}
          >
            <Text style={styles.actionTitle}>Race a Ghost</Text>
            <Text style={styles.actionSubtitle}>Chase your fastest self</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {summary.distanceKm.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.count}</Text>
              <Text style={styles.statLabel}>runs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.prs}</Text>
              <Text style={styles.statLabel}>prs</Text>
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
            recentRuns.map((run) => (
              <View key={run.id} style={styles.runCard}>
                <Text style={styles.runTitle}>
                  {new Date(run.timestamp ?? Date.now()).toLocaleDateString()}
                </Text>
                <Text style={styles.runMeta}>
                  {(run.distance / 1000).toFixed(2)} km •{' '}
                  {Math.floor((run.duration ?? 0) / 60)} min
                </Text>
              </View>
            ))
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
    paddingBottom: theme.spacing.xl,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.mist,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: theme.spacing.lg,
  },
  actions: {
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  primaryCard: {
    backgroundColor: theme.colors.primary,
  },
  secondaryCard: {
    backgroundColor: theme.colors.secondary,
  },
  actionTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: theme.colors.ink,
    opacity: 0.8,
    marginTop: theme.spacing.xs,
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
    fontSize: 20,
    fontWeight: '700',
  },
  sectionMeta: {
    color: theme.colors.mist,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E262E',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.mist,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.6,
    marginTop: 2,
  },
  runCard: {
    backgroundColor: '#1B222A',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  runTitle: {
    color: theme.colors.mist,
    fontSize: 16,
    fontWeight: '600',
  },
  runMeta: {
    color: theme.colors.mist,
    opacity: 0.7,
    marginTop: 4,
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
