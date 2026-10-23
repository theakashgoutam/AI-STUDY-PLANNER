import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Play,
  FileCheck,
  MessageSquare,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Search,
  Check,
} from 'lucide-react';
import { ScoredSubject, ScoredTopic, Subject, Topic } from '../types';

interface SubjectDetailViewProps {
  scoredSubject: ScoredSubject;
  onBack: () => void;
  onStartStudy: (scoredTopic: ScoredTopic) => void;
  onTakeMockTest: (subject: Subject, topicName?: string) => void;
  onAskAi: (subject: Subject, topic?: Topic) => void;
  onAddTopic: (subjectId: string) => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (topicId: string, topicName: string) => void;
  onUpdateTopicProgress: (topic: Topic) => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  scoredSubject,
  onBack,
  onStartStudy,
  onTakeMockTest,
  onAskAi,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onUpdateTopicProgress,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'in_progress' | 'revision' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());
  const [openMenuTopicId, setOpenMenuTopicId] = useState<string | null>(null);

  const {
    subject,
    topics,
    totalTopics,
    completedTopicsCount,
    inProgressTopicsCount,
    overallProgress,
    averageConfidence,
    topPriorityTopic,
    weakestTopic,
  } = scoredSubject;

  const toggleExpand = (topicId: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Filter topics
  const filteredTopics = topics.filter((st) => {
    const matchesSearch =
      st.topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.topic.subtopics &&
        st.topic.subtopics.some((sub) => sub.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'high':
        return st.priorityLevel === 'High';
      case 'in_progress':
        return st.topic.completion > 0 && st.topic.completion < 100;
      case 'revision':
        return st.topic.needsRevision || st.topic.lastStudiedDaysAgo >= 7;
      case 'completed':
        return st.topic.completion >= 100;
      default:
        return true;
    }
  });

  // Generate dynamic AI insight
  const getAiInsight = () => {
    if (completedTopicsCount === totalTopics && totalTopics > 0) {
      return `Outstanding achievement! You have completed 100% of the topics in ${subject.name}. Take a full-syllabus mock exam to cement high retention before test day.`;
    }
    if (weakestTopic && weakestTopic.topic.confidence <= 2) {
      return `You're progressing nicely across ${subject.name}, but your reported confidence in "${weakestTopic.topic.name}" is low (${weakestTopic.topic.confidence}/5). We recommend dedicating 35 minutes to active recall on this topic today.`;
    }
    if (topPriorityTopic && topPriorityTopic.topic.completion < 100) {
      return `Your highest yield focus in ${subject.name} right now is "${topPriorityTopic.topic.name}". It carries ${topPriorityTopic.topic.importance.toLowerCase()} exam weight and is currently at ${topPriorityTopic.topic.completion}% completion.`;
    }
    return `Keep steady momentum in ${subject.name}. Review completed concepts periodically to prevent forgetting curve decay.`;
  };

  return (
    <div id="subject-detail-view" className="space-y-6 animate-fadeIn">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-stone-300 border border-white/[0.08] hover:border-amber-400/40 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to All Subjects</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddTopic(subject.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-stone-200 border border-white/[0.08] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* Main Subject Header Banner */}
      <div className="relative rounded-2xl bg-[#0b0e17]/90 border border-white/[0.08] p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Subject Identity */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
              {subject.icon || '📚'}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {subject.name}
                </h1>
                {subject.code && (
                  <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 font-medium uppercase tracking-wider">
                    {subject.code}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                <span className="flex items-center gap-1 text-stone-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Exam Date: {subject.examDate}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white font-medium">{completedTopicsCount}</strong> of{' '}
                  <strong className="text-white font-medium">{totalTopics}</strong> topics completed
                </span>
                <span>•</span>
                <span className="text-amber-300 flex items-center gap-1">
                  <span>★</span>
                  <span>{averageConfidence} / 5 Avg Confidence</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {topPriorityTopic && topPriorityTopic.topic.completion < 100 && (
              <button
                type="button"
                onClick={() => onStartStudy(topPriorityTopic)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-all duration-200 shadow-lg shadow-amber-400/20 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Continue Studying</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onTakeMockTest(subject)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium text-xs border border-white/[0.1] transition-all duration-200"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Take Mock Test</span>
            </button>

            <button
              type="button"
              onClick={() => onAskAi(subject)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 hover:text-white text-xs border border-white/[0.08] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Ask StudyMate AI</span>
            </button>
          </div>
        </div>

        {/* Progress Bar in Header */}
        <div className="mt-6 pt-6 border-t border-white/[0.08] space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 font-medium">Syllabus Completion</span>
            <span className="text-amber-400 font-mono font-bold text-base">{overallProgress}%</span>
          </div>
          <div className="h-2.5 w-full bg-white/[0.05] rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(2, overallProgress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* StudyMate AI Contextual Insight Banner */}
      <div className="rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              StudyMate AI Insight
            </div>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-3xl">
              {getAiInsight()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAskAi(subject, topPriorityTopic?.topic)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-medium border border-amber-400/30 transition-colors flex-shrink-0 self-start sm:self-center"
        >
          <Sparkles className="w-3 h-3" />
          <span>Ask AI for Tips</span>
        </button>
      </div>

      {/* Topics Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Topics', count: totalTopics },
            { id: 'high', label: 'High Priority', count: topics.filter((t) => t.priorityLevel === 'High').length },
            { id: 'in_progress', label: 'In Progress', count: inProgressTopicsCount },
            { id: 'revision', label: 'Needs Revision', count: topics.filter((t) => t.topic.needsRevision).length },
            { id: 'completed', label: 'Completed', count: completedTopicsCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-amber-400 text-black font-semibold shadow-sm'
                  : 'bg-white/[0.04] text-stone-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab.id
                    ? 'bg-black/20 text-black font-bold'
                    : 'bg-white/[0.08] text-stone-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Topic Search Input */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics or subtopics..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-400/50 transition-colors"
          />
        </div>
      </div>

      {/* Topics List: Compact, Scannable Rows */}
      <div className="rounded-2xl bg-[#0b0e17]/80 border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden backdrop-blur-xl shadow-xl">
        {filteredTopics.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs">
            No topics match the selected filter or search query.
          </div>
        ) : (
          filteredTopics.map((st, idx) => {
            const { topic } = st;
            const isCompleted = topic.completion >= 100;
            const isInProgress = topic.completion > 0 && topic.completion < 100;
            const isExpanded = expandedTopicIds.has(topic.id);
            const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
            const isMenuOpen = openMenuTopicId === topic.id;

            // Status icon
            const statusNode = isCompleted ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
            ) : isInProgress ? (
              <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-stone-500 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-stone-600" />
              </div>
            );

            // Action button based on status
            const actionButton = isCompleted ? (
              <button
                type="button"
                onClick={() => onStartStudy(st)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-medium text-stone-300 hover:text-white border border-white/[0.08] transition-colors"
              >
                Review
              </button>
            ) : isInProgress ? (
              <button
                type="button"
                onClick={() => onStartStudy(st)}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[11px] font-semibold text-black transition-colors flex items-center gap-1"
              >
                <Play className="w-2.5 h-2.5 fill-black" />
                <span>Continue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartStudy(st)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-amber-400 hover:text-black text-[11px] font-medium text-stone-300 border border-white/[0.08] transition-all"
              >
                Start
              </button>
            );

            return (
              <div
                key={topic.id}
                id={`topic-row-${topic.id}`}
                className="p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Status + Number + Title + Subtopics indicator */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {statusNode}

                    <div className="text-xs font-mono text-stone-500 w-5 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => hasSubtopics && toggleExpand(topic.id)}
                          className={`text-xs sm:text-sm font-medium ${
                            isCompleted ? 'text-stone-300' : 'text-white'
                          } hover:text-amber-300 cursor-pointer transition-colors truncate`}
                        >
                          {topic.name}
                        </span>

                        {st.priorityLevel === 'High' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
                            High Priority
                          </span>
                        )}

                        {topic.needsRevision && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            Needs Revision
                          </span>
                        )}
                      </div>

                      {/* Small metadata info */}
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                        <span>Confidence: {topic.confidence}/5</span>
                        <span>•</span>
                        <span>
                          {topic.lastStudiedDaysAgo === 0
                            ? 'Studied today'
                            : `${topic.lastStudiedDaysAgo}d ago`}
                        </span>
                        {topic.latestScore !== null && (
                          <>
                            <span>•</span>
                            <span className="text-stone-400">Score: {topic.latestScore}%</span>
                          </>
                        )}
                        {hasSubtopics && (
                          <>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => toggleExpand(topic.id)}
                              className="text-amber-400/90 hover:text-amber-300 flex items-center gap-0.5"
                            >
                              <span>{topic.subtopics!.length} subtopics</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress bar + Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Mini Progress */}
                    <div className="hidden sm:flex items-center gap-2 w-28">
                      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${topic.completion}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-stone-400 w-8 text-right">
                        {topic.completion}%
                      </span>
                    </div>

                    {/* Action button */}
                    {actionButton}

                    {/* Quick Test button */}
                    <button
                      type="button"
                      onClick={() => onTakeMockTest(subject, topic.name)}
                      title="Test this topic"
                      className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-stone-400 hover:text-stone-200 border border-white/[0.06] transition-colors"
                    >
                      Test
                    </button>

                    {/* Topic Row Dropdown Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuTopicId(isMenuOpen ? null : topic.id)
                        }
                        className="p-1 rounded-lg hover:bg-white/[0.08] text-stone-400 hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-[#141824] border border-white/[0.1] shadow-2xl py-1 z-20 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuTopicId(null);
                              onUpdateTopicProgress(topic);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-white/[0.05] text-stone-300 flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Update Progress</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuTopicId(null);
                              onEditTopic(topic);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-white/[0.05] text-stone-300 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                            <span>Edit Topic</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuTopicId(null);
                              onAskAi(subject, topic);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-white/[0.05] text-stone-300 flex items-center gap-2"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                            <span>Ask AI for Guide</span>
                          </button>
                          <div className="border-t border-white/[0.06] my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuTopicId(null);
                              onDeleteTopic(topic.id, topic.name);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Topic</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Subtopics List (Progressive disclosure) */}
                {isExpanded && hasSubtopics && (
                  <div className="mt-3 pl-11 pr-2 pt-2 border-t border-white/[0.04]">
                    <div className="text-[11px] font-medium text-stone-400 mb-1.5">
                      Subtopics & Core Learning Units:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.subtopics!.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-stone-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
