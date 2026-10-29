/**
 * Cantabile - Pure React Native Root Application
 * Managed Expo SDK 52 / React Native Mobile Experience
 * 
 * Strict React Native Primitives & lucide-react-native icons
 * Bottom Tab Navigation Shell (Practice, Progress, Lessons)
 * Horizontal Instrument Switcher Pills (Voice, Piano, Oboe)
 * Offline-first SQLite dimensional star schema backing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Timer,
  BarChart2,
  BookOpen,
  WifiOff,
  Music,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';
import { db, DimInstrument } from './database/schema';
import { PracticeStopwatch } from './components/PracticeStopwatch';
import { RollingConsistencyCard } from './components/RollingConsistencyCard';
import { PracticeLog } from './components/PracticeLog';
import { AiLessonAnalyzer } from './components/AiLessonAnalyzer';

type ActiveTab = 'practice' | 'progress' | 'lessons';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');
  const [instruments, setInstruments] = useState<DimInstrument[]>(() =>
    db.getInstruments()
  );
  // Default to first instrument (Voice)
  const [activeInstrumentId, setActiveInstrumentId] = useState<string>(
    instruments[0]?.instrument_id || 'inst-voice-001'
  );
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const activeInstrument =
    instruments.find((i) => i.instrument_id === activeInstrumentId) ||
    instruments[0];

  const handleDataChanged = () => {
    setInstruments(db.getInstruments());
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.appContainer}>
        {/* Top Header & Offline Readiness Bar */}
        <View style={styles.topHeader}>
          <View style={styles.brandingRow}>
            <View style={styles.logoGroup}>
              <View style={styles.appIconCircle}>
                <Music size={18} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.appName}>Cantabile</Text>
                <Text style={styles.appTagline}>Vocal & Instrumental Practice</Text>
              </View>
            </View>

            {/* Offline-First SQLite Indicator */}
            <View style={styles.offlineStatusPill}>
              <ShieldCheck size={13} color="#10b981" />
              <Text style={styles.offlineStatusText}>Local SQLite</Text>
            </View>
          </View>

          {/* Horizontal Instrument Switcher Pills */}
          <View style={styles.instrumentSelectorContainer}>
            {instruments.map((inst) => {
              const isActive = inst.instrument_id === activeInstrument.instrument_id;
              return (
                <TouchableOpacity
                  key={inst.instrument_id}
                  style={[
                    styles.instrumentPill,
                    isActive && styles.instrumentPillActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setActiveInstrumentId(inst.instrument_id)}
                >
                  <Text
                    style={[
                      styles.instrumentPillText,
                      isActive && styles.instrumentPillTextActive,
                    ]}
                  >
                    {inst.name}
                  </Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tab Content Body */}
        <View style={styles.bodyContent}>
          {activeTab === 'practice' && (
            <PracticeStopwatch
              key={`${activeInstrument.instrument_id}-${refreshTrigger}`}
              activeInstrument={activeInstrument}
              onSessionSaved={handleDataChanged}
            />
          )}

          {activeTab === 'progress' && (
            <ScrollView
              style={styles.scrollScreen}
              contentContainerStyle={styles.scrollScreenContent}
              showsVerticalScrollIndicator={false}
            >
              <RollingConsistencyCard
                key={`${activeInstrument.instrument_id}-${refreshTrigger}`}
                instrument={activeInstrument}
              />
              <PracticeLog
                key={`${activeInstrument.instrument_id}-${refreshTrigger}`}
                instrumentId={activeInstrument.instrument_id}
                refreshKey={refreshTrigger}
              />
            </ScrollView>
          )}

          {activeTab === 'lessons' && (
            <AiLessonAnalyzer
              key={`${activeInstrument.instrument_id}-${refreshTrigger}`}
              activeInstrument={activeInstrument}
              onTagsUpdated={handleDataChanged}
            />
          )}
        </View>

        {/* Bottom Tab Navigation Shell (3 Tabs) */}
        <View style={styles.bottomTabBar}>
          {/* TAB 1: PRACTICE */}
          <TouchableOpacity
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => setActiveTab('practice')}
          >
            <View
              style={[
                styles.tabIconContainer,
                activeTab === 'practice' && styles.tabIconContainerActive,
              ]}
            >
              <Timer
                size={20}
                color={activeTab === 'practice' ? '#60a5fa' : '#64748b'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'practice' && styles.tabLabelActive,
              ]}
            >
              Practice
            </Text>
          </TouchableOpacity>

          {/* TAB 2: PROGRESS */}
          <TouchableOpacity
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => setActiveTab('progress')}
          >
            <View
              style={[
                styles.tabIconContainer,
                activeTab === 'progress' && styles.tabIconContainerActive,
              ]}
            >
              <BarChart2
                size={20}
                color={activeTab === 'progress' ? '#60a5fa' : '#64748b'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'progress' && styles.tabLabelActive,
              ]}
            >
              Progress
            </Text>
          </TouchableOpacity>

          {/* TAB 3: LESSONS */}
          <TouchableOpacity
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => setActiveTab('lessons')}
          >
            <View
              style={[
                styles.tabIconContainer,
                activeTab === 'lessons' && styles.tabIconContainerActive,
              ]}
            >
              <BookOpen
                size={20}
                color={activeTab === 'lessons' ? '#60a5fa' : '#64748b'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'lessons' && styles.tabLabelActive,
              ]}
            >
              Lessons
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  topHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  offlineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 5,
  },
  offlineStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34d399',
  },
  instrumentSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  instrumentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  instrumentPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  instrumentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  instrumentPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#60a5fa',
  },
  bodyContent: {
    flex: 1,
  },
  scrollScreen: {
    flex: 1,
  },
  scrollScreenContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIconContainer: {
    padding: 4,
    borderRadius: 10,
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
});
