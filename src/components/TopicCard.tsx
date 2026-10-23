import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  RotateCw,
  Brain,
  Target,
} from 'lucide-react';
import { ScoredTopic } from '../types';

interface TopicCardProps {
  scored: ScoredTopic;
  rank: number;
  onStudyNow: (topic: ScoredTopic) => void;
  onUpdateProgress: (topic: ScoredTopic) => void;
  onEdit: (topic: ScoredTopic) => void;
  onDelete: (topicId: string) => void;
  onRefreshAi: (topic: ScoredTopic) => Promise<void>;
  onAskAi?: (topic: ScoredTopic) => void;
  onTestTopic?: (topic: ScoredTopic) => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  scored,
  rank,
  onStudyNow,
  onUpdateProgress,
  onEdit,
  onDelete,
  onRefreshAi,
  onAskAi,
  onTestTopic,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { topic, subject, priorityScore, priorityLevel, examDaysRemaining, breakdown, reason, suggestedAction } = scored;

  // Stagger calculation: subtle stagger for cards entering viewport together
  const staggerMs = Math.min((rank - 1) * 75, 300);

  // Viewport Intersection Detection:
  // Card starts slightly lower (translateY 56px, opacity 0, scale 0.97).
  // When it enters viewport during downward scrolling, it rises smoothly and settles.
  // Once revealed, it stays revealed (never replays annoyingly when scrolling up).
  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasRevealed(true);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHasRevealed(true);
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasRevealed(true);
          observer.unobserve(el); // Stays permanently revealed during scroll
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const getPriorityBadge = (level: 'High' | 'Medium' | 'Low') => {
    switch (level) {
      case 'High':
        return {
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
          dot: 'bg-rose-400',
          indicator: 'High Priority',
        };
      case 'Medium':
        return {
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
          dot: 'bg-amber-400',
          indicator: 'Moderate Priority',
        };
      case 'Low':
        return {
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
          dot: 'bg-emerald-400',
          indicator: 'On Track',
        };
    }
  };

  const badge = getPriorityBadge(priorityLevel);

