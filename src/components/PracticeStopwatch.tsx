/**
 * Cantabile - PracticeStopwatch Component
 * 1-Tap Zero-Friction Stopwatch & Multi-Tag Matrix
 * 
 * Strict React Native Primitives & lucide-react-native icons
 * Delta math clock (Date.now() - started_at) resilient against app switching & backgrounding
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native';
import {
  Play,
  Square,
  Sparkles,
  Tag as TagIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
} from 'lucide-react-native';
import { db, DimTag, DimInstrument } from '../database/schema';

interface PracticeStopwatchProps {
  activeInstrument: DimInstrument;
  onSessionSaved: () => void;
}

export const PracticeStopwatch: React.FC<PracticeStopwatchProps> = ({
  activeInstrument,
  onSessionSaved,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [sessionNotice, setSessionNotice] = useState<{
    type: 'success' | 'discard';
    message: string;
  } | null>(null);

  // Delta math references
  const startTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Load available tags for active instrument
  const availableTags = db.getTagsForInstrument(activeInstrument.instrument_id);
  const segmentTags = availableTags.filter((t) => t.tag_type === 'Session Segment');
  const techniqueTags = availableTags.filter((t) => t.tag_type === 'Technique Focus');

  // Initialize default 1-tap tag selection: default to 'Warm Up' segment
  useEffect(() => {
    const warmUpTag = segmentTags.find((t) => t.tag_name.toLowerCase() === 'warm up');
    if (warmUpTag && selectedTagIds.size === 0) {
      setSelectedTagIds(new Set([warmUpTag.tag_id]));
    }
  }, [activeInstrument.instrument_id]);

  // Delta math timer tick
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const deltaSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(deltaSec);
        }
      }, 500);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  // Toggle tag in bridge_session_tags without interrupting running clock
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(tagId)) {
        updated.delete(tagId);
      } else {
        updated.add(tagId);
      }
      return updated;
    });
  };

  const handleStartPractice = () => {
    setSessionNotice(null);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  const handleStopPractice = () => {
    if (!startTimeRef.current) return;
    const endedAt = Date.now();
    const duration = Math.floor((endedAt - startTimeRef.current) / 1000);
    setIsRunning(false);

    // End-of-Session Threshold Logic
    if (duration < 300) {
      // Under 5 minutes: Discard completely. Zero guilt, no DB write.
      setSessionNotice({
        type: 'discard',
        message: `Practiced ${Math.floor(duration / 60)}m ${duration % 60}s. Sessions under 5 minutes are kept off the record—zero pressure!`,
      });
      setElapsedSeconds(0);
      startTimeRef.current = null;
    } else {
      // 5 minutes or more: Save transactionally & award XP
      try {
        const result = db.recordSession({
          instrument_id: activeInstrument.instrument_id,
          started_at: new Date(startTimeRef.current).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          duration_seconds: duration,
          tag_ids: Array.from(selectedTagIds),
        });

        setSessionNotice({
          type: 'success',
          message: `Great focus! Saved ${Math.floor(duration / 60)} min session. +${result.xpEarned} XP awarded!`,
        });
        setElapsedSeconds(0);
        startTimeRef.current = null;
        onSessionSaved();
      } catch (err: any) {
        setSessionNotice({
          type: 'discard',
          message: err.message || 'Error recording session',
        });
      }
    }
  };

  // Clock Formatting (HH:MM:SS or MM:SS)
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isQualifyingThreshold = elapsedSeconds >= 300;
  const currentProjectedXp = Math.floor(elapsedSeconds / 60) * 10;

  return (
    <View style={styles.container}>
      {/* Timer Display Card */}
      <View style={[styles.timerCard, isRunning && styles.timerCardActive]}>
        <View style={styles.instrumentBadgeRow}>
          <View style={styles.instrumentBadge}>
            <Text style={styles.instrumentBadgeText}>
              {activeInstrument.name}
            </Text>
          </View>

          {isRunning && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>DELTA MATH CLOCK</Text>
            </View>
          )}
        </View>

        {/* Digital Display */}
        <Text style={[styles.timerDigits, isRunning && styles.timerDigitsActive]}>
          {formatTime(elapsedSeconds)}
        </Text>

        {/* Threshold Status & XP Indicator */}
        <View style={styles.statusIndicatorRow}>
          {isRunning ? (
            isQualifyingThreshold ? (
              <View style={styles.qualifyingBadge}>
                <Flame size={14} color="#f59e0b" />
                <Text style={styles.qualifyingText}>
                  Qualifies for 7-day target • +{currentProjectedXp} XP
                </Text>
              </View>
            ) : (
              <View style={styles.preQualifyingBadge}>
                <Clock size={14} color="#94a3b8" />
                <Text style={styles.preQualifyingText}>
                  {Math.ceil((300 - elapsedSeconds) / 60)}m left to count for consistency (5m min)
                </Text>
              </View>
            )
          ) : (
            <Text style={styles.readyPromptText}>
              Tap start to begin. Defaults to Warm Up for zero-friction entry.
            </Text>
          )}
        </View>

        {/* Primary Action Button (Thumb-accessible) */}
        {!isRunning ? (
          <TouchableOpacity
            style={styles.primaryStartButton}
            activeOpacity={0.8}
            onPress={handleStartPractice}
          >
            <Play size={22} color="#ffffff" fill="#ffffff" />
            <Text style={styles.primaryStartButtonText}>Start Practice</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryStopButton}
            activeOpacity={0.8}
            onPress={handleStopPractice}
          >
            <Square size={20} color="#ffffff" fill="#ffffff" />
            <Text style={styles.primaryStopButtonText}>Stop Practice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gentle Non-Punitive Notice Banner */}
      {sessionNotice && (
        <View
          style={[
            styles.noticeCard,
            sessionNotice.type === 'success'
              ? styles.noticeCardSuccess
              : styles.noticeCardDiscard,
          ]}
        >
          {sessionNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <AlertCircle size={18} color="#94a3b8" />
          )}
          <Text
            style={[
              styles.noticeText,
              sessionNotice.type === 'success'
                ? styles.noticeTextSuccess
                : styles.noticeTextDiscard,
            ]}
          >
            {sessionNotice.message}
          </Text>
        </View>
      )}

      {/* Multi-Tag Matrix: Outer Vertical ScrollView */}
      <ScrollView
        style={styles.matrixScrollView}
        contentContainerStyle={styles.matrixScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.matrixHeaderRow}>
          <TagIcon size={16} color="#60a5fa" />
          <Text style={styles.matrixTitle}>Session & Technique Tag Matrix</Text>
        </View>
        <Text style={styles.matrixSubtitle}>
          Tap chips to tag on the fly without interrupting the timer clock.
        </Text>

        {/* Row 1: Session Segments */}
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>Session Segments</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={segmentTags}
            keyExtractor={(item) => item.tag_id}
            contentContainerStyle={styles.chipRowContainer}
            renderItem={({ item }) => {
              const isSelected = selectedTagIds.has(item.tag_id);
              return (
                <TouchableOpacity
                  style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(item.tag_id)}
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

        {/* Row 2: Technique Focus (Staged & Active) */}
        <View style={styles.categoryBlock}>
          <View style={styles.categoryLabelWithIcon}>
            <Text style={styles.categoryLabel}>Technique Focus</Text>
            <Sparkles size={12} color="#a855f7" />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={techniqueTags}
            keyExtractor={(item) => item.tag_id}
            contentContainerStyle={styles.chipRowContainer}
            renderItem={({ item }) => {
              const isSelected = selectedTagIds.has(item.tag_id);
              return (
                <TouchableOpacity
                  style={[
                    styles.tagChip,
                    styles.techniqueChip,
                    isSelected && styles.techniqueChipSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(item.tag_id)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      isSelected && styles.techniqueChipTextSelected,
                    ]}
                  >
                    {item.tag_name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: 16,
  },
  timerCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0f172a',
  },
  instrumentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  instrumentBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instrumentBadgeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 6,
  },
  liveText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerDigits: {
    fontFamily: 'monospace',
    fontSize: 64,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 2,
    marginVertical: 6,
  },
  timerDigitsActive: {
    color: '#60a5fa',
  },
  statusIndicatorRow: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qualifyingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  qualifyingText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  preQualifyingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  preQualifyingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  readyPromptText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  primaryStartButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryStartButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryStopButton: {
    backgroundColor: '#ef4444',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryStopButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  noticeCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  noticeCardDiscard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeTextSuccess: {
    color: '#34d399',
    fontWeight: '500',
  },
  noticeTextDiscard: {
    color: '#94a3b8',
  },
  matrixScrollView: {
    flex: 1,
  },
  matrixScrollContent: {
    paddingBottom: 24,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  matrixTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  matrixSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  chipRowContainer: {
    paddingVertical: 2,
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  techniqueChip: {
    borderColor: '#475569',
  },
  techniqueChipSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#8b5cf6',
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tagChipTextSelected: {
    color: '#ffffff',
  },
  techniqueChipTextSelected: {
    color: '#ffffff',
  },
});
