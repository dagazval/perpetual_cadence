import React, { useState } from 'react';
import { Clock, Tag, RefreshCw, CheckCircle2, Cloud, CloudOff } from 'lucide-react';
import { dimensionalStore } from '../db/dimensionalStore';
import { audioTools } from '../utils/audioTools';

interface PracticeHistoryListProps {
  onSyncCompleted: () => void;
  isOffline: boolean;
}

export const PracticeHistoryList: React.FC<PracticeHistoryListProps> = ({ onSyncCompleted, isOffline }) => {
  const sessions = dimensionalStore.getSessionsWithDetails();
  const pendingCount = dimensionalStore.getPendingSessions().length;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncPending = async () => {
    audioTools.triggerHaptic('tap');
    if (pendingCount === 0 || isOffline) return;

    setIsSyncing(true);
    try {
      const pending = dimensionalStore.getPendingSessions();
      const res = await fetch('/api/sync-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: pending }),
      });

      if (res.ok) {
        audioTools.triggerHaptic('success');
        dimensionalStore.markSessionsSynced(pending.map((s) => s.session_id));
        onSyncCompleted();
      }
    } catch (e) {
      console.warn('Sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Pending Sync CTA */}
      <div className="p-4 rounded-2xl bg-[#2b1850] border border-purple-800/70 shadow-md shadow-purple-950/40 flex items-center justify-between text-white">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-white">
            Practice Log & Multi-Tag Attribution
          </h3>
          <p className="text-xs text-purple-200">
            Backed by <code className="font-mono text-yellow-300">fact_practice_sessions</code> & <code className="font-mono text-yellow-300">bridge_session_tags</code>
          </p>
        </div>

        {pendingCount > 0 ? (
          <button
            onClick={handleSyncPending}
            disabled={isSyncing || isOffline}
            className="px-3.5 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-purple-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isOffline ? 'Sync Paused (Offline)' : `Sync ${pendingCount} Pending`}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All Synced</span>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="space-y-2.5">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-purple-300 bg-[#2b1850] rounded-2xl border border-purple-800/70">
            No practice sessions recorded yet. Tap Start Practice on the Stopwatch!
          </div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess.session_id}
              className="p-4 rounded-2xl bg-[#241442] border border-purple-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-yellow-400/40 transition-colors text-white"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {sess.instrument_name}
                  </span>
                  <span aria-hidden="true" className="text-purple-400 text-xs">·</span>
                  <span className="text-xs text-purple-200 font-medium">
                    {Math.round(sess.duration_seconds / 60)} minutes
                  </span>
                  <span aria-hidden="true" className="text-purple-400 text-xs">·</span>
                  <span className="text-xs font-mono tabular-nums text-yellow-400 font-bold">
                    +{sess.xp_earned} XP
                  </span>
                </div>

                {/* Focus Tags from Bridge Table */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {sess.tags.map((tag) => (
                    <span
                      key={tag.tag_id}
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#2b1850] border border-purple-700/60 text-purple-200"
                    >
                      {tag.tag_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sync Status Badge & Date */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs text-purple-300 gap-1">
                <span>{formatDate(sess.started_at)}</span>
                <span
                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                    sess.sync_status === 'pending'
                      ? 'text-yellow-300'
                      : 'text-purple-300/80'
                  }`}
                >
                  {sess.sync_status === 'pending' ? (
                    <>
                      <CloudOff className="w-3 h-3 text-yellow-400" />
                      <span>Local SQLite</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-purple-300" />
                      <span>Supabase Synced</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