  const handleRefreshAiClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshingAi(true);
    try {
      await onRefreshAi(scored);
    } finally {
      setIsRefreshingAi(false);
    }
  };

  return (
    <div
      ref={cardRef}
      id={`topic-card-${topic.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transitionDuration: hasRevealed ? (isHovered ? '220ms' : '620ms') : '620ms',
        transitionDelay: hasRevealed ? (isHovered ? '0ms' : `${staggerMs}ms`) : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`group/card rounded-2xl border bg-[#0d1017]/85 backdrop-blur-xl transition-all select-none will-change-transform ${
        !hasRevealed
          ? 'opacity-0 translate-y-14 sm:translate-y-16 scale-[0.97] pointer-events-none'
          : isHovered
          ? '-translate-y-1 scale-[1.01]'
          : 'opacity-100 translate-y-0 scale-100'
      } ${
        rank === 1
          ? isHovered
            ? 'border-amber-400/70 ring-1 ring-amber-400/40 shadow-2xl shadow-amber-500/20'
            : 'border-amber-400/45 ring-1 ring-amber-400/20 shadow-xl shadow-amber-500/10 priority-ambient-gold'
          : isHovered
          ? 'border-white/[0.25] shadow-2xl shadow-white/[0.04]'
          : 'border-white/[0.08] shadow-md hover:border-white/[0.14]'
      }`}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header Row: Rank, Subject, Priority Score & Actions */}
        <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                rank === 1 
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/30 font-mono' 
                  : 'bg-white/[0.08] text-white border-white/[0.1]'
              }`}>
                #{rank}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.04] text-stone-300 border border-white/[0.08]">
                {subject.name}
              </span>
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                Exam {examDaysRemaining === 0 ? 'Today' : `in ${examDaysRemaining} days`}
              </span>
              {topic.importance === 'High' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  High Yield
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug">
              {topic.name}
            </h3>
          </div>

          {/* Priority Score Stamp */}
          <div className="flex items-center gap-3 self-start">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className={`text-2xl font-bold tracking-tight font-mono ${
                  rank === 1 ? 'text-amber-300' : 'text-white'
                }`}>
                  {priorityScore}
                </span>
                <span className="text-xs font-medium text-stone-500">/100</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${badge.bg} ${
                  rank === 1 ? 'animate-pulse' : ''
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{badge.indicator}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Status Indicators */}
        <div 
          style={{ transitionDelay: hasRevealed ? `${staggerMs + 75}ms` : '0ms' }}
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 px-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-stone-400 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hasRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div>
            <span className="text-stone-500 block text-[11px]">Syllabus Completion</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    topic.completion >= 80
                      ? 'bg-emerald-400'
                      : topic.completion >= 50
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: hasRevealed ? `${topic.completion}%` : '0%' }}
                />
              </div>
              <span className="font-semibold text-white text-[11px] min-w-8 text-right font-mono">
                {topic.completion}%
              </span>
            </div>
          </div>

          <div>
            <span className="text-stone-500 block text-[11px]">Latest Test Score</span>
            <span className="font-semibold text-white mt-0.5 block">
              {topic.latestScore !== null ? (
                <span
                  className={
                    topic.latestScore < 50
                      ? 'text-rose-400'
                      : topic.latestScore < 75
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {topic.latestScore}%
                </span>
              ) : (
                <span className="text-stone-500 font-normal">Not tested</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-stone-500 block text-[11px]">Confidence</span>
            <span className="font-semibold text-amber-300 mt-0.5 flex items-center gap-1">
              {'★'.repeat(topic.confidence)}
              <span className="text-stone-700">
                {'★'.repeat(5 - topic.confidence)}
              </span>
              <span className="text-[11px] text-stone-500 ml-0.5">
                ({topic.confidence}/5)
              </span>
            </span>
          </div>

          <div>
            <span className="text-stone-500 block text-[11px]">Last Studied</span>
            <span className="font-semibold text-white mt-0.5 block">
              {topic.lastStudiedDaysAgo === 0
                ? 'Today'
                : `${topic.lastStudiedDaysAgo}d ago`}
              {topic.needsRevision && (
                <span className="text-amber-300 text-[10px] ml-1 bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 rounded font-medium">
                  Due
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Mock Test Performance & AI Recommendation (When Available) */}
        {topic.mockTestAccuracy !== undefined && topic.mockTestAccuracy !== null && (
          <div
            style={{ transitionDelay: hasRevealed ? `${staggerMs + 105}ms` : '0ms' }}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/[0.07] border border-purple-500/20 text-xs transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              hasRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-purple-200 font-medium">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>Mock Test Accuracy:</span>
                <strong className={`font-mono ${
                  topic.mockTestAccuracy < 60
                    ? 'text-rose-400'
                    : topic.mockTestAccuracy < 80
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}>
                  {topic.mockTestAccuracy}%
                </strong>
              </span>

              {topic.lastTestedDaysAgo !== undefined && topic.lastTestedDaysAgo !== null && (
                <span className="text-stone-400 text-[11px]">
                  • Last Tested: {topic.lastTestedDaysAgo === 0 ? 'Today' : `${topic.lastTestedDaysAgo}d ago`}
                </span>
              )}
            </div>

            {topic.mockTestRecommendation && (
              <div className="text-[11px] text-purple-200/90 italic flex items-center gap-1.5">
                <span className="not-italic text-[10px] uppercase font-bold tracking-wide text-purple-300 bg-purple-500/25 px-1.5 py-0.5 rounded border border-purple-500/30">
                  AI Rec
                </span>
                <span>"{topic.mockTestRecommendation}"</span>
              </div>
            )}
          </div>
        )}

        {/* AI & Priority Explanation */}
        <div 
          style={{ transitionDelay: hasRevealed ? `${staggerMs + 140}ms` : '0ms' }}
          className={`space-y-2 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3.5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hasRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Priority Explanation</span>
              {scored.isAiGenerated && (
                <span className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-1.5 py-0.2 rounded font-medium">
                  AI Enhanced
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefreshAiClick}
              disabled={isRefreshingAi}
              title="Refresh with Gemini AI"
              className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50 active:scale-95 transition-transform"
            >
              <RotateCw className={`w-3 h-3 ${isRefreshingAi ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAi ? 'Analyzing...' : 'AI Explain'}</span>
            </button>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed font-normal">
            <span className="font-semibold text-white">Why #{rank}: </span>
            {reason}
          </p>

          <div className="pt-1.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <div className="text-stone-400 flex items-start sm:items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="text-stone-200">Suggested Action: </strong>
                {suggestedAction}
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Mathematical Breakdown (Transparency Guarantee) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer py-1 group/toggle"
          >
            <BarChart3 className="w-3.5 h-3.5 text-stone-500 group-hover/toggle:text-amber-400 transition-colors" />
            <span>{showBreakdown ? 'Hide Mathematical Breakdown' : 'View Formula Score Breakdown'}</span>
            {showBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
            )}
          </button>

          {showBreakdown && (
            <div className="mt-2 p-3.5 rounded-xl bg-black/40 border border-white/[0.07] text-xs space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold uppercase tracking-wider pb-1 border-b border-white/[0.06]">
                <span>Evaluated Factor</span>
                <span>Raw / 100</span>
                <span>Engine Weight</span>
                <span>Points Added</span>
              </div>

              <div className="space-y-1.5 text-stone-300 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <Clock className="w-3 h-3 text-rose-400" />
                    Exam Urgency ({examDaysRemaining} days remaining)
                  </span>
                  <span>{breakdown.rawUrgency}</span>
                  <span className="text-stone-500">25%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedUrgency}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <TrendingDown className="w-3 h-3 text-amber-400" />
                    Student Weakness (100 - score / confidence gap)
                  </span>
                  <span>{breakdown.rawWeakness}</span>
                  <span className="text-stone-500">25%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedWeakness}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <AlertCircle className="w-3 h-3 text-sky-400" />
                    Topic Exam Importance ({topic.importance})
                  </span>
                  <span>{breakdown.rawImportance}</span>
                  <span className="text-stone-500">20%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedImportance}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <HelpCircle className="w-3 h-3 text-indigo-400" />
                    Incompleteness ({100 - topic.completion}% unfinished)
                  </span>
                  <span>{breakdown.rawIncompleteness}</span>
                  <span className="text-stone-500">15%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedIncompleteness}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <RotateCw className="w-3 h-3 text-stone-400" />
                    Revision Need (last studied {topic.lastStudiedDaysAgo}d ago)
                  </span>
                  <span>{breakdown.rawRevision}</span>
                  <span className="text-stone-500">10%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedRevision}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-sans">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Confidence Gap (5 - {topic.confidence} stars)
                  </span>
                  <span>{breakdown.rawConfidenceGap}</span>
                  <span className="text-stone-500">5%</span>
                  <span className="font-semibold text-white">
                    +{breakdown.weightedConfidenceGap}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between font-semibold text-white">
                <span>Final Calculated Priority Score</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {priorityScore} / 100
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card Actions: Primary "Study Now" + "Update Progress" + Edit */}
        <div 
          style={{ transitionDelay: hasRevealed ? `${staggerMs + 200}ms` : '0ms' }}
          className={`pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] flex-wrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hasRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              id={`btn-study-topic-${topic.id}`}
              type="button"
              onClick={() => onStudyNow(scored)}
              className="group/btn inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-amber-300 text-stone-950 transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 group-hover/btn:rotate-12 group-hover/btn:scale-110 transition-transform duration-200" />
              <span>Study This Now</span>
            </button>

            <button
              id={`btn-update-topic-${topic.id}`}
              type="button"
              onClick={() => onUpdateProgress(scored)}
              className="group/btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.08] text-stone-300 hover:text-white transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 group-hover/btn:text-emerald-400 group-hover/btn:scale-110 transition-all duration-200" />
              <span>Log Progress</span>
            </button>

            {onTestTopic && (
              <button
                id={`btn-mock-test-${topic.id}`}
                type="button"
                onClick={() => onTestTopic(scored)}
                title="Generate a targeted mock test for this topic"
                className="group/btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 border border-purple-500/25 hover:border-purple-500/45 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] hover:shadow-sm hover:shadow-purple-500/15 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-purple-400 group-hover/btn:scale-110 group-hover/btn:text-purple-300 transition-transform duration-200" />
                <span>Mock Test</span>
              </button>
            )}

            {onAskAi && (
              <button
                id={`btn-ask-ai-${topic.id}`}
                type="button"
                onClick={() => onAskAi(scored)}
                title="Ask StudyMate AI about this topic"
                className="group/btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-400/10 border border-amber-400/25 hover:border-amber-400/40 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200 transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] hover:shadow-sm hover:shadow-amber-400/10 cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5 text-amber-400 group-hover/btn:scale-110 group-hover/btn:text-amber-300 transition-transform duration-200" />
                <span>Ask AI</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(scored)}
              title="Edit topic details"
              className="p-2 text-stone-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              id={`btn-delete-topic-${topic.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(topic.id);
              }}
              title="Delete topic"
              aria-label={`Delete topic ${topic.name}`}
              className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
