import { Check, Code2, Copy, Network, Play, Terminal } from 'lucide-react';
import React, { useState } from 'react';
import { dimensionalStore } from '../db/dimensionalStore';
import { audioTools } from '../utils/audioTools';

export const RelationalSchemaExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'diagram' | 'ddl'>('console');
  const [sqlInput, setSqlInput] = useState<string>(
    `SELECT i.name, COUNT(f.session_id) as sessions, 
       SUM(f.duration_seconds)/60 as total_minutes, 
       SUM(f.xp_earned) as total_xp
FROM fact_practice_sessions f
JOIN dim_instruments i ON f.instrument_id = i.instrument_id
GROUP BY i.name;`
  );

  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: any[];
    rowCount: number;
    error?: string;
  } | null>(() => dimensionalStore.executeSQL(sqlInput));

  const [copiedDdl, setCopiedDdl] = useState<boolean>(false);

  const handleRunSQL = () => {
    audioTools.triggerHaptic('tap');
    const res = dimensionalStore.executeSQL(sqlInput);
    setQueryResult(res);
  };

  const handleSelectPreset = (presetSql: string) => {
    audioTools.triggerHaptic('tap');
    setSqlInput(presetSql);
    const res = dimensionalStore.executeSQL(presetSql);
    setQueryResult(res);
  };

  const ddlScript = `-- DIMENSIONS
CREATE TABLE dim_instruments (
    instrument_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    name VARCHAR(50) NOT NULL, -- 'Voice', 'Piano', 'Oboe'
    target_days_rolling_week INT NOT NULL DEFAULT 4,
    current_xp INT NOT NULL DEFAULT 0,
    current_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_instrument UNIQUE (user_id, name)
);

CREATE TABLE dim_tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    instrument_id UUID NOT NULL REFERENCES dim_instruments(instrument_id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(30) NOT NULL, -- 'Session Segment' | 'Technique Focus'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'staged' | 'active' | 'archived'
    source VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user' | 'lesson_extracted'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tag_length CHECK (array_length(regexp_split_to_array(trim(tag_name), '\\s+'), 1) <= 2)
);

-- CORE FACT TABLE
CREATE TABLE fact_practice_sessions (
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

-- BRIDGE TABLE FOR MULTI-TAG ATTRIBUTION
CREATE TABLE bridge_session_tags (
    session_id UUID NOT NULL REFERENCES fact_practice_sessions(session_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES dim_tags(tag_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    PRIMARY KEY (session_id, tag_id)
);

-- LESSON ANALYSIS ENTITY
CREATE TABLE fact_lesson_summaries (
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

-- COST & QUOTA PROTECTION ENTITY
CREATE TABLE user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'beta_free',
    lessons_processed_this_month INT NOT NULL DEFAULT 0,
    max_lessons_per_month INT NOT NULL DEFAULT 4,
    billing_cycle_anchor DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ENFORCE STRICT RLS ON ALL TABLES
ALTER TABLE dim_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_lesson_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own instruments" ON dim_instruments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own tags" ON dim_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own sessions" ON fact_practice_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own bridge tags" ON bridge_session_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own lesson summaries" ON fact_lesson_summaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own quota" ON user_quotas FOR SELECT USING (auth.uid() = user_id);`;

  return (
    <div className="space-y-4">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-800/50">
        <div className="flex items-center gap-1.5 p-1 bg-[#241442] rounded-xl border border-purple-800/50">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'console'
                ? 'bg-yellow-400 text-purple-950 shadow-xs'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Query Runner</span>
          </button>
          <button
            onClick={() => setActiveSubTab('diagram')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'diagram'
                ? 'bg-yellow-400 text-purple-950 shadow-xs'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Kimball Star Schema</span>
          </button>
          <button
            onClick={() => setActiveSubTab('ddl')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ddl'
                ? 'bg-yellow-400 text-purple-950 shadow-xs'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>PostgreSQL & RLS DDL</span>
          </button>
        </div>

        <span className="text-xs text-yellow-400 font-mono hidden sm:inline font-semibold">
          Kimball Star-Schema Engine
        </span>
      </div>

      {/* Tab 1: SQL Console & Query Runner */}
      {activeSubTab === 'console' && (
        <div className="space-y-4">
          {/* Preset Queries */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-purple-300 font-semibold shrink-0">Presets:</span>
            <button
              onClick={() =>
                handleSelectPreset(`SELECT i.name, COUNT(f.session_id) as sessions, 
       SUM(f.duration_seconds)/60 as total_minutes, 
       SUM(f.xp_earned) as total_xp
FROM fact_practice_sessions f
JOIN dim_instruments i ON f.instrument_id = i.instrument_id
GROUP BY i.name;`)
              }
              className="px-2.5 py-1 rounded-lg bg-[#241442] hover:bg-[#2f1957] border border-purple-800 text-purple-200 shrink-0 cursor-pointer"
            >
              Instrument Fact Aggregation
            </button>
            <button
              onClick={() => handleSelectPreset('SELECT * FROM dim_instruments;')}
              className="px-2.5 py-1 rounded-lg bg-[#241442] hover:bg-[#2f1957] border border-purple-800 text-purple-200 shrink-0 cursor-pointer"
            >
              dim_instruments
            </button>
            <button
              onClick={() => handleSelectPreset('SELECT * FROM dim_tags;')}
              className="px-2.5 py-1 rounded-lg bg-[#241442] hover:bg-[#2f1957] border border-purple-800 text-purple-200 shrink-0 cursor-pointer"
            >
              dim_tags
            </button>
            <button
              onClick={() => handleSelectPreset('SELECT * FROM bridge_session_tags;')}
              className="px-2.5 py-1 rounded-lg bg-[#241442] hover:bg-[#2f1957] border border-purple-800 text-purple-200 shrink-0 cursor-pointer"
            >
              bridge_session_tags
            </button>
            <button
              onClick={() => handleSelectPreset('SELECT * FROM fact_lesson_summaries;')}
              className="px-2.5 py-1 rounded-lg bg-[#241442] hover:bg-[#2f1957] border border-purple-800 text-purple-200 shrink-0 cursor-pointer"
            >
              fact_lesson_summaries
            </button>
          </div>

          {/* SQL Editor Area */}
          <div className="p-4 rounded-2xl bg-[#241442] border border-purple-800/80 space-y-3 shadow-md shadow-purple-950/40">
            <div className="flex items-center justify-between text-xs text-purple-200">
              <span className="font-mono text-yellow-300 font-semibold">SQL Editor (Local Relational Engine)</span>
              <button
                onClick={handleRunSQL}
                className="px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Query</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="w-full font-mono text-xs text-yellow-300 bg-[#140b24] p-3 rounded-xl border border-purple-800/70 focus:outline-hidden focus:ring-1 focus:ring-yellow-400"
              spellCheck={false}
            />
          </div>

          {/* Query Results Table */}
          {queryResult && (
            <div className="p-4 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 space-y-3 text-white">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Query Results
                </span>
                <span className="font-mono text-yellow-400 font-semibold tabular-nums">
                  {queryResult.rowCount} rows returned
                </span>
              </div>

              {queryResult.error ? (
                <div className="p-3 rounded-lg bg-red-950/70 text-red-200 border border-red-800 text-xs font-mono">
                  {queryResult.error}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-purple-800/60">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-purple-800 bg-[#241442]">
                        {queryResult.columns.map((col) => (
                          <th key={col} className="p-2.5 text-yellow-400 font-bold uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-800/50 bg-[#1d1033]">
                      {queryResult.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-900/40 transition-colors">
                          {queryResult.columns.map((col) => (
                            <td key={col} className="p-2.5 text-white whitespace-nowrap">
                              {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'NULL')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Star Schema Visual Diagram */}
      {activeSubTab === 'diagram' && (
        <div className="p-5 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 space-y-4 text-white">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              Kimball Dimensional Star Schema
            </h3>
            <p className="text-xs text-purple-200">
              Normalized core facts, conformed dimensions, multi-valued tag bridge, and quota telemetry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Dimension: dim_instruments */}
            <div className="p-3.5 rounded-xl bg-[#241442] border border-purple-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  dim_instruments
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400">
                  Dimension
                </span>
              </div>
              <ul className="text-[11px] font-mono text-purple-200 space-y-1">
                <li className="font-bold text-yellow-300">PK instrument_id</li>
                <li>FK user_id</li>
                <li>name (Voice | Piano | Oboe)</li>
                <li>target_days_rolling_week</li>
                <li>current_xp, current_level</li>
              </ul>
            </div>

            {/* Core Fact: fact_practice_sessions */}
            <div className="p-3.5 rounded-xl bg-[#241442] border-2 border-yellow-400 shadow-md shadow-yellow-500/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-300 font-mono">
                  fact_practice_sessions
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded">
                  Core Fact
                </span>
              </div>
              <ul className="text-[11px] font-mono text-white space-y-1">
                <li className="font-bold text-yellow-300">PK session_id</li>
                <li>FK user_id</li>
                <li>FK instrument_id</li>
                <li>started_at, ended_at</li>
                <li>duration_seconds (Measure)</li>
                <li>xp_earned, counts_for_streak</li>
                <li>sync_status (pending | synced)</li>
              </ul>
            </div>

            {/* Bridge: bridge_session_tags */}
            <div className="p-3.5 rounded-xl bg-[#241442] border border-yellow-400/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-300 font-mono">
                  bridge_session_tags
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400">
                  Bridge Table
                </span>
              </div>
              <ul className="text-[11px] font-mono text-purple-200 space-y-1">
                <li className="font-bold text-yellow-300">PK FK session_id</li>
                <li className="font-bold text-yellow-300">PK FK tag_id</li>
                <li>FK user_id</li>
                <li className="text-purple-300/80 pt-1">
                  Enables N:M session-to-tag attribution
                </li>
              </ul>
            </div>

            {/* Dimension: dim_tags */}
            <div className="p-3.5 rounded-xl bg-[#241442] border border-purple-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  dim_tags
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400">
                  Dimension
                </span>
              </div>
              <ul className="text-[11px] font-mono text-purple-200 space-y-1">
                <li className="font-bold text-yellow-300">PK tag_id</li>
                <li>FK instrument_id</li>
                <li>tag_name (chk_tag_length &lt;= 2 words)</li>
                <li>tag_type ('Segment' | 'Focus')</li>
                <li>status ('staged'|'active'|'archived')</li>
                <li>source ('user'|'lesson_extracted')</li>
              </ul>
            </div>

            {/* Fact Entity: fact_lesson_summaries */}
            <div className="p-3.5 rounded-xl bg-[#241442] border border-purple-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  fact_lesson_summaries
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400">
                  Lesson Fact
                </span>
              </div>
              <ul className="text-[11px] font-mono text-purple-200 space-y-1">
                <li className="font-bold text-yellow-300">PK lesson_id</li>
                <li>FK user_id, instrument_id</li>
                <li>lesson_date DATE</li>
                <li>areas_of_growth TEXT</li>
                <li>wins_and_strengths TEXT</li>
                <li>technique_mechanics_cues TEXT</li>
              </ul>
            </div>

            {/* Quota: user_quotas */}
            <div className="p-3.5 rounded-xl bg-[#241442] border border-purple-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  user_quotas
                </span>
                <span className="text-[10px] uppercase font-bold text-yellow-400">
                  Quota Entity
                </span>
              </div>
              <ul className="text-[11px] font-mono text-purple-200 space-y-1">
                <li className="font-bold text-yellow-300">PK FK user_id</li>
                <li>plan_tier ('beta_free')</li>
                <li>lessons_processed_this_month</li>
                <li>max_lessons_per_month (4)</li>
                <li>billing_cycle_anchor</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: DDL & RLS Policies */}
      {activeSubTab === 'ddl' && (
        <div className="p-4 rounded-2xl bg-[#241442] border border-purple-800/80 space-y-3 shadow-md shadow-purple-950/40">
          <div className="flex items-center justify-between text-xs text-white">
            <span className="font-mono text-yellow-400 font-semibold">Supabase PostgreSQL Schema & Security Rules</span>
            <button
              onClick={() => {
                audioTools.triggerHaptic('tap');
                navigator.clipboard.writeText(ddlScript);
                setCopiedDdl(true);
                setTimeout(() => setCopiedDdl(false), 2000);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedDdl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDdl ? 'Copied to Clipboard' : 'Copy SQL'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-[#140b24] font-mono text-xs text-purple-200 overflow-x-auto max-h-96 leading-relaxed select-all border border-purple-800/60">
            {ddlScript}
          </pre>
        </div>
      )}
    </div>
  );
};
