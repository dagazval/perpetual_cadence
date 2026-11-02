/**
 * Cantabile - Lesson Audio Pipeline
 * Native document picker, Supabase Storage upload, Edge Function trigger, & SQLite persistence
 */

import * as DocumentPicker from 'expo-document-picker';
import { db, FactLessonSummary } from '../database/schema';
import { supabase } from './supabaseClient';

export interface PickedAudioFile {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
}

export const pickLessonAudioFile = async (): Promise<PickedAudioFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    console.log('[DEBUG] Full DocumentPicker Result:', JSON.stringify(result));

    if (result.canceled) {
      console.log('[DEBUG] User canceled the picker.');
      return null;
    }

    if (result.assets && result.assets.length > 0) {
      const selected = result.assets[0];
      console.log('[DEBUG] Asset selected:', selected.name, selected.uri);
      return {
        name: selected.name,
        size: selected.size ?? 0,
        uri: selected.uri,
        mimeType: selected.mimeType || 'audio/m4a',
      };
    }

    return null;
  } catch (error) {
    console.error('[DEBUG] DocumentPicker threw an exception:', error);
    throw error;
  }
};

/**
 * Upload Audio to Supabase Storage Bucket ('lesson-recordings')
 * Reads raw ArrayBuffer directly to avoid Android OkHttp FormDataPart crashes.
 */
async function uploadAudioToSupabase(file: PickedAudioFile): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `uploads/${timestamp}_${safeName}`;

  console.log(`[STORAGE] Reading file as ArrayBuffer from: ${file.uri}`);

  // fetch(file.uri) to arrayBuffer is natively supported in Expo / React Native
  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();

  console.log(`[STORAGE] Uploading ArrayBuffer (${arrayBuffer.byteLength} bytes) to 'lesson-recordings'...`);

  const { data, error } = await supabase.storage
    .from('lesson-recordings')
    .upload(filePath, arrayBuffer, {
      contentType: file.mimeType || 'audio/m4a',
      upsert: true,
    });

  if (error) {
    console.error('[STORAGE ERROR]', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  console.log('[STORAGE SUCCESS] File uploaded successfully:', data?.path);
  return data.path;
}

/**
 * Executes Lesson Storage Upload & Edge Pipeline Trigger
 */
export async function processLessonRecording(
  file: PickedAudioFile,
  instrumentId: string,
  instrumentName: string,
  onProgress?: (stage: string) => void
): Promise<FactLessonSummary> {
  // 1. Upload to Supabase Storage
  if (onProgress) onProgress('Uploading audio to Supabase Storage...');
  const uploadedPath = await uploadAudioToSupabase(file);

  // 2. Trigger Asynchronous Background Task
  if (onProgress) onProgress('Queuing analysis in cloud background...');
  const invokeResponse = await supabase.functions.invoke('process-lesson-audio', {
    body: {
      filePath: uploadedPath,
      instrumentName,
      instrumentId,
      userId: '00000000-0000-0000-0000-000000000001',
    },
  });

  if (invokeResponse.error) {
    throw new Error(`Edge Function trigger failed: ${invokeResponse.error.message}`);
  }

  const { jobId } = invokeResponse.data;
  if (!jobId) throw new Error('Failed to retrieve background Job ID.');

  // 3. Poll for Completion (bypasses the 150-second HTTP gateway limit)
  if (onProgress) onProgress('Gemini analyzing audio (running in cloud)...');
  
  let attempts = 0;
  const maxAttempts = 60; // 60 attempts * 5s = 5 minutes max runtime

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, 5000));

    const { data: job, error } = await supabase
      .from('fact_lesson_jobs')
      .select('status, error_message')
      .eq('job_id', jobId)
      .single();

    if (error) {
      console.warn('[POLL WARNING]', error.message);
      continue;
    }

    if (job?.status === 'completed') {
      break;
    }

    if (job?.status === 'failed') {
      throw new Error(`Background job failed: ${job.error_message}`);
    }

    if (onProgress) {
      onProgress(`Analyzing lesson with Gemini (${attempts * 5}s)...`);
    }
  }

  // 4. Fetch the generated summary from Supabase and sync down to local SQLite
  if (onProgress) onProgress('Saving completed critique to local storage...');

  const { data: latestSummaries, error: fetchErr } = await supabase
    .from('fact_lesson_summaries')
    .select('*')
    .eq('instrument_id', instrumentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr || !latestSummaries || latestSummaries.length === 0) {
    throw new Error('Lesson processed but summary record could not be retrieved.');
  }

  const remote = latestSummaries[0];

  // Save into local SQLite schema
  const summary = db.recordLessonSummary({
    instrument_id: instrumentId,
    lesson_date: remote.lesson_date,
    areas_of_growth: JSON.parse(remote.areas_of_growth),
    wins_and_strengths: JSON.parse(remote.wins_and_strengths),
    technique_mechanics_cues: JSON.parse(remote.technique_mechanics_cues),
    suggested_focus_tags: [],
    transcript_text: remote.transcript_text,
  });

  return summary;
}