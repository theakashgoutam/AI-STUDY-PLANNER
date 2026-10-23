import React from 'react';
import {
  Sparkles,
  Play,
  ArrowRight,
  Clock,
  Target,
  AlertCircle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { ScoredTopic, ScoredSubject } from '../types';

interface StudyNowRecommendationProps {
  topScoredTopic: ScoredTopic | null;
  onStartStudy: (scoredTopic: ScoredTopic) => void;
  onOpenSubject: (subjectId: string) => void;
}

export const StudyNowRecommendation: React.FC<StudyNowRecommendationProps> = ({
  topScoredTopic,
  onStartStudy,
  onOpenSubject,
}) => {
  if (!topScoredTopic) return null;

  const { topic, subject, examDaysRemaining, reason, studyObjective } = topScoredTopic;

  return (
    <div
      id="study-now-recommendation"
      className="relative rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-[#101422]/90 to-[#0b0e17]/90 border border-amber-500/30 p-5 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden group"
    >
      {/* Subtle glowing orb */}
      <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/15 transition-all duration-700" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Recommendation Details */}
        <div className="space-y-2.5 max-w-3xl">
          {/* Eyebrow / Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400 text-black shadow-sm">
              <Sparkles className="w-3 h-3 fill-black" />
              <span>Recommended Right Now</span>
            </span>

            <span className="text-xs text-stone-400">
              Exam approaching in <strong className="text-stone-200">{examDaysRemaining} days</strong>
            </span>
          </div>

          {/* Topic & Subject Name */}
          <div>
            <div className="text-xs font-medium text-amber-400/90 flex items-center gap-1.5">
              <span>{subject.icon || '📚'}</span>
              <span>{subject.name}</span>
              <span className="text-stone-600">/</span>
              <span className="text-stone-400">{topic.importance} Importance</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              {topic.name}
            </h2>
          </div>

          {/* Why this is important & Study Objective */}
          <div className="space-y-1 text-xs text-stone-300 leading-relaxed">
            <p className="flex items-start gap-1.5 text-stone-300">
              <span className="text-amber-400 font-medium flex-shrink-0">Why now:</span>
              <span>{reason}</span>
            </p>
            {studyObjective && (
              <p className="flex items-start gap-1.5 text-stone-400 line-clamp-1">
                <span className="text-stone-500 font-medium flex-shrink-0">Goal:</span>
                <span>{studyObjective}</span>
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5 text-stone-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Est. Session: <strong>35 mins</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Progress: <strong>{topic.completion}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Confidence: <strong>{topic.confidence} / 5</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onStartStudy(topScoredTopic)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-all duration-200 shadow-xl shadow-amber-400/20 active:scale-95"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Start Studying Now</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSubject(subject.id)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 hover:text-white text-xs font-medium border border-white/[0.08] transition-colors"
          >
            <span>Open {subject.name.slice(0, 18)}...</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
