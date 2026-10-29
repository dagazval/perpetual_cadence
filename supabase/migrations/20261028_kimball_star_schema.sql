-- ====================================================================
-- Cantabile - Kimball-Style Star Schema & Row Level Security (RLS)
-- Supabase PostgreSQL Migration
-- ====================================================================

-- 1. Dimensions
CREATE TABLE IF NOT EXISTS dim_instruments (
    instrument_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    name VARCHAR(50) NOT NULL, -- 'Voice', 'Piano', 'Oboe'
    target_days_rolling_week INT NOT NULL DEFAULT 4,
    current_xp INT NOT NULL DEFAULT 0,
    current_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_instrument UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS dim_tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    instrument_id UUID NOT NULL REFERENCES dim_instruments(instrument_id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(30) NOT NULL, -- 'Session Segment' | 'Technique Focus'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'staged' | 'active' | 'archived'
    source VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user' | 'lesson_extracted'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tag_length CHECK (array_length(regexp_split_to_array(trim(tag_name), '\s+'), 1) <= 2)
);

-- 2. Core Fact Table
CREATE TABLE IF NOT EXISTS fact_practice_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    instrument_id UUID NOT NULL REFERENCES dim_instruments(instrument_id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    xp_earned INT NOT NULL DEFAULT 0,
    counts_for_streak BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced', -- 'pending' | 'synced' in SQLite
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bridge Table for Multi-Tag Attribution
CREATE TABLE IF NOT EXISTS bridge_session_tags (
    session_id UUID NOT NULL REFERENCES fact_practice_sessions(session_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES dim_tags(tag_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    PRIMARY KEY (session_id, tag_id)
);

-- 4. Lesson Analysis Entity
CREATE TABLE IF NOT EXISTS fact_lesson_summaries (
    lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    instrument_id UUID NOT NULL REFERENCES dim_instruments(instrument_id),
    lesson_date DATE NOT NULL,
    areas_of_growth TEXT NOT NULL,
    wins_and_strengths TEXT NOT NULL,
    technique_mechanics_cues TEXT NOT NULL,
    transcript_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Cost & Quota Protection Entity
CREATE TABLE IF NOT EXISTS user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'beta_free',
    lessons_processed_this_month INT NOT NULL DEFAULT 0,
    max_lessons_per_month INT NOT NULL DEFAULT 4,
    billing_cycle_anchor DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 6. Enforce Strict RLS on all tables
ALTER TABLE dim_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_lesson_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- 7. Policies
DROP POLICY IF EXISTS "Users access own instruments" ON dim_instruments;
CREATE POLICY "Users access own instruments" ON dim_instruments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own tags" ON dim_tags;
CREATE POLICY "Users access own tags" ON dim_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own sessions" ON fact_practice_sessions;
CREATE POLICY "Users access own sessions" ON fact_practice_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own bridge tags" ON bridge_session_tags;
CREATE POLICY "Users access own bridge tags" ON bridge_session_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own lesson summaries" ON fact_lesson_summaries;
CREATE POLICY "Users access own lesson summaries" ON fact_lesson_summaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own quota" ON user_quotas;
CREATE POLICY "Users view own quota" ON user_quotas FOR SELECT USING (auth.uid() = user_id);
