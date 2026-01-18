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
import { getUser } from '../services/firebaseService';
import { auth } from '../firebase';
import { formatDistanceKmToMiles } from '../utils/distanceUtils';
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
          const currentUserId = auth?.currentUser?.uid;
          const [friends, currentUser] = await Promise.all([
            fetchFriends(),
            currentUserId ? getUser(currentUserId).catch(() => null) : null,
          ]);

          // Build leaderboard entries from friends
          const friendEntries = friends.map((friend) => ({
            id: friend.id,
            userId: friend.id,
            name: friend.displayName ?? friend.name ?? 'Runner',
            distance: (friend.totalDistance ?? 0) * 0.000621371, // Convert meters to miles
            runs: friend.totalRuns ?? 0,
            isCurrentUser: false,
          }));

          // Add current user to leaderboard if they exist
          const allEntries = [...friendEntries];
          if (currentUser && currentUserId) {
            const currentUserEntry = {
              id: currentUserId,
              userId: currentUserId,
              name: currentUser.name ?? currentUser.displayName ?? 'You',
              distance: (currentUser.totalDistance ?? 0) * 0.000621371, // Convert meters to miles
              runs: currentUser.totalRuns ?? 0,
              isCurrentUser: true,
            };
            // Only add if not already in friends list
            const isAlreadyInList = friendEntries.some((f) => f.id === currentUserId);
            if (!isAlreadyInList) {
              allEntries.push(currentUserEntry);
            } else {
              // Mark the existing entry as current user
              const existingIndex = allEntries.findIndex((e) => e.id === currentUserId);
              if (existingIndex >= 0) {
                allEntries[existingIndex].isCurrentUser = true;
                allEntries[existingIndex].name = currentUser.name ?? currentUser.displayName ?? 'You';
              }
            }
          }

          // Sort by distance and assign ranks
          const leaderboardData = allEntries
            .sort((a, b) => b.distance - a.distance)
            .map((entry, index) => ({
              ...entry,
              rank: index + 1,
            }));

          if (active) {
            setLeaderboard(leaderboardData);
          }
        } catch (error) {
          console.error('Error loading leaderboard:', error);
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

        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 100 }]}>
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
              style={[
                styles.leaderboardCard,
                entry.isCurrentUser && styles.currentUserCard,
              ]}
              activeOpacity={0.7}
              onPress={() =>
                entry.isCurrentUser
                  ? navigation.getParent()?.navigate('ProfileTab')
                  : navigation.navigate('UserRunHistory', {
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
                  <Text style={[styles.userName, entry.isCurrentUser && styles.currentUserName]}>
                    {entry.isCurrentUser ? 'You' : entry.name}
                  </Text>
                  <Text style={styles.userStats}>
                    {entry.runs} runs • {entry.distance.toFixed(1)} mi
                  </Text>
                </View>
              </View>
              <View style={styles.distanceContainer}>
                <View>
                  <Text style={styles.distanceValue}>
                    {entry.distance.toFixed(1)}
                  </Text>
                  <Text style={styles.distanceLabel}>mi</Text>
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
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.neonPink,
    borderColor: theme.colors.neonPink,
    shadowColor: theme.colors.neonPink,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  filterText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  filterTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  container: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 26, 38, 0.6)',
    borderRadius: 18,
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
  currentUserCard: {
    borderWidth: 2,
    borderColor: theme.colors.neonPink,
    backgroundColor: 'rgba(255, 45, 122, 0.15)',
    shadowColor: theme.colors.neonPink,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  currentUserName: {
    color: theme.colors.neonPink,
    fontWeight: '900',
  },
  userStats: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
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
