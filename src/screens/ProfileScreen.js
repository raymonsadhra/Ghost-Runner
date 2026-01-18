import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getUserRuns } from '../services/firebaseService';
import { seedFakeRuns } from '../services/seedFakeRuns';
import { loadRewards } from '../services/rewardService';
import { loadProfile, updateProfile } from '../services/profileService';
import { AVATAR_BASES, COSMETICS, COSMETIC_CATEGORIES } from '../config/cosmetics';
import { getProgressToNextLevel } from '../utils/leveling';
import { theme } from '../theme';

const PRIMARY_BLUE = '#2F6BFF';
const DARK_BG = '#0B0F17';
const CARD_BG = '#121A2A';
const CARD_BORDER = '#1E2A3C';
const MUTED_TEXT = '#8FA4BF';

function formatBadgeLabel(badgeId) {
  if (!badgeId) return 'Unknown';
  return badgeId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getWeekStart(timestamp) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function ProfileScreen() {
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState([]);
  const [unlocks, setUnlocks] = useState([]);
  const [bossWins, setBossWins] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [runs, setRuns] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const [rewards, loadedProfile, loadedRuns] = await Promise.all([
          loadRewards(),
          loadProfile(),
          getUserRuns(undefined, { max: 5 }),
        ]);
        if (!active) return;
        setXp(rewards.xp ?? 0);
        setBadges(rewards.badges ?? []);
        setUnlocks(rewards.unlocks ?? []);
        setBossWins(rewards.bossWins ?? []);
        setProfile(loadedProfile);
        setProfileName(loadedProfile?.name ?? '');
        setRuns(loadedRuns ?? []);
      };

      load();
      return () => {
        active = false;
      };
    }, [])
  );

  const progress = getProgressToNextLevel(xp);
  const nextLevelDelta = progress.nextLevelXp - xp;
  const currentOutfit = profile?.outfit ?? {};
  const selectedBase = profile?.base ?? AVATAR_BASES[0]?.id;

  const weekSummary = useMemo(() => {
    const weekStart = getWeekStart(Date.now());
    const weekRuns = runs.filter((run) => (run.timestamp ?? 0) >= weekStart);
    const distance = weekRuns.reduce((sum, run) => sum + (run.distance ?? 0), 0);
    const duration = weekRuns.reduce((sum, run) => sum + (run.duration ?? 0), 0);
    return {
      distanceKm: distance / 1000,
      durationMin: Math.floor(duration / 60),
      count: weekRuns.length,
    };
  }, [runs]);

  const isUnlocked = useCallback((item) => xp >= (item?.xpRequired ?? 0), [xp]);

  const updateProfilePatch = useCallback(async (patch) => {
    setIsSavingProfile(true);
    try {
      const next = await updateProfile(patch);
      setProfile(next);
      if (typeof next?.name === 'string') {
        setProfileName(next.name);
      }
    } finally {
      setIsSavingProfile(false);
    }
  }, []);

  const handleSaveName = useCallback(() => {
    const trimmed = profileName.trim() || 'Runner';
    updateProfilePatch({ name: trimmed });
  }, [profileName, updateProfilePatch]);

  const handleSelectBase = useCallback(
    (baseId) => {
      updateProfilePatch({ base: baseId });
    },
    [updateProfilePatch]
  );

  const handleSelectCosmetic = useCallback(
    (category, itemId) => {
      updateProfilePatch({
        outfit: {
          ...currentOutfit,
          [category]: itemId,
        },
      });
    },
    [currentOutfit, updateProfilePatch]
  );

  const handleSeedFakeRuns = useCallback(async () => {
    Alert.alert(
      'Seed fake runs',
      'Add 10 fake runs each for anon + Runner 1–5 (60 total)? This uses your Firebase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const { saved, failed, errors } = await seedFakeRuns({
                withLeaderboardUsers: true,
                runsPerUser: 10,
              });
              const msg = failed > 0
                ? `Saved: ${saved}. Failed: ${failed}. ${errors[0] || ''}`
                : `Done. ${saved} runs saved to Firebase.`;
              Alert.alert('Seed complete', msg);
              if (saved > 0) {
                const data = await getUserRuns(undefined, { max: 5 });
                setRuns(data ?? []);
              }
            } catch (e) {
              Alert.alert('Seed failed', e?.message || String(e));
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profileName || 'Runner').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName || 'Runner'}</Text>
            <Text style={styles.profileLocation}>Ghost Runner League</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{badges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bossWins.length}</Text>
            <Text style={styles.statLabel}>Boss Wins</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Level {progress.level}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress.progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressMeta}>
            {xp} XP • {nextLevelDelta} XP to level {progress.level + 1}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.weekRow}>
            <View style={styles.weekStat}>
              <Text style={styles.weekValue}>
                {weekSummary.distanceKm.toFixed(2)}
              </Text>
              <Text style={styles.weekLabel}>km</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekValue}>{weekSummary.durationMin}</Text>
              <Text style={styles.weekLabel}>min</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekValue}>{weekSummary.count}</Text>
              <Text style={styles.weekLabel}>runs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Character Studio</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Runner Name</Text>
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Your name"
              placeholderTextColor="rgba(233, 242, 244, 0.5)"
              style={styles.textInput}
            />
            <TouchableOpacity
              style={[
                styles.saveButton,
                isSavingProfile && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveName}
              disabled={isSavingProfile}
            >
              <Text style={styles.saveButtonText}>
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Base Style</Text>
            <View style={styles.optionRow}>
              {AVATAR_BASES.map((base) => {
                const isActive = base.id === selectedBase;
                return (
                  <TouchableOpacity
                    key={base.id}
                    style={[
                      styles.optionChip,
                      isActive && styles.optionChipActive,
                    ]}
                    onPress={() => handleSelectBase(base.id)}
                  >
                    <View
                      style={[
                        styles.optionSwatch,
                        { backgroundColor: base.color },
                      ]}
                    />
                    <Text style={styles.optionText}>{base.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {COSMETIC_CATEGORIES.map((category) => {
              const options = COSMETICS.filter(
                (item) => item.category === category.id
              );
              return (
                <View key={category.id} style={styles.cosmeticBlock}>
                  <Text style={styles.inputLabel}>{category.label}</Text>
                  <View style={styles.optionRow}>
                    {options.map((item) => {
                      const unlocked = isUnlocked(item);
                      const selected = currentOutfit[category.id] === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.optionChip,
                            selected && styles.optionChipActive,
                            !unlocked && styles.optionChipLocked,
                          ]}
                          onPress={() =>
                            unlocked && handleSelectCosmetic(category.id, item.id)
                          }
                          disabled={!unlocked}
                        >
                          <Text style={styles.optionText}>{item.name}</Text>
                          {!unlocked && (
                            <Text style={styles.optionHint}>
                              {item.xpRequired} XP
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.card}>
            {badges.length === 0 ? (
              <Text style={styles.sectionEmpty}>No badges yet.</Text>
            ) : (
              <View style={styles.badgeGrid}>
                {badges.map((badge) => (
                  <View key={badge} style={styles.badgeChip}>
                    <Text style={styles.badgeText}>{formatBadgeLabel(badge)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unlocks</Text>
          <View style={styles.card}>
            {unlocks.length === 0 ? (
              <Text style={styles.sectionEmpty}>No unlocks yet.</Text>
            ) : (
              unlocks.map((unlock) => (
                <Text key={unlock} style={styles.sectionRow}>
                  {formatBadgeLabel(unlock)}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {runs.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionEmpty}>No runs yet.</Text>
            </View>
          ) : (
            runs.map((run) => (
              <View key={run.id} style={styles.activityCard}>
                <Text style={styles.activityTitle}>
                  {run.name?.trim() ||
                    new Date(run.timestamp ?? Date.now()).toLocaleDateString()}
                </Text>
                <Text style={styles.activityMeta}>
                  {(run.distanceKm ?? (run.distance ?? 0) / 1000).toFixed(2)} km •{' '}
                  {Math.floor((run.duration ?? 0) / 60)} min
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <TouchableOpacity
            style={[styles.seedButton, isSeeding && styles.seedButtonDisabled]}
            onPress={handleSeedFakeRuns}
            disabled={isSeeding}
          >
            <Text style={styles.seedButtonText}>
              {isSeeding ? 'Seeding…' : 'Seed fake runs to Firebase'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: theme.colors.mist,
    fontSize: 22,
    fontWeight: '700',
  },
  profileLocation: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  cardTitle: {
    color: theme.colors.mist,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: CARD_BORDER,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
  },
  progressMeta: {
    color: MUTED_TEXT,
    marginTop: theme.spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
  },
  weekValue: {
    color: theme.colors.mist,
    fontSize: 20,
    fontWeight: '700',
  },
  weekLabel: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.mist,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: theme.spacing.sm,
  },
  sectionEmpty: {
    color: MUTED_TEXT,
  },
  inputLabel: {
    color: theme.colors.mist,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: theme.radius.md,
    color: theme.colors.mist,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#0F1626',
  },
  saveButton: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#0F1626',
  },
  optionChipActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: 'rgba(47, 107, 255, 0.15)',
  },
  optionChipLocked: {
    opacity: 0.5,
  },
  optionText: {
    color: theme.colors.mist,
    fontWeight: '600',
  },
  optionHint: {
    color: MUTED_TEXT,
    fontSize: 12,
  },
  optionSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  cosmeticBlock: {
    marginBottom: theme.spacing.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeChip: {
    backgroundColor: 'rgba(47, 107, 255, 0.12)',
    borderColor: 'rgba(47, 107, 255, 0.4)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    color: theme.colors.mist,
    fontWeight: '600',
  },
  sectionRow: {
    color: theme.colors.mist,
    opacity: 0.8,
    marginBottom: 4,
  },
  activityCard: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  activityTitle: {
    color: theme.colors.mist,
    fontWeight: '600',
    fontSize: 16,
  },
  activityMeta: {
    color: MUTED_TEXT,
    marginTop: 4,
  },
  seedButton: {
    backgroundColor: CARD_BG,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  seedButtonDisabled: {
    opacity: 0.6,
  },
  seedButtonText: {
    color: MUTED_TEXT,
    fontWeight: '600',
  },
});
