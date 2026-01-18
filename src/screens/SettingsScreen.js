import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { theme } from '../theme';

const PRIMARY_BLUE = '#2F6BFF';
const CARD_BG = '#121A2A';
const CARD_BORDER = '#1E2A3C';
const MUTED_TEXT = '#8FA4BF';

function OptionRow({ label, options, value, onSelect }) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segmentedBtn, isActive && styles.segmentedBtnActive]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[styles.segmentedText, isActive && styles.segmentedTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.card}>
            <OptionRow
              label="Distance"
              options={[{ value: 'km', label: 'Kilometers' }, { value: 'mi', label: 'Miles' }]}
              value={settings.distanceUnit}
              onSelect={(v) => updateSettings({ distanceUnit: v })}
            />
            <Text style={styles.hint}>Pace (min/km or min/mi) follows this setting.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <View style={styles.card}>
            <OptionRow
              label="Week starts on"
              options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]}
              value={settings.weekStartsOn}
              onSelect={(v) => updateSettings({ weekStartsOn: v })}
            />
            <Text style={styles.hint}>Used for “This week” stats and goals.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  container: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.mist,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  optionRow: {
    marginBottom: theme.spacing.sm,
  },
  optionLabel: {
    color: theme.colors.mist,
    fontWeight: '600',
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentedBtnActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  segmentedText: {
    color: MUTED_TEXT,
    fontWeight: '600',
  },
  segmentedTextActive: {
    color: 'white',
  },
  hint: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginTop: 8,
  },
});
