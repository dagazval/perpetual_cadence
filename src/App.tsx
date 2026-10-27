import React, { useState } from 'react';
import {
  Timer,
  CalendarDays,
  Sparkles,
  Database,
  Smartphone,
  Wifi,
  WifiOff,
  Music,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { PracticeStopwatch } from './components/PracticeStopwatch';
import { RollingConsistencyCard } from './components/RollingConsistencyCard';
import { AiLessonAnalyzer } from './components/AiLessonAnalyzer';
import { RelationalSchemaExplorer } from './components/RelationalSchemaExplorer';
import { ExpoFilesViewer } from './components/ExpoFilesViewer';
import { PracticeHistoryList } from './components/PracticeHistoryList';
import { dimensionalStore } from './db/dimensionalStore';
import { audioTools } from './utils/audioTools';

type TabType = 'stopwatch' | 'consistency' | 'lesson_ai' | 'kimball_sql' | 'android_build';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('stopwatch');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [phoneFrameMode, setPhoneFrameMode] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleDataRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const toggleOfflineMode = () => {
    audioTools.triggerHaptic('tap');
    setIsOffline((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-[#1a0f2e] text-white flex flex-col selection:bg-yellow-400 selection:text-purple-950">
      {/* Top Bar Contract: 3 Zones (Brand wordmark — 4-5 single-line links — 1 primary action) */}
      <header className="sticky top-0 z-40 bg-[#241442]/95 backdrop-blur-md border-b border-purple-800/60 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Cadence
            </span>
            <span className="hidden sm:inline-block text-[11px] text-purple-300/70 font-mono">
              v1.0-Relational
            </span>
          </div>

          {/* Zone 2: 4-5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-purple-200">
            <button
              onClick={() => setActiveTab('stopwatch')}
              className={`hover:text-yellow-300 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'stopwatch'
                  ? 'text-yellow-400 font-bold underline underline-offset-4 decoration-2 decoration-yellow-400'
                  : ''
              }`}
            >
              Stopwatch
            </button>
            <button
              onClick={() => setActiveTab('consistency')}
              className={`hover:text-yellow-300 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'consistency'
                  ? 'text-yellow-400 font-bold underline underline-offset-4 decoration-2 decoration-yellow-400'
                  : ''
              }`}
            >
              Consistency
            </button>
            <button
              onClick={() => setActiveTab('lesson_ai')}
              className={`hover:text-yellow-300 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'lesson_ai'
                  ? 'text-yellow-400 font-bold underline underline-offset-4 decoration-2 decoration-yellow-400'
                  : ''
              }`}
            >
              Lesson AI
            </button>
            <button
              onClick={() => setActiveTab('kimball_sql')}
              className={`hover:text-yellow-300 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'kimball_sql'
                  ? 'text-yellow-400 font-bold underline underline-offset-4 decoration-2 decoration-yellow-400'
                  : ''
              }`}
            >
              Kimball SQL
            </button>
            <button
              onClick={() => setActiveTab('android_build')}
              className={`hover:text-yellow-300 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'android_build'
                  ? 'text-yellow-400 font-bold underline underline-offset-4 decoration-2 decoration-yellow-400'
                  : ''
              }`}
            >
              Android APK
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Controller (Offline Simulator / Network Switcher) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleOfflineMode}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isOffline
                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                  : 'bg-purple-900/60 text-purple-100 hover:bg-purple-800/80 border border-purple-700/60'
              }`}
              title="Toggle offline state to verify local-first SQLite persistence"
            >
              {isOffline ? (
                <WifiOff className="w-3.5 h-3.5 text-yellow-300" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-yellow-400" />
              )}
              <span>{isOffline ? 'Offline (SQLite)' : 'Online (Supabase)'}</span>
            </button>

            <button
              onClick={() => setPhoneFrameMode(!phoneFrameMode)}
              className="p-1.5 rounded-lg text-purple-200 hover:text-yellow-300 hover:bg-purple-900/60 transition-colors hidden sm:block"
              title={phoneFrameMode ? 'Switch to Full Width Canvas' : 'Preview Android Mobile Frame'}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {/* Conditional Wrapper: If user enabled Android Phone Preview, wrap in phone shell */}
        <div className={phoneFrameMode ? 'max-w-[420px] mx-auto' : 'w-full'}>
          {phoneFrameMode && (
            <div className="mb-2 text-center text-xs text-purple-200 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Android Touch-First Preview (Pixel 8 Shell)</span>
            </div>
          )}

          <div
            className={
              phoneFrameMode
                ? 'rounded-[38px] border-[8px] border-purple-900/90 shadow-2xl bg-[#241442] overflow-hidden flex flex-col min-h-[760px]'
                : ''
            }
          >
            {/* Android Mock Status Bar (when frame mode active) */}
            {phoneFrameMode && (
              <div className="bg-[#1a0f2e] text-purple-200 px-6 py-2 flex items-center justify-between text-[11px] font-mono select-none border-b border-purple-900/50">
                <span>09:41</span>
                <div className="w-3.5 h-3.5 rounded-full bg-black/60 mx-auto" />
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-yellow-400" />
                  <span className="font-sans font-bold text-yellow-400">100%</span>
                </div>
              </div>
            )}

            <div className={phoneFrameMode ? 'p-4 flex-1 overflow-y-auto space-y-4' : 'space-y-6'}>
              {/* Tab 1: Stopwatch Core Practice Experience */}
              {activeTab === 'stopwatch' && (
                <div className="space-y-6">
                  {/* Executive-dysfunction friendly banner */}
                  <div className="p-3.5 rounded-xl bg-[#241442]/80 border border-purple-800/60 text-xs text-purple-200 flex items-center justify-between">
                    <span>
                      Zero guilt. 1-tap stopwatch defaults to your last instrument and Warm Up segment.
                    </span>
                    <span className="text-yellow-400 font-mono font-semibold shrink-0 hidden sm:inline">
                      Rolling 7-Day Window
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Stopwatch & Segment Controller */}
                    <div className="lg:col-span-7 space-y-4">
                      <PracticeStopwatch
                        onSessionFinished={handleDataRefresh}
                        isOffline={isOffline}
                      />
                    </div>

                    {/* Right: Rolling 7-Day Consistency & Practice Log */}
                    <div className="lg:col-span-5 space-y-4">
                      <RollingConsistencyCard
                        key={refreshTrigger}
                        onUpdate={handleDataRefresh}
                      />
                      <PracticeHistoryList
                        key={`history-${refreshTrigger}`}
                        onSyncCompleted={handleDataRefresh}
                        isOffline={isOffline}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Detailed Rolling 7-Day Consistency */}
              {activeTab === 'consistency' && (
                <div className="space-y-4">
                  <RollingConsistencyCard
                    key={`full-consistency-${refreshTrigger}`}
                    onUpdate={handleDataRefresh}
                  />
                  <PracticeHistoryList
                    key={`full-history-${refreshTrigger}`}
                    onSyncCompleted={handleDataRefresh}
                    isOffline={isOffline}
                  />
                </div>
              )}

              {/* Tab 3: AI Lesson Analysis */}
              {activeTab === 'lesson_ai' && (
                <div className="space-y-4">
                  <AiLessonAnalyzer onSummaryAdded={handleDataRefresh} />
                </div>
              )}

              {/* Tab 4: Kimball Relational Schema & SQL Console */}
              {activeTab === 'kimball_sql' && (
                <div className="space-y-4">
                  <RelationalSchemaExplorer key={refreshTrigger} />
                </div>
              )}

              {/* Tab 5: Android Build & Expo SDK 52 Project Exporter */}
              {activeTab === 'android_build' && (
                <div className="space-y-4">
                  <ExpoFilesViewer />
                </div>
              )}
            </div>

            {/* Android Navigation Bar Pill (when frame mode active) */}
            {phoneFrameMode && (
              <div className="bg-[#1a0f2e] py-3 flex justify-center border-t border-purple-900/50">
                <div className="w-32 h-1 bg-purple-700 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Touch Bottom Navigation Anchor */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#241442]/95 backdrop-blur-md border-t border-purple-800/80">
        <div className="grid grid-cols-5 items-center h-16 pb-safe">
          <button
            onClick={() => {
              audioTools.triggerHaptic('tap');
              setActiveTab('stopwatch');
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'stopwatch'
                ? 'text-yellow-400 font-bold'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Timer</span>
          </button>

          <button
            onClick={() => {
              audioTools.triggerHaptic('tap');
              setActiveTab('consistency');
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'consistency'
                ? 'text-yellow-400 font-bold'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">7-Day</span>
          </button>

          <button
            onClick={() => {
              audioTools.triggerHaptic('tap');
              setActiveTab('lesson_ai');
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'lesson_ai'
                ? 'text-yellow-400 font-bold'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Lesson AI</span>
          </button>

          <button
            onClick={() => {
              audioTools.triggerHaptic('tap');
              setActiveTab('kimball_sql');
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'kimball_sql'
                ? 'text-yellow-400 font-bold'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">SQL</span>
          </button>

          <button
            onClick={() => {
              audioTools.triggerHaptic('tap');
              setActiveTab('android_build');
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'android_build'
                ? 'text-yellow-400 font-bold'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Build APK</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
