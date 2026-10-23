import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { ScoredSubject, ScoredTopic, Subject } from '../types';

interface SubjectCardProps {
  scoredSubject: ScoredSubject;
  index: number;
  onOpenSubject: (subject: ScoredSubject) => void;
  onContinueStudying?: (topic: ScoredTopic) => void;
  onTakeMockTest?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  scoredSubject,
  index,
  onOpenSubject,
  onContinueStudying,
  onTakeMockTest,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Professional rising animation on viewport entry (Requirement 24)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const {
    subject,
    totalTopics,
    completedTopicsCount,
    inProgressTopicsCount,
    notStartedTopicsCount,
    overallProgress,
    averageConfidence,
    priorityLevel,
    topPriorityTopic,
    lastStudiedDaysAgo,
    latestMockScore,
    aiRecommendation,
  } = scoredSubject;

  // Format last studied text
  const lastStudiedText =
    lastStudiedDaysAgo === null
      ? 'Not yet studied'
      : lastStudiedDaysAgo === 0
      ? 'Today'
      : lastStudiedDaysAgo === 1
      ? 'Yesterday'
      : `${lastStudiedDaysAgo} days ago`;

  // Priority badge styling
  const priorityBadgeConfig = {
    High: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400',
      label: 'High Priority',
    },
    Medium: {
      bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
      dot: 'bg-sky-400',
      label: 'Medium Priority',
    },
    Low: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      label: 'Low Priority',
    },
  }[priorityLevel];

  // Subject icon fallback
  const displayIcon = subject.icon || '📚';

  return (
    <div
      id={`subject-card-${subject.id}`}
      ref={cardRef}
      style={{
        transform: isVisible
          ? 'translateY(0) scale(1)'
          : 'translateY(48px) scale(0.98)',
        opacity: isVisible ? 1 : 0,
        transition: `all 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s`,
      }}
      className="group relative rounded-2xl bg-[#0b0e17]/85 border border-white/[0.08] hover:border-amber-400/40 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => onOpenSubject(scoredSubject)}
    >
      {/* Subtle background ambient highlight */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500 pointer-events-none" />

      {/* Card Header: Icon, Name, Priority Badge */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
              {displayIcon}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
                {subject.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                {subject.code && (
                  <span className="font-mono uppercase tracking-wider text-stone-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                    {subject.code}
                  </span>
                )}
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-500" />
                  {scoredSubject.topPriorityTopic
                    ? `${scoredSubject.topPriorityTopic.examDaysRemaining}d to exam`
                    : 'Upcoming exam'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Priority Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${priorityBadgeConfig.bg} flex-shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priorityBadgeConfig.dot} animate-pulse`} />
            {priorityBadgeConfig.label}
          </span>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-300 font-medium">Overall Progress</span>
            <span className="text-amber-400 font-semibold font-mono text-sm">
              {overallProgress}%
            </span>
          </div>
          <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.04]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${Math.min(100, Math.max(2, overallProgress))}%` }}
            />
          </div>

          {/* Topic Status Breakdown */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
            <span>
              <strong className="text-stone-200 font-medium">{completedTopicsCount}</strong> of{' '}
              <strong className="text-stone-200 font-medium">{totalTopics}</strong> topics completed
            </span>
            <div className="flex items-center gap-2">
              {inProgressTopicsCount > 0 && (
                <span className="text-amber-400/90 font-medium">
                  {inProgressTopicsCount} in progress
                </span>
              )}
              {notStartedTopicsCount > 0 && (
                <span className="text-stone-500">{notStartedTopicsCount} remaining</span>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Row: Confidence, Latest Test, Last Studied */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Confidence</div>
            <div className="font-medium text-stone-200 mt-0.5 flex items-center gap-1">
              <span className="text-amber-400">★</span>
              <span>{averageConfidence} / 5</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Latest Test</div>
            <div className="font-medium text-stone-200 mt-0.5">
              {latestMockScore !== null ? (
                <span className={latestMockScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                  {latestMockScore}%
                </span>
              ) : (
                <span className="text-stone-500 font-normal">No test yet</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Last Studied</div>
            <div className="font-medium text-stone-300 mt-0.5 truncate flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-500 flex-shrink-0" />
              <span className="truncate">{lastStudiedText}</span>
            </div>
          </div>
        </div>

        {/* Small AI Recommendation Snippet */}
        {aiRecommendation && (
          <div className="p-2.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 flex items-start gap-2 text-xs text-amber-200/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed text-[11px]">{aiRecommendation}</p>
          </div>
        )}
      </div>

      {/* Card Footer: Action Button */}
      <div className="pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between gap-3 relative z-10">
        {topPriorityTopic && topPriorityTopic.topic.completion < 100 && onContinueStudying ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onContinueStudying(topPriorityTopic);
            }}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors"
          >
            <Play className="w-3 h-3 fill-amber-400" />
            <span>Continue {topPriorityTopic.topic.name.slice(0, 16)}...</span>
          </button>
        ) : (
          <span className="text-xs text-stone-500 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-stone-500" />
            {totalTopics} Study Topics
          </span>
        )}

        <button
          type="button"
          onClick={() => onOpenSubject(scoredSubject)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-amber-400 hover:text-black text-xs font-medium text-stone-200 border border-white/[0.08] hover:border-amber-400 transition-all duration-200 group-hover:border-amber-400/40"
        >
          <span>Open Subject</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
