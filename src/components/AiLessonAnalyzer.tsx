/**
 * Cantabile - AiLessonAnalyzer Component
 * Audio Ingestion, Pedagogical Vocal Analysis & Tag Staging Review
 */

import {
  AlertCircle,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db, DimInstrument, DimTag, FactLessonSummary } from '../database/schema';
import { pickLessonAudioFile, processLessonRecording } from '../services/lessonPipeline';

interface AiLessonAnalyzerProps {
  activeInstrument: DimInstrument;
  onTagsUpdated: () => void;
}

export const AiLessonAnalyzer: React.FC<AiLessonAnalyzerProps> = ({
  activeInstrument,
  onTagsUpdated,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStage, setPipelineStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accordion open/collapse states
  const [isGrowthOpen, setIsGrowthOpen] = useState<boolean>(true);
  const [isWinsOpen, setIsWinsOpen] = useState<boolean>(true);
  const [isMechanicsOpen, setIsMechanicsOpen] = useState<boolean>(true);

  // Refresh trigger
  const [refreshSeed, setRefreshSeed] = useState<number>(0);

  // Safe data queries
  const quota =
    typeof (db as any).getQuota === 'function'
      ? (db as any).getQuota()
      : {
          plan_tier: 'beta_free',
          lessons_processed_this_month: 0,
          max_lessons_per_month: 10,
        };

  const stagedTags: DimTag[] =
    typeof (db as any).getStagedTags === 'function'
      ? (db as any).getStagedTags(activeInstrument.instrument_id)
      : [];

  const lessonSummaries: FactLessonSummary[] =
    typeof (db as any).getLessonSummaries === 'function'
      ? (db as any).getLessonSummaries(activeInstrument.instrument_id)
      : [];

  const latestLesson: FactLessonSummary | undefined = lessonSummaries[0];

  // Parse latest lesson content safely
  let areasOfGrowth: string[] = [];
  let winsAndStrengths: string[] = [];
  let mechanicsCues: string[] = [];

  if (latestLesson) {
    try {
      areasOfGrowth = JSON.parse(latestLesson.areas_of_growth);
    } catch {
      areasOfGrowth = [latestLesson.areas_of_growth];
    }
    try {
      winsAndStrengths = JSON.parse(latestLesson.wins_and_strengths);
    } catch {
      winsAndStrengths = [latestLesson.wins_and_strengths];
    }
    try {
      mechanicsCues = JSON.parse(latestLesson.technique_mechanics_cues);
    } catch {
      mechanicsCues = [latestLesson.technique_mechanics_cues];
    }
  }

const handleIngestAudio = async () => {
    setErrorMessage(null);
    try {
      console.log('[DEBUG] 1. Starting file picker...');
      const file = await pickLessonAudioFile();
      console.log('[DEBUG] 2. Picker returned:', file);

      if (!file) {
        Alert.alert('Picker Cancelled', 'No file was selected or returned.');
        return;
      }

      // Guard against undefined activeInstrument
      const instId = activeInstrument?.instrument_id || (activeInstrument as any)?.instrumentId || 'inst-voice-001';
      const instName = activeInstrument?.name || 'Voice';

      console.log(`[DEBUG] 3. Starting pipeline for ${instName} (${instId})...`);
      setIsProcessing(true);

      await processLessonRecording(
        file,
        instId,
        instName,
        (stage) => {
          console.log('[DEBUG Stage]:', stage);
          setPipelineStage(stage);
        }
      );

      console.log('[DEBUG] 4. Pipeline finished successfully.');
      setRefreshSeed((prev) => prev + 1);
      if (typeof onTagsUpdated === 'function') {
        onTagsUpdated();
      }
    } catch (err: any) {
      console.error('[INGEST ERROR RAW]:', err);
      // Alerts the full error message and name
      Alert.alert(
        'Ingestion Caught Error',
        `${err?.name || 'Error'}: ${err?.message || String(err)}\n\nStack:\n${err?.stack?.slice(0, 150) || 'No stack'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveTag = (tagId: string) => {
    if (typeof (db as any).approveStagedTag === 'function') {
      (db as any).approveStagedTag(tagId);
      setRefreshSeed((prev) => prev + 1);
      if (typeof onTagsUpdated === 'function') onTagsUpdated();
    }
  };

  const handleDiscardTag = (tagId: string) => {
    if (typeof (db as any).discardStagedTag === 'function') {
      (db as any).discardStagedTag(tagId);
      setRefreshSeed((prev) => prev + 1);
      if (typeof onTagsUpdated === 'function') onTagsUpdated();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Quota & Cost Protection Banner */}
      <View style={styles.quotaBanner}>
        <View style={styles.quotaTextGroup}>
          <Text style={styles.quotaTitle}>Quota & Cost Protection</Text>
          <Text style={styles.quotaSub}>
            Plan: {quota?.plan_tier ? String(quota.plan_tier).replace('_', ' ').toUpperCase() : 'BETA FREE'} • Cloud Storage Upload
          </Text>
        </View>
        <View style={styles.quotaPill}>
          <Text style={styles.quotaCountText}>
            {quota.lessons_processed_this_month ?? 0} / {quota.max_lessons_per_month ?? 10}
          </Text>
          <Text style={styles.quotaUnitText}>Used</Text>
        </View>
      </View>

      {/* Top Action Button: Ingest New Lesson */}
      <TouchableOpacity
        style={[
          styles.ingestButton,
          isProcessing && styles.ingestButtonDisabled,
          (quota.lessons_processed_this_month ?? 0) >= (quota.max_lessons_per_month ?? 10) &&
            styles.ingestButtonQuotaHit,
        ]}
        activeOpacity={0.8}
        disabled={isProcessing}
        onPress={handleIngestAudio}
      >
        {isProcessing ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <UploadCloud size={20} color="#ffffff" />
        )}
        <Text style={styles.ingestButtonText}>
          {isProcessing ? 'Processing Lesson...' : '+ Ingest New Lesson Recording'}
        </Text>
      </TouchableOpacity>

      {/* Processing Progress Status */}
      {isProcessing && (
        <View style={styles.processingCard}>
          <ActivityIndicator color="#60a5fa" size="small" />
          <View style={styles.processingTextGroup}>
            <Text style={styles.processingTitle}>Augmented Pedagogy Pipeline</Text>
            <Text style={styles.processingStage}>{pipelineStage}</Text>
          </View>
        </View>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* SECTION 1: FEEDBACK ACCORDIONS */}
      <View style={styles.feedbackSection}>
        <View style={styles.sectionHeaderRow}>
          <Sparkles size={16} color="#60a5fa" />
          <Text style={styles.sectionTitle}>
            {activeInstrument.name} Lesson Critique & Mechanics
          </Text>
        </View>
        <Text style={styles.sectionSubtext}>
          Evaluated against classical vocal pedagogy and music theory definitions.
        </Text>

        {latestLesson ? (
          <View style={styles.accordionsWrapper}>
            {/* Accordion 1: Areas of Growth */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.7}
                onPress={() => setIsGrowthOpen(!isGrowthOpen)}
              >
                <View style={styles.accordionTitleRow}>
                  <View style={[styles.accordionIconPill, styles.growthPill]}>
                    <AlertCircle size={14} color="#f59e0b" />
                  </View>
                  <Text style={styles.accordionTitleText}>
                    Areas of Growth & Instabilities
                  </Text>
                </View>
                {isGrowthOpen ? (
                  <ChevronUp size={18} color="#94a3b8" />
                ) : (
                  <ChevronDown size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>

              {isGrowthOpen && (
                <View style={styles.accordionBody}>
                  {areasOfGrowth.map((item, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, styles.bulletDotGrowth]} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Accordion 2: Wins & Strengths */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.7}
                onPress={() => setIsWinsOpen(!isWinsOpen)}
              >
                <View style={styles.accordionTitleRow}>
                  <View style={[styles.accordionIconPill, styles.winsPill]}>
                    <Award size={14} color="#10b981" />
                  </View>
                  <Text style={styles.accordionTitleText}>
                    Wins & Executed Strengths
                  </Text>
                </View>
                {isWinsOpen ? (
                  <ChevronUp size={18} color="#94a3b8" />
                ) : (
                  <ChevronDown size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>

              {isWinsOpen && (
                <View style={styles.accordionBody}>
                  {winsAndStrengths.map((item, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, styles.bulletDotWins]} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Accordion 3: Technique & Mechanics Cues */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.7}
                onPress={() => setIsMechanicsOpen(!isMechanicsOpen)}
              >
                <View style={styles.accordionTitleRow}>
                  <View style={[styles.accordionIconPill, styles.cuesPill]}>
                    <Zap size={14} color="#8b5cf6" />
                  </View>
                  <Text style={styles.accordionTitleText}>
                    Technique & Mechanics Cues
                  </Text>
                </View>
                {isMechanicsOpen ? (
                  <ChevronUp size={18} color="#94a3b8" />
                ) : (
                  <ChevronDown size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>

              {isMechanicsOpen && (
                <View style={styles.accordionBody}>
                  {mechanicsCues.map((item, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, styles.bulletDotCues]} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyLessonCard}>
            <Text style={styles.emptyLessonText}>
              No lesson recordings ingested yet for {activeInstrument.name}. Tap the button above to ingest an audio file (.m4a or .mp3).
            </Text>
          </View>
        )}
      </View>

      {/* SECTION 2: STAGING REVIEW AREA (BOTTOM OF SCREEN) */}
      <View style={styles.stagingSection}>
        <View style={styles.sectionHeaderRow}>
          <Layers size={16} color="#a855f7" />
          <Text style={styles.sectionTitle}>Staged Focus Tags Review</Text>
        </View>
        <Text style={styles.sectionSubtext}>
          LLM-extracted pedagogical tags (max 2 words, Title Case). Approve to add to Tab 1 practice carousel, or discard.
        </Text>

        {stagedTags.length === 0 ? (
          <View style={styles.emptyStagedCard}>
            <Text style={styles.emptyStagedText}>
              All suggested tags reviewed! Staged tags will appear here automatically when a new lesson is analyzed.
            </Text>
          </View>
        ) : (
          <View style={styles.stagedTagsGrid}>
            {stagedTags.map((tag: DimTag) => (
              <View key={tag.tag_id} style={styles.stagedTagCard}>
                <View style={styles.stagedTagInfo}>
                  <Text style={styles.stagedTagName}>{tag.tag_name}</Text>
                  <Text style={styles.stagedTagMeta}>
                    {tag.source === 'lesson_extracted' ? 'AI Lesson' : 'Custom'} • 2-word limit
                  </Text>
                </View>

                {/* Direct Touch Action Buttons */}
                <View style={styles.actionButtonGroup}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    activeOpacity={0.7}
                    onPress={() => handleApproveTag(tag.tag_id)}
                  >
                    <Check size={14} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.discardButton}
                    activeOpacity={0.7}
                    onPress={() => handleDiscardTag(tag.tag_id)}
                  >
                    <X size={14} color="#ef4444" />
                    <Text style={styles.discardButtonText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  quotaBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  quotaTextGroup: { flex: 1 },
  quotaTitle: { fontSize: 13, fontWeight: '700', color: '#f8fafc' },
  quotaSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  quotaPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quotaCountText: { fontSize: 13, fontWeight: '800', color: '#60a5fa' },
  quotaUnitText: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' },
  ingestButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ingestButtonDisabled: { opacity: 0.7 },
  ingestButtonQuotaHit: { backgroundColor: '#475569' },
  ingestButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 12,
    marginBottom: 16,
  },
  processingTextGroup: { flex: 1 },
  processingTitle: { fontSize: 13, fontWeight: '700', color: '#60a5fa' },
  processingStage: { fontSize: 12, color: '#cbd5e1', marginTop: 2 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
    marginBottom: 16,
  },
  errorText: { color: '#f87171', fontSize: 12, flex: 1 },
  feedbackSection: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#f8fafc' },
  sectionSubtext: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  accordionsWrapper: { gap: 10 },
  accordionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  accordionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  accordionIconPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthPill: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  winsPill: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  cuesPill: { backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  accordionTitleText: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', flex: 1 },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 8,
  },
  bulletItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletDotGrowth: { backgroundColor: '#f59e0b' },
  bulletDotWins: { backgroundColor: '#10b981' },
  bulletDotCues: { backgroundColor: '#a855f7' },
  bulletText: { fontSize: 13, color: '#cbd5e1', lineHeight: 18, flex: 1 },
  emptyLessonCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyLessonText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  stagingSection: { marginBottom: 20 },
  emptyStagedCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStagedText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  stagedTagsGrid: { gap: 8 },
  stagedTagCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stagedTagInfo: { flex: 1 },
  stagedTagName: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  stagedTagMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  actionButtonGroup: { flexDirection: 'row', gap: 8 },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  discardButtonText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
});