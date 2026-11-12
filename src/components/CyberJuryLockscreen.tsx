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
  todayPracticedMinutes?: number;
  rollingConsistencyDays?: number;
  rolling7DaysPracticed?: boolean[];
  repertoire?: RepertoirePiece[];
}

const DEFAULT_REPERTOIRE: RepertoirePiece[] = [
  { id: '1', title: 'I Feel The Earth Move', subtitle: 'Carole King' },
  { id: '2', title: 'Lesson 3 - Intervals of the Sixth', subtitle: 'Vaccai Method' },
  { id: '3', title: 'Shenandoah', subtitle: 'American Folk / Arr. Dougherty' },
];

export const CyberJuryLockscreen: React.FC<CyberJuryLockscreenProps> = ({
  juryDateIso = '2026-12-05T09:00:00',
  targetDailyMinutes = 45,
  todayPracticedMinutes = 30,
  rollingConsistencyDays,
  rolling7DaysPracticed,
  repertoire = DEFAULT_REPERTOIRE,
}) => {
  const countdown = useMemo(() => {
    const target = new Date(juryDateIso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, target - now);

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return { days, hours };
  }, [juryDateIso]);

  const resolved7Days = useMemo(() => {
    if (rolling7DaysPracticed && rolling7DaysPracticed.length > 0) {
      return rolling7DaysPracticed;
    }
    if (typeof rollingConsistencyDays === 'number') {
      const count = Math.max(0, Math.min(7, Math.round(rollingConsistencyDays)));
      return Array.from({ length: 7 }, (_, i) => i >= 7 - count);
    }
    return [true, false, true, true, false, true, true];
  }, [rollingConsistencyDays, rolling7DaysPracticed]);

  const dailyPercent = Math.min(
    100,
    Math.round((todayPracticedMinutes / Math.max(1, targetDailyMinutes)) * 100)
  );

  const dayLabels = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'YST', 'TDY'];

  return (
    <ImageBackground
      source={require('../../assets/images/cyber_bg.png')}
      style={styles.canvas}
      resizeMode="cover"
    >
      {/* Subtle dark tint so neon HUD text and progress bars remain razor-sharp */}
      <View style={styles.hudOverlay}>
        {/* Top 38% Void Spacer: Keeps Pixel 8 Pro clock, date, weather & notifications unobstructed */}
        <View style={styles.topVoidSpacer} />

        {/* HUD Section 1: Jury Countdown Module */}
        <View style={styles.hudCard}>
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
        </View>

        {/* HUD Section 2: Daily Practice Gauge & 7-Day Rolling Cadence */}
        <View style={styles.hudCard}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudTag}>// DAILY CADENCE</Text>
            <Text style={styles.hudMetricText}>
              {todayPracticedMinutes} / {targetDailyMinutes} MIN ({dailyPercent}%)
            </Text>
          </View>

          {/* Neon Progress Track */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${dailyPercent}%` }]} />
          </View>

          {/* 7-Day Rolling Dots */}
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

        {/* HUD Section 3: Active Repertoire Matrix */}
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
                index < repertoire.length - 1 && styles.repertoireDivider,
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
    paddingBottom: 820, // Keeps all HUD cards above the Pixel 8 Pro fingerprint ring
    justifyContent: 'flex-start',
    gap: 24, // Tight, clean spacing between the 3 cards
  },
  topVoidSpacer: {
    height: '33%', // Sits right beneath the Pixel lock screen clock & date
  },
  hudCard: {
    backgroundColor: 'rgba(15, 10, 30, 0.78)',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.75)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 38,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  hudTag: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  hudTargetDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#c4b5fd',
    letterSpacing: 1.5,
  },
  hudMetricText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e9d5ff',
    letterSpacing: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 6,
  },
  timeBlock: {
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 108,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#a78bfa',
    letterSpacing: 3,
    marginTop: 4,
  },
  countdownSeparator: {
    fontSize: 84,
    fontWeight: '800',
    color: '#22d3ee',
    marginBottom: 28,
  },
  progressTrack: {
    height: 22,
    backgroundColor: 'rgba(30, 20, 53, 0.9)',
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 11,
  },
  rollingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rollingCol: {
    alignItems: 'center',
    gap: 10,
  },
  rollingDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 18,
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
    paddingVertical: 16,
    gap: 20,
  },
  repertoireDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
  },
  repertoireIndex: {
    fontSize: 26,
    fontWeight: '800',
    color: '#22d3ee',
    fontVariant: ['tabular-nums'],
  },
  repertoireTextWrap: {
    flex: 1,
  },
  repertoireTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  repertoireSubtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#a78bfa',
    marginTop: 2,
  },
});

export default CyberJuryLockscreen;