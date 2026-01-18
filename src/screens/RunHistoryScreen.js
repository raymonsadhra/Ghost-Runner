import React, { useCallback, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserRuns, updateRunName, deleteRun } from '../services/firebaseService';
import { formatDurationCompact } from '../utils/timeUtils';
import { formatDistanceMiles, calculatePacePerMile } from '../utils/distanceUtils';
import { theme } from '../theme';
import OutsiderBackground from '../components/OutsiderBackground';

const RUNS_LIMIT = 50;
const POLL_INTERVAL_MS = 10000;

function formatDate(timestamp) {
  return new Date(timestamp ?? Date.now()).toLocaleDateString();
}

function getRunTitle(run) {
  const trimmed = run.name?.trim();
  return trimmed || formatDate(run.timestamp);
}

function buildRunMeta(run, includeDate) {
  const distanceMeters = run.distance ?? 0;
  const durationSeconds = run.duration ?? 0;
  const pace = calculatePacePerMile(durationSeconds, distanceMeters);
  const distanceMiles = distanceMeters * 0.000621371;
  const parts = [];
  if (includeDate) {
    parts.push(formatDate(run.timestamp));
  }
  parts.push(`${distanceMiles.toFixed(2)} mi`);
  parts.push(formatDurationCompact(durationSeconds));
  parts.push(`Pace ${pace.toFixed(2)} min/mi`);
  return parts.join(' • ');
}

export default function RunHistoryScreen() {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const loadRunsRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let inFlight = false;
      const load = async ({ showLoading = false } = {}) => {
        if (inFlight) return;
        inFlight = true;
        if (showLoading) {
          setIsLoading(true);
        }
        try {
          const data = await getUserRuns(undefined, { max: RUNS_LIMIT });
          if (active) {
            setRuns(data);
          }
        } catch (error) {
          if (active) {
            setRuns([]);
          }
        } finally {
          if (active && showLoading) {
            setIsLoading(false);
          }
          inFlight = false;
        }
      };

      loadRunsRef.current = load;
      load({ showLoading: true });
      const intervalId = setInterval(() => {
        void load();
      }, POLL_INTERVAL_MS);
      return () => {
        active = false;
        loadRunsRef.current = null;
        clearInterval(intervalId);
      };
    }, [])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const loadRuns = loadRunsRef.current;
    if (loadRuns) {
      await loadRuns();
    }
    setIsRefreshing(false);
  };

  const openRename = (run) => {
    setEditingRun(run);
    setEditName(run.name?.trim() || formatDate(run.timestamp));
  };

  const closeRename = () => {
    setEditingRun(null);
    setEditName('');
  };

  const handleSaveName = async () => {
    if (!editingRun) return;
    const trimmed = editName.trim();
    const nextName = trimmed || formatDate(editingRun.timestamp);
    const currentName =
      editingRun.name?.trim() || formatDate(editingRun.timestamp);

    if (nextName === currentName) {
      closeRename();
      return;
    }

    setIsSavingName(true);
    try {
      await updateRunName(editingRun.id, nextName, {
        localId: editingRun.localId,
        localOnly: editingRun.localOnly,
      });
      setRuns((prev) =>
        prev.map((run) =>
          run.id === editingRun.id ? { ...run, name: nextName } : run
        )
      );
      closeRename();
    } finally {
      setIsSavingName(false);
    }
  };

  const confirmDelete = (run) => {
    Alert.alert('Delete this run?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(run.id, {
            localId: run.localId,
            localOnly: run.localOnly,
          });
          setRuns((prev) => prev.filter((item) => item.id !== run.id));
        },
      },
    ]);
  };

  const renderRun = ({ item }) => {
    const title = getRunTitle(item);
    const includeDate = Boolean(item.name?.trim());
    const meta = buildRunMeta(item, includeDate);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{meta}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.renameButton]}
            onPress={() => openRename(item)}
          >
            <Text style={styles.actionText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <OutsiderBackground accent="blue">
      <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Run History</Text>
        <Text style={styles.subtitle}>
          {isLoading ? 'Loading...' : `${runs.length} runs`}
        </Text>
      </View>

      <FlatList
        data={runs}
        renderItem={renderRun}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No runs yet. Finish a run to see it here.
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={Boolean(editingRun)}
        transparent
        animationType="fade"
        onRequestClose={closeRename}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename run</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Run name"
              placeholderTextColor="rgba(245, 242, 255, 0.5)"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={closeRename}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSave,
                  isSavingName && styles.modalSaveDisabled,
                ]}
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingName ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  renameButton: {
    backgroundColor: theme.colors.neonPurple,
    marginRight: theme.spacing.sm,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 10, 14, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(11, 10, 14, 0.7)',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginRight: theme.spacing.sm,
  },
  modalCancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  modalSave: {
    backgroundColor: theme.colors.neonPink,
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
