import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;

export default function FriendsScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadFriends = async () => {
        setIsLoading(true);
        try {
          // TODO: Implement friends data fetching from Firebase
          // For now, using mock data
          const mockFriends = [
            { id: '1', name: 'Friend 1', status: 'active', lastRun: '2h ago' },
            { id: '2', name: 'Friend 2', status: 'active', lastRun: '5h ago' },
            { id: '3', name: 'Friend 3', status: 'away', lastRun: '1d ago' },
          ];
          const mockPending = [
            { id: '4', name: 'User 4', sent: false },
            { id: '5', name: 'User 5', sent: true },
          ];
          if (active) {
            setFriends(mockFriends);
            setPendingRequests(mockPending);
          }
        } catch (error) {
          if (active) {
            setFriends([]);
            setPendingRequests([]);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      loadFriends();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleAddFriend = () => {
    // TODO: Implement add friend functionality
    console.log('Add friend:', searchQuery);
  };

  const handleAcceptRequest = (requestId) => {
    // TODO: Implement accept friend request
    console.log('Accept request:', requestId);
  };

  const handleDeclineRequest = (requestId) => {
    // TODO: Implement decline friend request
    console.log('Decline request:', requestId);
  };

  return (
    <OutsiderBackground accent="blue">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Friend</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={MUTED_TEXT}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleAddFriend}
            >
              <Text style={styles.searchButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {request.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestName}>{request.name}</Text>
                    <Text style={styles.requestMeta}>
                      {request.sent ? 'Request sent' : 'Wants to be friends'}
                    </Text>
                  </View>
                </View>
                {!request.sent && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request.id)}
                    >
                      <Text style={styles.requestButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.declineButton]}
                      onPress={() => handleDeclineRequest(request.id)}
                    >
                      <Text style={styles.requestButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Friends</Text>
          {isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No friends yet. Add friends to compete and share your runs!
              </Text>
            </View>
          ) : (
            friends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendCard}
                onPress={() => {
                  // TODO: Navigate to friend's profile
                  console.log('View friend:', friend.id);
                }}
              >
                <View style={styles.friendInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {friend.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <View style={styles.friendNameRow}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <View
                        style={[
                          styles.statusIndicator,
                          friend.status === 'active'
                            ? styles.statusActive
                            : styles.statusAway,
                        ]}
                      />
                    </View>
                    <Text style={styles.friendMeta}>
                      Last run: {friend.lastRun}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
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
  container: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
  },
  searchButton: {
    backgroundColor: theme.colors.neonPink,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  requestDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  requestName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  requestMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  requestButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.neonGreen,
  },
  declineButton: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  requestButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  friendInfo: {
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
  friendDetails: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  friendName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: theme.colors.neonGreen,
  },
  statusAway: {
    backgroundColor: theme.colors.textMuted,
  },
  friendMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 24,
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
