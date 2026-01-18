import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { getUserRuns } from '../services/firebaseService';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;
const SOFT_TEXT = theme.colors.textSoft;

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
    const distance = weekRuns.reduce((sum, run) => {
      // Use distanceKm if available, otherwise convert distance from meters
      const runDistance = run.distanceKm ? run.distanceKm * 1000 : (run.distance ?? 0);
      return sum + runDistance;
    }, 0);
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
    <OutsiderBackground accent="purple">
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
              onPress={() => {
                // Navigate to Profile tab
                try {
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate('ProfileTab');
                  }
                } catch (error) {
                  console.warn('Navigation error:', error);
                }
              }}
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
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[theme.colors.neonPink, theme.colors.neonPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryActionInner}
            >
              <Text style={styles.primaryActionText}>Record an Activity</Text>
            </LinearGradient>
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
            recentRuns.map((run) => {
              const distanceKm = run.distanceKm || (run.distance ?? 0) / 1000;
              const durationMin = run.durationMin || Math.floor((run.duration ?? 0) / 60);
              const pace = run.pace || (distanceKm > 0 && durationMin > 0 ? (durationMin / distanceKm).toFixed(2) : '0.00');
              return (
                <View key={run.id} style={styles.runCard}>
                  <Text style={styles.runTitle}>
                    {run.name?.trim() ||
                      new Date(run.timestamp ?? Date.now()).toLocaleDateString()}
                  </Text>
                  <Text style={styles.runMeta}>
                    {distanceKm.toFixed(2)} km • {durationMin} min • {pace} min/km
                  </Text>
                </View>
              );
            })
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </OutsiderBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.6,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: theme.spacing.sm,
  },
  iconText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
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
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionLink: {
    color: theme.colors.neonBlue,
    fontWeight: '700',
  },
  sectionMetaText: {
    color: SOFT_TEXT,
    marginBottom: theme.spacing.md,
  },
  goalCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  goalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.neonPurple,
    marginRight: theme.spacing.md,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    color: theme.colors.text,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.neonGreen,
  },
  goalButton: {
    backgroundColor: theme.colors.neonPink,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    marginLeft: theme.spacing.md,
  },
  goalButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  readyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  readyMeta: {
    color: MUTED_TEXT,
    marginBottom: theme.spacing.md,
  },
  primaryAction: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  primaryActionInner: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryActionText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  secondaryActionText: {
    color: theme.colors.neonBlue,
    fontWeight: '700',
  },
  challengeCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  challengeTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  challengeMeta: {
    color: MUTED_TEXT,
    marginTop: 6,
  },
  challengeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.neonPurple,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginTop: theme.spacing.sm,
  },
  challengeBadgeText: {
    color: theme.colors.text,
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
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
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
