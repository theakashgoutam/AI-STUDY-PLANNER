import React from 'react';
import {
  Target,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Brain,
} from 'lucide-react';
import { MockTestResult, StudySessionRecord } from '../types';

interface QuickAssessmentBarProps {
  mockTestHistory: MockTestResult[];
  studySessions: StudySessionRecord[];
  onOpenMockTests: () => void;
  onOpenWeeklyReport: () => void;
}

export const QuickAssessmentBar: React.FC<QuickAssessmentBarProps> = ({
  mockTestHistory,
  studySessions,
  onOpenMockTests,
  onOpenWeeklyReport,
}) => {
  const totalTests = mockTestHistory.length;
  const latestTest = totalTests > 0 ? mockTestHistory[0] : null;
  const averageScore =
    totalTests > 0
      ? Math.round(
          mockTestHistory.reduce((acc, curr) => acc + curr.score, 0) / totalTests
        )
      : 0;

  // Study hours this week (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklySessions = studySessions.filter((s) => s.timestamp >= sevenDaysAgo);
  const totalWeeklyMinutes = weeklySessions.reduce(
    (acc, curr) => acc + curr.durationMinutes,
    0
  );
  const totalWeeklyHours = (totalWeeklyMinutes / 60).toFixed(1);

  // Active study days
  const activeDaysSet = new Set(
    weeklySessions.map((s) => new Date(s.timestamp).toDateString())
  );
  const activeDaysCount = activeDaysSet.size;

  const hasEnoughStudyData = weeklySessions.length >= 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Mock Test System Card */}
      <div
        id="card-quick-mock-tests"
        className="rounded-2xl border border-white/[0.08] bg-[#0d1017]/80 p-5 backdrop-blur-xl relative overflow-hidden transition-all hover:border-purple-500/30 group"
      >
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-purple-500/[0.08] rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/[0.14] transition-all" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  AI Mock Tests
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {totalTests > 0 ? `${totalTests} Taken` : 'Diagnostic'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Syllabus-aligned multi-difficulty exam simulator
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 relative z-10">
          {totalTests > 0 && latestTest ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block">Latest Score</span>
                  <span className="font-mono font-bold text-sm text-purple-300">
                    {latestTest.score}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Avg Accuracy</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {averageScore}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Weak Area</span>
                  <span className="font-semibold text-xs text-amber-300 truncate block">
                    {latestTest.weakTopics[0]?.topicName.split(' ')[0] || 'Optimized'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-stone-400 truncate">
                  Latest: <span className="text-stone-300">{latestTest.title}</span>
                </span>
                <button
                  id="btn-quick-take-mock-test"
                  onClick={onOpenMockTests}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Take Mock Test</span>
                  <ArrowRight className="w-3 h-3 text-purple-400" />
                </button>
              </div>
            </div>
          ) : (
            /* Inviting Empty State */
            <div className="space-y-3 py-1">
              <p className="text-xs text-stone-300 leading-relaxed">
                No mock tests taken yet. Take your first AI-generated diagnostic test to pinpoint your knowledge gaps and calibrate your priority engine!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  id="btn-quick-first-mock-test"
                  onClick={onOpenMockTests}
                  className="w-full py-2 px-3.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
                  <span>✨ Take Your First Mock Test</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Weekly Performance Card */}
      <div
        id="card-quick-weekly-report"
        className="rounded-2xl border border-white/[0.08] bg-[#0d1017]/80 p-5 backdrop-blur-xl relative overflow-hidden transition-all hover:border-amber-400/30 group"
      >
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/[0.07] rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/[0.12] transition-all" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Weekly AI Performance Report
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {hasEnoughStudyData ? 'Active' : 'Unlocking'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Retention analysis, study habits & AI coach advice
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 relative z-10">
          {hasEnoughStudyData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block">Weekly Study</span>
                  <span className="font-mono font-bold text-sm text-amber-300">
                    {totalWeeklyHours}h
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Study Days</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {activeDaysCount}/7 days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">Sessions</span>
                  <span className="font-semibold text-xs text-emerald-300 block">
                    {weeklySessions.length} logged
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-stone-400 truncate">
                  AI Coach: <span className="text-stone-300">Consistent pacing; focus on DBMS</span>
                </span>
                <button
                  id="btn-quick-open-report"
                  onClick={onOpenWeeklyReport}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                >
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  <span>View Full Report</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            </div>
          ) : (
            /* Encouraging message for gathering data */
            <div className="space-y-3 py-1">
              <p className="text-xs text-stone-300 leading-relaxed">
                Your weekly performance report is gathering study insights. Complete a few study sessions ({weeklySessions.length}/3 logged) to unlock personalized coaching and retention trends!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  id="btn-quick-preview-report"
                  onClick={onOpenWeeklyReport}
                  className="w-full py-2 px-3.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/[0.1] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Report Status & Sample Analytics</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
