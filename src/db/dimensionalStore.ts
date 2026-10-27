/**
 * Kimball Star-Schema Dimensional Local Database Store
 * Implements exact relational schema matching Supabase PostgreSQL & expo-sqlite.
 */

export interface DimInstrument {
  instrument_id: string;
  user_id: string;
  name: string; // 'Voice', 'Piano', 'Oboe'
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
  areas_of_growth: string;
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

const STORAGE_KEY = 'cadence_relational_store_v1';
const CURRENT_USER_ID = 'user-cadence-001';

// Seed initial Kimball dimensions
function createInitialStore() {
  const voiceId = 'inst-voice-01';
  const pianoId = 'inst-piano-02';
  const oboeId = 'inst-oboe-03';

  const instruments: DimInstrument[] = [
    {
      instrument_id: voiceId,
      user_id: CURRENT_USER_ID,
      name: 'Voice',
      target_days_rolling_week: 4,
      current_xp: 380,
      current_level: 2,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      instrument_id: pianoId,
      user_id: CURRENT_USER_ID,
      name: 'Piano',
      target_days_rolling_week: 3,
      current_xp: 220,
      current_level: 1,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      instrument_id: oboeId,
      user_id: CURRENT_USER_ID,
      name: 'Oboe',
      target_days_rolling_week: 3,
      current_xp: 150,
      current_level: 1,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ];

  // Default Session Segment and Technique Focus tags (all <= 2 words per constraint)
  const tags: DimTag[] = [
    // Voice tags
    {
      tag_id: 'tag-v-01',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Warm Up',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-v-02',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Vocalises',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-v-03',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Repertoire',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-v-04',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Breath Support',
      tag_type: 'Technique Focus',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-v-05',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Vowel Tuning',
      tag_type: 'Technique Focus',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-v-06',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      tag_name: 'Larynx Freedom',
      tag_type: 'Technique Focus',
      status: 'staged',
      source: 'lesson_extracted',
      created_at: new Date().toISOString(),
    },

    // Piano tags
    {
      tag_id: 'tag-p-01',
      user_id: CURRENT_USER_ID,
      instrument_id: pianoId,
      tag_name: 'Warm Up',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-p-02',
      user_id: CURRENT_USER_ID,
      instrument_id: pianoId,
      tag_name: 'Scales Arpeggios',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-p-03',
      user_id: CURRENT_USER_ID,
      instrument_id: pianoId,
      tag_name: 'Wrist Weight',
      tag_type: 'Technique Focus',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-p-04',
      user_id: CURRENT_USER_ID,
      instrument_id: pianoId,
      tag_name: 'Sight Reading',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },

    // Oboe tags
    {
      tag_id: 'tag-o-01',
      user_id: CURRENT_USER_ID,
      instrument_id: oboeId,
      tag_name: 'Warm Up',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-o-02',
      user_id: CURRENT_USER_ID,
      instrument_id: oboeId,
      tag_name: 'Long Tones',
      tag_type: 'Session Segment',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-o-03',
      user_id: CURRENT_USER_ID,
      instrument_id: oboeId,
      tag_name: 'Embouchure Cushion',
      tag_type: 'Technique Focus',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: 'tag-o-04',
      user_id: CURRENT_USER_ID,
      instrument_id: oboeId,
      tag_name: 'Reed Crowing',
      tag_type: 'Technique Focus',
      status: 'active',
      source: 'user',
      created_at: new Date().toISOString(),
    },
  ];

  // Seed sample practice sessions over the rolling window (gentle consistency)
  const now = Date.now();
  const sessions: FactPracticeSession[] = [
    {
      session_id: 'sess-01',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      started_at: new Date(now - 86400000 * 4).toISOString(),
      ended_at: new Date(now - 86400000 * 4 + 1800000).toISOString(),
      duration_seconds: 1800,
      xp_earned: 45,
      counts_for_streak: true,
      sync_status: 'synced',
      created_at: new Date(now - 86400000 * 4).toISOString(),
    },
    {
      session_id: 'sess-02',
      user_id: CURRENT_USER_ID,
      instrument_id: pianoId,
      started_at: new Date(now - 86400000 * 2).toISOString(),
      ended_at: new Date(now - 86400000 * 2 + 1200000).toISOString(),
      duration_seconds: 1200,
      xp_earned: 30,
      counts_for_streak: true,
      sync_status: 'synced',
      created_at: new Date(now - 86400000 * 2).toISOString(),
    },
    {
      session_id: 'sess-03',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      started_at: new Date(now - 86400000 * 1).toISOString(),
      ended_at: new Date(now - 86400000 * 1 + 2400000).toISOString(),
      duration_seconds: 2400,
      xp_earned: 60,
      counts_for_streak: true,
      sync_status: 'synced',
      created_at: new Date(now - 86400000 * 1).toISOString(),
    },
  ];

  const bridgeSessionTags: BridgeSessionTag[] = [
    { session_id: 'sess-01', tag_id: 'tag-v-01', user_id: CURRENT_USER_ID },
    { session_id: 'sess-01', tag_id: 'tag-v-04', user_id: CURRENT_USER_ID },
    { session_id: 'sess-02', tag_id: 'tag-p-01', user_id: CURRENT_USER_ID },
    { session_id: 'sess-02', tag_id: 'tag-p-03', user_id: CURRENT_USER_ID },
    { session_id: 'sess-03', tag_id: 'tag-v-02', user_id: CURRENT_USER_ID },
    { session_id: 'sess-03', tag_id: 'tag-v-05', user_id: CURRENT_USER_ID },
  ];

  const lessonSummaries: FactLessonSummary[] = [
    {
      lesson_id: 'lesson-01',
      user_id: CURRENT_USER_ID,
      instrument_id: voiceId,
      lesson_date: new Date(now - 86400000 * 5).toISOString().slice(0, 10),
      areas_of_growth: 'Gentle release of root-tongue tension on the passaggio [E4-F#4]; avoid over-darkening vowels.',
      wins_and_strengths: 'Effortless dynamic contrast in French mélodie; expressive phrasing and centered breath initiation.',
      technique_mechanics_cues: 'Slight soft palate lift with relaxed lower jaw; anchor down into back lower ribs without bracing.',
      transcript_text: 'Teacher noted excellent posture and tone quality, encouraging a light onset without glottal push.',
      created_at: new Date(now - 86400000 * 5).toISOString(),
    },
  ];

  const quota: UserQuota = {
    user_id: CURRENT_USER_ID,
    plan_tier: 'beta_free',
    lessons_processed_this_month: 1,
    max_lessons_per_month: 4,
    billing_cycle_anchor: new Date().toISOString().slice(0, 10),
  };

  return {
    dim_instruments: instruments,
    dim_tags: tags,
    fact_practice_sessions: sessions,
    bridge_session_tags: bridgeSessionTags,
    fact_lesson_summaries: lessonSummaries,
    user_quotas: [quota],
    last_active_instrument_id: voiceId,
  };
}

class DimensionalStore {
  private data: ReturnType<typeof createInitialStore>;

  constructor() {
    this.data = this.load();
  }

  private load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial store', e);
    }
    const initial = createInitialStore();
    this.save(initial);
    return initial;
  }

