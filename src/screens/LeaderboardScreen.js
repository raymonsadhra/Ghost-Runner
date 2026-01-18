import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';
import { theme } from '../theme';

const PRIMARY_BLUE = '#2F6BFF';
const DARK_BG = '#0B0F17';
const CARD_BG = '#121A2A';
const CARD_BORDER = '#1E2A3C';
const MUTED_TEXT = '#8FA4BF';

export default function LeaderboardScreen({ navigation }) {
  const { formatDistance, formatDistanceParts } = useSettings();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('weekly'); // weekly, monthly, allTime

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
          // TODO: Implement leaderboard data fetching from Firebase
          // For now, using mock data
          const mockData = [
            { id: '1', name: 'Runner 1', distance: 15.2, runs: 5, rank: 1 },
            { id: '2', name: 'Runner 2', distance: 12.8, runs: 4, rank: 2 },
            { id: '3', name: 'Runner 3', distance: 10.5, runs: 3, rank: 3 },
            { id: '4', name: 'Runner 4', distance: 9.1, runs: 3, rank: 4 },
            { id: '5', name: 'Runner 5', distance: 8.3, runs: 2, rank: 5 },
          ];
          if (active) {
            setLeaderboard(mockData);
          }
        } catch (error) {
          if (active) {
            setLeaderboard([]);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      loadLeaderboard();
      return () => {
        active = false;
      };
    }, [selectedFilter])
  );

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboards</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'weekly' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('weekly')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'weekly' && styles.filterTextActive,
            ]}
          >
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'monthly' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('monthly')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'monthly' && styles.filterTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'allTime' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('allTime')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'allTime' && styles.filterTextActive,
            ]}
          >
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading leaderboard...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No leaderboard data available yet.
            </Text>
          </View>
        ) : (
          leaderboard.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.leaderboardCard}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('UserRunHistory', {
                  userId: entry.userId ?? entry.id,
                  userName: entry.name ?? 'Runner',
                })
              }
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>{getRankIcon(entry.rank)}</Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(entry.name ?? 'R').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{entry.name}</Text>
                  <Text style={styles.userStats}>
                    {entry.runs} runs • {formatDistance((entry.distance ?? 0) * 1000)}
                  </Text>
                </View>
              </View>
              <View style={styles.distanceContainer}>
                <View>
                  <Text style={styles.distanceValue}>
                    {formatDistanceParts((entry.distance ?? 0) * 1000).value}
                  </Text>
                  <Text style={styles.distanceLabel}>{formatDistanceParts((entry.distance ?? 0) * 1000).unit}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.mist,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  filterText: {
    color: MUTED_TEXT,
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: 'white',
  },
  container: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.mist,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: theme.colors.mist,
    fontSize: 16,
    fontWeight: '600',
  },
  userStats: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginTop: 2,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceValue: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  distanceLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: MUTED_TEXT,
    fontSize: 22,
    fontWeight: '300',
  },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  emptyText: {
    color: MUTED_TEXT,
    textAlign: 'center',
  },
});
