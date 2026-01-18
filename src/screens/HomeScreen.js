import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { auth } from '../firebase';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceKmToMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { DEFAULT_WEEKLY_GOAL_MILES, loadWeeklyGoal, saveWeeklyGoal } from '../services/goalService';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;
const SOFT_TEXT = theme.colors.textSoft;
const POLL_INTERVAL_MS = 10000;

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
  const [goalMiles, setGoalMiles] = useState(DEFAULT_WEEKLY_GOAL_MILES);
  const [selectedGoalMiles, setSelectedGoalMiles] = useState(DEFAULT_WEEKLY_GOAL_MILES);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

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
          // getUserRuns() will automatically use auth.currentUser.uid
          const data = await getUserRuns();
          if (active) {
            setRuns(data);
          }
        } catch (error) {
          if (active) {
            setRuns([]);
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
    }, [auth?.currentUser?.uid])
  );

  useEffect(() => {
    let active = true;
    const loadGoal = async () => {
      const storedGoal = await loadWeeklyGoal();
      if (active) {
        setGoalMiles(storedGoal);
        setSelectedGoalMiles(storedGoal);
      }
    };

    loadGoal();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const weekStart = getWeekStart(Date.now());
    const weekRuns = runs.filter((run) => (run.timestamp ?? 0) >= weekStart);
    const distanceMeters = weekRuns.reduce((sum, run) => {
      // Use distanceKm if available, otherwise convert distance from meters
      const runDistance = run.distanceKm ? run.distanceKm * 1000 : (run.distance ?? 0);
      return sum + runDistance;
    }, 0);
    return {
      distanceMiles: distanceMeters * 0.000621371,
      count: weekRuns.length,
      prs: 0,
    };
  }, [runs]);

  const recentRuns = runs.slice(0, 3);
  const goalOptions = useMemo(
    () => Array.from({ length: 50 }, (_, index) => index + 1),
    []
  );
  const progressMiles = Math.min(goalMiles, summary.distanceMiles);
  const progressPercent = goalMiles > 0 ? progressMiles / goalMiles : 0;
  const isGoalCurrent = selectedGoalMiles === goalMiles;

  const handleSetGoal = async () => {
    if (isGoalCurrent || isSavingGoal) {
      return;
    }
    setIsSavingGoal(true);
    try {
      const nextGoal = await saveWeeklyGoal(selectedGoalMiles);
      setGoalMiles(nextGoal);
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <OutsiderBackground accent="purple">
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>

        {/* Top Action Buttons */}
        <View style={styles.topActionButtons}>
          <TouchableOpacity
            style={styles.topPrimaryAction}
            onPress={() => navigation.navigate('Run')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[theme.colors.neonPink, theme.colors.neonPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topActionInner}
            >
              <Text style={styles.topActionText}>Start Run</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topSecondaryAction}
            onPress={() => navigation.navigate('GhostSelect')}
            activeOpacity={0.85}
          >
            <Text style={styles.topSecondaryActionText}>Race Ghost</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Weekly Goal</Text>
          </View>
          
          <View style={styles.goalCardWrapper}>
            <LinearGradient
              colors={['rgba(255, 45, 122, 0.2)', 'rgba(124, 92, 255, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goalCard}
            >
              <View style={styles.goalContent}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalValueContainer}>
                    <Text style={styles.goalTitle}>{selectedGoalMiles}</Text>
                    <Text style={styles.goalUnit}>miles</Text>
                  </View>
                  {isGoalCurrent && (
                    <View style={styles.currentGoalIndicator}>
                      <View style={styles.checkmarkCircle}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                      <Text style={styles.currentGoalText}>Active</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.goalSubtitle}>Weekly target</Text>
                
                {isGoalCurrent && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress this week</Text>
                      <View style={styles.progressPercentContainer}>
                        <Text style={styles.progressPercent}>
                          {Math.round(progressPercent * 100)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.goalProgressContainer}>
                      <View style={styles.goalProgress}>
                        <LinearGradient
                          colors={[theme.colors.neonGreen, theme.colors.neonBlue]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.goalProgressFill,
                            { width: `${Math.round(progressPercent * 100)}%` },
                          ]}
                        />
                        {progressPercent > 0 && (
                          <View
                            style={[
                              styles.progressDot,
                              { left: `${Math.round(progressPercent * 100)}%` },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                    <View style={styles.progressStats}>
                      <View style={styles.progressStatItem}>
                        <Text style={styles.progressStatValue}>{progressMiles.toFixed(1)}</Text>
                        <Text style={styles.progressStatLabel}>Completed</Text>
                      </View>
                      <View style={styles.progressStatDivider} />
                      <View style={styles.progressStatItem}>
                        <Text style={styles.progressStatValue}>
                          {Math.max(0, (goalMiles - progressMiles).toFixed(1))}
                        </Text>
                        <Text style={styles.progressStatLabel}>Remaining</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.goalPicker}>
            <Text style={styles.goalPickerLabel}>Choose your weekly target</Text>
            <View style={styles.goalPickerContainer}>
              <View style={styles.goalScaleLine} pointerEvents="none" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.goalScale}
                snapToInterval={60}
                decelerationRate="fast"
              >
                {goalOptions.map((value) => {
                  const isActive = value === selectedGoalMiles;
                  const isMilestone = value % 5 === 0;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setSelectedGoalMiles(value)}
                      style={[
                        styles.goalTick,
                        isActive && styles.goalTickActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.goalTickText,
                        isActive && styles.goalTickTextActive,
                        isMilestone && styles.goalTickTextMilestone,
                      ]}>
                        {value}
                      </Text>
                      <View
                        style={[
                          styles.goalTickLine,
                          isActive && styles.goalTickLineActive,
                          isMilestone && styles.goalTickLineMilestone,
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={[
                styles.goalButton,
                isGoalCurrent && styles.goalButtonDisabled,
                !isGoalCurrent && styles.goalButtonActive,
              ]}
              onPress={handleSetGoal}
              disabled={isGoalCurrent || isSavingGoal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isGoalCurrent
                    ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']
                    : [theme.colors.neonPink, theme.colors.neonPurple]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.goalButtonGradient}
              >
                <Text style={styles.goalButtonText}>
                  {isGoalCurrent ? '✓ Goal Active' : isSavingGoal ? 'Saving...' : 'Set This Goal'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
              const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
              const durationSeconds = run.duration ?? (run.durationMin ?? 0) * 60;
              const pace = calculatePacePerMile(durationSeconds, distanceMeters);
              const distanceMiles = distanceMeters * 0.000621371;
              return (
                <View key={run.id} style={styles.runCard}>
                  <Text style={styles.runTitle}>
                    {run.name?.trim() ||
                      new Date(run.timestamp ?? Date.now()).toLocaleDateString()}
                  </Text>
                  <Text style={styles.runMeta}>
                    {distanceMiles.toFixed(2)} mi • {formatDurationCompact(durationSeconds)} • {pace.toFixed(2)} min/mi
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
    padding: 20,
    paddingBottom: 100, // Extra padding for tab bar
  },
  header: {
    marginBottom: 32,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -1,
  },
  topActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  topPrimaryAction: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  topSecondaryAction: {
    flex: 1,
    backgroundColor: 'rgba(29, 26, 38, 0.9)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(85, 215, 255, 0.4)',
    shadowColor: theme.colors.neonBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  topActionInner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topActionText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  topSecondaryActionText: {
    color: theme.colors.neonBlue,
    fontWeight: '700',
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionLink: {
    color: theme.colors.neonBlue,
    fontWeight: '700',
  },
  sectionMetaText: {
    color: SOFT_TEXT,
    marginBottom: theme.spacing.md,
  },
  goalCardWrapper: {
    marginBottom: 20,
  },
  goalCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  goalContent: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginRight: 8,
  },
  goalUnit: {
    color: MUTED_TEXT,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalSubtitle: {
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  currentGoalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 255, 156, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82, 255, 156, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkmark: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  currentGoalText: {
    color: theme.colors.neonGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentContainer: {
    backgroundColor: 'rgba(82, 255, 156, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressPercent: {
    color: theme.colors.neonGreen,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  goalProgressContainer: {
    marginBottom: 16,
  },
  goalProgress: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'visible',
    position: 'relative',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.neonGreen,
    borderWidth: 3,
    borderColor: theme.colors.text,
    marginLeft: -10,
    shadowColor: theme.colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  progressStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  progressStatLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: '500',
  },
  progressStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  goalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  goalButtonActive: {
    shadowColor: theme.colors.neonPink,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  goalButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  goalButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 15,
  },
  goalButtonDisabled: {
    opacity: 0.7,
  },
  goalPicker: {
    marginTop: 0,
  },
  goalPickerContainer: {
    backgroundColor: 'rgba(29, 26, 38, 0.5)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  goalPickerLabel: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  goalScale: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 70,
  },
  goalScaleLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
  },
  goalTick: {
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: 44,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goalTickActive: {
    backgroundColor: 'rgba(255, 45, 122, 0.1)',
  },
  goalTickText: {
    color: MUTED_TEXT,
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
  },
  goalTickTextActive: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  goalTickTextMilestone: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalTickLine: {
    width: 3,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  goalTickLineActive: {
    height: 24,
    width: 5,
    backgroundColor: theme.colors.neonPink,
    borderRadius: 3,
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  goalTickLineMilestone: {
    height: 18,
    width: 3,
  },
  readyTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  readyMeta: {
    color: MUTED_TEXT,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  primaryAction: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryActionInner: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryActionText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  secondaryAction: {
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderRadius: 18,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(85, 215, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  runTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  runMeta: {
    color: MUTED_TEXT,
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
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
