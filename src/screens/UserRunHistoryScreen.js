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
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const RUNS_LIMIT = 50;
const PRIMARY_BLUE = theme.colors.neonPink;
const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;

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
  const distanceKm = run.distanceKm ?? (run.distance ?? 0) / 1000;
  const durationMin = run.durationMin ?? Math.floor((run.duration ?? 0) / 60);
  const pace = distanceKm > 0 ? (run.duration ?? 0) / 60 / distanceKm : (run.pace ?? 0);
  const parts = [];
  if (includeDate) {
    parts.push(formatDate(run.timestamp));
  }
  parts.push(`${distanceKm.toFixed(2)} km`);
  parts.push(`${durationMin} min`);
  parts.push(`Pace ${pace.toFixed(2)} min/km`);
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
      const load = async () => {
        if (!userId) {
          if (active) {
            setRuns([]);
            setError('No user selected');
            setIsLoading(false);
          }
          return;
        }
        setIsLoading(true);
        setError(null);
        try {
          const data = await getUserRuns(userId, { max: RUNS_LIMIT });
          if (active) {
            setRuns(Array.isArray(data) ? data : []);
          }
        } catch (e) {
          if (active) {
            setRuns([]);
            setError('Could not load runs. They may be private.');
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };
      load();
      return () => { active = false; };
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
    fontSize: 22,
    fontWeight: '700',
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
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 6,
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
