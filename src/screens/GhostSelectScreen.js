import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { getUserRuns } from '../services/firebaseService';
import { theme } from '../theme';

export default function GhostSelectScreen({ navigation }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRuns = async () => {
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
  }, []);

  const renderRun = ({ item }) => {
    const distanceKm = (item.distance ?? 0) / 1000;
    const durationMin = Math.floor((item.duration ?? 0) / 60);
    const pace = distanceKm > 0 ? (item.duration / 60) / distanceKm : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('GhostRun', {
            ghostRoute: item.points,
            ghostMeta: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {new Date(item.timestamp ?? Date.now()).toLocaleDateString()}
          </Text>
          <Text style={styles.cardBadge}>Ghost</Text>
        </View>
        <Text style={styles.cardMeta}>
          {distanceKm.toFixed(2)} km • {durationMin} min
        </Text>
        <Text style={styles.cardMeta}>
          Pace {pace.toFixed(2)} min/km
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Ghost</Text>
      {isLoading ? (
        <Text style={styles.loading}>Loading runs...</Text>
      ) : (
        <FlatList
          data={runs}
          renderItem={renderRun}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No runs yet. Record a run to create your first ghost.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
    paddingTop: theme.spacing.lg,
  },
  title: {
    color: theme.colors.mist,
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  loading: {
    color: theme.colors.mist,
    opacity: 0.7,
    paddingHorizontal: theme.spacing.lg,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: '#1D242C',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBadge: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    fontWeight: '700',
    fontSize: 12,
  },
  cardMeta: {
    color: theme.colors.mist,
    opacity: 0.7,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#1D242C',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.mist,
    opacity: 0.7,
  },
});
