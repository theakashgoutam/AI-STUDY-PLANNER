import React from 'react';
import {
  Compass,
  Plus,
  Sliders,
  RotateCcw,
  Sparkles,
  Box,
  BookOpen,
  Target,
  TrendingUp,
  Brain,
} from 'lucide-react';

interface HeaderProps {
  onOpenAddTopic: () => void;
  onOpenWeights: () => void;
  onResetData: () => void;
  onStudyNow: () => void;
  totalTopics: number;
  hasApiKey: boolean;
  viewMode?: 'subjects' | 'list' | '3d';
  onToggleViewMode?: () => void;
  onScrollToBook?: () => void;
  onOpenAiPlanner?: () => void;
  onScrollToPlanner?: () => void;
  onOpenMockTests: () => void;
  onOpenWeeklyReport: () => void;
  onScrollToAiPlanner?: () => void;
  mockTestCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddTopic,
  onOpenWeights,
  onResetData,
  onStudyNow,
  totalTopics,
  hasApiKey,
  viewMode = 'list',
  onToggleViewMode,
  onScrollToBook,
  onOpenAiPlanner,
  onScrollToPlanner,
  onOpenMockTests,
  onOpenWeeklyReport,
  onScrollToAiPlanner,
  mockTestCount = 0,
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#06070a]/85 sticky top-0 z-30 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 border border-white/[0.12] text-white flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                AI Study Planner
              </h1>
              <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-stone-300">
                Priority Engine
              </span>
            </div>
            <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <span>Dynamic academic ranking</span>
              <span className="text-stone-600">•</span>
              <span className="inline-flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasApiKey ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400'
                  }`}
                />
                <span className="text-stone-400">
                  {hasApiKey ? 'Gemini Active' : 'Deterministic Heuristic'}
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Primary Navigation Bar */}
        <nav
          aria-label="Main Navigation"
          className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl"
        >
          <button
            id="nav-study-planner"
            type="button"
            onClick={onScrollToPlanner}
            title="Jump to Study Priority Planner"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-stone-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Study Planner</span>
            <span className="sm:hidden">Planner</span>
          </button>

          <button
            id="nav-mock-tests"
            type="button"
            onClick={onOpenMockTests}
            title="Open AI Mock Tests"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200 hover:text-white hover:bg-purple-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span>Mock Tests</span>
            {mockTestCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200">
                {mockTestCount}
              </span>
            )}
          </button>

          <button
            id="nav-weekly-report"
            type="button"
            onClick={onOpenWeeklyReport}
            title="Open Weekly Performance Report"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-amber-200 hover:text-white hover:bg-amber-400/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Weekly Report</span>
            <span className="sm:hidden">Report</span>
          </button>

          {onScrollToAiPlanner && (
            <button
              id="nav-studymate-ai"
              type="button"
              onClick={onScrollToAiPlanner}
              title="Open StudyMate AI Mentor"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-sky-200 hover:text-white hover:bg-sky-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Brain className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">StudyMate AI</span>
              <span className="sm:hidden">AI</span>
            </button>
          )}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-header-study-now"
            onClick={onStudyNow}
            disabled={totalTopics === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 transition-all shadow-md shadow-amber-400/10 disabled:opacity-40 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-950 animate-pulse" />
            <span>Study Now</span>
          </button>

          {onScrollToBook && (
            <button
              id="btn-header-scroll-book"
              onClick={onScrollToBook}
              title="Interactive Book: Why Studies Matter"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white border border-white/[0.08] transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Studies Matter</span>
            </button>
          )}

          {onToggleViewMode && (
            <button
              id="btn-header-toggle-3d"
              onClick={onToggleViewMode}
              title={viewMode === '3d' ? 'Switch to List View' : 'Explore 3D Priority Constellation'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border shadow-xs ${
                viewMode === '3d'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-stone-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>{viewMode === '3d' ? '3D Active' : '3D View'}</span>
            </button>
          )}

          <button
            id="btn-header-add-topic"
            onClick={onOpenAddTopic}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-stone-300 hover:text-white transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Add Topic</span>
          </button>

          <button
            id="btn-header-weights"
            onClick={onOpenWeights}
            title="Adjust engine scoring weights"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-stone-300 hover:text-white transition-all shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden lg:inline">Weights</span>
          </button>

          <button
            id="btn-header-reset"
            onClick={onResetData}
            title="Reset to sample college syllabus"
            className="inline-flex items-center gap-1 p-2 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-stone-400 hover:text-white transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="sr-only">Reset Syllabus</span>
          </button>
        </div>
      </div>
    </header>
  );
};
