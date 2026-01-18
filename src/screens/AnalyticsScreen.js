import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import { getUserRuns } from '../services/firebaseService';
import { auth } from '../firebase';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;
const POLL_INTERVAL_MS = 10000;
const screenWidth = Dimensions.get('window').width;

function getWeekStart(timestamp) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getMonthStart(timestamp) {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function groupRunsByWeek(runs) {
  const grouped = {};
  runs.forEach((run) => {
    const weekStart = getWeekStart(run.timestamp ?? Date.now());
    if (!grouped[weekStart]) {
      grouped[weekStart] = {
        weekStart,
        distance: 0,
        duration: 0,
        count: 0,
        paceSum: 0,
      };
    }
    const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
    const durationSeconds = run.duration ?? (run.durationMin ?? 0) * 60;
    grouped[weekStart].distance += distanceMeters;
    grouped[weekStart].duration += durationSeconds;
    grouped[weekStart].count += 1;
    if (distanceMeters > 0) {
      const pace = calculatePacePerMile(durationSeconds, distanceMeters);
      grouped[weekStart].paceSum += pace;
    }
  });
  return Object.values(grouped).sort((a, b) => a.weekStart - b.weekStart);
}

function groupRunsByMonth(runs) {
  const grouped = {};
  runs.forEach((run) => {
    const monthStart = getMonthStart(run.timestamp ?? Date.now());
    if (!grouped[monthStart]) {
      grouped[monthStart] = {
        monthStart,
        distance: 0,
        duration: 0,
        count: 0,
        paceSum: 0,
      };
    }
    const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
    const durationSeconds = run.duration ?? (run.durationMin ?? 0) * 60;
    grouped[monthStart].distance += distanceMeters;
    grouped[monthStart].duration += durationSeconds;
    grouped[monthStart].count += 1;
    if (distanceMeters > 0) {
      const pace = calculatePacePerMile(durationSeconds, distanceMeters);
      grouped[monthStart].paceSum += pace;
    }
  });
  return Object.values(grouped).sort((a, b) => a.monthStart - b.monthStart);
}

export default function AnalyticsScreen() {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

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
          // Fetch all runs (use a large limit)
          const data = await getUserRuns(undefined, { max: 1000 });
          if (active) {
            setRuns(data);
          }
        } catch (error) {
          console.error('Error loading runs:', error);
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

  const weeklyData = useMemo(() => groupRunsByWeek(runs), [runs]);
  const monthlyData = useMemo(() => groupRunsByMonth(runs), [runs]);

  const chartData = useMemo(() => {
    const data = viewMode === 'week' ? weeklyData : monthlyData;
    if (data.length === 0) return null;

    // Get last 12 weeks or 12 months
    const recentData = data.slice(-12);
    
    const labels = recentData.map((item) => {
      const date = new Date(viewMode === 'week' ? item.weekStart : item.monthStart);
      if (viewMode === 'week') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
    });

    const distances = recentData.map((item) => 
      parseFloat((item.distance * 0.000621371).toFixed(1))
    );

    const runCounts = recentData.map((item) => item.count);

    const paces = recentData.map((item) => {
      const avgPace = item.count > 0 ? item.paceSum / item.count : 0;
      return parseFloat(avgPace.toFixed(1));
    });

    return {
      labels,
      distances,
      runCounts,
      paces,
    };
  }, [weeklyData, monthlyData, viewMode]);

  const overallStats = useMemo(() => {
    const totalDistance = runs.reduce((sum, run) => {
      const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
      return sum + distanceMeters;
    }, 0);

    const totalDuration = runs.reduce((sum, run) => {
      return sum + (run.duration ?? (run.durationMin ?? 0) * 60);
    }, 0);

    const totalRuns = runs.length;

    let totalPaceSum = 0;
    let paceCount = 0;
    runs.forEach((run) => {
      const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
      const durationSeconds = run.duration ?? (run.durationMin ?? 0) * 60;
      if (distanceMeters > 0) {
        totalPaceSum += calculatePacePerMile(durationSeconds, distanceMeters);
        paceCount += 1;
      }
    });

    const avgPace = paceCount > 0 ? totalPaceSum / paceCount : 0;

    return {
      totalDistance: totalDistance * 0.000621371,
      totalDuration,
      totalRuns,
      avgPace,
    };
  }, [runs]);

  const chartConfig = {
    backgroundColor: CARD_BG,
    backgroundGradientFrom: CARD_BG,
    backgroundGradientTo: CARD_BG,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 45, 122, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(180, 174, 196, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: theme.colors.neonPink,
      fill: theme.colors.neonPink,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: 'rgba(255, 255, 255, 0.05)',
      strokeWidth: 1,
    },
  };

  if (isLoading) {
    return (
      <OutsiderBackground accent="blue">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.neonPink} />
          </View>
        </SafeAreaView>
      </OutsiderBackground>
    );
  }

  return (
    <OutsiderBackground accent="blue">
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <View style={styles.viewModeSelector}>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('week')}
              >
                <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('month')}
              >
                <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overall Stats */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overall Stats</Text>
            <View style={styles.statsGrid}>
              <LinearGradient
                colors={['rgba(255, 45, 122, 0.15)', 'rgba(255, 45, 122, 0.05)']}
                style={styles.statCard}
              >
                <Text style={[styles.statValue, { color: theme.colors.neonPink }]}>
                  {overallStats.totalRuns}
                </Text>
                <Text style={styles.statLabel}>Total Runs</Text>
              </LinearGradient>
              <LinearGradient
                colors={['rgba(82, 255, 156, 0.15)', 'rgba(82, 255, 156, 0.05)']}
                style={styles.statCard}
              >
                <Text style={[styles.statValue, { color: theme.colors.neonGreen }]}>
                  {overallStats.totalDistance.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Total Distance (mi)</Text>
              </LinearGradient>
              <LinearGradient
                colors={['rgba(85, 215, 255, 0.15)', 'rgba(85, 215, 255, 0.05)']}
                style={styles.statCard}
              >
                <Text style={[styles.statValue, { color: theme.colors.neonBlue }]}>
                  {formatDurationCompact(overallStats.totalDuration)}
                </Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </LinearGradient>
              <LinearGradient
                colors={['rgba(124, 92, 255, 0.15)', 'rgba(124, 92, 255, 0.05)']}
                style={styles.statCard}
              >
                <Text style={[styles.statValue, { color: theme.colors.neonPurple }]}>
                  {overallStats.avgPace.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Avg Pace (min/mi)</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Distance Over Time */}
          {chartData && chartData.distances.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Distance Over Time</Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Miles per {viewMode === 'week' ? 'week' : 'month'}</Text>
                </View>
              </View>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        data: chartData.distances,
                      },
                    ],
                  }}
                  width={screenWidth - 64}
                  height={240}
                  chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: CARD_BG,
                    backgroundGradientTo: CARD_BG,
                    fillShadowGradient: theme.colors.neonPink,
                    fillShadowGradientOpacity: 0.2,
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  segments={4}
                  fromZero
                />
              </View>
            </View>
          )}

          {/* Run Frequency */}
          {chartData && chartData.runCounts.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Run Frequency</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.neonGreen }]} />
                  <Text style={styles.legendText}>Runs per {viewMode === 'week' ? 'week' : 'month'}</Text>
                </View>
              </View>
              <View style={styles.chartContainer}>
                <BarChart
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        data: chartData.runCounts,
                      },
                    ],
                  }}
                  width={screenWidth - 64}
                  height={240}
                  chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: CARD_BG,
                    backgroundGradientTo: CARD_BG,
                    color: (opacity = 1) => `rgba(82, 255, 156, ${opacity})`,
                    fillShadowGradient: theme.colors.neonGreen,
                    fillShadowGradientOpacity: 0.3,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  segments={4}
                  fromZero
                />
              </View>
            </View>
          )}

          {/* Average Pace Trend */}
          {chartData && chartData.paces.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Average Pace Trend</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.neonBlue }]} />
                  <Text style={styles.legendText}>Minutes per mile</Text>
                </View>
              </View>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        data: chartData.paces,
                      },
                    ],
                  }}
                  width={screenWidth - 64}
                  height={240}
                  chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: CARD_BG,
                    backgroundGradientTo: CARD_BG,
                    color: (opacity = 1) => `rgba(85, 215, 255, ${opacity})`,
                    fillShadowGradient: theme.colors.neonBlue,
                    fillShadowGradientOpacity: 0.2,
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  segments={4}
                  yAxisSuffix=" min/mi"
                  fromZero
                />
              </View>
            </View>
          )}

          {runs.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No runs yet</Text>
              <Text style={styles.emptySubtext}>Start running to see your analytics!</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </OutsiderBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 26, 38, 0.8)',
    borderRadius: 14,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: theme.colors.neonPink,
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  viewModeText: {
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.neonPink,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: MUTED_TEXT,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statCard: {
    width: '48%',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: MUTED_TEXT,
    fontWeight: '500',
  },
  chartContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(11, 10, 14, 0.3)',
    padding: 8,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 4,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 15,
    color: MUTED_TEXT,
    textAlign: 'center',
  },
});
