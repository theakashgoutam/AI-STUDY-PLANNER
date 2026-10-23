import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, ArrowRight, Sparkles, Star } from 'lucide-react';
import { ScoredTopic, Topic, PriorityWeights } from '../types';
import { calculateTopicPriority, DEFAULT_WEIGHTS } from '../utils/priorityEngine';

interface ProgressUpdateModalProps {
  isOpen: boolean;
  topic: ScoredTopic | null;
  weights?: PriorityWeights;
  onClose: () => void;
  onSaveProgress: (
    topicId: string,
    updates: {
      completion: number;
      confidence: number;
      latestScore: number | null;
      lastStudiedDaysAgo: number;
      needsRevision: boolean;
    }
  ) => void;
}

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  isOpen,
  topic,
  weights = DEFAULT_WEIGHTS,
  onClose,
  onSaveProgress,
}) => {
  if (!isOpen || !topic) return null;

  return (
    <ProgressUpdateModalContent
      topic={topic}
      weights={weights}
      onClose={onClose}
      onSaveProgress={onSaveProgress}
    />
  );
};

interface ContentProps {
  topic: ScoredTopic;
  weights: PriorityWeights;
  onClose: () => void;
  onSaveProgress: (
    topicId: string,
    updates: {
      completion: number;
      confidence: number;
      latestScore: number | null;
      lastStudiedDaysAgo: number;
      needsRevision: boolean;
    }
  ) => void;
}

const ProgressUpdateModalContent: React.FC<ContentProps> = ({
  topic,
  weights,
  onClose,
  onSaveProgress,
}) => {
  const [completion, setCompletion] = useState<number>(topic.topic.completion);
  const [confidence, setConfidence] = useState<number>(topic.topic.confidence);
  const [hasScore, setHasScore] = useState<boolean>(topic.topic.latestScore !== null);
  const [latestScore, setLatestScore] = useState<number>(topic.topic.latestScore ?? 75);
  const [needsRevision, setNeedsRevision] = useState<boolean>(false);

  // Live recalculate the projected priority score with new inputs
  const projected = useMemo(() => {
    const updatedTopicData: Topic = {
      ...topic.topic,
      completion,
      confidence,
      latestScore: hasScore ? latestScore : null,
      lastStudiedDaysAgo: 0, // Reset to today
      needsRevision,
    };
    return calculateTopicPriority(updatedTopicData, topic.subject, weights);
  }, [topic, completion, confidence, hasScore, latestScore, needsRevision, weights]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProgress(topic.topic.id, {
      completion,
      confidence,
      latestScore: hasScore ? latestScore : null,
      lastStudiedDaysAgo: 0,
      needsRevision,
    });
    onClose();
  };

  const scoreDiff = projected.priorityScore - topic.priorityScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        id="modal-progress-update"
        className="bg-[#0b0d13] rounded-2xl max-w-lg w-full border border-white/[0.1] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-[#0f131f]">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.06] text-stone-300 border border-white/[0.08]">
              {topic.subject.name}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1.5">
              How did your study session go?
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Topic: <span className="font-semibold text-white">{topic.topic.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-stone-300">
          {/* Adaptive Live Projection Preview Banner */}
          <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
                Dynamic Priority Recalculation
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-stone-400 font-medium">
                  Current: <strong className="text-white font-mono">{topic.priorityScore}/100</strong>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-white font-bold">
                  New: <span className="text-amber-400 font-mono">{projected.priorityScore}/100</span>
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    scoreDiff < 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : scoreDiff > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-white/[0.06] text-stone-300'
                  }`}
                >
                  {scoreDiff < 0 ? `${scoreDiff} pts (Priority lowers)` : scoreDiff > 0 ? `+${scoreDiff} pts` : 'No change'}
                </span>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
          </div>

          {/* Completion Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-medium">
              <label htmlFor="input-update-completion" className="text-stone-300">
                Syllabus Completion
              </label>
              <span className="font-bold text-white text-sm font-mono">{completion}%</span>
            </div>
            <input
              id="input-update-completion"
              type="range"
              min="0"
              max="100"
              step="5"
              value={completion}
              onChange={(e) => setCompletion(Number(e.target.value))}
              className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>0% (Just started)</span>
              <span>50% (Halfway)</span>
              <span>100% (Complete)</span>
            </div>
          </div>

          {/* Confidence Stars */}
          <div className="space-y-2">
            <label className="text-stone-300 font-medium block">
              Confidence Level: ({confidence} / 5 stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setConfidence(star)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    confidence === star
                      ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-white/[0.04] border-white/[0.08] text-stone-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= confidence
                        ? confidence === star
                          ? 'fill-stone-950 text-stone-950'
                          : 'fill-amber-400 text-amber-400'
                        : 'text-stone-600'
                    }`}
                  />
                  <span>{star}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Test / Quiz Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-stone-300 font-medium">
                Recent Diagnostic / Quiz Score
              </label>
              <label className="flex items-center gap-1.5 text-stone-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasScore}
                  onChange={(e) => setHasScore(e.target.checked)}
                  className="rounded border-white/[0.2] bg-white/[0.05] accent-amber-400"
                />
                <span>Include quiz score</span>
              </label>
            </div>

            {hasScore && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={latestScore}
                  onChange={(e) => setLatestScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-24 px-3 py-2 border border-white/[0.1] rounded-xl text-sm font-semibold text-white bg-[#141824] font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-stone-400 text-xs">% on recent practice test</span>
              </div>
            )}
          </div>

          {/* Flag for Revision Need */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-300">
              <input
                type="checkbox"
                checked={needsRevision}
                onChange={(e) => setNeedsRevision(e.target.checked)}
                className="rounded border-white/[0.2] bg-white/[0.05] accent-amber-400"
              />
              <span>Mark this topic as needing scheduled review soon</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-progress-update"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-amber-400/10 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-stone-950" />
              <span>Update My Priorities</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
