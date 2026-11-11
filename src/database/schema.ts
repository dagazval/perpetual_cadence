/**
 * Cantabile - Native SQLite Dimensional Storage Engine
 * Strict Kimball-style Star Schema Implementation via expo-sqlite
 */
import * as SQLite from 'expo-sqlite';

import { supabase } from '../services/supabaseClient'; // ensure supabase client is imported

export interface DimInstrument {
  instrument_id: string;
  user_id: string;
  name: string;
  target_days_rolling_week: number;
  current_xp: number;
  current_level: number;
  created_at: string;
}

export interface DimRepertoire {
  repertoire_id: string; // UUID primary key
  user_id: string;       // Foreign key / user attribution
  instrument_id: string; // Foreign key referencing dim_instruments
  title: string;
  composer_arranger: string;
  is_active: boolean;    // Only active pieces display on the lock screen
  created_at: string;
}

export interface DimTag {
  tag_id: string;
  user_id: string;
  instrument_id: string;
  tag_name: string;
  tag_type: 'Session Segment' | 'Technique Focus';
  status: 'staged' | 'active' | 'archived';
  source: 'user' | 'lesson_extracted';
  created_at: string;
}

export interface FactPracticeSession {
  session_id: string;
  user_id: string;
  instrument_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  xp_earned: number;
  counts_for_streak: boolean;
  sync_status: 'pending' | 'synced';
  created_at: string;
}

export interface BridgeSessionTag {
  session_id: string;
  tag_id: string;
  user_id: string;
}

export interface FactLessonSummary {
  lesson_id: string;
  user_id: string;
  instrument_id: string;
  lesson_date: string;
  areas_of_growth: string;
  wins_and_strengths: string;
  technique_mechanics_cues: string;
  transcript_text: string | null;
  created_at: string;
}

export interface FactTeacherComment {
  comment_id: string;
  lesson_id: string;
  instrument_id: string;
  card_category: string;
  comment_text: string;
  comment_date: string;
  sync_status: 'pending' | 'synced';
  created_at: string;
}

export interface UserQuota {
  user_id: string;
  plan_tier: string;
  lessons_processed_this_month: number;
  max_lessons_per_month: number;
  billing_cycle_anchor: string;
}

export interface PracticeSessionWithTags extends FactPracticeSession {
  instrument_name?: string;
  tags?: DimTag[];
}

export const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';

// Pre-defined UUIDs conforming to Supabase PostgreSQL constraints
export const DEFAULT_INSTRUMENT_IDS = {
  VOICE: '0fdab669-702b-42cc-88c3-044d5842b9a2',
  PIANO: '201b6d93-7f20-4f47-92b1-cbdb5efc578d',
  OBOE:  'f5a46c7f-c600-433d-9430-ba9f224c8d0d',
};

// Open native SQLite database file on device
const sqliteDb = SQLite.openDatabaseSync('cantabile_v2.db');

// Pure JS RFC 4122 v4 UUID generator (Hermes / React Native safe)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class CantabileDatabase {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = sqliteDb;
    this.initDatabase();
  }

