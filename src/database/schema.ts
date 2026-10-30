/**
 * Cantabile - Relational Dimensional Schema & SQLite Storage Engine
 * Strict Kimball-style Star Schema Implementation
 * 
 * Target Database: SQLite (local offline-first) & Supabase PostgreSQL (cloud sync)
 */

export interface DimInstrument {
  instrument_id: string;
  user_id: string;
  name: 'Voice' | 'Piano' | 'Oboe' | string;
  target_days_rolling_week: number;
  current_xp: number;
  current_level: number;
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
  areas_of_growth: string; // JSON or formatted text
  wins_and_strengths: string;
  technique_mechanics_cues: string;
  transcript_text: string | null;
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

// In-Memory & LocalStorage backed SQLite relational engine
const STORAGE_PREFIX = 'cantabile_db_v1_';

function getStoredTable<T>(tableName: string, fallback: T[]): T[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(`${STORAGE_PREFIX}${tableName}`);
      if (data) return JSON.parse(data);
    }
  } catch (err) {
    console.warn(`Error reading table ${tableName}:`, err);
  }
  return fallback;
}

function saveTable<T>(tableName: string, records: T[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${tableName}`, JSON.stringify(records));
    }
  } catch (err) {
    console.warn(`Error saving table ${tableName}:`, err);
  }
}

// Default Seed Data
const DEFAULT_INSTRUMENTS: DimInstrument[] = [
  {
    instrument_id: 'inst-voice-001',
    user_id: CURRENT_USER_ID,
    name: 'Voice',
    target_days_rolling_week: 4,
    current_xp: 320,
    current_level: 1,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    instrument_id: 'inst-piano-002',
    user_id: CURRENT_USER_ID,
    name: 'Piano',
    target_days_rolling_week: 3,
    current_xp: 150,
    current_level: 1,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    instrument_id: 'inst-oboe-003',
    user_id: CURRENT_USER_ID,
    name: 'Oboe',
    target_days_rolling_week: 3,
    current_xp: 90,
    current_level: 1,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

const DEFAULT_TAGS: DimTag[] = [
  // Voice Tags
  {
    tag_id: 'tag-v-seg-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Warm Up',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-seg-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Exercises',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-seg-3',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Repertoire',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-tech-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Mid-Range Crackle',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'lesson_extracted',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-tech-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Vowel Space',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-tech-3',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Breath Support',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-v-tech-4',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    tag_name: 'Passaggio Shift',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },

  // Piano Tags
  {
    tag_id: 'tag-p-seg-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-piano-002',
    tag_name: 'Warm Up',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-p-seg-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-piano-002',
    tag_name: 'Exercises',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-p-seg-3',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-piano-002',
    tag_name: 'Repertoire',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-p-tech-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-piano-002',
    tag_name: 'Hanon Drills',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-p-tech-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-piano-002',
    tag_name: 'Pedal Clarity',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },

  // Oboe Tags
  {
    tag_id: 'tag-o-seg-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-oboe-003',
    tag_name: 'Warm Up',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-o-seg-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-oboe-003',
    tag_name: 'Exercises',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-o-seg-3',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-oboe-003',
    tag_name: 'Repertoire',
    tag_type: 'Session Segment',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-o-tech-1',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-oboe-003',
    tag_name: 'Reed Crow',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
  {
    tag_id: 'tag-o-tech-2',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-oboe-003',
    tag_name: 'Long Tones',
    tag_type: 'Technique Focus',
    status: 'active',
    source: 'user',
    created_at: new Date().toISOString(),
  },
];

// Seed recent sessions for rolling 7-day display
const now = Date.now();
const DEFAULT_SESSIONS: FactPracticeSession[] = [
  {
    session_id: 'sess-001',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    started_at: new Date(now - 1 * 86400000 - 1800000).toISOString(),
    ended_at: new Date(now - 1 * 86400000).toISOString(),
    duration_seconds: 1800, // 30 mins
    xp_earned: 300,
    counts_for_streak: true,
    sync_status: 'synced',
    created_at: new Date(now - 1 * 86400000).toISOString(),
  },
  {
    session_id: 'sess-002',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    started_at: new Date(now - 3 * 86400000 - 1200000).toISOString(),
    ended_at: new Date(now - 3 * 86400000).toISOString(),
    duration_seconds: 1200, // 20 mins
    xp_earned: 200,
    counts_for_streak: true,
    sync_status: 'synced',
    created_at: new Date(now - 3 * 86400000).toISOString(),
  },
  {
    session_id: 'sess-003',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    started_at: new Date(now - 5 * 86400000 - 1500000).toISOString(),
    ended_at: new Date(now - 5 * 86400000).toISOString(),
    duration_seconds: 1500, // 25 mins
    xp_earned: 250,
    counts_for_streak: true,
    sync_status: 'synced',
    created_at: new Date(now - 5 * 86400000).toISOString(),
  },
];

const DEFAULT_BRIDGE_TAGS: BridgeSessionTag[] = [
  { session_id: 'sess-001', tag_id: 'tag-v-seg-1', user_id: CURRENT_USER_ID },
  { session_id: 'sess-001', tag_id: 'tag-v-tech-1', user_id: CURRENT_USER_ID },
  { session_id: 'sess-002', tag_id: 'tag-v-seg-2', user_id: CURRENT_USER_ID },
  { session_id: 'sess-002', tag_id: 'tag-v-tech-3', user_id: CURRENT_USER_ID },
  { session_id: 'sess-003', tag_id: 'tag-v-seg-3', user_id: CURRENT_USER_ID },
  { session_id: 'sess-003', tag_id: 'tag-v-tech-2', user_id: CURRENT_USER_ID },
];

const DEFAULT_QUOTA: UserQuota = {
  user_id: CURRENT_USER_ID,
  plan_tier: 'beta_free',
  lessons_processed_this_month: 1,
  max_lessons_per_month: 4,
  billing_cycle_anchor: new Date().toISOString().slice(0, 10),
};

const DEFAULT_LESSON_SUMMARIES: FactLessonSummary[] = [
  {
    lesson_id: 'lesson-001',
    user_id: CURRENT_USER_ID,
    instrument_id: 'inst-voice-001',
    lesson_date: new Date(now - 4 * 86400000).toISOString().slice(0, 10),
    areas_of_growth: JSON.stringify([
      "Vowel spreading on F4-G4 transition; losing pharyngeal resonance.",
      "Slight abdominal clamping at phrase ends before breathing.",
      "Upper passaggio pitch sag during crescendo in descending scalar runs."
    ]),
    wins_and_strengths: JSON.stringify([
      "Clean vocal fold closure on onset in mid register.",
      "Appoggio connection remained steady across Italian art song opening.",
      "Noticeably relaxed larynx during initial five-tone scale warm-up."
    ]),
    technique_mechanics_cues: JSON.stringify([
      "Keep dome of soft palate elevated; drop jaw vertically rather than sideways.",
      "Inhale through the sensation of a gentle gasp of surprise to release epigastrium.",
      "Use narrow [u] into [o] sirens to anchor the second passaggio."
    ]),
    transcript_text: "Teacher: Let's start with descending arpeggios on [mi-me-ma]. Notice how as you climb through E4 into F4, you widen the mouth. Keep the vowel cylindrical...",
    created_at: new Date(now - 4 * 86400000).toISOString(),
  }
];

export class CantabileDatabase {
  private instruments: DimInstrument[];
  private tags: DimTag[];
  private sessions: FactPracticeSession[];
  private bridgeTags: BridgeSessionTag[];
  private lessonSummaries: FactLessonSummary[];
  private quota: UserQuota;

  constructor() {
    this.instruments = getStoredTable('dim_instruments', DEFAULT_INSTRUMENTS);
    this.tags = getStoredTable('dim_tags', DEFAULT_TAGS);
    this.sessions = getStoredTable('fact_practice_sessions', DEFAULT_SESSIONS);
    this.bridgeTags = getStoredTable('bridge_session_tags', DEFAULT_BRIDGE_TAGS);
    this.lessonSummaries = getStoredTable('fact_lesson_summaries', DEFAULT_LESSON_SUMMARIES);
    this.quota = getStoredTable('user_quotas', [DEFAULT_QUOTA])[0] || DEFAULT_QUOTA;
  }

  // Dimension: Instruments
public getInstruments(): DimInstrument[] {
  const seen = new Set<string>();
  return this.instruments.filter((inst) => {
    if (seen.has(inst.instrument_id)) return false;
    seen.add(inst.instrument_id);
    return true;
  });
}

  public getInstrumentById(id: string): DimInstrument | undefined {
    return this.instruments.find(i => i.instrument_id === id);
  }

  // Dimension: Tags
  public getTagsForInstrument(instrumentId: string, includeStaged = false): DimTag[] {
    return this.tags.filter(t => {
      if (t.instrument_id !== instrumentId) return false;
      if (includeStaged) return t.status === 'active' || t.status === 'staged';
      return t.status === 'active';
    });
  }

  public getStagedTags(instrumentId?: string): DimTag[] {
    return this.tags.filter(t => {
      const matchInst = instrumentId ? t.instrument_id === instrumentId : true;
      return matchInst && t.status === 'staged';
    });
  }

  public addTag(tag: Omit<DimTag, 'tag_id' | 'created_at'>): DimTag {
    // Check 2 words constraint
    const words = tag.tag_name.trim().split(/\s+/);
    if (words.length > 2) {
      throw new Error("Tag name must not exceed 2 words");
    }

    const newTag: DimTag = {
      ...tag,
      tag_id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.tags.push(newTag);
    saveTable('dim_tags', this.tags);
    return newTag;
  }

  public approveStagedTag(tagId: string): void {
    const tag = this.tags.find(t => t.tag_id === tagId);
    if (tag) {
      tag.status = 'active';
      saveTable('dim_tags', this.tags);
    }
  }

  public discardStagedTag(tagId: string): void {
    this.tags = this.tags.filter(t => t.tag_id !== tagId);
    saveTable('dim_tags', this.tags);
  }

  // Core Fact: Practice Sessions
  public recordSession(data: {
    instrument_id: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    tag_ids: string[];
  }): { session: FactPracticeSession; xpEarned: number } {
    // 5-minute threshold rule: < 300 seconds is discarded completely
    if (data.duration_seconds < 300) {
      throw new Error("Session under 300 seconds discarded per low-friction threshold rule.");
    }

    // XP calculation: 50 XP base + linear accumulation (10 XP per minute)
    const minutes = Math.floor(data.duration_seconds / 60);
    const xpEarned = minutes * 10;

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const session: FactPracticeSession = {
      session_id: sessionId,
      user_id: CURRENT_USER_ID,
      instrument_id: data.instrument_id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      duration_seconds: data.duration_seconds,
      xp_earned: xpEarned,
      counts_for_streak: true,
      sync_status: 'synced',
      created_at: new Date().toISOString(),
    };

    // Transactional write: Session + Bridge Tags
    this.sessions.unshift(session);
    saveTable('fact_practice_sessions', this.sessions);

    for (const tagId of data.tag_ids) {
      this.bridgeTags.push({
        session_id: sessionId,
        tag_id: tagId,
        user_id: CURRENT_USER_ID,
      });
    }
    saveTable('bridge_session_tags', this.bridgeTags);

    // Update Instrument XP & Level progression (Total XP = 100 * L^2)
    const instrument = this.instruments.find(i => i.instrument_id === data.instrument_id);
    if (instrument) {
      instrument.current_xp += xpEarned;
      // Calculate level: L = floor(sqrt(total_xp / 100)) + 1
      instrument.current_level = Math.max(1, Math.floor(Math.sqrt(instrument.current_xp / 100)) + 1);
      saveTable('dim_instruments', this.instruments);
    }

    return { session, xpEarned };
  }

  // Practice Log Query
  public getPracticeSessions(instrumentId?: string, limit = 20): PracticeSessionWithTags[] {
    let filtered = [...this.sessions];
    if (instrumentId) {
      filtered = filtered.filter(s => s.instrument_id === instrumentId);
    }
    filtered.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    filtered = filtered.slice(0, limit);

    return filtered.map(session => {
      const inst = this.instruments.find(i => i.instrument_id === session.instrument_id);
      const tagBridges = this.bridgeTags.filter(b => b.session_id === session.session_id);
      const sessionTags = tagBridges
        .map(b => this.tags.find(t => t.tag_id === b.tag_id))
        .filter((t): t is DimTag => Boolean(t));

      return {
        ...session,
        instrument_name: inst?.name || 'Instrument',
        tags: sessionTags,
      };
    });
  }

  // Rolling 7-Day Consistency Query
  public getRolling7DayStats(instrumentId: string): {
    daysPracticed: number;
    targetDays: number;
    rollingDays: Array<{ dateStr: string; dayLetter: string; isPracticed: boolean; isToday: boolean }>;
  } {
    const inst = this.instruments.find(i => i.instrument_id === instrumentId);
    const targetDays = inst?.target_days_rolling_week ?? 4;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const rollingDays: Array<{ dateStr: string; dayLetter: string; isPracticed: boolean; isToday: boolean }> = [];
    const practicedDatesSet = new Set<string>();

    // Scan sessions for qualifying days (duration >= 300) in active instrument
    for (const session of this.sessions) {
      if (session.instrument_id === instrumentId && session.duration_seconds >= 300) {
        const d = new Date(session.started_at);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        practicedDatesSet.add(ymd);
      }
    }

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

    const daysPracticed = rollingDays.filter(d => d.isPracticed).length;

    return {
      daysPracticed,
      targetDays,
      rollingDays,
    };
  }

  // Polynomial Level calculation: 100 * L^2
  public getLevelProgress(xp: number): {
    currentLevel: number;
    currentLevelBaseXp: number;
    nextLevelRequiredXp: number;
    progressPercent: number;
    xpToNextLevel: number;
  } {
    // Current Level: L = floor(sqrt(xp / 100)) + 1
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
    let summaries = [...this.lessonSummaries];
    if (instrumentId) {
      summaries = summaries.filter(s => s.instrument_id === instrumentId);
    }
    summaries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return summaries;
  }

  public recordLessonSummary(data: {
    instrument_id: string;
    lesson_date: string;
    areas_of_growth: string[];
    wins_and_strengths: string[];
    technique_mechanics_cues: string[];
    suggested_focus_tags: string[];
    transcript_text?: string;
  }): FactLessonSummary {
    const summary: FactLessonSummary = {
      lesson_id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: CURRENT_USER_ID,
      instrument_id: data.instrument_id,
      lesson_date: data.lesson_date,
      areas_of_growth: JSON.stringify(data.areas_of_growth),
      wins_and_strengths: JSON.stringify(data.wins_and_strengths),
      technique_mechanics_cues: JSON.stringify(data.technique_mechanics_cues),
      transcript_text: data.transcript_text || null,
      created_at: new Date().toISOString(),
    };

    this.lessonSummaries.unshift(summary);
    saveTable('fact_lesson_summaries', this.lessonSummaries);

    // Add suggested focus tags as 'staged' tags into dim_tags
    for (const tagRaw of data.suggested_focus_tags) {
      const trimmed = tagRaw.trim();
      const words = trimmed.split(/\s+/);
      // Enforce max 2 words & Title Case
      const formatted = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      // Check if tag already exists in dim_tags for this instrument
      const existing = this.tags.find(
        t => t.instrument_id === data.instrument_id && t.tag_name.toLowerCase() === formatted.toLowerCase()
      );

      if (!existing && formatted.length > 0) {
        this.tags.push({
          tag_id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: CURRENT_USER_ID,
          instrument_id: data.instrument_id,
          tag_name: formatted,
          tag_type: 'Technique Focus',
          status: 'staged',
          source: 'lesson_extracted',
          created_at: new Date().toISOString(),
        });
      }
    }
    saveTable('dim_tags', this.tags);

    // Update Quota
    this.quota.lessons_processed_this_month += 1;
    saveTable('user_quotas', [this.quota]);

    return summary;
  }

  // Quota
  public getQuota(): UserQuota {
    return { ...this.quota };
  }
}

// Global Singleton Instance
export const db = new CantabileDatabase();
