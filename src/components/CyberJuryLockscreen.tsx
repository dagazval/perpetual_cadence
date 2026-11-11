import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { db, DEFAULT_INSTRUMENT_IDS, DimRepertoire } from '../database/schema';

interface CyberJuryLockscreenProps {
  todayPracticeMinutes: number; // calculated from fact_practice_sessions
  rollingConsistencyDays: number; // qualifying days count (>= 5 min)
}

export const CyberJuryLockscreen: React.FC<CyberJuryLockscreenProps> = ({
  todayPracticeMinutes,
  rollingConsistencyDays,
}) => {
  // Query active repertoire for Voice from SQLite
  const activeRepertoire: DimRepertoire[] = db.getActiveRepertoire(
    DEFAULT_INSTRUMENT_IDS.VOICE
  );


  // Jury date targets
  const juryTarget = new Date('2026-12-05T10:32:00');
  const now = new Date();

  // Day-of check
  const isJuryDay =
    now.getFullYear() === 2026 &&
    now.getMonth() === 11 && // Dec (0-indexed)
    now.getDate() === 5;

  const msRemaining = juryTarget.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  // Gauge calculations (Option A: Segmented Cyber Bar with Overdrive)
  const targetMinutes = 20;
  const isOverdrive = todayPracticeMinutes > targetMinutes;
  const progressPercent = Math.min(
    100,
    Math.round((todayPracticeMinutes / targetMinutes) * 100)
  );

  return (
    <View style={styles.canvasContainer}>
      {/* Upper 38% reserved for native Android system clock & notifications */}
      <View style={styles.systemReservationSpacer} />

      {/* Main HUD Body */}
      <View style={styles.hudBody}>
        {/* Status Line */}
        <View style={styles.telemetryHeader}>
          <Text style={styles.telemetryText}>
            [ • CANTABILE HUD // VOICE STUDIO ]
          </Text>
          <Text style={styles.telemetrySub}>
            SYS: OK • SQLITE PERSISTED
          </Text>
        </View>

        {/* Hero Countdown / Day-of Telemetry */}
        <View style={styles.heroCard}>
          {isJuryDay ? (
            <View style={styles.dayOfContainer}>
              <Text style={styles.dayOfAlert}>[ ! ] JURY DAY PROTOCOL ACTIVE</Text>
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
                <Text style={styles.juryText}>VOICE JURY EVALUATION</Text>
              </View>
            </View>
          ) : (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownNumber}>
                {daysRemaining} <Text style={styles.countdownDaysLabel}>DAYS</Text>
              </Text>
              <Text style={styles.countdownSubtitle}>
                UNTIL VOCAL JURY // DEC 05, 2026
              </Text>
            </View>
          )}
        </View>

        {/* Milestone Indicator */}
        <View style={styles.milestoneBadge}>
          <Text style={styles.milestoneLabel}>NEXT TARGET</Text>
          <Text style={styles.milestoneDetail}>
            Nov 16 • 9:30 AM — Pianist Rehearsal #1 (Full Run)
          </Text>
        </View>

        {/* Daily Discipline Gauge (Option A: Segmented Cyber Bar) */}
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeTitle}>DAILY DISCIPLINE GAUGES</Text>
            <Text
              style={[
                styles.gaugeStats,
                isOverdrive && styles.overdriveText,
              ]}
            >
              {todayPracticeMinutes} / {targetMinutes} MIN{' '}
              {isOverdrive
                ? `• ${Math.round((todayPracticeMinutes / targetMinutes) * 100)}% OVERDRIVE`
                : `• ${progressPercent}%`}
            </Text>
          </View>

          {/* Segmented Bar Track */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, progressPercent)}%` },
                isOverdrive && styles.barFillOverdrive,
              ]}
            />
          </View>

          {/* 7-Day Rolling Consistency (Qualifying >= 5 mins) */}
          <View style={styles.consistencyRow}>
            <Text style={styles.consistencyLabel}>7-DAY ROLLING</Text>
            <View style={styles.dotsContainer}>
              {[...Array(7)].map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.dot,
                    i < rollingConsistencyDays && styles.dotFilled,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.consistencyCount}>
              ({rollingConsistencyDays}/4 Target)
            </Text>
          </View>
        </View>

        {/* Active Repertoire Matrix */}
        <View style={styles.repertoireContainer}>
          <Text style={styles.repertoireHeader}>REPERTOIRE MATRIX // ACTIVE</Text>
          {activeRepertoire.map((piece) => (
            <View key={piece.repertoire_id} style={styles.repertoireRow}>
              <View style={styles.pieceTitleCol}>
                <Text style={styles.pieceGlyph}>[♫]</Text>
                <Text style={styles.pieceTitle} numberOfLines={1}>
                  {piece.title}
                </Text>
              </View>
              <View style={styles.focusCol}>
                <Text style={styles.focusBadge}>Focus: Memorization</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    width: 1344,
    height: 2992,
    backgroundColor: '#0f0a1e',
    paddingHorizontal: 72,
    justifyContent: 'space-between',
  },
  systemReservationSpacer: {
    height: 1140, // Top ~38% reserved for Pixel 8 Pro system lock elements
    width: '100%',
  },
  hudBody: {
    flex: 1,
    paddingBottom: 96,
    justifyContent: 'space-around',
  },
  telemetryHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#2e1b4d',
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryText: {
    color: '#a78bfa',
    fontSize: 24,
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontWeight: '700',
  },
  telemetrySub: {
    color: '#6b7280',
    fontSize: 20,
    fontFamily: 'monospace',
  },
  heroCard: {
    backgroundColor: '#170e30',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#7c3aed',
    padding: 40,
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 108,
    fontWeight: '900',
    color: '#06b6d4', // Cyan neon
    fontFamily: 'monospace',
    letterSpacing: 6,
  },
  countdownDaysLabel: {
    fontSize: 48,
    color: '#ec4899', // Magenta neon
  },
  countdownSubtitle: {
    color: '#c4b5fd',
    fontSize: 28,
    marginTop: 12,
    letterSpacing: 3,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  dayOfContainer: {
    width: '100%',
  },
  dayOfAlert: {
    color: '#ec4899',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2b1b46',
  },
  juryHighlightRow: {
    borderBottomWidth: 0,
    marginTop: 10,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scheduleTime: {
    color: '#06b6d4',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  scheduleEvent: {
    color: '#e2e8f0',
    fontSize: 28,
    fontWeight: '500',
  },
  juryTime: {
    color: '#ec4899',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  juryText: {
    color: '#f43f5e',
    fontSize: 32,
    fontWeight: '900',
  },
  milestoneBadge: {
    backgroundColor: '#1f1338',
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 8,
    borderLeftColor: '#06b6d4',
  },
  milestoneLabel: {
    color: '#06b6d4',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  milestoneDetail: {
    color: '#f1f5f9',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 6,
  },
  gaugeContainer: {
    backgroundColor: '#170e30',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3b2562',
    padding: 32,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gaugeTitle: {
    color: '#a78bfa',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  gaugeStats: {
    color: '#38bdf8',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  overdriveText: {
    color: '#ec4899',
  },
  barTrack: {
    height: 36,
    backgroundColor: '#0c0717',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4c2882',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },
  barFillOverdrive: {
    backgroundColor: '#ec4899',
  },
  consistencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a1a45',
  },
  consistencyLabel: {
    color: '#94a3b8',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#271940',
    borderWidth: 2,
    borderColor: '#472d73',
  },
  dotFilled: {
    backgroundColor: '#06b6d4',
    borderColor: '#67e8f9',
  },
  consistencyCount: {
    color: '#cbd5e1',
    fontSize: 22,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  repertoireContainer: {
    backgroundColor: '#170e30',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3b2562',
    padding: 32,
  },
  repertoireHeader: {
    color: '#a78bfa',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  repertoireRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#25153d',
  },
  pieceTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  pieceGlyph: {
    color: '#c084fc',
    fontSize: 24,
    marginRight: 12,
  },
  pieceTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '600',
  },
  focusCol: {
    backgroundColor: '#281745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5b21b6',
  },
  focusBadge: {
    color: '#e9d5ff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});