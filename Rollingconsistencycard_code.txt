/**
 * Cantabile - RollingConsistencyCard Component
 * Rolling 7-day consistency metric & polynomial XP curve (100 * L^2)
 * 
 * Strict non-punitive design: No streaks, no guilt, rolling window only
 * Pure React Native primitives & lucide-react-native icons
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award, Zap, Calendar, TrendingUp } from 'lucide-react-native';
import { db, DimInstrument } from '../database/schema';

interface RollingConsistencyCardProps {
  instrument: DimInstrument;
}

export const RollingConsistencyCard: React.FC<RollingConsistencyCardProps> = ({
  instrument,
}) => {
  const stats = db.getRolling7DayStats(instrument.instrument_id);
  const levelInfo = db.getLevelProgress(instrument.current_xp);

  const isTargetMet = stats.daysPracticed >= stats.targetDays;

  return (
    <View style={styles.cardContainer}>
      {/* Header: Instrument & Level Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Calendar size={18} color="#60a5fa" />
          <Text style={styles.cardTitle}>Rolling 7-Day Window</Text>
        </View>
        <View style={styles.levelBadge}>
          <Award size={14} color="#f59e0b" />
          <Text style={styles.levelBadgeText}>Lv. {levelInfo.currentLevel}</Text>
        </View>
      </View>

      <Text style={styles.gentleSubtext}>
        Measured over the past 7 days. Low friction, no broken streaks, no guilt.
      </Text>

      {/* Target Progress Counter */}
      <View style={styles.metricRow}>
        <View style={styles.targetProgressContainer}>
          <Text style={styles.bigCountText}>
            {stats.daysPracticed}
            <Text style={styles.targetDenominatorText}> / {stats.targetDays}</Text>
          </Text>
          <Text style={styles.targetLabel}>Target Days This Week</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            isTargetMet ? styles.statusPillMet : styles.statusPillOngoing,
          ]}
        >
          <TrendingUp
            size={14}
            color={isTargetMet ? '#10b981' : '#60a5fa'}
          />
          <Text
            style={[
              styles.statusPillText,
              isTargetMet ? styles.statusPillTextMet : styles.statusPillTextOngoing,
            ]}
          >
            {isTargetMet ? 'Target Reached' : `${stats.targetDays - stats.daysPracticed} more to goal`}
          </Text>
        </View>
      </View>

      {/* 7 Circular Day Dots */}
      <View style={styles.dayDotsContainer}>
        {stats.rollingDays.map((day, idx) => {
          return (
            <View key={`${day.dateStr}-${idx}`} style={styles.dayDotColumn}>
              <View
                style={[
                  styles.dayCircle,
                  day.isPracticed && styles.dayCirclePracticed,
                  day.isToday && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayCircleLetter,
                    day.isPracticed && styles.dayCircleLetterPracticed,
                  ]}
                >
                  {day.dayLetter}
                </Text>
              </View>
              <Text
                style={[
                  styles.dayLabelSub,
                  day.isToday && styles.dayLabelSubToday,
                ]}
              >
                {day.isToday ? 'Today' : day.dateStr.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Polynomial Level Progression Curve (100 * L^2) */}
      <View style={styles.levelCardSection}>
        <View style={styles.levelProgressHeader}>
          <View style={styles.levelTitleRow}>
            <Zap size={14} color="#a855f7" />
            <Text style={styles.levelProgressTitle}>Mastery Progression</Text>
          </View>
          <Text style={styles.xpFractionText}>
            {instrument.current_xp} / {levelInfo.nextLevelRequiredXp} XP
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${levelInfo.progressPercent}%` },
            ]}
          />
        </View>

        <View style={styles.levelFooterRow}>
          <Text style={styles.levelCurveInfo}>
            Level curve: 100 × L² (Polynomial growth)
          </Text>
          <Text style={styles.xpToNextText}>
            {levelInfo.xpToNextLevel} XP to Level {levelInfo.currentLevel + 1}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  levelBadgeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  gentleSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  targetProgressContainer: {
    flexDirection: 'column',
  },
  bigCountText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  targetDenominatorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  targetLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusPillMet: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillOngoing: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPillTextMet: {
    color: '#34d399',
  },
  statusPillTextOngoing: {
    color: '#60a5fa',
  },
  dayDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayDotColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCirclePracticed: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  dayCircleToday: {
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  dayCircleLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  dayCircleLetterPracticed: {
    color: '#ffffff',
  },
  dayLabelSub: {
    fontSize: 10,
    color: '#64748b',
  },
  dayLabelSubToday: {
    color: '#fbbf24',
    fontWeight: '700',
  },
  levelCardSection: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelProgressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  xpFractionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c084fc',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9333ea',
    borderRadius: 4,
  },
  levelFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelCurveInfo: {
    fontSize: 10,
    color: '#64748b',
  },
  xpToNextText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
