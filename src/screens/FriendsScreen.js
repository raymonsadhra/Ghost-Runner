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
import {
  fetchFriends,
  fetchPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from '../services/friendService';
import OutsiderBackground from '../components/OutsiderBackground';

const CARD_BG = theme.colors.surfaceElevated;
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const MUTED_TEXT = theme.colors.textMuted;
const POLL_INTERVAL_MS = 10000;

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeTime(value) {
  const date = toDate(value);
  if (!date) return 'No runs yet';
  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 60 * 1000) return 'just now';
  const minutes = Math.floor(deltaMs / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FriendsScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusTone, setStatusTone] = useState('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let inFlight = false;
      const loadFriendsData = async ({ showLoading = false } = {}) => {
        if (inFlight) return;
        inFlight = true;
        if (showLoading) {
          setIsLoading(true);
        }
        try {
          const [friendData, pendingData] = await Promise.all([
            fetchFriends(),
            fetchPendingRequests(),
          ]);
          if (active) {
            setFriends(friendData);
            setPendingRequests(pendingData);
          }
        } catch (error) {
          if (active) {
            setFriends([]);
            setPendingRequests([]);
          }
        } finally {
          if (active && showLoading) {
            setIsLoading(false);
          }
          inFlight = false;
        }
      };

      loadFriendsData({ showLoading: true });
      const intervalId = setInterval(() => {
        void loadFriendsData();
      }, POLL_INTERVAL_MS);
      return () => {
        active = false;
        clearInterval(intervalId);
      };
    }, [])
  );

  const handleAddFriend = async () => {
    if (!searchQuery.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await sendFriendRequest(searchQuery);
      if (result.status === 'already_friends') {
        setStatusTone('info');
        setStatusMessage('You are already friends with that user.');
      } else if (result.status === 'incoming_request') {
        setStatusTone('info');
        setStatusMessage('That user already sent you a request.');
      } else if (result.status === 'already_requested') {
        setStatusTone('info');
        setStatusMessage('Friend request already sent.');
      } else {
        setStatusTone('success');
        setStatusMessage('Friend request sent.');
      }
      setSearchQuery('');
      const [friendData, pendingData] = await Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
      ]);
      setFriends(friendData);
      setPendingRequests(pendingData);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error?.message || 'Could not send request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      setStatusTone('success');
      setStatusMessage('Friend added.');
      const [friendData, pendingData] = await Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
      ]);
      setFriends(friendData);
      setPendingRequests(pendingData);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error?.message || 'Could not accept request.');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await declineFriendRequest(requestId);
      setStatusTone('info');
      setStatusMessage('Request declined.');
      const pendingData = await fetchPendingRequests();
      setPendingRequests(pendingData);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error?.message || 'Could not decline request.');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await cancelFriendRequest(requestId);
      setStatusTone('info');
      setStatusMessage('Request canceled.');
      const pendingData = await fetchPendingRequests();
      setPendingRequests(pendingData);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error?.message || 'Could not cancel request.');
    }
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
              placeholder="Email, username, or user id..."
              placeholderTextColor={MUTED_TEXT}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleAddFriend}
              disabled={isSubmitting}
            >
              <Text style={styles.searchButtonText}>
                {isSubmitting ? 'Sending...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
          {statusMessage ? (
            <Text
              style={[
                styles.statusMessage,
                statusTone === 'error' && styles.statusError,
                statusTone === 'success' && styles.statusSuccess,
              ]}
            >
              {statusMessage}
            </Text>
          ) : null}
        </View>

        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {request.displayName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestName}>{request.displayName}</Text>
                    <Text style={styles.requestMeta}>
                      {request.direction === 'outgoing'
                        ? 'Request sent'
                        : 'Wants to be friends'}
                    </Text>
                  </View>
                </View>
                {request.direction === 'outgoing' ? (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.cancelButton]}
                      onPress={() => handleCancelRequest(request.id)}
                    >
                      <Text style={styles.requestButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
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
                  navigation.navigate('UserRunHistory', {
                    userId: friend.id,
                    userName: friend.displayName ?? friend.name ?? 'Runner',
                  });
                }}
              >
                <View style={styles.friendInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {friend.displayName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <View style={styles.friendNameRow}>
                      <Text style={styles.friendName}>{friend.displayName}</Text>
                    </View>
                    <Text style={styles.friendMeta}>
                      Last run: {formatRelativeTime(friend.lastRunAt)}
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
  statusMessage: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
  },
  statusError: {
    color: theme.colors.danger,
  },
  statusSuccess: {
    color: theme.colors.neonGreen,
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
  cancelButton: {
    backgroundColor: theme.colors.danger,
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
  },
  friendName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
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
