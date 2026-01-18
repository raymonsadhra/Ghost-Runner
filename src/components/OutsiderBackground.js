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
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: glow }]} />
      <View
        pointerEvents="none"
        style={[styles.glowSmall, { backgroundColor: glow }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  glow: {
    position: 'absolute',
    top: -140,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.85,
  },
  glowSmall: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.6,
  },
});
