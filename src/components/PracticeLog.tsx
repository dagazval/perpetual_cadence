/**
 * Cantabile - PracticeLog Component
 * Minimalist Read-Only Practice Session Log
 * 
 * Strict Read-Only protection against accidental touch/swipe deletion
 * Layout: [Instrument Pill] • [Bold Duration] • [Primary Focus Tag] • [Relative Timestamp]
 * Pure React Native primitives & lucide-react-native icons
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Clock, Tag, History, Check } from 'lucide-react-native';
import { db, PracticeSessionWithTags } from '../database/schema';

interface PracticeLogProps {
  instrumentId?: string;
  refreshKey?: number;
}

export const PracticeLog: React.FC<PracticeLogProps> = ({
  instrumentId,
  refreshKey,
}) => {
  const sessions = db.getPracticeSessions(instrumentId, 30);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m`;
  };

  const getRelativeTime = (isoString: string) => {
    const sessionTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - sessionTime) / 1000);

    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hrs = Math.floor(diffSec / 3600);
      return `${hrs}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    const d = new Date(isoString);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <History size={16} color="#60a5fa" />
          <Text style={styles.title}>Practice Log</Text>
        </View>
        <Text style={styles.countBadge}>{sessions.length} sessions logged</Text>
      </View>

      <Text style={styles.subtext}>
        Read-only audit trail. All entries backed by relational fact tables.
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={32} color="#475569" />
          <Text style={styles.emptyTitle}>No qualifying sessions yet</Text>
          <Text style={styles.emptySub}>
            Complete a practice session of 5 minutes or longer to log progress.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false} // Outer screen handles scrolling cleanly
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const primaryTag =
              item.tags && item.tags.length > 0
                ? item.tags[0].tag_name
                : 'Free Practice';
            const extraTagsCount = item.tags ? Math.max(0, item.tags.length - 1) : 0;

            return (
              <View style={styles.sessionRow}>
                {/* Left: Instrument Pill & Duration */}
                <View style={styles.leftGroup}>
                  <View style={styles.instrumentPill}>
                    <Text style={styles.instrumentPillText}>
                      {item.instrument_name || 'Practice'}
                    </Text>
                  </View>

                  <Text style={styles.durationBold}>
                    {formatDuration(item.duration_seconds)}
                  </Text>
                </View>

                {/* Middle: Primary Focus Tag */}
                <View style={styles.tagGroup}>
                  <View style={styles.tagBadge}>
                    <Tag size={10} color="#94a3b8" />
                    <Text style={styles.tagText} numberOfLines={1}>
                      {primaryTag}
                    </Text>
                  </View>
                  {extraTagsCount > 0 && (
                    <Text style={styles.extraTagsText}>+{extraTagsCount}</Text>
                  )}
                </View>

                {/* Right: Relative Timestamp & Sync state */}
                <View style={styles.rightGroup}>
                  <Text style={styles.timeText}>
                    {getRelativeTime(item.started_at)}
                  </Text>
                  <View style={styles.syncDot}>
                    <Check size={10} color="#10b981" />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  countBadge: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  subtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  listContent: {
    gap: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instrumentPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  instrumentPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  durationBold: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
    gap: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: 120,
  },
  tagText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  extraTagsText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  syncDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 240,
  },
});