public async syncPracticeSessionsFromCloud(instrumentId?: string): Promise<void> {
    try {
      let query = supabase.from('fact_practice_sessions').select('*');
      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[SUPABASE RESTORE ERROR]:', error.message);
        return;
      }

      if (data && data.length > 0) {
        for (const row of data) {
          // INSERT OR IGNORE avoids duplicates if rows already exist locally
          this.db.runSync(
            `INSERT OR IGNORE INTO fact_practice_sessions 
              (session_id, user_id, instrument_id, started_at, ended_at, duration_seconds, xp_earned, counts_for_streak, sync_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?);`,
            [
              row.session_id,
              row.user_id || CURRENT_USER_ID,
              row.instrument_id,
              row.started_at,
              row.ended_at,
              row.duration_seconds,
              row.xp_earned ?? (Math.floor(row.duration_seconds / 60) * 10),
              row.counts_for_streak ? 1 : 0,
              row.created_at || new Date().toISOString(),
            ]
          );
        }
        console.log(`[LOCAL RECONCILIATION]: Synced ${data.length} session(s) from Supabase.`);
      }
    } catch (err) {
      console.error('[CLOUD SYNC EXCEPTION]:', err);
    }
  }
  
  private initDatabase(): void {
    try {
      this.db.execSync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS dim_instruments (
          instrument_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL UNIQUE,
          target_days_rolling_week INTEGER NOT NULL DEFAULT 4,
          current_xp INTEGER NOT NULL DEFAULT 0,
          current_level INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dim_repertoire (
          repertoire_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          instrument_id TEXT NOT NULL REFERENCES dim_instruments(instrument_id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          composer_arranger TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dim_tags (
          tag_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          instrument_id TEXT NOT NULL REFERENCES dim_instruments(instrument_id) ON DELETE CASCADE,
          tag_name TEXT NOT NULL,
          tag_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          source TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fact_practice_sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          instrument_id TEXT NOT NULL REFERENCES dim_instruments(instrument_id),
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          xp_earned INTEGER NOT NULL DEFAULT 0,
          counts_for_streak INTEGER NOT NULL DEFAULT 0,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bridge_session_tags (
          session_id TEXT NOT NULL REFERENCES fact_practice_sessions(session_id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES dim_tags(tag_id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          PRIMARY KEY (session_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS fact_lesson_summaries (
          lesson_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          instrument_id TEXT NOT NULL REFERENCES dim_instruments(instrument_id),
          lesson_date TEXT NOT NULL,
          areas_of_growth TEXT NOT NULL,
          wins_and_strengths TEXT NOT NULL,
          technique_mechanics_cues TEXT NOT NULL,
          transcript_text TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fact_teacher_comments (
          comment_id TEXT PRIMARY KEY,
          lesson_id TEXT REFERENCES fact_lesson_summaries(lesson_id) ON DELETE CASCADE,
          instrument_id TEXT NOT NULL REFERENCES dim_instruments(instrument_id) ON DELETE CASCADE,
          card_category TEXT NOT NULL,
          comment_text TEXT NOT NULL,
          comment_date TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_quotas (
          user_id TEXT PRIMARY KEY,
          plan_tier TEXT NOT NULL DEFAULT 'beta_free',
          lessons_processed_this_month INTEGER NOT NULL DEFAULT 0,
          max_lessons_per_month INTEGER NOT NULL DEFAULT 10,
          billing_cycle_anchor TEXT NOT NULL
        );
      `);

      // Seed Default Instruments with valid UUIDs
      const nowIso = new Date().toISOString();
      this.db.runSync(
        `INSERT OR IGNORE INTO dim_instruments (instrument_id, user_id, name, target_days_rolling_week, current_xp, current_level, created_at)
         VALUES 
           (?, ?, 'Voice', 4, 320, 1, ?),
           (?, ?, 'Piano', 3, 150, 1, ?),
           (?, ?, 'Oboe', 3, 90, 1, ?);`,
        [
          DEFAULT_INSTRUMENT_IDS.VOICE, CURRENT_USER_ID, nowIso,
          DEFAULT_INSTRUMENT_IDS.PIANO, CURRENT_USER_ID, nowIso,
          DEFAULT_INSTRUMENT_IDS.OBOE, CURRENT_USER_ID, nowIso
        ]
      );

      // Seed Default Tags linked to UUIDs
      this.db.runSync(
        `INSERT OR IGNORE INTO dim_tags (tag_id, user_id, instrument_id, tag_name, tag_type, status, source, created_at)
         VALUES
           ('tag-v-seg-1', ?, ?, 'Warm Up', 'Session Segment', 'active', 'user', ?),
           ('tag-v-seg-2', ?, ?, 'Exercises', 'Session Segment', 'active', 'user', ?),
           ('tag-v-seg-3', ?, ?, 'Repertoire', 'Session Segment', 'active', 'user', ?),
           ('tag-v-tech-1', ?, ?, 'Mid-Range Crackle', 'Technique Focus', 'active', 'lesson_extracted', ?),
           ('tag-p-seg-1', ?, ?, 'Warm Up', 'Session Segment', 'active', 'user', ?),
           ('tag-p-tech-1', ?, ?, 'Hanon Drills', 'Technique Focus', 'active', 'user', ?),
           ('tag-o-seg-1', ?, ?, 'Warm Up', 'Session Segment', 'active', 'user', ?),
           ('tag-o-tech-1', ?, ?, 'Long Tones', 'Technique Focus', 'active', 'user', ?);`,
        [
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.PIANO, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.PIANO, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.OBOE, nowIso,
          CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.OBOE, nowIso,
        ]
      );

      // Seed Default Repertoire for Voice Jury
        this.db.runSync(
          `INSERT OR IGNORE INTO dim_repertoire (
            repertoire_id, user_id, instrument_id, title, composer_arranger, is_active, created_at
          ) VALUES 
            ('rep-voice-001', ?, ?, 'I Feel The Earth Move', 'Carole King', 1, ?),
            ('rep-voice-002', ?, ?, 'Lesson 3 - Intervals of the Sixth', 'Nicola Vaccai', 1, ?),
            ('rep-voice-003', ?, ?, 'Shenandoah', 'arr. Jay Althouse', 1, ?);`,
          [
            CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
            CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
            CURRENT_USER_ID, DEFAULT_INSTRUMENT_IDS.VOICE, nowIso,
          ]
        );

      // Seed Default Quota
      this.db.runSync(
        `INSERT OR IGNORE INTO user_quotas (user_id, plan_tier, lessons_processed_this_month, max_lessons_per_month, billing_cycle_anchor)
         VALUES (?, 'beta_free', 0, 10, ?);`,
        [CURRENT_USER_ID, nowIso.slice(0, 10)]
      );
    } catch (err) {
      console.error('[CRITICAL SQLITE INIT CRASH]:', err);
    }
  }

  // Dimension: Instruments
  public getInstruments(): DimInstrument[] {
    try {
      const rows = this.db.getAllSync<DimInstrument>('SELECT * FROM dim_instruments ORDER BY created_at ASC;');
      // Deduplicate instruments defensively
      const seen = new Set<string>();
      return rows.filter((inst) => {
        if (seen.has(inst.instrument_id)) return false;
        seen.add(inst.instrument_id);
        return true;
      });
    } catch (err) {
      console.error('[DB ERROR getInstruments]:', err);
      return [];
    }
  }

  public getInstrumentById(id: string): DimInstrument | undefined {
    try {
      const row = this.db.getFirstSync<DimInstrument>(
        'SELECT * FROM dim_instruments WHERE instrument_id = ?;',
        [id]
      );
      return row ?? undefined;
    } catch {
      return undefined;
    }
  }

  // Dimension: Tags
  public getTagsForInstrument(instrumentId: string, includeStaged = false): DimTag[] {
    try {
      if (includeStaged) {
        return this.db.getAllSync<DimTag>(
          `SELECT * FROM dim_tags WHERE instrument_id = ? AND status IN ('active', 'staged');`,
          [instrumentId]
        );
      }
      return this.db.getAllSync<DimTag>(
        `SELECT * FROM dim_tags WHERE instrument_id = ? AND status = 'active';`,
        [instrumentId]
      );
    } catch {
      return [];
    }
  }

  public getStagedTags(instrumentId?: string): DimTag[] {
    try {
      if (instrumentId) {
        return this.db.getAllSync<DimTag>(
          `SELECT * FROM dim_tags WHERE instrument_id = ? AND status = 'staged';`,
          [instrumentId]
        );
      }
      return this.db.getAllSync<DimTag>(`SELECT * FROM dim_tags WHERE status = 'staged';`);
    } catch {
      return [];
    }
  }

  public addTag(tag: Omit<DimTag, 'tag_id' | 'created_at'>): DimTag {
    const words = tag.tag_name.trim().split(/\s+/);
    if (words.length > 2) throw new Error('Tag name must not exceed 2 words');

    const newTag: DimTag = {
      ...tag,
      tag_id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    this.db.runSync(
      `INSERT INTO dim_tags (tag_id, user_id, instrument_id, tag_name, tag_type, status, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newTag.tag_id,
        newTag.user_id,
        newTag.instrument_id,
        newTag.tag_name,
        newTag.tag_type,
        newTag.status,
        newTag.source,
        newTag.created_at,
      ]
    );

    return newTag;
  }

public approveStagedTag(tagId: string): void {
    // 1. Retrieve the tag details BEFORE altering local state
    const tag = this.db.getFirstSync<DimTag>(`SELECT * FROM dim_tags WHERE tag_id = ?;`, [tagId]);

    // 2. Update local SQLite
    this.db.runSync(`UPDATE dim_tags SET status = 'active' WHERE tag_id = ?;`, [tagId]);

    // 3. Update Supabase Cloud
    if (tag) {
      supabase
        .from('dim_tags')
        .update({ status: 'active' })
        .eq('instrument_id', tag.instrument_id)
        .eq('tag_name', tag.tag_name.trim())
        .select()
        .then(({ data, error }) => {
          if (error) {
            console.error('[SUPABASE TAG APPROVE ERROR]:', error.message);
          } else {
            console.log(`[SUPABASE TAG APPROVE SUCCESS]: Updated ${data?.length || 0} row(s) for "${tag.tag_name}"`);
          }
        });
    }
  }

public discardStagedTag(identifier: string, instrumentId?: string): void {
    // 1. Retrieve the tag BEFORE deleting locally (matching tag_id or tag_name)
    const tag = this.db.getFirstSync<DimTag>(
      `SELECT * FROM dim_tags WHERE tag_id = ? OR tag_name = ? LIMIT 1;`,
      [identifier, identifier]
    );

    const targetName = tag ? tag.tag_name : identifier;
    const targetInstrument = tag ? tag.instrument_id : instrumentId;

    console.log(`[DISCARD] Found local tag before delete:`, JSON.stringify(tag));

    // 2. Delete locally from SQLite
    this.db.runSync(
      `DELETE FROM dim_tags WHERE tag_id = ? OR tag_name = ?;`,
      [identifier, identifier]
    );

    // 3. Delete remotely from Supabase
    let query = supabase
      .from('dim_tags')
      .delete()
      .ilike('tag_name', targetName.trim());

    if (targetInstrument) {
      query = query.eq('instrument_id', targetInstrument);
    }

    query
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error('[SUPABASE TAG DISCARD ERROR]:', error.message);
        } else {
          console.log(`[SUPABASE TAG DISCARD SUCCESS]: Deleted ${data?.length || 0} row(s) for "${targetName}"`);
        }
      });
  }

  // Dimension: Repertoire
public getActiveRepertoire(instrumentId: string): DimRepertoire[] {
  try {
    const rows = this.db.getAllSync<any>(
      `SELECT * FROM dim_repertoire 
       WHERE instrument_id = ? AND is_active = 1 
       ORDER BY created_at ASC;`,
      [instrumentId]
    );
    return rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));
  } catch (err) {
    console.error('[DB ERROR getActiveRepertoire]:', err);
    return [];
  }
}

public addRepertoire(piece: {
  instrument_id: string;
  title: string;
  composer_arranger: string;
  is_active?: boolean;
}): DimRepertoire {
  const repertoireId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();
  const isActive = piece.is_active !== undefined ? (piece.is_active ? 1 : 0) : 1;

  this.db.runSync(
    `INSERT INTO dim_repertoire (
      repertoire_id, user_id, instrument_id, title, composer_arranger, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      repertoireId,
      CURRENT_USER_ID,
      piece.instrument_id,
      piece.title.trim(),
      piece.composer_arranger.trim(),
      isActive,
      nowIso,
    ]
  );

  return {
    repertoire_id: repertoireId,
    user_id: CURRENT_USER_ID,
    instrument_id: piece.instrument_id,
    title: piece.title.trim(),
    composer_arranger: piece.composer_arranger.trim(),
    is_active: Boolean(isActive),
    created_at: nowIso,
  };
}

public setRepertoireActiveStatus(repertoireId: string, isActive: boolean): void {
  this.db.runSync(
    `UPDATE dim_repertoire SET is_active = ? WHERE repertoire_id = ?;`,
    [isActive ? 1 : 0, repertoireId]
  );
}

  // Core Fact: Practice Sessions
public recordSession(data: {
    instrument_id: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    tag_ids?: string[];
  }): { session: FactPracticeSession; xpEarned: number } {
    if (data.duration_seconds < 300) {
      throw new Error('Session under 300 seconds discarded per low-friction threshold rule.');
    }

    const minutes = Math.floor(data.duration_seconds / 60);
    const xpEarned = minutes * 10;
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const session: FactPracticeSession = {
      session_id: sessionId,
      user_id: CURRENT_USER_ID,
      instrument_id: data.instrument_id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      duration_seconds: data.duration_seconds,
      xp_earned: xpEarned,
      counts_for_streak: true,
      sync_status: 'pending',
      created_at: nowIso,
    };

    // 1. Transactional write to local SQLite
    this.db.withTransactionSync(() => {
      this.db.runSync(
        `INSERT INTO fact_practice_sessions (
          session_id, user_id, instrument_id, started_at, ended_at,
          duration_seconds, xp_earned, counts_for_streak, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          session.session_id,
          session.user_id,
          session.instrument_id,
          session.started_at,
          session.ended_at,
          session.duration_seconds,
          session.xp_earned,
          session.counts_for_streak ? 1 : 0,
          session.sync_status,
          session.created_at,
        ]
      );

      if (data.tag_ids && data.tag_ids.length > 0) {
        for (const tagId of data.tag_ids) {
          this.db.runSync(
            `INSERT OR IGNORE INTO bridge_session_tags (session_id, tag_id, user_id)
             VALUES (?, ?, ?);`,
            [sessionId, tagId, CURRENT_USER_ID]
          );
        }
      }

      // Update instrument XP and level
      const inst = this.getInstrumentById(data.instrument_id);
      if (inst) {
        const newXp = inst.current_xp + xpEarned;
        const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)) + 1);
        this.db.runSync(
          `UPDATE dim_instruments SET current_xp = ?, current_level = ? WHERE instrument_id = ?;`,
          [newXp, newLevel, data.instrument_id]
        );
      }
    });

    // 2. Dual-write to Supabase (supplying user_id explicitly)
    try {
      supabase
        .from('fact_practice_sessions')
        .insert({
          session_id: sessionId,
          user_id: CURRENT_USER_ID,
          instrument_id: session.instrument_id,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_seconds: session.duration_seconds,
          xp_earned: session.xp_earned,
          counts_for_streak: session.counts_for_streak,
          sync_status: 'synced',
          created_at: nowIso,
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[SUPABASE PRACTICE SYNC WARNING]:', error.message);
          } else {
            console.log(`[SUPABASE PRACTICE SYNC SUCCESS]: Saved session ${sessionId}`);
          }
        });
    } catch (err) {
      console.warn('[SUPABASE SYNC DISPATCH FAILED]:', err);
    }

    return { session, xpEarned };
  }
