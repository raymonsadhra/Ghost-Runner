import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { getUserRuns } from '../services/firebaseService';

const PRIMARY_BLUE = '#2F6BFF';
const DARK_BG = '#0B0F17';
const CARD_BG = '#121A2A';
const CARD_BORDER = '#1E2A3C';
const MUTED_TEXT = '#8FA4BF';

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadRuns = async () => {
        setIsLoading(true);
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
    }, [])
  );

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
  const goalKm = 10;
  const progressKm = Math.min(goalKm, summary.distanceKm);
  const progressPercent = goalKm > 0 ? progressKm / goalKm : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconText}>?</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Home</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.iconText}>Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Suggested Goal</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Customize</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.goalCard}>
            <View style={styles.goalIcon} />
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>{goalKm} km per week</Text>
              <Text style={styles.goalMeta}>
                {progressKm.toFixed(1)} km / {goalKm} km run
              </Text>
              <View style={styles.goalProgress}>
                <View
                  style={[
                    styles.goalProgressFill,
                    { width: `${Math.round(progressPercent * 100)}%` },
                  ]}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.goalButton}>
              <Text style={styles.goalButtonText}>Set Goal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.readyTitle}>Ready to get moving?</Text>
          <Text style={styles.readyMeta}>
            Choose a run and hit start. Your stats will be waiting.
          </Text>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('Run')}
          >
            <Text style={styles.primaryActionText}>Record an Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('GhostSelect')}
          >
            <Text style={styles.secondaryActionText}>Race a Ghost</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Challenges</Text>
          <Text style={styles.sectionMetaText}>
            Make accountability more fun and earn rewards.
          </Text>
          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>December 5K Challenge</Text>
            <Text style={styles.challengeMeta}>
              Chase your best 5K run and claim a digital trophy.
            </Text>
            <View style={styles.challengeBadge}>
              <Text style={styles.challengeBadgeText}>Digital Trophy</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Runs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RunHistory')}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
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
                  {run.name?.trim() ||
                    new Date(run.timestamp ?? Date.now()).toLocaleDateString()}
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
    backgroundColor: DARK_BG,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.mist,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    marginRight: theme.spacing.sm,
  },
  iconText: {
    color: theme.colors.mist,
    fontWeight: '700',
    fontSize: 12,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeaderRow: {
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
  sectionLink: {
    color: PRIMARY_BLUE,
    fontWeight: '600',
  },
  sectionMetaText: {
    color: MUTED_TEXT,
    marginBottom: theme.spacing.md,
  },
  goalCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2A3C',
    marginRight: theme.spacing.md,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  goalMeta: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  goalProgress: {
    height: 6,
    borderRadius: 999,
    backgroundColor: CARD_BORDER,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
  },
  goalButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    marginLeft: theme.spacing.md,
  },
  goalButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  readyTitle: {
    color: theme.colors.mist,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  readyMeta: {
    color: MUTED_TEXT,
    marginBottom: theme.spacing.md,
  },
  primaryAction: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryAction: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  secondaryActionText: {
    color: theme.colors.mist,
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  challengeTitle: {
    color: theme.colors.mist,
    fontSize: 16,
    fontWeight: '700',
  },
  challengeMeta: {
    color: MUTED_TEXT,
    marginTop: 6,
  },
  challengeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C2B4D',
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginTop: theme.spacing.sm,
  },
  challengeBadgeText: {
    color: '#A9C4FF',
    fontWeight: '700',
    fontSize: 12,
  },
  runCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  runTitle: {
    color: theme.colors.mist,
    fontSize: 16,
    fontWeight: '600',
  },
  runMeta: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  emptyText: {
    color: MUTED_TEXT,
  },
});
