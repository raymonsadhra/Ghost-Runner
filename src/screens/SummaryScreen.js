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
      <MapView 
        style={styles.map} 
        initialRegion={getInitialRegion(routePoints)}
        mapType="standard"
      >
        <Polyline
          coordinates={routePoints}
          strokeColor={theme.colors.secondary}
          strokeWidth={5}
        />
      </MapView>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Run Complete!</Text>
          <Text style={styles.subtitle}>Great job out there</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statUnit}>km</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Text style={styles.statValue}>
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statUnit}>min:sec</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statValue}>{pace.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Pace</Text>
            <Text style={styles.statUnit}>min/km</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('GhostRun', {
              ghostRoute: routePoints,
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.primaryText}>Race This Ghost 👻</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
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
    backgroundColor: 'rgba(15, 20, 27, 0.95)',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.slate,
  },
  header: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.mist,
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mist,
    opacity: 0.6,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statCardPrimary: {
    borderTopWidth: 3,
    borderTopColor: theme.colors.primary,
  },
  statCardSecondary: {
    borderTopWidth: 3,
    borderTopColor: theme.colors.secondary,
  },
  statCardAccent: {
    borderTopWidth: 3,
    borderTopColor: theme.colors.accent,
  },
  statValue: {
    color: theme.colors.mist,
    fontWeight: '800',
    fontSize: 22,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    color: theme.colors.mist,
    opacity: 0.7,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  statUnit: {
    color: theme.colors.mist,
    opacity: 0.5,
    fontSize: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  primaryText: {
    color: theme.colors.ink,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderColor: theme.colors.mist,
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryText: {
    color: theme.colors.mist,
    fontWeight: '600',
    fontSize: 16,
  },
});
