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
import { theme } from '../theme';
import { fetchFriends } from '../services/friendService';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;

export default function LeaderboardScreen({ navigation }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('weekly'); // weekly, monthly, allTime

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
          const friends = await fetchFriends();
          const leaderboardData = friends
            .map((friend) => ({
              id: friend.id,
              userId: friend.id,
              name: friend.displayName ?? friend.name ?? 'Runner',
              distance: (friend.totalDistance ?? 0) / 1000,
              runs: friend.totalRuns ?? 0,
            }))
            .sort((a, b) => b.distance - a.distance)
            .map((entry, index) => ({
              ...entry,
              rank: index + 1,
            }));
          if (active) {
            setLeaderboard(leaderboardData);
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
    <OutsiderBackground accent="green">
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
                    {entry.runs} runs • {entry.distance.toFixed(1)} km
                  </Text>
                </View>
              </View>
              <View style={styles.distanceContainer}>
                <View>
                  <Text style={styles.distanceValue}>
                    {entry.distance.toFixed(1)}
                  </Text>
                  <Text style={styles.distanceLabel}>km</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.neonPink,
    borderColor: theme.colors.neonPink,
  },
  filterText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: theme.colors.text,
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
    color: theme.colors.text,
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
  userDetails: {
    flex: 1,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  userStats: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  distanceLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: theme.colors.textMuted,
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
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
