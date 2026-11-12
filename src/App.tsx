import {
  BarChart2,
  BookOpen,
  Music,
  Timer,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { AiLessonAnalyzer } from './components/AiLessonAnalyzer';
import { CyberJuryLockscreen } from './components/CyberJuryLockscreen';
import { PracticeLog } from './components/PracticeLog';
import { PracticeStopwatch } from './components/PracticeStopwatch';
import { RollingConsistencyCard } from './components/RollingConsistencyCard';
import { db, DEFAULT_INSTRUMENT_IDS, DimInstrument } from './database/schema';

type ActiveTab = 'practice' | 'progress' | 'lessons';

const FALLBACK_INSTRUMENT: DimInstrument = {
  instrument_id: DEFAULT_INSTRUMENT_IDS.VOICE,
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Voice',
  target_days_rolling_week: 4,
  current_xp: 320,
  current_level: 1,
  created_at: new Date().toISOString(),
};

function MainApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');
  const [instruments, setInstruments] = useState<DimInstrument[]>(() => {
    try {
      const list = db.getInstruments();
      return list && list.length > 0 ? list : [FALLBACK_INSTRUMENT];
    } catch (err) {
      console.error('[DB INIT ERROR]:', err);
      return [FALLBACK_INSTRUMENT];
    }
  });

  const [activeInstrumentId, setActiveInstrumentId] = useState<string>(
    instruments[0]?.instrument_id || DEFAULT_INSTRUMENT_IDS.VOICE
  );
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Off-screen ViewShot reference for generating the 1344x2992 wallpaper bitmap
  const lockscreenRef = useRef<any>(null);

  // 1. Calculate today's completed practice minutes for Voice
  const todayPracticeMinutes = useMemo(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const sessions = db.getPracticeSessions(DEFAULT_INSTRUMENT_IDS.VOICE);
      const todaySessions = sessions.filter((s) => s.started_at.startsWith(todayStr));
      return Math.floor(
        todaySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
      );
    } catch (e) {
      console.error('[LOCKSCREEN PRACTICE CALC ERROR]:', e);
      return 0;
    }
  }, [refreshTrigger]);

  // 2. Query 7-day rolling qualifying days (>= 5 min sessions)
  const rollingConsistencyDays = useMemo(() => {
    try {
      const stats = db.getRolling7DayStats(DEFAULT_INSTRUMENT_IDS.VOICE);
      return stats.daysPracticed;
    } catch (e) {
      console.error('[LOCKSCREEN ROLLING CALC ERROR]:', e);
      return 0;
    }
  }, [refreshTrigger]);

  const activeInstrument =
    instruments.find((i) => i.instrument_id === activeInstrumentId) ||
    instruments[0] ||
    FALLBACK_INSTRUMENT;

  // Capture off-screen HUD and apply directly to Android Lock Screen
  const captureLockscreenWallpaper = async (showAlert = false) => {
    try {
      if (!lockscreenRef.current) {
        console.warn('[WALLPAPER] Ref is null, canvas not ready.');
        return;
      }

      const uri = await captureRef(lockscreenRef, {
        format: 'png',
        quality: 1.0,
      });

      ManageWallpaper.setWallpaper(
        { uri },
        (res: any) => {
          console.log('[LOCKSCREEN APPLIED]:', res);
          if (showAlert) {
            Alert.alert(
              'Lock Screen Updated!',
              'Your Pixel lock screen wallpaper has been updated.'
            );
          }
        },
        TYPE.LOCK
      );
    } catch (err: any) {
      console.error('[LOCKSCREEN CAPTURE ERROR]:', err);
      if (showAlert) {
        Alert.alert('Lockscreen Error', err?.message || String(err));
      }
    }
  };

  // Triggered when a qualifying practice session is saved ("Stop Practice") or tags update
  const handleDataChanged = () => {
    try {
      setInstruments(db.getInstruments());
      setRefreshTrigger((prev) => prev + 1);

      // Give React one tick to render updated SQLite stats to the off-screen HUD
      setTimeout(() => {
        captureLockscreenWallpaper(false);
      }, 600);
    } catch (err) {
      console.error('[REFRESH ERROR]:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header & Instrument Selector */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandingRow}>
            <View style={styles.appIconCircle}>
              <Music size={16} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Cantabile</Text>
              <Text style={styles.headerSubtitle}>Perpetual Cadence Practice</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => captureLockscreenWallpaper(true)}
            style={styles.syncButton}
          >
            <Text style={styles.syncButtonText}>⚡ Sync Lockscreen</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.instrumentBar}
          contentContainerStyle={styles.instrumentBarContent}
        >
          {instruments.map((inst, index) => {
            const isSelected = inst.instrument_id === activeInstrument.instrument_id;
            return (
              <TouchableOpacity
                key={`${inst.instrument_id}-${index}`}
                onPress={() => setActiveInstrumentId(inst.instrument_id)}
                style={[
                  styles.instrumentPill,
                  isSelected && styles.instrumentPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.instrumentPillText,
                    isSelected && styles.instrumentPillTextActive,
                  ]}
                >
                  {inst.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Tab Screen Area */}
      <View style={styles.content}>
        {/* Tab 1: Practice Stopwatch */}
        <View style={[styles.tabContainer, activeTab !== 'practice' && styles.hiddenTab]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <PracticeStopwatch
              activeInstrument={activeInstrument}
              onSessionSaved={handleDataChanged}
            />
          </ScrollView>
        </View>

        {/* Tab 2: Progress */}
        <View style={[styles.tabContainer, activeTab !== 'progress' && styles.hiddenTab]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <RollingConsistencyCard
              key={`consistency-${activeInstrument.instrument_id}-${refreshTrigger}`}
              instrument={activeInstrument}
            />
            <View style={{ marginTop: 24 }}>
              <PracticeLog
                key={`log-${activeInstrument.instrument_id}-${refreshTrigger}`}
                instrumentId={activeInstrument.instrument_id}
                refreshKey={refreshTrigger}
              />
            </View>
          </ScrollView>
        </View>

        {/* Tab 3: Lessons */}
        <View style={[styles.tabContainer, activeTab !== 'lessons' && styles.hiddenTab]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AiLessonAnalyzer
              key={`lessons-${activeInstrument.instrument_id}-${refreshTrigger}`}
              activeInstrument={activeInstrument}
              onTagsUpdated={handleDataChanged}
            />
          </ScrollView>
        </View>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('practice')}
        >
          <Timer
            size={22}
            color={activeTab === 'practice' ? '#a78bfa' : '#6b7280'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'practice' && styles.navLabelActive,
            ]}
          >
            Practice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('progress')}
        >
          <BarChart2
            size={22}
            color={activeTab === 'progress' ? '#a78bfa' : '#6b7280'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'progress' && styles.navLabelActive,
            ]}
          >
            Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('lessons')}
        >
          <BookOpen
            size={22}
            color={activeTab === 'lessons' ? '#a78bfa' : '#6b7280'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'lessons' && styles.navLabelActive,
            ]}
          >
            Lessons
          </Text>
        </TouchableOpacity>
      </View>

      {/* Off-screen ViewShot container for Pixel 8 Pro Lock Screen Generation */}
      <View pointerEvents="none" style={styles.offscreenContainer}>
        <ViewShot
          ref={lockscreenRef}
          options={{ format: 'png', quality: 1.0, width: 1344, height: 2992 }}
        >
          <CyberJuryLockscreen
            todayPracticeMinutes={todayPracticeMinutes}
            rollingConsistencyDays={rollingConsistencyDays}
          />
        </ViewShot>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a1e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#251b3d',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  syncButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#4c1d95',
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instrumentBar: {
    marginTop: 14,
  },
  instrumentBarContent: {
    flexDirection: 'row',
    gap: 8,
  },
  instrumentPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1e1435',
    borderWidth: 1,
    borderColor: '#372a56',
  },
  instrumentPillActive: {
    backgroundColor: '#4c1d95',
    borderColor: '#7c3aed',
  },
  instrumentPillText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  instrumentPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
  },
  hiddenTab: {
    display: 'none',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    backgroundColor: '#150d2a',
    borderTopWidth: 1,
    borderTopColor: '#251b3d',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#a78bfa',
    fontWeight: '700',
  },
  offscreenContainer: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: 1344,
    height: 2992,
    opacity: 1,
  },
});