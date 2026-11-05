
import {
  BarChart2,
  BookOpen,
  Music,
  Timer,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AiLessonAnalyzer } from './components/AiLessonAnalyzer';
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

export default function App() {

    // Reset quota on launch for testing
  React.useEffect(() => {
    try {
      db.resetMonthlyQuota();
    } catch (e) {
      console.warn('[QUOTA RESET ERROR]:', e);
    }
  }, []);

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

  const activeInstrument =
    instruments.find((i) => i.instrument_id === activeInstrumentId) ||
    instruments[0] ||
    FALLBACK_INSTRUMENT;

  const handleDataChanged = () => {
    try {
      setInstruments(db.getInstruments());
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('[REFRESH ERROR]:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header & Instrument Selector */}
      <View style={styles.header}>
        <View style={styles.brandingRow}>
          <View style={styles.appIconCircle}>
            <Music size={16} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Cantabile</Text>
            <Text style={styles.headerSubtitle}>Perpetual Cadence Practice</Text>
          </View>
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
        {activeTab === 'practice' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <PracticeStopwatch
              key={`stopwatch-${activeInstrument.instrument_id}-${refreshTrigger}`}
              activeInstrument={activeInstrument}
              onSessionSaved={handleDataChanged}
            />
          </ScrollView>
        )}

        {activeTab === 'progress' && (
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
        )}

        {activeTab === 'lessons' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AiLessonAnalyzer
              key={`lessons-${activeInstrument.instrument_id}-${refreshTrigger}`}
              activeInstrument={activeInstrument}
              onTagsUpdated={handleDataChanged}
            />
          </ScrollView>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a1e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#251b3d',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
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
});