  private save(data = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Could not save to localStorage', e);
    }
  }

  public getUserId(): string {
    return CURRENT_USER_ID;
  }

  public getRawData() {
    return this.data;
  }

  // --- Dimension: Instruments ---
  public getInstruments(): DimInstrument[] {
    return [...this.data.dim_instruments];
  }

  public getLastActiveInstrument(): DimInstrument {
    const found = this.data.dim_instruments.find(
      (i) => i.instrument_id === this.data.last_active_instrument_id
    );
    return found || this.data.dim_instruments[0];
  }

  public setLastActiveInstrument(instrumentId: string) {
    this.data.last_active_instrument_id = instrumentId;
    this.save();
  }

  public updateInstrumentTarget(instrumentId: string, targetDays: number) {
    const inst = this.data.dim_instruments.find((i) => i.instrument_id === instrumentId);
    if (inst) {
      inst.target_days_rolling_week = Math.max(1, Math.min(7, targetDays));
      this.save();
    }
  }

  // --- Dimension: Tags with Constraint chk_tag_length (<= 2 words) ---
  public validateTagName(name: string): boolean {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 && words.length <= 2;
  }

  public getTags(instrumentId?: string, status?: 'staged' | 'active' | 'archived'): DimTag[] {
    return this.data.dim_tags.filter((tag) => {
      if (instrumentId && tag.instrument_id !== instrumentId) return false;
      if (status && tag.status !== status) return false;
      return true;
    });
  }

  public addTag(tag: Omit<DimTag, 'tag_id' | 'created_at' | 'user_id'>): DimTag {
    if (!this.validateTagName(tag.tag_name)) {
      throw new Error(`Tag name "${tag.tag_name}" violates constraint chk_tag_length: max 2 words allowed.`);
    }

    const newTag: DimTag = {
      ...tag,
      tag_name: tag.tag_name.trim(),
      tag_id: 'tag-' + Math.random().toString(36).substring(2, 9),
      user_id: CURRENT_USER_ID,
      created_at: new Date().toISOString(),
    };

    this.data.dim_tags.push(newTag);
    this.save();
    return newTag;
  }

  public promoteStagedTag(tagId: string): boolean {
    const tag = this.data.dim_tags.find((t) => t.tag_id === tagId);
    if (tag) {
      tag.status = 'active';
      this.save();
      return true;
    }
    return false;
  }

  public archiveTag(tagId: string): boolean {
    const tag = this.data.dim_tags.find((t) => t.tag_id === tagId);
    if (tag) {
      tag.status = 'archived';
      this.save();
      return true;
    }
    return false;
  }

  // --- Core Fact: Practice Sessions & Bridge Tags ---
  public recordSession(params: {
    instrumentId: string;
    durationSeconds: number;
    startedAt: Date;
    endedAt: Date;
    tagIds: string[];
    syncStatus?: 'pending' | 'synced';
  }): FactPracticeSession {
    const xp = Math.max(5, Math.round(params.durationSeconds / 60) * 2);
    const sessionId = 'sess-' + Math.random().toString(36).substring(2, 9);

    const session: FactPracticeSession = {
      session_id: sessionId,
      user_id: CURRENT_USER_ID,
      instrument_id: params.instrumentId,
      started_at: params.startedAt.toISOString(),
      ended_at: params.endedAt.toISOString(),
      duration_seconds: params.durationSeconds,
      xp_earned: xp,
      counts_for_streak: params.durationSeconds >= 60, // Any genuine practice >= 1 min counts
      sync_status: params.syncStatus || 'pending', // offline-first: default to pending
      created_at: new Date().toISOString(),
    };

    this.data.fact_practice_sessions.unshift(session);

    // Write to Bridge table
    for (const tagId of params.tagIds) {
      this.data.bridge_session_tags.push({
        session_id: sessionId,
        tag_id: tagId,
        user_id: CURRENT_USER_ID,
      });
    }

    // Update Instrument XP & Level
    const inst = this.data.dim_instruments.find((i) => i.instrument_id === params.instrumentId);
    if (inst) {
      inst.current_xp += xp;
      // Simple transparent level formula: level = floor(xp / 200) + 1
      inst.current_level = Math.floor(inst.current_xp / 200) + 1;
    }

    this.data.last_active_instrument_id = params.instrumentId;
    this.save();
    return session;
  }

  public getSessionsWithDetails(instrumentId?: string) {
    const sessions = instrumentId
      ? this.data.fact_practice_sessions.filter((s) => s.instrument_id === instrumentId)
      : this.data.fact_practice_sessions;

    return sessions.map((s) => {
      const instrument = this.data.dim_instruments.find((i) => i.instrument_id === s.instrument_id);
      const tagBridges = this.data.bridge_session_tags.filter((b) => b.session_id === s.session_id);
      const tags = tagBridges
        .map((b) => this.data.dim_tags.find((t) => t.tag_id === b.tag_id))
        .filter(Boolean) as DimTag[];

      return {
        ...s,
        instrument_name: instrument?.name || 'Unknown',
        tags,
      };
    });
  }

  // --- Rolling 7-Day Consistency (NO streak shaming, NO punitive resets) ---
  public getRollingConsistency(instrumentId?: string) {
    const targetInst = instrumentId
      ? this.data.dim_instruments.find((i) => i.instrument_id === instrumentId)
      : this.getLastActiveInstrument();

    const targetDays = targetInst?.target_days_rolling_week || 4;

    // Past 7 calendar days (today and preceding 6 days)
    const days: { dateStr: string; dayLabel: string; active: boolean; minutes: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      // Find sessions on this date
      const matchingSessions = this.data.fact_practice_sessions.filter((s) => {
        if (targetInst && s.instrument_id !== targetInst.instrument_id) return false;
        const sessionDate = s.started_at.slice(0, 10);
        return sessionDate === dateStr;
      });

      const totalSeconds = matchingSessions.reduce((acc, curr) => acc + curr.duration_seconds, 0);

      days.push({
        dateStr,
        dayLabel,
        active: matchingSessions.length > 0,
        minutes: Math.round(totalSeconds / 60),
      });
    }

    const activeDaysCount = days.filter((d) => d.active).length;
    const progressPercent = Math.min(100, Math.round((activeDaysCount / targetDays) * 100));

    return {
      instrument: targetInst,
      targetDays,
      activeDaysCount,
      progressPercent,
      days,
      isTargetMet: activeDaysCount >= targetDays,
    };
  }

  // --- Fact: Lesson Summaries ---
  public getLessonSummaries(instrumentId?: string): FactLessonSummary[] {
    return this.data.fact_lesson_summaries
      .filter((l) => !instrumentId || l.instrument_id === instrumentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public recordLessonSummary(params: {
    instrumentId: string;
    lessonDate: string;
    areasOfGrowth: string;
    winsAndStrengths: string;
    techniqueMechanicsCues: string;
    transcriptText: string | null;
    stagedTags: string[];
  }): FactLessonSummary {
    const summary: FactLessonSummary = {
      lesson_id: 'lesson-' + Math.random().toString(36).substring(2, 9),
      user_id: CURRENT_USER_ID,
      instrument_id: params.instrumentId,
      lesson_date: params.lessonDate,
      areas_of_growth: params.areasOfGrowth,
      wins_and_strengths: params.winsAndStrengths,
      technique_mechanics_cues: params.techniqueMechanicsCues,
      transcript_text: params.transcriptText,
      created_at: new Date().toISOString(),
    };

    this.data.fact_lesson_summaries.unshift(summary);

    // Insert staged tags
    for (const tagName of params.stagedTags) {
      if (this.validateTagName(tagName)) {
        // avoid duplicate tag name for this instrument
        const exists = this.data.dim_tags.find(
          (t) => t.instrument_id === params.instrumentId && t.tag_name.toLowerCase() === tagName.toLowerCase()
        );
        if (!exists) {
          this.data.dim_tags.push({
            tag_id: 'tag-' + Math.random().toString(36).substring(2, 9),
            user_id: CURRENT_USER_ID,
            instrument_id: params.instrumentId,
            tag_name: tagName.trim(),
            tag_type: 'Technique Focus',
            status: 'staged',
            source: 'lesson_extracted',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Increment quota usage in local representation
    const quota = this.data.user_quotas[0];
    if (quota) {
      quota.lessons_processed_this_month = Math.min(quota.max_lessons_per_month, quota.lessons_processed_this_month + 1);
    }

    this.save();
    return summary;
  }

  // --- User Quotas ---
  public getQuota(): UserQuota {
    return this.data.user_quotas[0] || {
      user_id: CURRENT_USER_ID,
      plan_tier: 'beta_free',
      lessons_processed_this_month: 0,
      max_lessons_per_month: 4,
      billing_cycle_anchor: new Date().toISOString().slice(0, 10),
    };
  }

  // --- Offline Sync Protocol ---
  public getPendingSessions(): FactPracticeSession[] {
    return this.data.fact_practice_sessions.filter((s) => s.sync_status === 'pending');
  }

  public markSessionsSynced(sessionIds: string[]) {
    for (const session of this.data.fact_practice_sessions) {
      if (sessionIds.includes(session.session_id)) {
        session.sync_status = 'synced';
      }
    }
    this.save();
  }

  // --- Relational SQL Query Console Executor (Kimball Star Schema) ---
  public executeSQL(query: string): { columns: string[]; rows: any[]; error?: string; rowCount: number } {
    const trimmed = query.trim().replace(/;$/, '');
    if (!trimmed) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    const lower = trimmed.toLowerCase();

    try {
      // 1. SELECT * FROM dim_instruments
      if (lower.startsWith('select') && lower.includes('from dim_instruments')) {
        const rows = this.data.dim_instruments;
        const columns = ['instrument_id', 'name', 'target_days_rolling_week', 'current_xp', 'current_level', 'created_at'];
        return { columns, rows, rowCount: rows.length };
      }

      // 2. SELECT * FROM dim_tags
      if (lower.startsWith('select') && lower.includes('from dim_tags')) {
        const rows = this.data.dim_tags;
        const columns = ['tag_id', 'instrument_id', 'tag_name', 'tag_type', 'status', 'source', 'created_at'];
        return { columns, rows, rowCount: rows.length };
      }

      // 3. SELECT * FROM bridge_session_tags
      if (lower.startsWith('select') && lower.includes('from bridge_session_tags')) {
        const rows = this.data.bridge_session_tags;
        const columns = ['session_id', 'tag_id', 'user_id'];
        return { columns, rows, rowCount: rows.length };
      }

      // 4. SELECT * FROM fact_lesson_summaries
      if (lower.startsWith('select') && lower.includes('from fact_lesson_summaries')) {
        const rows = this.data.fact_lesson_summaries;
        const columns = ['lesson_id', 'instrument_id', 'lesson_date', 'areas_of_growth', 'wins_and_strengths', 'technique_mechanics_cues'];
        return { columns, rows, rowCount: rows.length };
      }

      // 5. SELECT * FROM user_quotas
      if (lower.startsWith('select') && lower.includes('from user_quotas')) {
        const rows = this.data.user_quotas;
        const columns = ['user_id', 'plan_tier', 'lessons_processed_this_month', 'max_lessons_per_month', 'billing_cycle_anchor'];
        return { columns, rows, rowCount: rows.length };
      }

      // 6. Aggregate Kimball Query: fact_practice_sessions JOIN dim_instruments
      if (lower.includes('fact_practice_sessions') && (lower.includes('group by') || lower.includes('count') || lower.includes('join'))) {
        const aggregated: Record<string, { instrument: string; sessions: number; total_minutes: number; total_xp: number; pending_sync: number }> = {};

        for (const inst of this.data.dim_instruments) {
          aggregated[inst.instrument_id] = {
            instrument: inst.name,
            sessions: 0,
            total_minutes: 0,
            total_xp: 0,
            pending_sync: 0,
          };
        }

        for (const sess of this.data.fact_practice_sessions) {
          const entry = aggregated[sess.instrument_id];
          if (entry) {
            entry.sessions += 1;
            entry.total_minutes += Math.round(sess.duration_seconds / 60);
            entry.total_xp += sess.xp_earned;
            if (sess.sync_status === 'pending') {
              entry.pending_sync += 1;
            }
          }
        }

        const rows = Object.values(aggregated);
        const columns = ['instrument', 'sessions', 'total_minutes', 'total_xp', 'pending_sync'];
        return { columns, rows, rowCount: rows.length };
      }

      // 7. Generic SELECT * FROM fact_practice_sessions
      if (lower.startsWith('select') && lower.includes('from fact_practice_sessions')) {
        const rows = this.data.fact_practice_sessions;
        const columns = ['session_id', 'instrument_id', 'started_at', 'duration_seconds', 'xp_earned', 'sync_status'];
        return { columns, rows, rowCount: rows.length };
      }

      // Fallback for custom or unrecognized queries
      return {
        columns: ['query_status', 'executed_statement'],
        rows: [{ query_status: 'Executed on local SQLite engine', executed_statement: trimmed }],
        rowCount: 1,
      };
    } catch (err: any) {
      return {
        columns: ['error'],
        rows: [{ error: err?.message || 'SQL Execution error' }],
        rowCount: 0,
        error: err?.message,
      };
    }
  }

  public resetToDefault() {
    this.data = createInitialStore();
    this.save();
  }
}

export const dimensionalStore = new DimensionalStore();