// Inside src/database/schema.ts, within the CantabileDatabase class:

  public resetMonthlyQuota(): void {
    this.db.runSync(
      `UPDATE user_quotas 
       SET lessons_processed_this_month = 0, max_lessons_per_month = 100 
       WHERE user_id = ?;`,
      [CURRENT_USER_ID]
    );
    console.log('[QUOTA] Local monthly quota reset to 0 / 100.');
  }

  // Practice Log Query
  public getPracticeSessions(instrumentId?: string, limit = 20): PracticeSessionWithTags[] {
    try {
      let rows: FactPracticeSession[] = [];
      if (instrumentId) {
        rows = this.db.getAllSync<FactPracticeSession>(
          `SELECT * FROM fact_practice_sessions WHERE instrument_id = ? ORDER BY started_at DESC LIMIT ?;`,
          [instrumentId, limit]
        );
      } else {
        rows = this.db.getAllSync<FactPracticeSession>(
          `SELECT * FROM fact_practice_sessions ORDER BY started_at DESC LIMIT ?;`,
          [limit]
        );
      }

      return rows.map((session) => {
        const inst = this.getInstrumentById(session.instrument_id);
        const tags = this.db.getAllSync<DimTag>(
          `SELECT t.* FROM dim_tags t
           JOIN bridge_session_tags b ON t.tag_id = b.tag_id
           WHERE b.session_id = ?;`,
          [session.session_id]
        );

        return {
          ...session,
          counts_for_streak: Boolean(session.counts_for_streak),
          instrument_name: inst?.name || 'Instrument',
          tags,
        };
      });
    } catch {
      return [];
    }
  }

  // Rolling 7-Day Consistency Query
  public getRolling7DayStats(instrumentId: string): {
    daysPracticed: number;
    targetDays: number;
    rollingDays: Array<{ dateStr: string; dayLetter: string; isPracticed: boolean; isToday: boolean }>;
  } {
    const inst = this.getInstrumentById(instrumentId);
    const targetDays = inst?.target_days_rolling_week ?? 4;

    try {
      const rows = this.db.getAllSync<{ practice_date: string }>(
        `SELECT DISTINCT substr(started_at, 1, 10) AS practice_date
         FROM fact_practice_sessions
         WHERE instrument_id = ?
           AND duration_seconds >= 300
           AND date(started_at) >= date('now', '-6 days');`,
        [instrumentId]
      );

      const practicedDatesSet = new Set<string>(rows.map((r) => r.practice_date));
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const rollingDays: Array<{ dateStr: string; dayLetter: string; isPracticed: boolean; isToday: boolean }> = [];

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        const ymd = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        const dayOfWeek = targetDate.getDay();

        rollingDays.push({
          dateStr: ymd,
          dayLetter: dayLabels[dayOfWeek],
          isPracticed: practicedDatesSet.has(ymd),
          isToday: i === 0,
        });
      }

      const daysPracticed = rollingDays.filter((d) => d.isPracticed).length;

      return {
        daysPracticed,
        targetDays,
        rollingDays,
      };
    } catch {
      return {
        daysPracticed: 0,
        targetDays,
        rollingDays: [],
      };
    }
  }

  // Level Progression: Total XP = 100 * L^2
  public getLevelProgress(xp: number): {
    currentLevel: number;
    currentLevelBaseXp: number;
    nextLevelRequiredXp: number;
    progressPercent: number;
    xpToNextLevel: number;
  } {
    const currentLevel = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
    const currentLevelBaseXp = 100 * Math.pow(currentLevel - 1, 2);
    const nextLevelRequiredXp = 100 * Math.pow(currentLevel, 2);
    const levelSpan = nextLevelRequiredXp - currentLevelBaseXp;
    const progressInLevel = Math.max(0, xp - currentLevelBaseXp);
    const progressPercent = Math.min(100, Math.round((progressInLevel / (levelSpan || 1)) * 100));
    const xpToNextLevel = Math.max(0, nextLevelRequiredXp - xp);

    return {
      currentLevel,
      currentLevelBaseXp,
      nextLevelRequiredXp,
      progressPercent,
      xpToNextLevel,
    };
  }

  // Lessons
  public getLessonSummaries(instrumentId?: string): FactLessonSummary[] {
    try {
      if (instrumentId) {
        return this.db.getAllSync<FactLessonSummary>(
          `SELECT * FROM fact_lesson_summaries WHERE instrument_id = ? ORDER BY created_at DESC;`,
          [instrumentId]
        );
      }
      return this.db.getAllSync<FactLessonSummary>(
        `SELECT * FROM fact_lesson_summaries ORDER BY created_at DESC;`
      );
    } catch {
      return [];
    }
  }

  // Record Lesson Summary & Staged Focus Tags
  public recordLessonSummary(data: {
    instrument_id: string;
    lesson_date: string;
    areas_of_growth: string[];
    wins_and_strengths: string[];
    technique_mechanics_cues: string[];
    suggested_focus_tags: string[];
    transcript_text?: string;
  }): FactLessonSummary {
    const lessonId = `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const summary: FactLessonSummary = {
      lesson_id: lessonId,
      user_id: CURRENT_USER_ID,
      instrument_id: data.instrument_id,
      lesson_date: data.lesson_date,
      areas_of_growth: JSON.stringify(data.areas_of_growth),
      wins_and_strengths: JSON.stringify(data.wins_and_strengths),
      technique_mechanics_cues: JSON.stringify(data.technique_mechanics_cues),
      transcript_text: data.transcript_text || null,
      created_at: nowIso,
    };

    this.db.withTransactionSync(() => {
      // 1. Insert into fact_lesson_summaries
      this.db.runSync(
        `INSERT INTO fact_lesson_summaries (
          lesson_id, user_id, instrument_id, lesson_date,
          areas_of_growth, wins_and_strengths, technique_mechanics_cues,
          transcript_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          summary.lesson_id,
          summary.user_id,
          summary.instrument_id,
          summary.lesson_date,
          summary.areas_of_growth,
          summary.wins_and_strengths,
          summary.technique_mechanics_cues,
          summary.transcript_text,
          summary.created_at,
        ]
      );



