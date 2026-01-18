import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserRuns } from '../services/firebaseService';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceKmToMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const RUNS_LIMIT = 50;
const PRIMARY_BLUE = theme.colors.neonPink;
const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;
const POLL_INTERVAL_MS = 10000;

function formatDate(timestamp) {
  return new Date(timestamp ?? Date.now()).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRunTitle(run) {
  const trimmed = run.name?.trim();
  return trimmed || formatDate(run.timestamp);
}

function buildRunMeta(run, includeDate) {
  const distanceMeters = run.distance ?? (run.distanceKm ? run.distanceKm * 1000 : 0);
  const durationSeconds = run.duration ?? (run.durationMin ?? 0) * 60;
  const pace = calculatePacePerMile(durationSeconds, distanceMeters);
  const distanceMiles = distanceMeters * 0.000621371;
  const parts = [];
  if (includeDate) {
    parts.push(formatDate(run.timestamp));
  }
  parts.push(`${distanceMiles.toFixed(2)} mi`);
  parts.push(formatDurationCompact(durationSeconds));
  parts.push(`Pace ${pace.toFixed(2)} min/mi`);
  return parts.join(' • ');
}

export default function UserRunHistoryScreen({ route, navigation }) {
  const userId = route.params?.userId ?? null;
  const userName = route.params?.userName ?? 'Runner';

  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let inFlight = false;
      const load = async ({ showLoading = false } = {}) => {
        if (inFlight) return;
        inFlight = true;
        if (!userId) {
          if (active) {
            setRuns([]);
            setError('No user selected');
            setIsLoading(false);
          }
          inFlight = false;
          return;
        }
        if (showLoading) {
          setIsLoading(true);
          setError(null);
        }
        try {
          const data = await getUserRuns(userId, { max: RUNS_LIMIT });
          if (active) {
            setRuns(Array.isArray(data) ? data : []);
            setError(null);
          }
        } catch (e) {
          if (active) {
            setRuns([]);
            setError('Could not load runs. They may be private.');
          }
        } finally {
          if (active) {
            if (showLoading) {
              setIsLoading(false);
            }
          }
          inFlight = false;
        }
      };
      load({ showLoading: true });
      const intervalId = setInterval(() => {
        void load();
      }, POLL_INTERVAL_MS);
      return () => {
        active = false;
        clearInterval(intervalId);
      };
    }, [userId])
  );

  const renderRun = ({ item }) => {
    const title = getRunTitle(item);
    const includeDate = Boolean(item.name?.trim());
    const meta = buildRunMeta(item, includeDate);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{meta}</Text>
      </View>
    );
  };

  return (
    <OutsiderBackground accent="blue">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userName || 'R').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{userName}'s Runs</Text>
              <Text style={styles.subtitle}>
                {isLoading ? 'Loading...' : `${runs.length} runs`}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={runs}
            renderItem={renderRun}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No runs to show.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </OutsiderBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neonPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
  },
});
