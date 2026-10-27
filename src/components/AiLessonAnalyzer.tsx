import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, FileAudio, Sparkles, Check, ArrowRight, Loader2, AlertCircle, BookmarkPlus, ChevronRight } from 'lucide-react';
import { dimensionalStore, FactLessonSummary, DimTag } from '../db/dimensionalStore';
import { audioTools } from '../utils/audioTools';

interface AiLessonAnalyzerProps {
  onSummaryAdded: () => void;
}

export const AiLessonAnalyzer: React.FC<AiLessonAnalyzerProps> = ({ onSummaryAdded }) => {
  const [instrumentName, setInstrumentName] = useState<string>('Voice');
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  const [transcriptInput, setTranscriptInput] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Processing state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recentSummary, setRecentSummary] = useState<FactLessonSummary | null>(null);
  const [stagedTags, setStagedTags] = useState<DimTag[]>([]);

  // Quota
  const [quota, setQuota] = useState(dimensionalStore.getQuota());

  useEffect(() => {
    refreshStagedTags();
    fetchQuota();
  }, [instrumentName]);

  const refreshStagedTags = () => {
    const activeInst = dimensionalStore.getInstruments().find((i) => i.name === instrumentName);
    if (activeInst) {
      setStagedTags(dimensionalStore.getTags(activeInst.instrument_id, 'staged'));
    }
  };

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/quota');
      if (res.ok) {
        const json = await res.json();
        if (json.quota) {
          setQuota(json.quota);
        }
      }
    } catch {
      setQuota(dimensionalStore.getQuota());
    }
  };

  // Microphone recording
  const handleStartRecording = async () => {
    audioTools.triggerHaptic('tap');
    audioChunksRef.current = [];
    setRecordedBlob(null);
    setAnalysisError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setAnalysisError('Microphone access was denied or not supported on this device.');
    }
  };

  const handleStopRecording = () => {
    audioTools.triggerHaptic('tap');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Run AI analysis
  const handleAnalyze = async () => {
    audioTools.triggerHaptic('tap');
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      let audioBase64: string | undefined;
      let mimeType: string | undefined;

      // If audio file or recording is provided, downsample to 16kHz mono (react-native-compressor behavior)
      const blobToProcess = recordedBlob || audioFile;
      if (blobToProcess) {
        const compressed = await audioTools.processAudioTo16kHzMonoBase64(blobToProcess);
        audioBase64 = compressed.base64;
        mimeType = compressed.mimeType;
      }

      if (!audioBase64 && (!transcriptInput || transcriptInput.trim().length === 0)) {
        throw new Error('Please enter lesson notes or record/upload audio first.');
      }

      const res = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrumentName,
          transcriptText: transcriptInput,
          audioBase64,
          mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Lesson analysis failed');
      }

      const targetInst = dimensionalStore.getInstruments().find((i) => i.name === instrumentName);
      if (!targetInst) throw new Error('Instrument not found');

      // Record in Kimball Fact table
      const summary = dimensionalStore.recordLessonSummary({
        instrumentId: targetInst.instrument_id,
        lessonDate: new Date().toISOString().slice(0, 10),
        areasOfGrowth: data.analysis.areas_of_growth,
        winsAndStrengths: data.analysis.wins_and_strengths,
        techniqueMechanicsCues: data.analysis.technique_mechanics_cues,
        transcriptText: data.analysis.transcript_text,
        stagedTags: data.analysis.suggested_tags || [],
      });

      audioTools.triggerHaptic('success');
      setRecentSummary(summary);
      setTranscriptInput('');
      setAudioFile(null);
      setRecordedBlob(null);
      refreshStagedTags();
      fetchQuota();
      onSummaryAdded();
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err?.message || 'An error occurred while analyzing the lesson.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePromoteTag = (tagId: string) => {
    audioTools.triggerHaptic('tap');
    dimensionalStore.promoteStagedTag(tagId);
    refreshStagedTags();
    onSummaryAdded();
  };

  const handleDismissTag = (tagId: string) => {
    audioTools.triggerHaptic('tap');
    dimensionalStore.archiveTag(tagId);
    refreshStagedTags();
  };

  return (
    <div className="space-y-4">
      {/* Quota & Instrument Selector Card */}
      <div className="p-4 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-purple-200">
            Instrument:
          </span>
          <div className="flex gap-1 bg-[#241442] p-1 rounded-xl border border-purple-800/50">
            {['Voice', 'Piano', 'Oboe'].map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrumentName(inst)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  instrumentName === inst
                    ? 'bg-yellow-400 text-purple-950 font-bold shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>

        {/* Kimball User Quota Protection Display */}
        <div className="flex items-center gap-2 text-xs text-purple-200">
          <span>Monthly AI Quota:</span>
          <span className="font-mono tabular-nums font-bold text-yellow-400">
            {quota.lessons_processed_this_month}/{quota.max_lessons_per_month} used
          </span>
          <span className="text-[11px] text-yellow-300/90 font-medium">
            ({Math.max(0, quota.max_lessons_per_month - quota.lessons_processed_this_month)} remaining)
          </span>
        </div>
      </div>

      {/* Input Form & Mode Selector */}
      <div className="p-5 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 space-y-4 text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">
              AI Pedagogical Lesson Analysis
            </h3>
            <p className="text-xs text-purple-200">
              Extracts growth areas, anatomical mechanics cues, and dimensional focus tags
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#241442] border border-purple-800/50 rounded-xl">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'text'
                  ? 'bg-yellow-400 text-purple-950 font-bold shadow-xs'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Notes / Transcript
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'audio'
                  ? 'bg-yellow-400 text-purple-950 font-bold shadow-xs'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Audio / Memo
            </button>
          </div>
        </div>

        {/* Text Input Mode */}
        {mode === 'text' && (
          <div className="space-y-2">
            <textarea
              rows={4}
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              placeholder="Paste teacher notes, lesson reflections, or feedback here... (e.g., 'Work on soft palate arch during higher registration, keep breath continuous through French vowels, release lower jaw tension')"
              className="w-full text-xs p-3.5 rounded-xl bg-[#1a0f2e] border border-purple-700/80 text-white placeholder:text-purple-300/40 focus:outline-hidden focus:ring-1 focus:ring-yellow-400"
            />
            <div className="flex justify-end">
              <button
                onClick={() =>
                  setTranscriptInput(
                    `In today's ${instrumentName} lesson, we worked on intervallic accuracy and breathing mechanics. The teacher noted that my rib cage expansion was grounded and tone was resonant, but suggested releasing the root of my tongue during vowel transitions. We drilled arpeggios focusing on maintaining soft palate lift and floating the high tessitura without pushing.`
                  )
                }
                className="text-[11px] text-yellow-400 hover:text-yellow-300 underline cursor-pointer"
              >
                Insert sample {instrumentName} lesson notes
              </button>
            </div>
          </div>
        )}

        {/* Audio Recording / Upload Mode */}
        {mode === 'audio' && (
          <div className="p-4 rounded-xl bg-[#221342] border border-purple-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="px-3.5 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Record Lesson Memo</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="px-3.5 py-2 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                  >
                    <div className="w-2.5 h-2.5 rounded-sm bg-white" />
                    <span>Stop Recording</span>
                  </button>
                )}

                {recordedBlob && (
                  <span className="text-xs text-yellow-300 font-semibold">
                    Audio recorded ({Math.round(recordedBlob.size / 1024)} KB)
                  </span>
                )}
              </div>

              <div className="text-xs text-purple-300">or upload audio file</div>

              <label className="px-3 py-2 rounded-lg bg-[#2b1850] border border-purple-700 text-xs font-semibold text-white hover:bg-purple-800 cursor-pointer flex items-center gap-1.5 shrink-0">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>{audioFile ? audioFile.name.slice(0, 16) + '...' : 'Pick Audio File'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setAudioFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[11px] text-purple-300/80">
              Audio is downsampled in-browser to 16kHz mono (AAC/PCM) via Web Audio API before processing, exactly matching react-native-compressor.
            </p>
          </div>
        )}

        {/* Error Notification */}
        {analysisError && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Analyze Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || quota.lessons_processed_this_month >= quota.max_lessons_per_month}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-purple-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-yellow-500/10 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-950" />
                <span>Analyzing Lesson with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Extract Growth, Mechanics & Tags</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Staged Tags Card (Kimball DDL chk_tag_length constraint enforcement) */}
      {stagedTags.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#241442] border border-yellow-400/50 space-y-3 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-yellow-400">
                Staged Lesson Tags ({stagedTags.length})
              </span>
              <p className="text-[11px] text-purple-200">
                Extracted by AI · Under 2 words constraint · Promote to practice stopwatch
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {stagedTags.map((tag) => (
              <div
                key={tag.tag_id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2b1850] border border-yellow-400/40 text-xs text-white shadow-xs"
              >
                <span className="font-semibold">{tag.tag_name}</span>
                <button
                  onClick={() => handlePromoteTag(tag.tag_id)}
                  title="Promote to Active"
                  className="p-1 rounded hover:bg-yellow-400 hover:text-purple-950 text-yellow-400 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDismissTag(tag.tag_id)}
                  title="Dismiss"
                  className="p-1 rounded hover:bg-purple-800 text-purple-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Analysis Results (Structured Kimball Fact Display) */}
      {recentSummary && (
        <div className="p-5 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 space-y-4 text-white">
          <div className="flex items-center justify-between border-b border-purple-800/60 pb-2">
            <span className="text-xs font-bold text-white">
              Fact Entity: fact_lesson_summaries
            </span>
            <span className="text-[11px] text-yellow-400 font-mono font-semibold">
              Date: {recentSummary.lesson_date}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Wins & Strengths */}
            <div>
              <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider mb-1">
                Wins & Strengths
              </div>
              <p className="text-purple-100 leading-relaxed bg-[#221342] p-3 rounded-xl border border-purple-800/60">
                {recentSummary.wins_and_strengths}
              </p>
            </div>

            {/* Areas of Growth */}
            <div>
              <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                Areas of Growth
              </div>
              <p className="text-purple-100 leading-relaxed bg-[#221342] p-3 rounded-xl border border-purple-800/60">
                {recentSummary.areas_of_growth}
              </p>
            </div>

            {/* Technique Mechanics Cues */}
            <div>
              <div className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider mb-1">
                Technique Mechanics & Somatic Cues
              </div>
              <p className="text-white leading-relaxed bg-[#221342] p-3 rounded-xl border border-purple-800/60 font-medium">
                {recentSummary.technique_mechanics_cues}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