// 2. Stage suggested focus tags into dim_tags (status = 'staged')
      for (const tagRaw of data.suggested_focus_tags) {
        const trimmed = tagRaw.trim();
        const words = trimmed.split(/\s+/);
        const formatted = words
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        if (formatted.length > 0) {
          // >>> PUT THE CHECK RIGHT HERE <<<
          const existing = this.db.getFirstSync<{ tag_id: string }>(
            `SELECT tag_id FROM dim_tags 
             WHERE instrument_id = ? AND lower(trim(tag_name)) = lower(?);`,
            [data.instrument_id, formatted]
          );

          if (!existing) {
            const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            this.db.runSync(
              `INSERT INTO dim_tags (
                tag_id, user_id, instrument_id, tag_name, tag_type, status, source, created_at
              ) VALUES (?, ?, ?, ?, 'Technique Focus', 'staged', 'lesson_extracted', ?);`,
              [tagId, CURRENT_USER_ID, data.instrument_id, formatted, nowIso]
            );
          }
        }
      }

      // 3. Increment quota
      this.db.runSync(
        `UPDATE user_quotas 
         SET lessons_processed_this_month = lessons_processed_this_month + 1 
         WHERE user_id = ?;`,
        [CURRENT_USER_ID]
      );
    });

    return summary;
  }

  // Quotas
  public getQuota(): UserQuota {
    try {
      const quota = this.db.getFirstSync<UserQuota>(
        `SELECT * FROM user_quotas WHERE user_id = ?;`,
        [CURRENT_USER_ID]
      );
      return quota || {
        user_id: CURRENT_USER_ID,
        plan_tier: 'beta_free',
        lessons_processed_this_month: 0,
        max_lessons_per_month: 10,
        billing_cycle_anchor: new Date().toISOString().slice(0, 10),
      };
    } catch {
      return {
        user_id: CURRENT_USER_ID,
        plan_tier: 'beta_free',
        lessons_processed_this_month: 0,
        max_lessons_per_month: 10,
        billing_cycle_anchor: new Date().toISOString().slice(0, 10),
      };
    }
  }
}

// Global Singleton Instance
export const db = new CantabileDatabase();