import React from 'react';
import { Sparkles, Calendar, AlertTriangle, CheckCircle2, Flame, Layers } from 'lucide-react';
import { ScoredTopic, Subject } from '../types';
import { ThreeHeroGem } from './ThreeHeroGem';

interface WelcomeBannerProps {
  topTopic: ScoredTopic | null;
  scoredTopics: ScoredTopic[];
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  onStudyNow: () => void;
  onOpenAddTopic: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  topTopic,
  scoredTopics,
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onStudyNow,
  onOpenAddTopic,
}) => {
  const highPriorityCount = scoredTopics.filter((t) => t.priorityLevel === 'High').length;
  const mediumPriorityCount = scoredTopics.filter((t) => t.priorityLevel === 'Medium').length;
  const lowPriorityCount = scoredTopics.filter((t) => t.priorityLevel === 'Low').length;

  const nearestExamDays = scoredTopics.length > 0
    ? Math.min(...scoredTopics.map((t) => t.examDaysRemaining))
    : null;

  return (
    <div className="space-y-5">
      {/* Main Hero Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d1017]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] text-amber-300 text-xs font-medium border border-white/[0.08]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Automated Study Priority Engine</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight animate-fade-slide-up">
              Study smarter, not just longer.
            </h2>
            
            <p className="text-stone-400 text-sm sm:text-base leading-relaxed">
              Traditional planners divide time into arbitrary blocks. Our engine continuously models your exam proximity, student weaknesses, syllabus gaps, and course weightage to objectively compute what deserves your cognitive focus right now.
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium transition-transform duration-200 hover:-translate-y-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{highPriorityCount} Urgent Topics</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium transition-transform duration-200 hover:-translate-y-0.5">
                <span>{mediumPriorityCount} Moderate</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium transition-transform duration-200 hover:-translate-y-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lowPriorityCount} On Track</span>
              </div>
              {nearestExamDays !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-stone-300 border border-white/[0.08] font-medium transition-transform duration-200 hover:-translate-y-0.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    Nearest Exam: {nearestExamDays === 0 ? 'Today' : `in ${nearestExamDays} days`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Standout "Study Now" Prompt Card */}
          <div className="lg:w-80 flex-shrink-0 bg-[#121622] text-white rounded-xl p-5 shadow-xl border border-white/[0.1] flex flex-col justify-between space-y-4 transition-all duration-300 hover:border-white/[0.18] hover:shadow-2xl">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 pb-2.5 border-b border-white/[0.08]">
                <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Primary Recommendation
                </span>
                {topTopic && (
                  <span className="font-semibold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-mono">
                    {topTopic.priorityScore}/100
                  </span>
                )}
              </div>

              {topTopic ? (
                <div className="mt-3 flex items-start gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400">
                      {topTopic.subject.name}
                    </span>
                    <h3 className="text-sm font-semibold text-white leading-snug">
                      {topTopic.topic.name}
                    </h3>
                    <p className="text-xs text-stone-400 line-clamp-2 mt-1">
                      {topTopic.reason}
                    </p>
                  </div>
                  <ThreeHeroGem
                    priorityScore={topTopic.priorityScore}
                    priorityLevel={topTopic.priorityLevel}
                  />
                </div>
              ) : (
                <div className="mt-3 text-xs text-stone-400">
                  Add topics to generate your study recommendation.
                </div>
              )}
            </div>

            <div className="pt-2">
              {topTopic ? (
                <button
                  id="btn-hero-study-now"
                  onClick={onStudyNow}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-amber-400/10 hover:shadow-lg hover:shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Start Studying This Now</span>
                </button>
              ) : (
                <button
                  id="btn-hero-add-topic"
                  onClick={onOpenAddTopic}
                  className="w-full py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-white/[0.08] hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <span>Create Study Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-stone-400 font-medium flex items-center gap-1.5 flex-shrink-0 pl-1">
          <Layers className="w-3.5 h-3.5 text-stone-500" />
          Filter:
        </span>
        <button
          id="btn-filter-all"
          onClick={() => onSelectSubject(null)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 cursor-pointer flex-shrink-0 text-xs hover:-translate-y-0.5 active:scale-95 ${
            selectedSubjectId === null
              ? 'bg-white text-stone-950 font-semibold shadow-sm'
              : 'bg-white/[0.04] border border-white/[0.08] text-stone-300 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          All Subjects ({scoredTopics.length})
        </button>

        {subjects.map((sub) => {
          const count = scoredTopics.filter((t) => t.subject.id === sub.id).length;
          const isSelected = selectedSubjectId === sub.id;
          return (
            <button
              key={sub.id}
              id={`btn-filter-${sub.id}`}
              onClick={() => onSelectSubject(sub.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 cursor-pointer flex-shrink-0 text-xs hover:-translate-y-0.5 active:scale-95 ${
                isSelected
                  ? 'bg-white text-stone-950 font-semibold shadow-sm'
                  : 'bg-white/[0.04] border border-white/[0.08] text-stone-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {sub.name} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
};
