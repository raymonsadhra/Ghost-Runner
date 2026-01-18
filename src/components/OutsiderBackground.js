import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../theme';

const ACCENT_GRADIENTS = {
  pink: theme.gradients.pink,
  green: theme.gradients.green,
  purple: theme.gradients.purple,
  blue: theme.gradients.blue,
  base: theme.gradients.base,
};

const ACCENT_GLOWS = {
  pink: theme.colors.glowPink,
  green: theme.colors.glowGreen,
  purple: theme.colors.glowPurple,
  blue: theme.colors.glowBlue,
  base: theme.colors.glowPurple,
};

export default function OutsiderBackground({ accent = 'base', children, style }) {
  const gradient = ACCENT_GRADIENTS[accent] ?? ACCENT_GRADIENTS.base;
  const glow = ACCENT_GLOWS[accent] ?? ACCENT_GLOWS.base;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      {/* Enhanced glow effects */}
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: glow }]} />
      <View
        pointerEvents="none"
        style={[styles.glowSmall, { backgroundColor: glow }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glowMedium, { backgroundColor: glow }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -160,
    right: -140,
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.7,
    shadowColor: theme.colors.neonPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  glowSmall: {
    position: 'absolute',
    bottom: -180,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.5,
    shadowColor: theme.colors.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  glowMedium: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.25,
    transform: [{ translateX: -140 }],
    shadowColor: theme.colors.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
});
