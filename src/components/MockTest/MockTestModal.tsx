import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  RotateCw,
  Brain,
  Award,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  BookOpen,
  History,
  TrendingUp,
  Bookmark,
  AlertTriangle,
  Play,
} from 'lucide-react';
import {
  Subject,
  Topic,
  MockTestQuestion,
  MockTestSetupOptions,
  MockTestResult,
  QuestionType,
  QuestionDifficulty,
  ScoredTopic,
} from '../../types';

interface MockTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  topics: Topic[];
  scoredTopics: ScoredTopic[];
  initialTopic?: ScoredTopic | null;
  initialSubjectId?: string | null;
  mockTestHistory: MockTestResult[];
  onSaveTestResult: (result: MockTestResult) => void;
  onAddToStudyPlan: (steps: { title: string; action: string; topicName?: string }[]) => void;
  onAskStudyMateAi: (questionContext: {
    topicName: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    conceptTested: string;
    explanation: string;
  }) => void;
}

type ModalView = 'setup' | 'taking' | 'result' | 'history';

export const MockTestModal: React.FC<MockTestModalProps> = ({
  isOpen,
  onClose,
  subjects,
  topics,
  scoredTopics,
  initialTopic,
  initialSubjectId,
  mockTestHistory,
  onSaveTestResult,
  onAddToStudyPlan,
  onAskStudyMateAi,
}) => {
  const [view, setView] = useState<ModalView>('setup');

  // Setup Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialTopic
      ? initialTopic.subject.id
      : initialSubjectId || subjects[0]?.id || ''
  );
  const [coverage, setCoverage] = useState<'full' | 'selected' | 'weak'>('full');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialTopic ? [initialTopic.topic.id] : []
  );
  const [difficulty, setDifficulty] = useState<'Adaptive' | 'Easy' | 'Medium' | 'Hard'>('Adaptive');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([
    'mcq',
    'conceptual',
    'application',
    'numerical',
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customSyllabusText, setCustomSyllabusText] = useState<string>('');

  // Active Test State
  const [activeTest, setActiveTest] = useState<{
    id: string;
    title: string;
    subjectId: string;
    subjectName: string;
    difficulty: 'Adaptive' | 'Easy' | 'Medium' | 'Hard';
    durationMinutes: number;
    questions: MockTestQuestion[];
  } | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Completed Test Result State
  const [completedResult, setCompletedResult] = useState<MockTestResult | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | 'incorrect' | 'correct' | 'review'>('all');
  const [studyPlanAdded, setStudyPlanAdded] = useState<boolean>(false);

  // Sync initialTopic or initialSubjectId on open
  useEffect(() => {
    if (initialTopic) {
      setSelectedSubjectId(initialTopic.subject.id);
      setCoverage('selected');
      setSelectedTopicIds([initialTopic.topic.id]);
      setView('setup');
    } else if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
      setCoverage('full');
      setSelectedTopicIds([]);
      setView('setup');
    }
  }, [initialTopic, initialSubjectId]);

  // Duration auto-adjust when questionCount changes
  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
    if (count <= 5) setDurationMinutes(10);
    else if (count <= 10) setDurationMinutes(20);
    else if (count <= 15) setDurationMinutes(30);
    else setDurationMinutes(40);
  };

  // Timer countdown
  useEffect(() => {
    if (view !== 'taking' || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, secondsRemaining]);

  const subjectTopics = topics.filter((t) => t.subjectId === selectedSubjectId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Handle Question Type Toggle
  const toggleQuestionType = (type: QuestionType) => {
    setSelectedQuestionTypes((prev) =>
      prev.includes(type)
        ? prev.length > 1
          ? prev.filter((t) => t !== type)
          : prev
        : [...prev, type]
    );
  };

  // Start Generation
  const handleGenerateTest = async () => {
    if (!selectedSubject) return;
    setIsGenerating(true);

    try {
      const payload: MockTestSetupOptions = {
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        coverage,
        selectedTopicIds: coverage === 'selected' ? selectedTopicIds : [],
        difficulty,
        questionCount,
        durationMinutes,
        questionTypes: selectedQuestionTypes,
        syllabusInput: customSyllabusText,
      };

      const res = await fetch('/api/ai/mock-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          syllabusTopics: subjectTopics,
        }),
      });

      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const testId = `test-${Date.now()}`;
        setActiveTest({
          id: testId,
          title: data.title || `${selectedSubject.name} Mock Examination`,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          difficulty,
          durationMinutes,
          questions: data.questions,
        });

        setUserAnswers({});
        setReviewFlags({});
        setCurrentQuestionIndex(0);
        setSecondsRemaining(durationMinutes * 60);
        setTestStartTime(Date.now());
        setView('taking');
      } else {
        alert('Could not generate questions. Please retry.');
      }
    } catch (err) {
      console.error('Failed to generate mock test:', err);
      alert('Error generating test. Please check connection and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select Answer for Current Question
  const handleSelectAnswer = (optionId: 'A' | 'B' | 'C' | 'D') => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[currentQuestionIndex];
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  // Toggle Review Flag
  const toggleReviewCurrent = () => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[currentQuestionIndex];
    setReviewFlags((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Auto-submit on timer expiry
  const handleAutoSubmit = () => {
    executeSubmission();
  };

  // Manual submit trigger
  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    executeSubmission();
  };

  // Submit & Diagnostic Analysis Engine
  const executeSubmission = async () => {
    if (!activeTest) return;
    setIsAnalyzing(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - testStartTime) / 1000));
    const questions = activeTest.questions;

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const topicStats: Record<string, { total: number; correct: number; topicName: string }> = {};

    const questionResults = questions.map((q) => {
      const userAns = userAnswers[q.id];
      const isAns = userAns !== undefined;
      const isCorrect = isAns && userAns === q.correctAnswer;

      if (!isAns) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      const tName = q.topicName || 'General';
      if (!topicStats[tName]) {
        topicStats[tName] = { total: 0, correct: 0, topicName: tName };
      }
      topicStats[tName].total += 1;
      if (isCorrect) topicStats[tName].correct += 1;

      return {
        questionText: q.question,
        topicName: q.topicName,
        type: q.type,
        userAnswer: userAns || 'Unanswered',
        correctAnswer: q.correctAnswer,
        isCorrect,
        conceptTested: q.conceptTested,
      };
    });

    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const score = accuracy;

    // Weak topics (<70% accuracy)
    const weakTopics = Object.values(topicStats)
      .filter((s) => (s.correct / s.total) < 0.7)
      .map((s) => ({
        topicName: s.topicName,
        accuracy: Math.round((s.correct / s.total) * 100),
        totalQuestions: s.total,
        correctQuestions: s.correct,
      }));

    let grade: 'Strong' | 'Moderate' | 'Needs Revision' = 'Moderate';
    if (accuracy >= 80) grade = 'Strong';
    else if (accuracy < 60) grade = 'Needs Revision';

    try {
      const res = await fetch('/api/ai/mock-test/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeTest.subjectName,
          difficulty: activeTest.difficulty,
          score,
          accuracy,
          timeTakenSeconds: timeSpentSeconds,
          questionResults,
          weakTopics,
        }),
      });

      const analysisData = await res.json();

      const result: MockTestResult = {
        id: activeTest.id,
        title: activeTest.title,
        subjectId: activeTest.subjectId,
        subjectName: activeTest.subjectName,
        difficulty: activeTest.difficulty,
        durationMinutes: activeTest.durationMinutes,
        timeTakenSeconds: timeSpentSeconds,
        completedAt: Date.now(),
        score,
        accuracy,
        correctCount,
        incorrectCount,
        unansweredCount,
        performanceGrade: grade,
        questions: activeTest.questions,
        userAnswers,
        reviewFlags,
        aiAnalysis: {
          whatYouDidWell: analysisData.whatYouDidWell || [
            'Demonstrated steady pacing through question prompts.',
            'Understood fundamental definitions.',
          ],
          areasToImprove: analysisData.areasToImprove || [
            'Targeted revision on missed multi-step questions.',
          ],
          aiDiagnosis:
            analysisData.aiDiagnosis ||
            'Review foundational formulas and recalculate edge condition problems before retaking.',
        },
        weakTopics,
        followUpSteps: analysisData.followUpSteps || [
          {
            title: `Revise targeted topics`,
            durationMinutes: 30,
            action: 'Solve 5 active recall problems.',
          },
          {
            title: 'Review missed questions',
            durationMinutes: 15,
            action: 'Examine detailed answer explanations.',
          },
        ],
      };

      setCompletedResult(result);
      setStudyPlanAdded(false);
      onSaveTestResult(result);
      setView('result');
    } catch (err) {
      console.error('Error analyzing test:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="mock-test-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-[#090b10] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-sans">
                  AI-Generated Mock Test
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  Adaptive Engine
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {view === 'setup' && 'Configure syllabus scope, question types & adaptive difficulty'}
                {view === 'taking' && (activeTest ? activeTest.title : 'Examination in Progress')}
                {view === 'result' && 'Detailed Performance Diagnosis & Weak Topic Feedback'}
                {view === 'history' && 'Past Mock Test Attempts & Diagnostics'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view !== 'taking' && (
              <button
                type="button"
                onClick={() => setView(view === 'history' ? 'setup' : 'history')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-stone-400" />
                <span>{view === 'history' ? 'New Test' : `History (${mockTestHistory.length})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={view === 'taking' && !showSubmitConfirm}
              title="Close modal"
              className="p-1.5 text-stone-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: SETUP SCREEN */}
        {/* ========================================================================= */}
        {view === 'setup' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                1. Select Academic Subject
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {subjects.map((s) => {
                  const isSelected = s.id === selectedSubjectId;
                  const count = topics.filter((t) => t.subjectId === s.id).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(s.id);
                        setSelectedTopicIds([]);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/15 border-purple-500/50 shadow-sm shadow-purple-500/20'
                          : 'bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-purple-200' : 'text-stone-200'}`}>
                          {s.name}
                        </span>
                        {s.code && (
                          <span className="text-[10px] font-mono text-stone-500 px-1.5 py-0.5 rounded bg-black/40">
                            {s.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 mt-1 block">
                        {count} syllabus topics mapped
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Syllabus Coverage Scope */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                2. Syllabus Coverage
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'full',
                    title: 'Full Subject Syllabus',
                    desc: 'Spans all units, chapters & high-weightage topics',
                  },
                  {
                    id: 'selected',
                    title: 'Specific Topics',
                    desc: 'Target custom subtopics or exam chapters',
                  },
                  {
                    id: 'weak',
                    title: 'Weak Areas Only',
                    desc: 'Focuses on low-confidence & missed questions',
                  },
                ].map((cov) => (
                  <button
                    key={cov.id}
                    type="button"
                    onClick={() => setCoverage(cov.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      coverage === cov.id
                        ? 'bg-purple-500/15 border-purple-500/50 text-white'
                        : 'bg-white/[0.02] border-white/[0.07] text-stone-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{cov.title}</div>
                    <div className="text-[11px] text-stone-400 mt-1">{cov.desc}</div>
                  </button>
                ))}
              </div>

              {/* Multi-topic selector if 'selected' */}
              {coverage === 'selected' && (
                <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>Select topics to include ({selectedTopicIds.length} selected):</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTopicIds(
                          selectedTopicIds.length === subjectTopics.length
                            ? []
                            : subjectTopics.map((t) => t.id)
                        )
                      }
                      className="text-purple-400 hover:underline cursor-pointer text-[11px]"
                    >
                      {selectedTopicIds.length === subjectTopics.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {subjectTopics.map((t) => {
                      const isChecked = selectedTopicIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer text-xs text-stone-300"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedTopicIds((prev) =>
                                isChecked ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                              );
                            }}
                            className="rounded border-stone-700 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="flex-1 truncate">{t.name}</span>
                          <span className="text-[10px] text-stone-500">
                            {t.latestScore !== null ? `${t.latestScore}%` : `${t.completion}% done`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Difficulty Setting */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                3. Difficulty Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Adaptive', label: 'Adaptive', badge: 'Dynamic AI' },
                  { id: 'Easy', label: 'Easy', badge: 'Definitions' },
                  { id: 'Medium', label: 'Medium', badge: 'Standard Exam' },
                  { id: 'Hard', label: 'Hard', badge: 'Edge Cases' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      difficulty === d.id
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 font-bold'
                        : 'bg-white/[0.02] border-white/[0.07] text-stone-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs">{d.label}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{d.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Scale: Count & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 flex items-center justify-between">
                  <span>Questions</span>
                  <span className="text-purple-400 font-mono">{questionCount} Qs</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleQuestionCountChange(count)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        questionCount === count
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/[0.02] border-white/[0.07] text-stone-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 flex items-center justify-between">
                  <span>Duration</span>
                  <span className="text-purple-400 font-mono">{durationMinutes} Minutes</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        durationMinutes === mins
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/[0.02] border-white/[0.07] text-stone-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Question Types
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'mcq', label: 'Multiple Choice (MCQ)' },
                  { id: 'conceptual', label: 'Conceptual Clarity' },
                  { id: 'application', label: 'Application & Scenarios' },
                  { id: 'numerical', label: 'Numerical / Calculations' },
                ].map((type) => {
                  const isChecked = selectedQuestionTypes.includes(type.id as any);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleQuestionType(type.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                          : 'bg-white/[0.02] border-white/[0.08] text-stone-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Syllabus Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>Custom Syllabus / Topic Notes (Optional)</span>
                <span className="text-[11px] text-stone-500 font-normal">Add specific chapters or focus formulas</span>
              </label>
              <textarea
                value={customSyllabusText}
                onChange={(e) => setCustomSyllabusText(e.target.value)}
                placeholder="e.g. Unit 3: BCNF decompositions, Lossless join testing, and 2-Phase Locking protocols..."
                rows={2}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-purple-500 placeholder-stone-600 resize-none font-sans"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div className="text-xs text-stone-400">
                <span>Generates {questionCount} questions • {durationMinutes} min exam</span>
              </div>

              <button
                type="button"
                onClick={handleGenerateTest}
                disabled={isGenerating || !selectedSubject}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Synthesizing Questions...' : 'Generate Mock Test'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: DISTRACTION-FREE TEST TAKING */}
        {/* ========================================================================= */}
        {view === 'taking' && activeTest && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Exam Header */}
            <div className="px-5 py-3 bg-black/50 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-300">
                  Question {currentQuestionIndex + 1} of {activeTest.questions.length}
                </span>

                {/* Question progress bar */}
                <div className="w-24 sm:w-40 bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / activeTest.questions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Adaptive Difficulty Tag */}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-stone-300 border border-white/[0.1]">
                  {activeTest.questions[currentQuestionIndex]?.difficulty || 'Medium'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Countdown Timer */}
                <div
                  className={`flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    secondsRemaining < 120
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : secondsRemaining < 300
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/[0.04] text-stone-200 border-white/[0.08]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(secondsRemaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
                >
                  Finish Test
                </button>
              </div>
            </div>

            {/* Question Workspace */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {(() => {
                const q = activeTest.questions[currentQuestionIndex];
                const currentAnswer = userAnswers[q.id];
                const isFlagged = reviewFlags[q.id];

                return (
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Topic Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                        Topic: {q.topicName}
                      </span>

                      <button
                        type="button"
                        onClick={toggleReviewCurrent}
                        className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isFlagged
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/[0.02] text-stone-400 border-white/[0.06] hover:bg-white/[0.06]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{isFlagged ? 'Flagged for Review' : 'Mark for Review'}</span>
                      </button>
                    </div>

                    {/* Problem Statement */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                      <p className="text-sm sm:text-base font-normal text-stone-100 leading-relaxed font-sans">
                        {q.question}
                      </p>
                    </div>

                    {/* Option Choices */}
                    <div className="space-y-2.5">
                      {q.options.map((opt) => {
                        const isSelected = currentAnswer === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectAnswer(opt.id)}
                            className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-500/20 border-purple-500/60 shadow-md shadow-purple-500/20 text-white'
                                : 'bg-white/[0.02] border-white/[0.07] text-stone-300 hover:bg-white/[0.05]'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white/[0.06] text-stone-400'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span className="text-xs sm:text-sm leading-relaxed mt-0.5">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Question Navigator Drawer Bar */}
            <div className="px-5 py-3 border-t border-white/[0.07] bg-black/40 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                {activeTest.questions.map((q, idx) => {
                  const isAnswered = userAnswers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;
                  const isFlagged = reviewFlags[q.id];

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                        isCurrent
                          ? 'border-2 border-purple-400 text-white bg-purple-500/30'
                          : isAnswered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.04] text-stone-400 border border-white/[0.08] hover:bg-white/[0.08]'
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-stone-300 disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentQuestionIndex === activeTest.questions.length - 1}
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(activeTest.questions.length - 1, prev + 1)
                    )
                  }
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-purple-300 text-stone-950 transition-colors disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Anti-Accident Submit Confirmation Dialog */}
            {showSubmitConfirm && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in duration-150">
                <div className="bg-[#0f121a] border border-white/[0.1] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Submit Examination?</h3>
                      <p className="text-xs text-stone-400">
                        Check your answered questions before submitting.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs space-y-2 font-mono">
                    <div className="flex justify-between text-stone-300">
                      <span>Total Questions:</span>
                      <span className="font-bold">{activeTest.questions.length}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Answered:</span>
                      <span className="font-bold">{Object.keys(userAnswers).length}</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Unanswered:</span>
                      <span className="font-bold">
                        {activeTest.questions.length - Object.keys(userAnswers).length}
                      </span>
                    </div>
                    {Object.values(reviewFlags).filter(Boolean).length > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Marked for Review:</span>
                        <span className="font-bold">
                          {Object.values(reviewFlags).filter(Boolean).length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirm(false)}
                      className="px-4 py-2 text-xs font-medium rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-stone-300 cursor-pointer"
                    >
                      Return to Test
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSubmit}
                      disabled={isAnalyzing}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-lg shadow-purple-600/30"
                    >
                      {isAnalyzing ? 'Analyzing Score...' : 'Confirm & Submit'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: RESULT DASHBOARD & AI DIAGNOSTIC ANALYSIS */}
        {/* ========================================================================= */}
        {view === 'result' && completedResult && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Top Score & Performance Grade Header */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-black border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-purple-300">
                    {completedResult.subjectName}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full border ${
                      completedResult.performanceGrade === 'Strong'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : completedResult.performanceGrade === 'Moderate'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {completedResult.performanceGrade}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  Mock Examination Complete
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Completed in {Math.round(completedResult.timeTakenSeconds / 60)}m • Priority Engine recalibrated
                </p>
              </div>

              <div className="flex items-baseline gap-2 self-start sm:self-center bg-black/40 px-5 py-3 rounded-2xl border border-white/[0.08]">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {completedResult.score}%
                </span>
                <span className="text-xs text-stone-400 font-sans">
                  ({completedResult.correctCount}/{completedResult.questions.length})
                </span>
              </div>
            </div>

            {/* Metric Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                <span className="text-stone-500 block">Total Questions</span>
                <span className="text-base font-bold text-white font-mono mt-0.5 block">
                  {completedResult.questions.length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-xs">
                <span className="text-emerald-400 block">Correct Answers</span>
                <span className="text-base font-bold text-emerald-300 font-mono mt-0.5 block">
                  {completedResult.correctCount}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 text-xs">
                <span className="text-rose-400 block">Incorrect Answers</span>
                <span className="text-base font-bold text-rose-300 font-mono mt-0.5 block">
                  {completedResult.incorrectCount}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] text-xs">
                <span className="text-stone-500 block">Time Spent</span>
                <span className="text-base font-bold text-white font-mono mt-0.5 block">
                  {Math.round(completedResult.timeTakenSeconds / 60)} min
                </span>
              </div>
            </div>

            {/* AI Performance Analysis (What Went Well, Areas to Improve, AI Diagnosis) */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-purple-500/25 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>StudyMate AI Diagnostic Performance Analysis</span>
              </div>

              {/* AI Diagnosis Narrative */}
              <div className="p-4 rounded-xl bg-purple-500/[0.08] border border-purple-500/20 text-xs text-purple-100 leading-relaxed">
                <strong className="text-white block mb-1">AI Conceptual Diagnosis:</strong>
                {completedResult.aiAnalysis.aiDiagnosis}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* What You Did Well */}
                <div className="space-y-2 p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    What You Did Well
                  </span>
                  <ul className="space-y-1.5 text-stone-300">
                    {completedResult.aiAnalysis.whatYouDidWell.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas to Improve */}
                <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Areas to Improve
                  </span>
                  <ul className="space-y-1.5 text-stone-300">
                    {completedResult.aiAnalysis.areasToImprove.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Weak Topics Detected & Priority Engine Notification */}
              {completedResult.weakTopics.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-stone-300 mb-2 flex items-center justify-between">
                    <span>Weak Topics Identified (Accuracy &lt; 70%)</span>
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Priority Engine: Elevated to HIGH
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {completedResult.weakTopics.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-stone-200">{w.topicName}</span>
                        <span className="font-mono font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                          {w.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Study Plan / Recommended Next Steps */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-300">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Recommended Next Steps</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToStudyPlan(completedResult.followUpSteps);
                    setStudyPlanAdded(true);
                  }}
                  disabled={studyPlanAdded}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    studyPlanAdded
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white hover:bg-amber-300 text-stone-950 shadow-sm hover:shadow-amber-400/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{studyPlanAdded ? 'Added to Study Plan!' : 'Add to Study Plan'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {completedResult.followUpSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white">{step.title}</span>
                        <p className="text-stone-400 text-[11px] mt-0.5">{step.action}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 whitespace-nowrap bg-black/40 px-2 py-1 rounded">
                      {step.durationMinutes} min
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Question-by-Question Detailed Review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  Question-by-Question Review
                </h4>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-xs">
                  {[
                    { id: 'all', label: `All (${completedResult.questions.length})` },
                    { id: 'incorrect', label: `Incorrect (${completedResult.incorrectCount})` },
                    { id: 'correct', label: `Correct (${completedResult.correctCount})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setResultFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-medium ${
                        resultFilter === tab.id
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtered Questions List */}
              <div className="space-y-3">
                {completedResult.questions
                  .filter((q) => {
                    const userAns = completedResult.userAnswers[q.id];
                    const isCorrect = userAns === q.correctAnswer;
                    if (resultFilter === 'incorrect') return !isCorrect;
                    if (resultFilter === 'correct') return isCorrect;
                    return true;
                  })
                  .map((q, idx) => {
                    const userAns = completedResult.userAnswers[q.id];
                    const isCorrect = userAns === q.correctAnswer;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border space-y-3 text-xs ${
                          isCorrect
                            ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                            : 'bg-rose-500/[0.03] border-rose-500/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-stone-400">
                            Topic: <strong className="text-stone-200">{q.topicName}</strong>
                          </span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                          </span>
                        </div>

                        <p className="font-semibold text-stone-100 leading-relaxed font-sans">
                          {idx + 1}. {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300">
                          {q.options.map((opt) => {
                            const isUserChoice = userAns === opt.id;
                            const isRightAnswer = q.correctAnswer === opt.id;

                            let optStyle = 'bg-white/[0.02] border-white/[0.06] text-stone-400';
                            if (isRightAnswer) {
                              optStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold';
                            } else if (isUserChoice && !isCorrect) {
                              optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-300';
                            }

                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${optStyle}`}
                              >
                                <span className="font-mono font-bold">{opt.id}.</span>
                                <span>{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation & Concept Tested */}
                        <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] space-y-1.5 text-stone-300">
                          <div>
                            <strong className="text-emerald-400">Concept Tested: </strong>
                            <span>{q.conceptTested}</span>
                          </div>
                          <div>
                            <strong className="text-purple-300">Explanation: </strong>
                            <span>{q.explanation}</span>
                          </div>
                          {!isCorrect && q.whyIncorrectExplanation && (
                            <div className="text-amber-300/90 pt-1 border-t border-white/[0.04]">
                              <strong className="text-amber-400">Why your answer was incorrect: </strong>
                              <span>{q.whyIncorrectExplanation}</span>
                            </div>
                          )}
                        </div>

                        {/* "Ask StudyMate AI" Button */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onAskStudyMateAi({
                                topicName: q.topicName,
                                question: q.question,
                                userAnswer: userAns || 'Unanswered',
                                correctAnswer: q.correctAnswer,
                                conceptTested: q.conceptTested,
                                explanation: q.explanation,
                              });
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-amber-400/10 border border-amber-400/25 hover:border-amber-400/50 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5 text-amber-400" />
                            <span>Discuss with StudyMate AI</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView('setup')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
              >
                Configure Another Test
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-300 cursor-pointer"
              >
                Close & Return to Study Planner
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: PAST MOCK TESTS HISTORY */}
        {/* ========================================================================= */}
        {view === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {mockTestHistory.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Mock Tests Taken Yet</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Generate your first adaptive test to diagnose weak topics and automatically train the Priority Engine.
                </p>
                <button
                  type="button"
                  onClick={() => setView('setup')}
                  className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  Configure Your First Test
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {mockTestHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between gap-4 hover:border-purple-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{hist.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            hist.performanceGrade === 'Strong'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : hist.performanceGrade === 'Moderate'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {hist.score}%
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {new Date(hist.completedAt).toLocaleDateString()} • {hist.questions.length} questions •{' '}
                        {hist.weakTopics.length} weak topics detected
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCompletedResult(hist);
                        setView('result');
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 border border-purple-500/30 cursor-pointer whitespace-nowrap"
                    >
                      View Diagnosis
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
