import { Award, Play, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AppStateStatus
} from 'react-native';
import { db, DimInstrument, DimTag } from '../database/schema';

interface PracticeStopwatchProps {
  activeInstrument: DimInstrument;
  refreshKey?: number;
  onSessionSaved: () => void;
}

export function PracticeStopwatch({
  activeInstrument,
  refreshKey,
  onSessionSaved,
}: PracticeStopwatchProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [availableTags, setAvailableTags] = useState<DimTag[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set());

  // Timestamp anchor for drift-free delta math
  const startedAtRef = useRef<number | null>(null);

// Load active tags for the selected instrument (and refresh when cloud sync or tag approvals run)
  useEffect(() => {
    try {
      const tags = db.getTagsForInstrument(activeInstrument.instrument_id);
      setAvailableTags(tags);

      // Default selection: select 'Warm Up' segment on initial load if none selected yet
      const warmUpTag = tags.find(
        (t) => t.tag_name.toLowerCase() === 'warm up' && t.tag_type === 'Session Segment'
      );
      if (warmUpTag && activeTagIds.size === 0) {
        setActiveTagIds(new Set([warmUpTag.tag_id]));
      }
    } catch (err) {
      console.error('[LOAD TAGS ERROR]:', err);
    }
  }, [activeInstrument.instrument_id, refreshKey]);

  // AppState listener: Recalculate exact delta whenever app returns from background / sleep
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isRunning && startedAtRef.current) {
        const currentElapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(currentElapsed);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Foreground tick interval (visual ticker)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && startedAtRef.current) {
      interval = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000);
        setElapsedSeconds(currentElapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const handleStart = () => {
    // Preserve elapsed offset if resuming
    startedAtRef.current = Date.now() - elapsedSeconds * 1000;
    setIsRunning(true);
  };

  const handleStop = () => {
    const finalSeconds = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : elapsedSeconds;

    setIsRunning(false);

    // 5-minute threshold rule (300 seconds)
    if (finalSeconds < 300) {
      console.log(`[STOPWATCH] Under 5 min (${finalSeconds}s). Discarded per zero-friction rule.`);
    } else {
      const startedIso = new Date(startedAtRef.current || Date.now() - finalSeconds * 1000).toISOString();
      const endedIso = new Date().toISOString();

      try {
        db.recordSession({
          instrument_id: activeInstrument.instrument_id,
          started_at: startedIso,
          ended_at: endedIso,
          duration_seconds: finalSeconds,
          tag_ids: Array.from(activeTagIds),
        });
        onSessionSaved();
      } catch (err) {
        console.error('[SESSION RECORD ERROR]:', err);
      }
    }

    // Reset clock state
    startedAtRef.current = null;
    setElapsedSeconds(0);
  };

  const toggleTag = (tagId: string) => {
    setActiveTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Group tags by category ('Session Segment', 'Technique Focus', etc.)
  const categories = Array.from(new Set(availableTags.map((t) => t.tag_type)));

  return (
    <View style={styles.container}>
      {/* Timer Display Card */}
      <View style={styles.timerCard}>
        <Text style={styles.instrumentIndicator}>{activeInstrument.name} Practice</Text>
        <Text style={styles.timerDisplay}>{formatTime(elapsedSeconds)}</Text>

        {/* 5-Min XP Status Indicator */}
        <View style={styles.xpStatusRow}>
          <Award size={16} color={elapsedSeconds >= 300 ? '#10b981' : '#6b7280'} />
          <Text
            style={[
              styles.xpStatusText,
              elapsedSeconds >= 300 && styles.xpStatusTextActive,
            ]}
          >
            {elapsedSeconds >= 300
              ? `XP Active: +${Math.floor(elapsedSeconds / 60) * 10} XP`
              : `${Math.ceil((300 - elapsedSeconds) / 60)}m left to qualify for XP`}
          </Text>
        </View>

        {/* Start / Stop Button */}
        <TouchableOpacity
          onPress={isRunning ? handleStop : handleStart}
          style={[styles.actionButton, isRunning ? styles.stopButton : styles.startButton]}
          activeOpacity={0.8}
        >
          {isRunning ? (
            <>
              <Square size={20} color="#ffffff" fill="#ffffff" />
              <Text style={styles.actionButtonText}>Stop Practice</Text>
            </>
          ) : (
            <>
              <Play size={20} color="#ffffff" fill="#ffffff" />
              <Text style={styles.actionButtonText}>Start Practice</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Multi-Tag Matrix (Vertical categories containing horizontal chip rows) */}
      <View style={styles.tagMatrixContainer}>
        <Text style={styles.sectionHeader}>Practice Focus Tags</Text>

        {categories.map((category) => {
          const categoryTags = availableTags.filter((t) => t.tag_type === category);

          return (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categoryTags}
                keyExtractor={(item) => item.tag_id}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item }) => {
                  const isSelected = activeTagIds.has(item.tag_id);
                  return (
                    <TouchableOpacity
                      onPress={() => toggleTag(item.tag_id)}
                      style={[
                        styles.tagChip,
                        isSelected && styles.tagChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          isSelected && styles.tagChipTextSelected,
                        ]}
                      >
                        {item.tag_name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerCard: {
    backgroundColor: '#1b132e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2e204d',
    marginBottom: 24,
  },
  instrumentIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginVertical: 4,
  },
  xpStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
  },
  xpStatusText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  xpStatusTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButton: {
    backgroundColor: '#6d28d9',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tagMatrixContainer: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1b132e',
    borderWidth: 1,
    borderColor: '#2e204d',
  },
  tagChipSelected: {
    backgroundColor: '#4c1d95',
    borderColor: '#7c3aed',
  },
  tagChipText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
});