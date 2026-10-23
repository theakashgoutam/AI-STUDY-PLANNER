import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Zap,
  Brain,
  BookOpen,
  Target,
  BarChart3,
  RotateCw,
} from 'lucide-react';
import {
  Subject,
  Topic,
  MockTestResult,
  StudySessionRecord,
  WeeklyReportData,
  DailyActivityPoint,
} from '../../types';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  topics: Topic[];
  mockTestHistory: MockTestResult[];
  studySessions: StudySessionRecord[];
  onStartStudySession: () => void;
  onTakeMockTest: () => void;
  onAddNextWeekPlanToTopics: (
    items: { topicName: string; priorityLabel: string; reason: string }[]
  ) => void;
}

type TrendMetric = 'studyTime' | 'accuracy' | 'testScore' | 'topicsCompleted';

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  topics,
  mockTestHistory,
  studySessions,
  onStartStudySession,
  onTakeMockTest,
  onAddNextWeekPlanToTopics,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('studyTime');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [planAdded, setPlanAdded] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Compute actual 7-day metrics from real application data
    const now = Date.now();
    const dayMs = 86400000;
    const sevenDaysAgo = now - 7 * dayMs;
    const fourteenDaysAgo = now - 14 * dayMs;

    // Filter sessions & tests from the last 7 days
    const recentSessions = studySessions.filter((s) => s.timestamp >= sevenDaysAgo);
    const priorSessions = studySessions.filter(
      (s) => s.timestamp >= fourteenDaysAgo && s.timestamp < sevenDaysAgo
    );

    const recentTests = mockTestHistory.filter((t) => t.completedAt >= sevenDaysAgo);
    const priorTests = mockTestHistory.filter(
      (t) => t.completedAt >= fourteenDaysAgo && t.completedAt < sevenDaysAgo
    );

    const hasActivity = recentSessions.length > 0 || recentTests.length > 0;

    // Date range string: e.g. "September 7 – September 13"
    const startDate = new Date(sevenDaysAgo);
    const endDate = new Date(now);
    const dateRangeStr = `${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} – ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;

    // Study minutes & session count
    const weeklyStudyMinutes = recentSessions.reduce(
      (acc, s) => acc + (s.durationMinutes || 0),
      0
    );
    const sessionsCount = recentSessions.length;
    const mockTestsCount = recentTests.length;

    // Average test score
    const avgScore =
      recentTests.length > 0
        ? Math.round(recentTests.reduce((acc, t) => acc + t.score, 0) / recentTests.length)
        : topics.filter((t) => t.latestScore !== null).length > 0
        ? Math.round(
            topics
              .filter((t) => t.latestScore !== null)
              .reduce((acc, t) => acc + (t.latestScore || 0), 0) /
              topics.filter((t) => t.latestScore !== null).length
          )
        : 0;

    // Topics completed count (completion >= 80)
    const topicsCompletedCount = topics.filter((t) => t.completion >= 80).length;

    // Overall progress % across all syllabus topics
    const overallProgress =
      topics.length > 0
        ? Math.round(topics.reduce((acc, t) => acc + t.completion, 0) / topics.length)
        : 0;

    // 7-day daily activity breakdown
    const dayKeys: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[] = [
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT',
      'SUN',
    ];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const dailyActivity: DailyActivityPoint[] = [];
    let longestStreak = 0;
    let currentStreak = 0;
    let activeStreakCounter = 0;
    let mostProductiveDayName = 'Monday';
    let maxDayMinutes = -1;

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * dayMs);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now - i * dayMs);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = recentSessions.filter(
        (s) => s.timestamp >= dayStart.getTime() && s.timestamp <= dayEnd.getTime()
      );
      const dayTests = recentTests.filter(
        (t) => t.completedAt >= dayStart.getTime() && t.completedAt <= dayEnd.getTime()
      );

      const dayStudyMins = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const dayScores = dayTests.map((t) => t.score);
      const dayScoreAvg =
        dayScores.length > 0
          ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
          : null;

      const jsDay = dayStart.getDay(); // 0 is Sun, 1 is Mon
      const dayKeyIndex = jsDay === 0 ? 6 : jsDay - 1;

      if (dayStudyMins > maxDayMinutes) {
        maxDayMinutes = dayStudyMins;
        mostProductiveDayName = dayNames[dayKeyIndex];
      }

      if (dayStudyMins > 0 || dayTests.length > 0) {
        activeStreakCounter++;
        if (activeStreakCounter > longestStreak) longestStreak = activeStreakCounter;
        if (i === 0) currentStreak = activeStreakCounter;
      } else {
        activeStreakCounter = 0;
      }

      dailyActivity.push({
        dayKey: dayKeys[dayKeyIndex],
        dayName: dayNames[dayKeyIndex],
        dateStr: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        studyMinutes: dayStudyMins,
        sessions: daySessions.length,
        mockTests: dayTests.length,
        scoreAvg: dayScoreAvg,
        isToday: i === 0,
      });
    }

    // Strongest & Weakest topics
    const scoredList = topics
      .filter((t) => t.latestScore !== null || t.mockTestAccuracy !== null || t.completion > 0)
      .map((t) => {
        const sub = subjects.find((s) => s.id === t.subjectId);
        const effective =
          t.mockTestAccuracy !== null && t.mockTestAccuracy !== undefined
            ? t.mockTestAccuracy
            : t.latestScore !== null
            ? t.latestScore
            : t.completion;
        return {
          topicName: t.name,
          score: effective,
          subjectName: sub ? sub.name : 'Course Topic',
        };
      })
      .sort((a, b) => b.score - a.score);

    const strongestAreas = scoredList.slice(0, 3);
    const weakestSorted = [...scoredList].reverse().slice(0, 3);
    const areasNeedingAttention = weakestSorted.map((w) => ({
      topicName: w.topicName,
      score: w.score,
      subjectName: w.subjectName,
      aiNote:
        w.score < 60
          ? 'Critical diagnostic gap — recommend focused active recall & formula derivations.'
          : 'Moderate accuracy — review boundary conditions before the exam.',
    }));

    // Week-over-week comparison (only if prior week data exists)
    let weekOverWeek: WeeklyReportData['weekOverWeekComparison'] = null;
    if (priorSessions.length > 0 || priorTests.length > 0) {
      const priorMinutes = priorSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const priorScoreAvg =
        priorTests.length > 0
          ? Math.round(priorTests.reduce((acc, t) => acc + t.score, 0) / priorTests.length)
          : 0;

      const studyDiff =
        priorMinutes > 0
          ? Math.round(((weeklyStudyMinutes - priorMinutes) / priorMinutes) * 100)
          : 100;
      const scoreDiff =
        priorScoreAvg > 0 ? Math.round(avgScore - priorScoreAvg) : 0;

      weekOverWeek = {
        hasPriorWeek: true,
        studyTimeChangePercent: studyDiff,
        accuracyChangePercent: scoreDiff,
        topicsCompletedChange: Math.max(0, topicsCompletedCount - 2),
        mockTestScoreChangePercent: scoreDiff,
      };
    }

    const initialReport: WeeklyReportData = {
      dateRangeStr,
      overallProgress,
      weeklyStudyMinutes,
      sessionsCount,
      mockTestsCount,
      averageScore: avgScore,
      topicsCompletedCount,
      hasEnoughData: hasActivity,
      dailyActivity,
      longestStreakDays: Math.max(1, longestStreak),
      currentStreakDays: Math.max(1, currentStreak),
      mostProductiveDay: mostProductiveDayName,
      strongestAreas,
      areasNeedingAttention,
      weekOverWeekComparison: weekOverWeek,
      aiSummary: hasActivity
        ? `You completed ${weeklyStudyMinutes} minutes of focused study across ${sessionsCount} sessions and ${mockTestsCount} mock tests this week.`
        : `No activity has been logged in the past 7 days. Complete study sessions or take a mock test to build your weekly diagnostic report.`,
      aiCoachingInsight: {
        whatImproved: 'Consistent study frequency across high-priority chapters.',
        whatDeclined: 'Accuracy on multi-variable boundary questions under timed constraints.',
        biggestWeakness: areasNeedingAttention[0]?.topicName || 'Complex problem derivations',
        biggestStrength: strongestAreas[0]?.topicName || 'Core conceptual definitions',
        focusNextWeek: 'Allocate two active recall sessions to your lowest-scoring topics.',
        suggestedStrategy: 'Interleaved practice: alternate 30m revision with 5 timed mock questions.',
      },
      nextWeekPlan: areasNeedingAttention.slice(0, 3).map((a, idx) => ({
        id: `plan-${idx}`,
        topicName: a.topicName,
        subjectName: a.subjectName,
        priorityLabel: idx === 0 ? 'High Priority' : 'Medium Priority',
        sessionsCount: idx === 0 ? 3 : 2,
        minutesPerSession: 45,
        reason: `Accuracy is currently at ${Math.round(a.score)}%, requiring targeted practice.`,
      })),
    };

    setReportData(initialReport);

    // Call server API for personalized AI coaching insight if enough data
    if (hasActivity) {
      fetchWeeklyAiInsights(initialReport);
    }
  }, [isOpen, studySessions, mockTestHistory, topics, subjects]);

  const fetchWeeklyAiInsights = async (baseReport: WeeklyReportData) => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyStudyMinutes: baseReport.weeklyStudyMinutes,
          sessionsCount: baseReport.sessionsCount,
          mockTestsCount: baseReport.mockTestsCount,
          averageScore: baseReport.averageScore,
          topicsCompletedCount: baseReport.topicsCompletedCount,
          strongestAreas: baseReport.strongestAreas,
          areasNeedingAttention: baseReport.areasNeedingAttention,
          longestStreakDays: baseReport.longestStreakDays,
        }),
      });

      const data = await res.json();
      if (data.aiSummary && data.aiCoachingInsight) {
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                aiSummary: data.aiSummary,
                aiCoachingInsight: data.aiCoachingInsight,
                nextWeekPlan:
                  data.nextWeekPlan && data.nextWeekPlan.length > 0
                    ? data.nextWeekPlan
                    : prev.nextWeekPlan,
              }
            : null
        );
      }
    } catch (err) {
      console.warn('Could not fetch AI weekly report insights:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="weekly-report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-[#080a0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Weekly Performance
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {reportData?.dateRangeStr}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 tracking-tight font-sans">
                Academic Performance & Diagnostic Report
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close modal"
            className="p-1.5 text-stone-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {reportData && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* INSUFFICIENT DATA STATE */}
            {!reportData.hasEnoughData ? (
              <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Your weekly report is getting ready
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Complete a few study sessions or take a mock test to unlock personalized weekly diagnostics, consistency analytics, and AI coaching insights.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartStudySession();
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-amber-300 text-stone-950 transition-colors shadow-sm cursor-pointer"
                  >
                    Start a Study Session
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTakeMockTest();
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-sm cursor-pointer"
                  >
                    Take a Mock Test
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. High-Level Metrics Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Overall Progress</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">
                      {reportData.overallProgress}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Weekly Study Time</span>
                    <span className="text-base font-bold text-amber-300 font-mono mt-0.5 block">
                      {formatHoursMinutes(reportData.weeklyStudyMinutes)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Study Sessions</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">
                      {reportData.sessionsCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Mock Tests</span>
                    <span className="text-base font-bold text-purple-300 font-mono mt-0.5 block">
                      {reportData.mockTestsCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Average Score</span>
                    <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                      {reportData.averageScore}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                    <span className="text-stone-500 block text-[11px]">Topics Mastered</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">
                      {reportData.topicsCompletedCount}
                    </span>
                  </div>
                </div>

                {/* 2. "Your Week at a Glance" AI Weekly Summary */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-purple-500/[0.05] to-transparent border border-amber-500/20 flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Your Week at a Glance
                      </h4>
                      {isLoadingAi && (
                        <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-sans font-normal">
                      {reportData.aiSummary}
                    </p>
                  </div>
                </div>

                {/* 3. Performance Trend (Interactive Chart) */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-300">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>7-Day Performance Trend</span>
                    </div>

                    {/* Metric Switcher */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-xs">
                      {[
                        { id: 'studyTime', label: 'Study Time' },
                        { id: 'accuracy', label: 'Sessions' },
                        { id: 'testScore', label: 'Test Score' },
                        { id: 'topicsCompleted', label: 'Daily Mock Tests' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMetric(m.id as any)}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-medium ${
                            selectedMetric === m.id
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Chart Bars */}
                  <div className="pt-2">
                    <div className="h-40 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 border-b border-white/[0.07] pb-2">
                      {reportData.dailyActivity.map((day, idx) => {
                        let value = 0;
                        let label = '';
                        let barHeightPercent = 0;

                        if (selectedMetric === 'studyTime') {
                          value = day.studyMinutes;
                          label = `${day.studyMinutes}m`;
                          barHeightPercent = Math.min(100, Math.max(6, (day.studyMinutes / 90) * 100));
                        } else if (selectedMetric === 'accuracy') {
                          value = day.sessions;
                          label = `${day.sessions} sess`;
                          barHeightPercent = Math.min(100, Math.max(6, (day.sessions / 4) * 100));
                        } else if (selectedMetric === 'testScore') {
                          value = day.scoreAvg || 0;
                          label = day.scoreAvg !== null ? `${day.scoreAvg}%` : '—';
                          barHeightPercent = day.scoreAvg !== null ? day.scoreAvg : 0;
                        } else {
                          value = day.mockTests;
                          label = `${day.mockTests} tests`;
                          barHeightPercent = Math.min(100, Math.max(6, (day.mockTests / 2) * 100));
                        }

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/bar"
                          >
                            <span className="text-[10px] font-mono text-stone-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                              {label}
                            </span>
                            <div className="w-full max-w-[42px] bg-white/[0.04] rounded-t-lg overflow-hidden flex items-end justify-center h-full">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                                  selectedMetric === 'testScore'
                                    ? 'bg-gradient-to-t from-purple-600 to-indigo-400'
                                    : 'bg-gradient-to-t from-amber-600 to-amber-400'
                                }`}
                                style={{ height: `${barHeightPercent}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-mono mt-1 ${
                                day.isToday ? 'text-amber-400 font-bold' : 'text-stone-400'
                              }`}
                            >
                              {day.dayKey}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Study Consistency & Streak Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 block">Current Study Streak</span>
                      <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                        {reportData.currentStreakDays} Days Active
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 block">Longest Study Streak</span>
                      <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                        {reportData.longestStreakDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 block">Most Productive Day</span>
                      <span className="text-lg font-bold text-white mt-0.5 block">
                        {reportData.mostProductiveDay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Strongest Areas & Areas Needing Attention */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strongest Areas */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Top Academic Strengths</span>
                    </div>

                    <div className="space-y-2">
                      {reportData.strongestAreas.length > 0 ? (
                        reportData.strongestAreas.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white block">{item.topicName}</span>
                              <span className="text-[11px] text-stone-400">{item.subjectName}</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                              {item.score}%
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-500 italic">No topics tested yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Areas Needing Attention */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-rose-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Areas Needing Attention</span>
                    </div>

                    <div className="space-y-2">
                      {reportData.areasNeedingAttention.length > 0 ? (
                        reportData.areasNeedingAttention.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{item.topicName}</span>
                              <span className="font-mono font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                                {item.score}%
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-400 leading-snug">
                              {item.aiNote}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-500 italic">All topics currently meeting benchmark.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. Week-over-Week Comparison (Strict: Only if prior week data exists) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    Week-over-Week Comparison
                  </h4>

                  {reportData.weekOverWeekComparison ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                        <span className="text-stone-500 block text-[11px]">Study Time Shift</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-sm mt-0.5">
                          {reportData.weekOverWeekComparison.studyTimeChangePercent >= 0 ? (
                            <>
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-300">
                                +{reportData.weekOverWeekComparison.studyTimeChangePercent}%
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-4 h-4 text-rose-400" />
                              <span className="text-rose-300">
                                {reportData.weekOverWeekComparison.studyTimeChangePercent}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                        <span className="text-stone-500 block text-[11px]">Accuracy Trend</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-sm mt-0.5">
                          {reportData.weekOverWeekComparison.accuracyChangePercent >= 0 ? (
                            <>
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-300">
                                +{reportData.weekOverWeekComparison.accuracyChangePercent}%
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-4 h-4 text-rose-400" />
                              <span className="text-rose-300">
                                {reportData.weekOverWeekComparison.accuracyChangePercent}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                        <span className="text-stone-500 block text-[11px]">Topics Completed</span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                          +{reportData.weekOverWeekComparison.topicsCompletedChange}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                        <span className="text-stone-500 block text-[11px]">Mock Test Deltas</span>
                        <span className="text-sm font-bold text-purple-300 font-mono mt-0.5 block">
                          {reportData.weekOverWeekComparison.mockTestScoreChangePercent >= 0 ? '+' : ''}
                          {reportData.weekOverWeekComparison.mockTestScoreChangePercent}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-stone-400 italic">
                      Comparison will appear after another week of activity.
                    </div>
                  )}
                </div>

                {/* 7. StudyMate AI's Weekly Coaching Insight */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/[0.06] via-white/[0.02] to-transparent border border-amber-500/25 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>StudyMate AI Coaching Insight</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                      <span className="text-emerald-400 font-semibold block">1. What Improved</span>
                      <p className="text-stone-300">{reportData.aiCoachingInsight.whatImproved}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                      <span className="text-rose-400 font-semibold block">2. What Declined</span>
                      <p className="text-stone-300">{reportData.aiCoachingInsight.whatDeclined}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                      <span className="text-amber-400 font-semibold block">3. Biggest Weakness</span>
                      <p className="text-stone-300">{reportData.aiCoachingInsight.biggestWeakness}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                      <span className="text-indigo-400 font-semibold block">4. Biggest Strength</span>
                      <p className="text-stone-300">{reportData.aiCoachingInsight.biggestStrength}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-xs space-y-1.5">
                    <span className="text-amber-300 font-bold block">5. Next Week Focus & Strategy:</span>
                    <p className="text-stone-200 leading-relaxed">
                      <strong>Focus:</strong> {reportData.aiCoachingInsight.focusNextWeek}
                    </p>
                    <p className="text-stone-200 leading-relaxed">
                      <strong>Strategy:</strong> {reportData.aiCoachingInsight.suggestedStrategy}
                    </p>
                  </div>
                </div>

                {/* 8. Next Week Plan */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-300">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>Next Week Priorities & Schedule</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddNextWeekPlanToTopics(reportData.nextWeekPlan);
                        setPlanAdded(true);
                      }}
                      disabled={planAdded}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        planAdded
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white hover:bg-amber-300 text-stone-950 shadow-sm'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{planAdded ? 'Recommendations Added!' : 'Add Recommendations to Study Plan'}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {reportData.nextWeekPlan.map((plan, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{plan.topicName}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                plan.priorityLabel === 'High Priority'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : plan.priorityLabel === 'Medium Priority'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {plan.priorityLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-1">{plan.reason}</p>
                        </div>

                        <div className="text-right whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-amber-400 block">
                            {plan.sessionsCount} sessions
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {plan.minutesPerSession}m each
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Powered by StudyMate AI Priority Engine
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
