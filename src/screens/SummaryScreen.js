import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { theme } from '../theme';

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function getInitialRegion(points) {
  if (!points.length) return DEFAULT_REGION;
  const last = points[points.length - 1];
  return {
    latitude: last.latitude,
    longitude: last.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

export default function SummaryScreen({ navigation, route }) {
  const routePoints = route.params?.routePoints ?? [];
  const distance = route.params?.distance ?? 0;
  const duration = route.params?.duration ?? 0;
  const pace = distance > 0 ? (duration / 60) / (distance / 1000) : 0;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={getInitialRegion(routePoints)}>
        <Polyline
          coordinates={routePoints}
          strokeColor={theme.colors.secondary}
          strokeWidth={4}
        />
      </MapView>
      <View style={styles.panel}>
        <Text style={styles.title}>Run Complete</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.floor(duration / 60)}:
              {(duration % 60).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pace.toFixed(2)}</Text>
            <Text style={styles.statLabel}>min/km</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('GhostRun', {
              ghostRoute: routePoints,
            })
          }
        >
          <Text style={styles.primaryText}>Race This Ghost</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  map: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    backgroundColor: 'rgba(15, 20, 27, 0.92)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.mist,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1D242C',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.mist,
    fontWeight: '700',
    fontSize: 18,
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.6,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryText: {
    color: theme.colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: theme.colors.mist,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryText: {
    color: theme.colors.mist,
    fontWeight: '600',
    fontSize: 16,
  },
});
