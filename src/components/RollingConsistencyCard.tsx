import React, { useState } from 'react';
import { Sparkles, Calendar, Settings2, Check, Info } from 'lucide-react';
import { dimensionalStore, DimInstrument } from '../db/dimensionalStore';
import { audioTools } from '../utils/audioTools';

interface RollingConsistencyCardProps {
  onUpdate: () => void;
}

export const RollingConsistencyCard: React.FC<RollingConsistencyCardProps> = ({ onUpdate }) => {
  const consistency = dimensionalStore.getRollingConsistency();
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [targetDays, setTargetDays] = useState<number>(consistency.targetDays);

  const handleSaveTarget = () => {
    audioTools.triggerHaptic('tap');
    if (consistency.instrument) {
      dimensionalStore.updateInstrumentTarget(consistency.instrument.instrument_id, targetDays);
      setIsEditingTarget(false);
      onUpdate();
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#2b1850] border border-purple-800/70 text-white shadow-md shadow-purple-950/40 space-y-4">
      {/* Header with Title and Goal Configuration */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">
              Rolling 7-Day Consistency
            </h3>
            <span className="text-[11px] text-yellow-400 font-semibold">
              {consistency.instrument?.name || 'Voice'}
            </span>
          </div>
          <p className="text-xs text-purple-200">
            Paced consistency without daily streak guilt or punitive resets
          </p>
        </div>

        <button
          onClick={() => setIsEditingTarget(!isEditingTarget)}
          className="p-1.5 rounded-lg text-purple-300 hover:text-yellow-400 transition-colors cursor-pointer"
          title="Adjust weekly target"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Target Editor (Inline) */}
      {isEditingTarget && (
        <div className="p-3 rounded-xl bg-[#221342] border border-purple-800/60 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-200">
            Target practice days per 7-day window:
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targetDays}
              onChange={(e) => setTargetDays(parseInt(e.target.value, 10))}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#1a0f2e] border border-purple-700 text-white"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'day' : 'days'}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveTarget}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-yellow-400 hover:bg-yellow-300 text-purple-950 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* 7-Day Rolling Visual Stones */}
      <div className="grid grid-cols-7 gap-2">
        {consistency.days.map((day) => (
          <div
            key={day.dateStr}
            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all ${
              day.active
                ? 'bg-yellow-400 text-purple-950 font-bold shadow-md shadow-yellow-500/10'
                : 'bg-purple-950/60 text-purple-400 border border-purple-900/60'
            }`}
          >
            <span className="text-[10px] font-semibold tracking-wider">
              {day.dayLabel}
            </span>
            <div className="my-1">
              {day.active ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-purple-700/60" />
              )}
            </div>
            <span className="text-[10px] font-mono tabular-nums opacity-90">
              {day.minutes > 0 ? `${day.minutes}m` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Progress & Affirmation Footer */}
      <div className="pt-2 border-t border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-purple-200">
          <span className="font-bold text-white">
            {consistency.activeDaysCount} of {consistency.targetDays} target days
          </span>
          <span aria-hidden="true" className="text-purple-400">·</span>
          <span className="text-yellow-300 font-medium">
            {consistency.isTargetMet
              ? 'Target achieved for this 7-day period!'
              : `${consistency.targetDays - consistency.activeDaysCount} more session${
                  consistency.targetDays - consistency.activeDaysCount > 1 ? 's' : ''
                } to meet weekly goal.`}
          </span>
        </div>

        <div className="text-[11px] text-purple-300/80 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0 text-yellow-400" />
          <span>Rolling window auto-evaluates daily</span>
        </div>
      </div>
    </div>
  );
};
