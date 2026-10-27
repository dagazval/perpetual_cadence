import React, { useState } from 'react';
import { Smartphone, Copy, Check, Download, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';
import { audioTools } from '../utils/audioTools';

export const ExpoFilesViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<
    'app.json' | 'eas.json' | 'package.json' | 'sqlite.ts' | 'supabase_edge.ts'
  >('app.json');
  const [copied, setCopied] = useState<boolean>(false);

  const filesContent: Record<string, string> = {
    'app.json': `{
  "expo": {
    "name": "Cadence Practice Tracker",
    "slug": "cadence-practice-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.cadence.practicetracker"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "package": "com.cadence.practicetracker",
      "permissions": [
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.FOREGROUND_SERVICE"
      ]
    },
    "plugins": [
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-document-picker",
        {
          "appleICLoudContainerEnvironment": "Production"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "dd3e828e-6a0e-4680-9de9-f3d1a121337f"
      }
    }
  }
}`,

    'eas.json': `{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}`,

    'package.json': `{
  "name": "cadence-mobile-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "build:apk": "eas build -p android --profile preview"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-haptics": "~14.0.0",
    "react-native-compressor": "^1.10.3",
    "@supabase/supabase-js": "^2.48.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "lucide-react-native": "^0.475.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  },
  "private": true
}`,

    'sqlite.ts': `/**
 * Local SQLite Client (expo-sqlite) matching Supabase PostgreSQL Star Schema
 * Handles offline writes with sync_status = 'pending' and automatic background sync.
 */
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

let db: SQLite.SQLiteDatabase;

export async function initLocalDatabase() {
  db = await SQLite.openDatabaseAsync('cadence_dim.db');

  // Exact Kimball Star-Schema DDL for Local SQLite
  await db.execAsync(\`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS dim_instruments (
      instrument_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_days_rolling_week INTEGER NOT NULL DEFAULT 4,
      current_xp INTEGER NOT NULL DEFAULT 0,
      current_level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dim_tags (
      tag_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      instrument_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      tag_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fact_practice_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      instrument_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      counts_for_streak INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bridge_session_tags (
      session_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (session_id, tag_id)
    );
  \`);
}

// Background sync worker: pushes pending records when online
export async function syncPendingToSupabase(supabaseClient: any) {
  const pendingSessions = await db.getAllAsync<any>(
    "SELECT * FROM fact_practice_sessions WHERE sync_status = 'pending'"
  );

  if (pendingSessions.length === 0) return;

  const { error } = await supabaseClient
    .from('fact_practice_sessions')
    .upsert(pendingSessions.map(s => ({ ...s, sync_status: 'synced' })));

  if (!error) {
    const ids = pendingSessions.map(s => \`'\${s.session_id}'\`).join(',');
    await db.runAsync(
      \`UPDATE fact_practice_sessions SET sync_status = 'synced' WHERE session_id IN (\${ids})\`
    );
  }
}`,

    'supabase_edge.ts': `/**
 * Supabase Edge Function: /functions/v1/analyze-lesson
 * Validates user quota and calls Gemini API for non-shaming pedagogical feedback.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai';

const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! });

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const authHeader = req.headers.get('Authorization')!;
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 1. Quota check
  const { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (quota && quota.lessons_processed_this_month >= quota.max_lessons_per_month) {
    return new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 429 });
  }

  // 2. Call Gemini
  const { transcriptText, instrumentName } = await req.json();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: \`Analyze \${instrumentName} lesson: \${transcriptText}\`,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: 'Enforce max 2 words per suggested tag.'
    }
  });

  return new Response(response.text, {
    headers: { 'Content-Type': 'application/json' },
  });
});`,
  };

  const handleCopy = () => {
    audioTools.triggerHaptic('tap');
    navigator.clipboard.writeText(filesContent[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header and Build Notice */}
      <div className="p-4 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">
              Android Managed Expo SDK 52 Project
            </h3>
          </div>
          <p className="text-xs text-purple-200">
            Build standalone Android APK with: <code className="font-mono bg-[#140b24] text-yellow-300 px-1.5 py-0.5 rounded border border-purple-800">eas build -p android --profile preview</code>
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#241442] border border-purple-800/60 text-xs font-semibold text-yellow-300">
          <ShieldCheck className="w-4 h-4 text-yellow-400" />
          <span>Strict Android Permissions Guardrail</span>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-800/50">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#241442] p-1 rounded-xl border border-purple-800/50">
          {(
            [
              { id: 'app.json', label: 'app.json' },
              { id: 'eas.json', label: 'eas.json' },
              { id: 'package.json', label: 'package.json' },
              { id: 'sqlite.ts', label: 'src/db/sqlite.ts' },
              { id: 'supabase_edge.ts', label: 'supabase/analyze-lesson.ts' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                audioTools.triggerHaptic('tap');
                setSelectedFile(item.id);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedFile === item.id
                  ? 'bg-yellow-400 text-purple-950 shadow-xs'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-xs font-bold text-purple-950 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy File'}</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="p-4 rounded-2xl bg-[#140b24] border border-purple-800/70 space-y-2 shadow-md shadow-purple-950/40">
        <div className="flex items-center justify-between text-xs text-purple-300 font-mono pb-2 border-b border-purple-800/60">
          <span className="text-yellow-400 font-semibold">{selectedFile}</span>
          <span>Expo SDK 52 Managed</span>
        </div>
        <pre className="font-mono text-xs text-purple-100 overflow-x-auto p-2 leading-relaxed max-h-[480px]">
          {filesContent[selectedFile]}
        </pre>
      </div>
    </div>
  );
};
