import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

export interface RepertoirePiece {
  id: string;
  title: string;
  subtitle?: string;
}

export interface CyberJuryLockscreenProps {
  juryDateIso?: string;
  targetDailyMinutes?: number;
  todayPracticeMinutes?: number;
  todayPracticedMinutes?: number; // alias fallback
  rollingConsistencyDays?: number;
  rolling7DaysPracticed?: boolean[];
  repertoire?: RepertoirePiece[];
}

const DEFAULT_REPERTOIRE: RepertoirePiece[] = [
  { id: '1', title: 'I Feel The Earth Move', subtitle: 'Carole King' },
  { id: '2', title: 'Lesson 3 - Intervals of the Sixth', subtitle: 'Vaccai Method' },
  { id: '3', title: 'Shenandoah', subtitle: 'American Folk / Arr. Althouse' },
];

function getActiveMilestone(now: Date): { tag: string; title: string; detail: string } {
  const month = now.getMonth(); // 10 = Nov, 11 = Dec
  const day = now.getDate();

  if (month === 10 && day <= 15) {
    return {
      tag: 'NEXT MILESTONE // MON NOV 16',
      title: 'Pianist Rehearsal #1 • 9:30 AM',
      detail: 'Full top-to-bottom run • Memorization locked',
    };
  }
  if (month === 10 && day === 16) {
    return {
      tag: 'TODAY // 9:30 AM',
      title: 'Pianist Rehearsal #1',
      detail: 'Run all 3 selections & isolate trouble spots',
    };
  }
  if (month === 10 && day <= 20) {
    return {
      tag: 'NEXT MILESTONE // FRI NOV 20',
      title: 'Final Pianist Rehearsal',
      detail: 'Lock Vaccai L3 sixths & accompanist cues',
    };
  }
  if ((month === 10 && day >= 21) || (month === 11 && day <= 3)) {
    return {
      tag: 'PHASE // DRESS RUNS',
      title: 'Independent Dress Runs (20m/day)',
      detail: 'Full sequential runs with accompanist tracks',
    };
  }
  if (month === 11 && day === 4) {
    return {
      tag: 'TOMORROW // JURY DAY',
      title: 'Vocal Taper & Light Rest Day',
      detail: 'Gentle humming only • Conserve vocal stamina',
    };
  }
  return {
    tag: 'PROTOCOL // VOICE JURY',
    title: 'Performance Ready • 10:32 AM',
    detail: 'All 3 selections memorized & performance-prepped',
  };
}

