import React, { useState } from 'react';
import { X, Sliders, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PriorityWeights } from '../types';
import { DEFAULT_WEIGHTS } from '../utils/priorityEngine';

interface WeightConfigModalProps {
  isOpen: boolean;
  weights: PriorityWeights;
  onClose: () => void;
  onSaveWeights: (newWeights: PriorityWeights) => void;
  onResetWeights: () => void;
}

export const WeightConfigModal: React.FC<WeightConfigModalProps> = ({
  isOpen,
  weights,
  onClose,
  onSaveWeights,
  onResetWeights,
}) => {
  const [localWeights, setLocalWeights] = useState<PriorityWeights>(weights);

  if (!isOpen) return null;

  const totalSum = Math.round(
    (localWeights.urgency +
      localWeights.weakness +
      localWeights.importance +
      localWeights.incompleteness +
      localWeights.revision +
      localWeights.confidenceGap) *
      100
  );

  const isValid = totalSum === 100;

  const handleSliderChange = (key: keyof PriorityWeights, percentValue: number) => {
    setLocalWeights((prev) => ({
      ...prev,
      [key]: percentValue / 100,
    }));
  };

  const handleReset = () => {
    setLocalWeights(DEFAULT_WEIGHTS);
    onResetWeights();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWeights(localWeights);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        id="modal-weight-config"
        className="bg-[#0b0d13] rounded-2xl max-w-lg w-full border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-[#0f131f]">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h2 className="text-xl font-bold tracking-tight">
                Scoring Engine Weights
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Customize how heavily each academic dimension impacts the 0–100 priority score.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-stone-300">
          {/* Total Weight Monitor */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-semibold">
                Total Formula Weight: {totalSum}%
              </span>
            </div>
            <span className="text-[11px] font-medium opacity-80">
              {isValid ? 'Balanced (Target: 100%)' : 'Suggested: sum to 100%'}
            </span>
          </div>

          {/* Individual Weight Sliders */}
          <div className="space-y-4 pt-1">
            {/* Urgency */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Exam Urgency (Proximity to Exam Date)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.urgency * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(localWeights.urgency * 100)}
                onChange={(e) => handleSliderChange('urgency', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 25%</span>
            </div>

            {/* Weakness */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Student Weakness (100 - Quiz Score / Gap)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.weakness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(localWeights.weakness * 100)}
                onChange={(e) => handleSliderChange('weakness', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 25%</span>
            </div>

            {/* Topic Importance */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Topic Exam Importance (High / Med / Low)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.importance * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(localWeights.importance * 100)}
                onChange={(e) => handleSliderChange('importance', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 20%</span>
            </div>

            {/* Incompleteness */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Syllabus Incompleteness (100 - Completion %)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.incompleteness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(localWeights.incompleteness * 100)}
                onChange={(e) => handleSliderChange('incompleteness', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 15%</span>
            </div>

            {/* Revision Need */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Revision Requirement (Days Since Last Studied)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.revision * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(localWeights.revision * 100)}
                onChange={(e) => handleSliderChange('revision', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 10%</span>
            </div>

            {/* Confidence Gap */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label className="text-stone-300">Student Confidence Gap (5 - Stars)</label>
                <span className="font-bold text-white font-mono">
                  {Math.round(localWeights.confidenceGap * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={Math.round(localWeights.confidenceGap * 100)}
                onChange={(e) => handleSliderChange('confidenceGap', Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-500 block">Default: 5%</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset PRD Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors shadow-md shadow-amber-400/10 cursor-pointer"
              >
                Apply Weights
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
