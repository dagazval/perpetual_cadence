import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Music2, Sparkles, Volume2, Clock, CheckCircle2, Sliders, ChevronDown } from 'lucide-react';
import { dimensionalStore, DimInstrument, DimTag } from '../db/dimensionalStore';
import { audioTools } from '../utils/audioTools';

interface PracticeStopwatchProps {
  onSessionFinished: () => void;
  isOffline: boolean;
}

export const PracticeStopwatch: React.FC<PracticeStopwatchProps> = ({ onSessionFinished, isOffline }) => {
  const [instruments, setInstruments] = useState<DimInstrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<DimInstrument | null>(null);
  const [activeTags, setActiveTags] = useState<DimTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Timer states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Audio utility drawer
  const [showTools, setShowTools] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(100);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);
  const [isDroneActive, setIsDroneActive] = useState<boolean>(false);
  const [droneNote, setDroneNote] = useState<string>('A4');

  // Finish celebration state
  const [completionSummary, setCompletionSummary] = useState<{
    duration: number;
    xp: number;
    instrument: string;
    syncStatus: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allInstruments = dimensionalStore.getInstruments();
    setInstruments(allInstruments);
    const lastActive = dimensionalStore.getLastActiveInstrument();
    setSelectedInstrument(lastActive);

    if (lastActive) {
      loadTagsForInstrument(lastActive.instrument_id);
    }
  };

  const loadTagsForInstrument = (instrumentId: string) => {
    const availableTags = dimensionalStore.getTags(instrumentId, 'active');
    setActiveTags(availableTags);

    // Default to 'Warm Up' segment tag for zero-friction re-entry
    const warmUpTag = availableTags.find((t) => t.tag_name.toLowerCase() === 'warm up');
    if (warmUpTag && selectedTagIds.length === 0) {
      setSelectedTagIds([warmUpTag.tag_id]);
    }
  };

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Handle 1-Tap Quick Start
  const handleStartPractice = () => {
    audioTools.triggerHaptic('tap');
    if (!isRunning) {
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      setIsRunning(true);
    }
  };

  const handlePausePractice = () => {
    audioTools.triggerHaptic('tap');
    setIsRunning(false);
  };

  const handleInstrumentChange = (inst: DimInstrument) => {
    audioTools.triggerHaptic('tap');
    setSelectedInstrument(inst);
    dimensionalStore.setLastActiveInstrument(inst.instrument_id);
    const instTags = dimensionalStore.getTags(inst.instrument_id, 'active');
    setActiveTags(instTags);

    const warmUp = instTags.find((t) => t.tag_name.toLowerCase() === 'warm up');
    setSelectedTagIds(warmUp ? [warmUp.tag_id] : instTags.slice(0, 1).map((t) => t.tag_id));
  };

  const toggleTag = (tagId: string) => {
    audioTools.triggerHaptic('tap');
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Finish practice session
  const handleFinishPractice = () => {
    if (elapsedSeconds < 5) {
      // Gentle dismiss if under 5 seconds
      setIsRunning(false);
      setElapsedSeconds(0);
      setSessionStartTime(null);
      return;
    }

    audioTools.triggerHaptic('success');
    setIsRunning(false);
    audioTools.stopMetronome();
    setIsMetronomeActive(false);
    audioTools.stopDrone();
    setIsDroneActive(false);

    const endTime = new Date();
    const startTime = sessionStartTime || new Date(endTime.getTime() - elapsedSeconds * 1000);

    const session = dimensionalStore.recordSession({
      instrumentId: selectedInstrument!.instrument_id,
      durationSeconds: elapsedSeconds,
      startedAt: startTime,
      endedAt: endTime,
      tagIds: selectedTagIds,
      syncStatus: isOffline ? 'pending' : 'synced',
    });

    setCompletionSummary({
      duration: elapsedSeconds,
      xp: session.xp_earned,
      instrument: selectedInstrument!.name,
      syncStatus: session.sync_status,
    });

    setElapsedSeconds(0);
    setSessionStartTime(null);
    onSessionFinished();
  };

  // Metronome toggle
  const toggleMetronome = () => {
    audioTools.triggerHaptic('tap');
    if (isMetronomeActive) {
      audioTools.stopMetronome();
      setIsMetronomeActive(false);
    } else {
      setIsMetronomeActive(true);
      audioTools.startMetronome(metronomeBpm, (beat) => {
        setMetronomeBeat(beat % 4);
      });
    }
  };

  // Drone toggle
  const toggleDrone = () => {
    audioTools.triggerHaptic('tap');
    if (isDroneActive) {
      audioTools.stopDrone();
      setIsDroneActive(false);
    } else {
      setIsDroneActive(true);
      const freq = droneNote === 'A4' ? 440 : droneNote === 'Oboe 442' ? 442 : 261.63;
      audioTools.playDrone(freq);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Instrument Selection Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-800/50">
        <div className="flex items-center gap-1.5 p-1 bg-[#241442] rounded-xl border border-purple-800/40">
          {instruments.map((inst) => (
            <button
              key={inst.instrument_id}
              onClick={() => handleInstrumentChange(inst)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedInstrument?.instrument_id === inst.instrument_id
                  ? 'bg-yellow-400 text-purple-950 font-bold shadow-xs'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {inst.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-purple-200">
          <span>Level {selectedInstrument?.current_level || 1}</span>
          <span aria-hidden="true" className="text-purple-400">·</span>
          <span className="font-mono tabular-nums text-yellow-400 font-semibold">{selectedInstrument?.current_xp || 0} XP</span>
        </div>
      </div>

      {/* Main Practice Core Card */}
      <div className="p-6 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-lg shadow-purple-950/40 relative overflow-hidden">
        {/* Ambient Warm Gradient Accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center justify-center text-center py-4">
          <span className="text-xs font-medium text-yellow-300">
            {isRunning ? 'Currently Practicing' : 'Ready to Practice'}
          </span>

          {/* Big Tabular Zero-Distraction Stopwatch */}
          <div className="my-3 font-mono text-5xl sm:text-6xl font-bold tracking-tight text-white tabular-nums drop-shadow-xs">
            {formatTime(elapsedSeconds)}
          </div>

          <p className="text-xs text-purple-200 max-w-xs mb-6">
            {isRunning
              ? 'Stay in flow. Every minute counts toward your rolling 7-day target.'
              : `1-tap start for ${selectedInstrument?.name || 'Voice'} with Warm Up focus.`}
          </p>

          {/* Primary 1-Tap Action Controller in Natural Thumb Zone */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            {!isRunning ? (
              <button
                onClick={handleStartPractice}
                className="flex-1 h-13 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{elapsedSeconds > 0 ? 'Resume Practice' : 'Start Practice'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePausePractice}
                  className="flex-1 h-13 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform border border-purple-700/60 cursor-pointer"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={handleFinishPractice}
                  className="flex-1 h-13 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-yellow-500/20 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Finish</span>
                </button>
              </>
            )}

            {elapsedSeconds > 0 && !isRunning && (
              <button
                onClick={handleFinishPractice}
                title="Finish & Save Session"
                className="h-13 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Focus Tags Attribution (Interactive Buttons, <= 2 words constraint) */}
        <div className="mt-4 pt-4 border-t border-purple-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">
              Active Focus Tags
            </span>
            <span className="text-[11px] text-purple-300/70">
              Dimensional Attribution
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.tag_id);
              return (
                <button
                  key={tag.tag_id}
                  onClick={() => toggleTag(tag.tag_id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-400 text-purple-950 shadow-sm'
                      : 'bg-purple-900/40 text-purple-200 border border-purple-700/50 hover:bg-purple-800/50'
                  }`}
                >
                  {tag.tag_name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Practice Utilities Drawer Toggle */}
        <div className="mt-4 pt-3 border-t border-purple-800/60 flex items-center justify-between">
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center gap-1.5 text-xs font-semibold text-purple-200 hover:text-yellow-300 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            <span>Practice Aids: Metronome & Tuning Drone</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTools ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Audio Utilities Drawer */}
        {showTools && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#221342] border border-purple-800/60 space-y-3">
            {/* Metronome */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMetronome}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isMetronomeActive
                      ? 'bg-yellow-400 text-purple-950'
                      : 'bg-purple-900/80 text-white border border-purple-700/60 hover:bg-purple-800'
                  }`}
                >
                  {isMetronomeActive ? 'Stop Metronome' : 'Start Metronome'}
                </button>
                <span className="font-mono text-xs tabular-nums text-yellow-300 font-semibold">
                  {metronomeBpm} BPM
                </span>
                {isMetronomeActive && (
                  <div className="flex gap-1 ml-1">
                    {[0, 1, 2, 3].map((b) => (
                      <div
                        key={b}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          metronomeBeat === b ? 'bg-yellow-400' : 'bg-purple-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <input
                type="range"
                min="40"
                max="208"
                value={metronomeBpm}
                onChange={(e) => {
                  const bpm = parseInt(e.target.value, 10);
                  setMetronomeBpm(bpm);
                  if (isMetronomeActive) {
                    audioTools.startMetronome(bpm, (beat) => setMetronomeBeat(beat % 4));
                  }
                }}
                className="w-24 sm:w-32 accent-yellow-400"
              />
            </div>

            {/* Tuning Reference Drone */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-purple-800/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDrone}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isDroneActive
                      ? 'bg-yellow-400 text-purple-950'
                      : 'bg-purple-900/80 text-white border border-purple-700/60 hover:bg-purple-800'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                  {isDroneActive ? 'Stop Drone' : 'Play Drone'}
                </button>
                <span className="text-xs text-purple-200">
                  {droneNote} Reference Pitch
                </span>
              </div>

              <div className="flex gap-1">
                {(['A4', 'Oboe 442', 'C4'] as const).map((note) => (
                  <button
                    key={note}
                    onClick={() => {
                      setDroneNote(note);
                      if (isDroneActive) {
                        const freq = note === 'A4' ? 440 : note === 'Oboe 442' ? 442 : 261.63;
                        audioTools.playDrone(freq);
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      droneNote === note
                        ? 'bg-yellow-400 text-purple-950'
                        : 'bg-purple-900/50 text-purple-200 border border-purple-700/40 hover:bg-purple-800'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Saved Modal / Toast (Zero-Guilt Celebration) */}
      {completionSummary && (
        <div className="p-4 rounded-xl bg-[#2b1850] border border-yellow-400/70 text-white flex items-center justify-between shadow-lg shadow-purple-950/60">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-white">
                {completionSummary.instrument} Practice Recorded
              </span>
            </div>
            <div className="text-xs text-purple-200 flex items-center gap-2">
              <span>{Math.round(completionSummary.duration / 60)} minutes</span>
              <span aria-hidden="true" className="text-purple-400">·</span>
              <span className="text-yellow-300 font-semibold font-mono">+{completionSummary.xp} XP</span>
              <span aria-hidden="true" className="text-purple-400">·</span>
              <span className="text-purple-300/80">
                {completionSummary.syncStatus === 'pending'
                  ? 'Saved to Local SQLite'
                  : 'Cloud Synced'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setCompletionSummary(null)}
            className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-yellow-400 text-purple-950 hover:bg-yellow-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
