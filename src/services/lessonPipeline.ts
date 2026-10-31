/**
 * Cantabile - Lesson Audio Pipeline
 * Native document picker & Supabase Storage upload
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
 */
async function uploadAudioToSupabase(file: PickedAudioFile): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `uploads/${timestamp}_${safeName}`;

  console.log(`[STORAGE] Converting audio file to blob: ${file.uri}`);
  const response = await fetch(file.uri);
  const blob = await response.blob();

  console.log(`[STORAGE] Uploading to 'lesson-recordings' at path: ${filePath}`);
  const { data, error } = await supabase.storage
    .from('lesson-recordings')
    .upload(filePath, blob, {
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
): Promise<FactLessonSummary | null> {
  const quota =
    typeof (db as any).getQuota === 'function'
      ? (db as any).getQuota()
      : { lessons_processed_this_month: 0, max_lessons_per_month: 10 };

  if (quota.lessons_processed_this_month >= quota.max_lessons_per_month) {
    throw new Error(
      `QUOTA_EXCEEDED (402): Monthly quota of ${quota.max_lessons_per_month} lesson analyses reached.`
    );
  }

  if (onProgress) onProgress('Uploading to Supabase Storage (lesson-recordings)...');
  const uploadedPath = await uploadAudioToSupabase(file);

  if (onProgress) onProgress('File uploaded. Awaiting Edge Function analysis...');
  console.log(`[PIPELINE] Ready to trigger processing for storage path: ${uploadedPath} (${instrumentName})`);

  // Returns null for now until Edge Function is wired to populate real summary rows
  return null;
}