export const CyberJuryLockscreen: React.FC<CyberJuryLockscreenProps> = ({
  juryDateIso = '2026-12-05T10:32:00',
  targetDailyMinutes = 20,
  todayPracticeMinutes,
  todayPracticedMinutes,
  rollingConsistencyDays,
  rolling7DaysPracticed,
  repertoire = DEFAULT_REPERTOIRE,
}) => {
  const actualTodayMinutes = todayPracticeMinutes ?? todayPracticedMinutes ?? 0;

  const { countdown, isJuryDay, milestone } = useMemo(() => {
    const target = new Date(juryDateIso).getTime();
    const now = new Date();
    const diffMs = Math.max(0, target - now.getTime());

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    const juryToday =
      now.getFullYear() === 2026 &&
      now.getMonth() === 11 &&
      now.getDate() === 5;

    return {
      countdown: { days, hours },
      isJuryDay: juryToday,
      milestone: getActiveMilestone(now),
    };
  }, [juryDateIso]);

  const resolved7Days = useMemo(() => {
    if (rolling7DaysPracticed && rolling7DaysPracticed.length > 0) {
      return rolling7DaysPracticed;
    }
    if (typeof rollingConsistencyDays === 'number') {
      const count = Math.max(0, Math.min(7, Math.round(rollingConsistencyDays)));
      return Array.from({ length: 7 }, (_, i) => i >= 7 - count);
    }
    return [false, false, false, false, false, false, false];
  }, [rollingConsistencyDays, rolling7DaysPracticed]);

  const rawPercent = Math.round(
    (actualTodayMinutes / Math.max(1, targetDailyMinutes)) * 100
  );
  const isOverdrive = actualTodayMinutes > targetDailyMinutes;
  const barPercent = Math.min(100, rawPercent);

  const dayLabels = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'YST', 'TDY'];

  return (
    <ImageBackground
      source={require('../../assets/images/cyber_bg.png')}
      style={styles.canvas}
      resizeMode="cover"
    >
      <View style={styles.hudOverlay}>
        {/* Top 41% Void Spacer: Clears Pixel clock, date & notification pill */}
        <View style={styles.topVoidSpacer} />

        {/* HUD Section 1: Jury Countdown OR Day-Of Schedule */}
        <View style={styles.hudCard}>
          {isJuryDay ? (
            <View>
              <View style={styles.hudHeaderRow}>
                <Text style={styles.dayOfTag}>// JURY DAY PROTOCOL</Text>
                <Text style={styles.hudTargetDate}>SAT DEC 05</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleTime}>09:00 AM</Text>
                <Text style={styles.scheduleEvent}>Warm Up at Home (30m)</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleTime}>09:30 AM</Text>
                <Text style={styles.scheduleEvent}>Bike to Campus (30m)</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleTime}>10:00 AM</Text>
                <Text style={styles.scheduleEvent}>Arrival & Check-In</Text>
              </View>
              <View style={[styles.scheduleRow, styles.juryHighlightRow]}>
                <Text style={styles.juryTime}>10:32 AM</Text>
                <Text style={styles.juryText}>VOICE JURY</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.hudHeaderRow}>
                <Text style={styles.hudTag}>// JURY TELEMETRY</Text>
                <Text style={styles.hudTargetDate}>TARGET: DEC 05 2026</Text>
              </View>

              <View style={styles.countdownRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.countdownValue}>
                    {String(countdown.days).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countdownUnit}>DAYS</Text>
                </View>

                <Text style={styles.countdownSeparator}>:</Text>

                <View style={styles.timeBlock}>
                  <Text style={styles.countdownValue}>
                    {String(countdown.hours).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countdownUnit}>HRS</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* HUD Section 2: Next Milestone Badge */}
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTag}>{milestone.tag}</Text>
          <Text style={styles.milestoneTitle}>{milestone.title}</Text>
          <Text style={styles.milestoneDetail}>{milestone.detail}</Text>
        </View>

        {/* HUD Section 3: Daily 20-Min Practice Gauge & 7-Day Rolling Cadence */}
        <View style={styles.hudCard}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudTag}>// DAILY CADENCE</Text>
            <Text
              style={[
                styles.hudMetricText,
                isOverdrive && styles.overdriveMetricText,
              ]}
            >
              {actualTodayMinutes} / {targetDailyMinutes} MIN (
              {isOverdrive ? `${rawPercent}% OVERDRIVE` : `${rawPercent}%`})
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${barPercent}%` },
                isOverdrive && styles.progressFillOverdrive,
              ]}
            />
          </View>

          <View style={styles.rollingRow}>
            {resolved7Days.slice(0, 7).map((practiced, idx) => (
              <View key={idx} style={styles.rollingCol}>
                <View
                  style={[
                    styles.rollingDot,
                    practiced ? styles.rollingDotActive : styles.rollingDotInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.rollingLabel,
                    idx === 6 && styles.rollingLabelToday,
                  ]}
                >
                  {dayLabels[idx] || ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* HUD Section 4: Active Repertoire Matrix */}
        <View style={styles.hudCard}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudTag}>// ACTIVE REPERTOIRE</Text>
            <Text style={styles.hudMetricText}>VOICE</Text>
          </View>

          {repertoire.slice(0, 3).map((piece, index) => (
            <View
              key={piece.id}
              style={[
                styles.repertoireRow,
                index < repertoire.slice(0, 3).length - 1 && styles.repertoireDivider,
              ]}
            >
              <Text style={styles.repertoireIndex}>0{index + 1}</Text>
              <View style={styles.repertoireTextWrap}>
                <Text style={styles.repertoireTitle} numberOfLines={1}>
                  {piece.title}
                </Text>
                {piece.subtitle ? (
                  <Text style={styles.repertoireSubtitle} numberOfLines={1}>
                    {piece.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: 1344,
    height: 2992,
    backgroundColor: '#0f0a1e',
  },
  hudOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.42)',
    paddingHorizontal: 68,
    justifyContent: 'flex-start',
    gap: 20,
  },
  topVoidSpacer: {
    height: 1230, // ~41.1% clearance for Pixel clock, date & notification icons
  },
  hudCard: {
    backgroundColor: 'rgba(15, 10, 30, 0.80)',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.75)',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 34,
  },
  milestoneCard: {
    backgroundColor: 'rgba(23, 14, 48, 0.86)',
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.65)',
    borderLeftWidth: 10,
    borderLeftColor: '#22d3ee',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  milestoneTag: {
    fontSize: 19,
    fontWeight: '800',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  milestoneTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  milestoneDetail: {
    fontSize: 20,
    fontWeight: '500',
    color: '#c4b5fd',
    marginTop: 2,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hudTag: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  dayOfTag: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ec4899',
    letterSpacing: 2,
  },
  hudTargetDate: {
    fontSize: 19,
    fontWeight: '700',
    color: '#c4b5fd',
    letterSpacing: 1.5,
  },
  hudMetricText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e9d5ff',
    letterSpacing: 1,
  },
  overdriveMetricText: {
    color: '#ec4899',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  timeBlock: {
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 88,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    lineHeight: 94,
  },
  countdownUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#a78bfa',
    letterSpacing: 3,
    marginTop: 2,
  },
  countdownSeparator: {
    fontSize: 72,
    fontWeight: '800',
    color: '#22d3ee',
    marginBottom: 22,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.25)',
  },
  juryHighlightRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  scheduleTime: {
    color: '#22d3ee',
    fontSize: 22,
    fontWeight: '700',
  },
  scheduleEvent: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '500',
  },
  juryTime: {
    color: '#ec4899',
    fontSize: 24,
    fontWeight: '900',
  },
  juryText: {
    color: '#f43f5e',
    fontSize: 24,
    fontWeight: '900',
  },
  progressTrack: {
    height: 18,
    backgroundColor: 'rgba(30, 20, 53, 0.9)',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 9,
  },
  progressFillOverdrive: {
    backgroundColor: '#ec4899',
  },
  rollingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rollingCol: {
    alignItems: 'center',
    gap: 8,
  },
  rollingDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
  },
  rollingDotActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#22d3ee',
  },
  rollingDotInactive: {
    backgroundColor: 'rgba(30, 20, 53, 0.7)',
    borderColor: 'rgba(107, 114, 128, 0.6)',
  },
  rollingLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
  },
  rollingLabelToday: {
    color: '#22d3ee',
  },
  repertoireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 18,
  },
  repertoireDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
  },
  repertoireIndex: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22d3ee',
    fontVariant: ['tabular-nums'],
  },
  repertoireTextWrap: {
    flex: 1,
  },
  repertoireTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  repertoireSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#a78bfa',
    marginTop: 1,
  },
});

export default CyberJuryLockscreen;