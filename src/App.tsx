import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  Search,
  Plus,
  BookOpen,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  FolderKanban,
  LayoutGrid,
} from 'lucide-react';
import {
  Subject,
  Topic,
  PriorityWeights,
  ScoredTopic,
  ScoredSubject,
  MockTestResult,
  StudySessionRecord,
} from './types';
import {
  DEFAULT_WEIGHTS,
  rankTopics,
  fetchAiExplanation,
  groupAndScoreSubjects,
} from './utils/priorityEngine';
import { getSampleAcademicData, getSampleMockTests, getSampleStudySessions } from './data/sampleData';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { WelcomeBanner } from './components/WelcomeBanner';
import { QuickAssessmentBar } from './components/QuickAssessmentBar';
import { SubjectCard } from './components/SubjectCard';
import { SubjectDetailView } from './components/SubjectDetailView';
import { StudyNowRecommendation } from './components/StudyNowRecommendation';
import { TopicCard } from './components/TopicCard';
import { TopicCardSkeleton } from './components/TopicCardSkeleton';
import { ThreePriorityUniverse } from './components/ThreePriorityUniverse';
import { ScrollBookHero } from './components/ScrollBookHero';
import { CinematicStorytelling } from './components/CinematicStorytelling';
import { CosmicBackground } from './components/CosmicBackground';
import { StudyMateAiSection } from './components/StudyMateAiSection';
import { StudyNowModal } from './components/StudyNowModal';
import { ProgressUpdateModal } from './components/ProgressUpdateModal';
import { AddTopicModal } from './components/AddTopicModal';
import { WeightConfigModal } from './components/WeightConfigModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MockTestModal } from './components/MockTest/MockTestModal';
import { WeeklyReportModal } from './components/WeeklyReport/WeeklyReportModal';

const STORAGE_KEY_SUBJECTS = 'ai_study_planner_subjects_v1';
const STORAGE_KEY_TOPICS = 'ai_study_planner_topics_v1';
const STORAGE_KEY_WEIGHTS = 'ai_study_planner_weights_v1';
const STORAGE_KEY_MOCK_TESTS = 'ai_study_planner_mock_tests_v1';
const STORAGE_KEY_STUDY_SESSIONS = 'ai_study_planner_study_sessions_v1';

// Migration helper to ensure hierarchical integrity with nested subjects
function sanitizeAndMigrateData(rawSubjects: Subject[], rawTopics: Topic[]) {
  const sample = getSampleAcademicData();
  let subjects = Array.isArray(rawSubjects) ? [...rawSubjects] : [...sample.subjects];
  let topics = Array.isArray(rawTopics) ? [...rawTopics] : [...sample.topics];

  // 1. Ensure Python Programming subject exists if python topics exist or if missing
  const hasPythonSub = subjects.some(
    (s) => s.id === 'sub-python' || s.name.toLowerCase().includes('python')
  );
  if (!hasPythonSub) {
    const samplePython = sample.subjects.find((s) => s.id === 'sub-python');
    if (samplePython) subjects.push(samplePython);
  }

  const pythonSubject = subjects.find(
    (s) => s.id === 'sub-python' || s.name.toLowerCase().includes('python')
  );

  // 2. Link any loose python topics under Python Programming
  if (pythonSubject) {
    const hasPythonTopics = topics.some((t) => t.subjectId === pythonSubject.id);
    if (!hasPythonTopics) {
      const samplePythonTopics = sample.topics.filter((t) => t.subjectId === 'sub-python');
      topics = [...topics, ...samplePythonTopics];
    } else {
      topics = topics.map((t) => {
        if (t.name.toLowerCase().includes('python') || t.subjectId === pythonSubject.id) {
          const sampleMatch = sample.topics.find((st) => st.name === t.name);
          return {
            ...t,
            subjectId: pythonSubject.id,
            subtopics: t.subtopics || sampleMatch?.subtopics || undefined,
          };
        }
        return t;
      });
    }
  }

  // 3. Make sure all topics reference a valid subject ID
  const validSubjectIds = new Set(subjects.map((s) => s.id));
  topics = topics.map((t) => {
    if (!validSubjectIds.has(t.subjectId)) {
      return { ...t, subjectId: subjects[0]?.id || 'sub-1' };
    }
    return t;
  });

  return { subjects, topics };
}

export default function App() {
  // Persistence initialization with hierarchical migration
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const savedSubs = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      const savedTopics = localStorage.getItem(STORAGE_KEY_TOPICS);
      const parsedSubs = savedSubs ? JSON.parse(savedSubs) : getSampleAcademicData().subjects;
      const parsedTopics = savedTopics ? JSON.parse(savedTopics) : getSampleAcademicData().topics;
      return sanitizeAndMigrateData(parsedSubs, parsedTopics).subjects;
    } catch (e) {
      console.error('Failed reading subjects from localStorage', e);
    }
    return getSampleAcademicData().subjects;
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const savedSubs = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      const savedTopics = localStorage.getItem(STORAGE_KEY_TOPICS);
      const parsedSubs = savedSubs ? JSON.parse(savedSubs) : getSampleAcademicData().subjects;
      const parsedTopics = savedTopics ? JSON.parse(savedTopics) : getSampleAcademicData().topics;
      return sanitizeAndMigrateData(parsedSubs, parsedTopics).topics;
    } catch (e) {
      console.error('Failed reading topics from localStorage', e);
    }
    return getSampleAcademicData().topics;
  });

  const [weights, setWeights] = useState<PriorityWeights>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WEIGHTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading weights from localStorage', e);
    }
    return DEFAULT_WEIGHTS;
  });

  const [mockTestHistory, setMockTestHistory] = useState<MockTestResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MOCK_TESTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading mock tests from localStorage', e);
    }
    return getSampleMockTests();
  });

  const [studySessions, setStudySessions] = useState<StudySessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDY_SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading study sessions from localStorage', e);
    }
    return getSampleStudySessions();
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(weights));
  }, [weights]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MOCK_TESTS, JSON.stringify(mockTestHistory));
  }, [mockTestHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STUDY_SESSIONS, JSON.stringify(studySessions));
  }, [studySessions]);

  // System status
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHasApiKey(Boolean(data.hasApiKey)))
      .catch(() => setHasApiKey(false));
  }, []);

  // UI state
  const [viewMode, setViewMode] = useState<'subjects' | 'list' | '3d'>('subjects');
  const [activeDetailSubjectId, setActiveDetailSubjectId] = useState<string | null>(null);
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<
    'all' | 'high' | 'in_progress' | 'not_started' | 'completed'
  >('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [defaultSubjectIdForModal, setDefaultSubjectIdForModal] = useState<string | undefined>(undefined);

  // Modals
  const [isStudyNowOpen, setIsStudyNowOpen] = useState(false);
  const [studyNowTopic, setStudyNowTopic] = useState<ScoredTopic | null>(null);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressTopic, setProgressTopic] = useState<ScoredTopic | null>(null);

  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<{ topic: Topic; subject: Subject } | null>(null);

  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);

  // Mock Test Modal state
  const [isMockTestModalOpen, setIsMockTestModalOpen] = useState(false);
  const [mockTestTargetTopic, setMockTestTargetTopic] = useState<ScoredTopic | null>(null);
  const [mockTestTargetSubjectId, setMockTestTargetSubjectId] = useState<string | null>(null);

  // Weekly Report Modal state
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);

  // Pending discussion prompt for StudyMate AI
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [topicToDelete, setTopicToDelete] = useState<{ topic: Topic; subject?: Subject | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active AI Assistant Context
  const [activeAiContextTopic, setActiveAiContextTopic] = useState<ScoredTopic | null>(null);

  // Dynamic ranking calculation
  const allScoredTopics = useMemo(() => {
    return rankTopics(topics, subjects, weights);
  }, [topics, subjects, weights]);

  // Hierarchical Subject Grouping and dynamic aggregation
  const scoredSubjects = useMemo(() => {
    return groupAndScoreSubjects(subjects, allScoredTopics);
  }, [subjects, allScoredTopics]);

  // Currently focused subject in detail view
  const activeDetailSubject = useMemo(() => {
    if (!activeDetailSubjectId) return null;
    return scoredSubjects.find((s) => s.subject.id === activeDetailSubjectId) || null;
  }, [activeDetailSubjectId, scoredSubjects]);

  // Primary recommendation: Rank #1
  const topTopic = allScoredTopics[0] || null;

  // Filtered subjects for dashboard grid
  const filteredScoredSubjects = useMemo(() => {
    let list = scoredSubjects;

    // Filter by subject search query (matches subject name, code, or any child topic / subtopic)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        if (s.subject.name.toLowerCase().includes(q)) return true;
        if (s.subject.code && s.subject.code.toLowerCase().includes(q)) return true;
        return s.topics.some(
          (t) =>
            t.topic.name.toLowerCase().includes(q) ||
            (t.topic.notes && t.topic.notes.toLowerCase().includes(q)) ||
            t.topic.subtopics?.some((sub) => sub.toLowerCase().includes(q))
        );
      });
    }

    // Filter by status tab
    if (subjectStatusFilter === 'high') {
      list = list.filter((s) => s.priorityLevel === 'High');
    } else if (subjectStatusFilter === 'in_progress') {
      list = list.filter((s) => s.overallProgress > 0 && s.overallProgress < 100);
    } else if (subjectStatusFilter === 'not_started') {
      list = list.filter((s) => s.overallProgress === 0);
    } else if (subjectStatusFilter === 'completed') {
      list = list.filter((s) => s.overallProgress >= 100);
    }

    return list;
  }, [scoredSubjects, searchQuery, subjectStatusFilter]);

  // Metric counts for subject status tabs
  const subjectStatusCounts = useMemo(() => {
    return {
      all: scoredSubjects.length,
      high: scoredSubjects.filter((s) => s.priorityLevel === 'High').length,
      in_progress: scoredSubjects.filter((s) => s.overallProgress > 0 && s.overallProgress < 100).length,
      not_started: scoredSubjects.filter((s) => s.overallProgress === 0).length,
      completed: scoredSubjects.filter((s) => s.overallProgress >= 100).length,
    };
  }, [scoredSubjects]);

  // Filtered topics for flat list display
  const filteredScoredTopics = useMemo(() => {
    let list = allScoredTopics;
    if (selectedSubjectId) {
      list = list.filter((t) => t.subject.id === selectedSubjectId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.topic.name.toLowerCase().includes(q) ||
          t.subject.name.toLowerCase().includes(q) ||
          (t.topic.notes && t.topic.notes.toLowerCase().includes(q)) ||
          t.topic.subtopics?.some((sub) => sub.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allScoredTopics, selectedSubjectId, searchQuery]);

  // Handlers
  const handleOpenStudyNow = (topic?: ScoredTopic) => {
    const target = topic || topTopic;
    if (!target) return;
    setStudyNowTopic(target);
    setIsStudyNowOpen(true);
  };

  const handleOpenProgressUpdate = (topic: ScoredTopic) => {
    setProgressTopic(topic);
    setIsProgressModalOpen(true);
  };

  const handleFinishSession = (topic: ScoredTopic) => {
    // Record study session
    const newSession: StudySessionRecord = {
      id: `sess-${Date.now()}`,
      topicId: topic.topic.id,
      topicName: topic.topic.name,
      subjectName: topic.subject.name,
      timestamp: Date.now(),
      durationMinutes: 45,
      completionBefore: topic.topic.completion,
      completionAfter: Math.min(100, topic.topic.completion + 15),
      confidenceBefore: topic.topic.confidence,
      confidenceAfter: Math.min(5, topic.topic.confidence + 1),
      notes: `Dedicated focus study session for ${topic.topic.name}.`,
    };
    setStudySessions((prev) => [newSession, ...prev]);

    setProgressTopic(topic);
    setIsProgressModalOpen(true);
  };

  const handleOpenMockTests = (targetTopic?: ScoredTopic, targetSubjectId?: string) => {
    setMockTestTargetTopic(targetTopic || null);
    setMockTestTargetSubjectId(targetSubjectId || null);
    setIsMockTestModalOpen(true);
  };

  const handleOpenWeeklyReport = () => {
    setIsWeeklyReportModalOpen(true);
  };

  const handleSaveMockTestResult = (result: MockTestResult) => {
    // Add to history
    setMockTestHistory((prev) => [result, ...prev]);

    // Recalculate and update associated topic
    setTopics((prev) =>
      prev.map((t) => {
        const matchingQuestions = result.questions.filter(
          (q) =>
            q.topicName.toLowerCase().includes(t.name.toLowerCase()) ||
            t.name.toLowerCase().includes(q.topicName.toLowerCase()) ||
            (result.subjectName && t.name.toLowerCase().includes(result.subjectName.toLowerCase()))
        );

        if (matchingQuestions.length > 0) {
          const correctCount = matchingQuestions.filter(
            (q) => result.userAnswers[q.id] === q.correctAnswer
          ).length;
          const topicAcc = Math.round((correctCount / matchingQuestions.length) * 100);

          return {
            ...t,
            mockTestAccuracy: topicAcc,
            attemptsCount: (t.attemptsCount || 0) + 1,
            lastTestedTimestamp: result.completedAt,
            lastTestedDaysAgo: 0,
            latestScore: result.score,
            needsRevision: topicAcc < 65 ? true : t.needsRevision,
            mockTestRecommendation:
              result.aiAnalysis.areasToImprove[0] ||
              (topicAcc < 65 ? 'Revise core concepts and formulas.' : 'Performant. Move to mixed problems.'),
          };
        } else if (mockTestTargetTopic && mockTestTargetTopic.topic.id === t.id) {
          // If the test was specifically for this topic
          return {
            ...t,
            mockTestAccuracy: result.score,
            attemptsCount: (t.attemptsCount || 0) + 1,
            lastTestedTimestamp: result.completedAt,
            lastTestedDaysAgo: 0,
            latestScore: result.score,
            needsRevision: result.score < 65 ? true : t.needsRevision,
            mockTestRecommendation:
              result.aiAnalysis.areasToImprove[0] ||
              (result.score < 65 ? 'Revise core concepts.' : 'Solid score. Proceed to next topic.'),
          };
        }
        return t;
      })
    );

    setFeedbackNotice(
      `Mock test "${result.title}" recorded with score ${result.score}%. Topic priority rankings automatically updated!`
    );
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handleAddToStudyPlan = (
    steps: { title: string; durationMinutes: number; action: string; topicName?: string }[]
  ) => {
    // Add notes or actions to matched topics
    setTopics((prev) =>
      prev.map((t) => {
        const matchedStep = steps.find(
          (s) =>
            s.topicName &&
            (t.name.toLowerCase().includes(s.topicName.toLowerCase()) ||
              s.topicName.toLowerCase().includes(t.name.toLowerCase()))
        );
        if (matchedStep) {
          const appendedNote = t.notes
            ? `${t.notes} • Recommended: ${matchedStep.action} (${matchedStep.durationMinutes}m)`
            : `Recommended: ${matchedStep.action} (${matchedStep.durationMinutes}m)`;
          return {
            ...t,
            notes: appendedNote,
            needsRevision: true,
          };
        }
        return t;
      })
    );

    setFeedbackNotice(
      `Added ${steps.length} recommended action items to your active study priorities!`
    );
    setTimeout(() => setFeedbackNotice(null), 4500);
  };

  const handleDiscussQuestionWithAi = (context: {
    question: string;
    options: string[];
    userAnswer?: string;
    correctAnswer: string;
    explanation: string;
    topicName: string;
    conceptTested: string;
  }) => {
    const formattedPrompt = `Can you explain this mock test question to me in detail?\n\nTopic: ${context.topicName}\nConcept Tested: ${context.conceptTested}\nQuestion: ${context.question}\nOptions:\n${context.options.map((opt, i) => `  ${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}\n${context.userAnswer ? `My answer was: ${context.userAnswer} (Incorrect)` : 'I missed this question.'}\nCorrect Answer: ${context.correctAnswer}\nAI Explanation: ${context.explanation}\n\nPlease break down the intuition, the formula or principle behind it, and how I can recognize this in future exam questions.`;

    setPendingAiPrompt(formattedPrompt);
    handleScrollToAiPlanner();
  };

  const handleSaveProgress = (
    topicId: string,
    updates: {
      completion: number;
      confidence: number;
      latestScore: number | null;
      lastStudiedDaysAgo: number;
      needsRevision: boolean;
    }
  ) => {
    const prevTopic = topics.find((t) => t.id === topicId);
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, ...updates } : t))
    );

    if (prevTopic) {
      setFeedbackNotice(
        `Dynamic update applied for "${prevTopic.name}". Priorities and ranking automatically recalculated!`
      );
      setTimeout(() => setFeedbackNotice(null), 5000);
    }
  };

  const handleSaveTopic = (
    topicData: Omit<Topic, 'id'> & { id?: string },
    subjectData?: { name: string; examDate: string; code?: string }
  ) => {
    let targetSubjectId = topicData.subjectId;

    if (subjectData) {
      const newSubject: Subject = {
        id: `sub-${Date.now()}`,
        name: subjectData.name,
        code: subjectData.code,
        examDate: subjectData.examDate,
        color: 'stone',
      };
      setSubjects((prev) => [...prev, newSubject]);
      targetSubjectId = newSubject.id;
    }

    if (topicData.id) {
      // Edit
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicData.id
            ? { ...t, ...topicData, subjectId: targetSubjectId }
            : t
        )
      );
      setFeedbackNotice(`Topic "${topicData.name}" updated and re-ranked.`);
    } else {
      // Add
      const newTopic: Topic = {
        ...topicData,
        id: `topic-${Date.now()}`,
        subjectId: targetSubjectId,
      };
      setTopics((prev) => [...prev, newTopic]);
      setFeedbackNotice(`New topic "${topicData.name}" added to study priority engine.`);
    }
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleRequestDeleteTopic = (topicId: string) => {
    const target = topics.find((t) => t.id === topicId);
    if (!target) return;
    const sub = subjects.find((s) => s.id === target.subjectId) || null;
    setTopicToDelete({ topic: target, subject: sub });
  };

  const handleConfirmDeleteTopic = () => {
    if (!topicToDelete || isDeleting) return;
    const targetId = topicToDelete.topic.id;
    const targetName = topicToDelete.topic.name;
    setIsDeleting(true);

    // 1. Permanently update topics in state
    setTopics((prev) => {
      const updated = prev.filter((t) => t.id !== targetId);
      // 2. Synchronize to persistence layer
      try {
        localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed updating topics in localStorage', err);
      }
      return updated;
    });

    // 3. Clear any active modals currently targeting this topic
    if (studyNowTopic?.topic.id === targetId) {
      setIsStudyNowOpen(false);
      setStudyNowTopic(null);
    }
    if (progressTopic?.topic.id === targetId) {
      setIsProgressModalOpen(false);
      setProgressTopic(null);
    }
    if (editingTopic?.topic.id === targetId) {
      setIsAddTopicOpen(false);
      setEditingTopic(null);
    }

    // 4. Subtle feedback notice
    setFeedbackNotice(`Topic "${targetName}" permanently removed from study plan.`);
    setTimeout(() => setFeedbackNotice(null), 3500);

    // 5. Close confirmation dialog
    setTopicToDelete(null);
    setIsDeleting(false);
  };

  const handleEditTopic = (scored: ScoredTopic) => {
    setEditingTopic({ topic: scored.topic, subject: scored.subject });
    setIsAddTopicOpen(true);
  };

  const handleResetData = () => {
    const demo = getSampleAcademicData();
    const sampleTests = getSampleMockTests();
    const sampleSessions = getSampleStudySessions();
    setSubjects(demo.subjects);
    setTopics(demo.topics);
    setWeights(DEFAULT_WEIGHTS);
    setMockTestHistory(sampleTests);
    setStudySessions(sampleSessions);
    setSelectedSubjectId(null);
    setSearchQuery('');
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(demo.subjects));
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(demo.topics));
      localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(DEFAULT_WEIGHTS));
      localStorage.setItem(STORAGE_KEY_MOCK_TESTS, JSON.stringify(sampleTests));
      localStorage.setItem(STORAGE_KEY_STUDY_SESSIONS, JSON.stringify(sampleSessions));
    } catch (err) {
      console.error('Failed saving reset demo data to localStorage', err);
    }
    setFeedbackNotice('Reset to initial sample college syllabus with demo priority ranking and mock tests.');
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleRefreshAi = async (scored: ScoredTopic) => {
    const aiResult = await fetchAiExplanation(scored);
    if (aiResult) {
      setFeedbackNotice(`AI analysis refreshed for ${scored.topic.name}.`);
      setTimeout(() => setFeedbackNotice(null), 3000);
    }
  };

  const handleScrollToPlanner = () => {
    const plannerEl = document.getElementById('study-planner-workspace');
    if (plannerEl) {
      const headerOffset = 64;
      const elementPosition = plannerEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollToAiPlanner = () => {
    const aiEl = document.getElementById('ai-study-assistant-section');
    if (aiEl) {
      const headerOffset = 64;
      const elementPosition = aiEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleAskAiAboutTopic = (scored: ScoredTopic) => {
    setActiveAiContextTopic(scored);
    handleScrollToAiPlanner();
  };

  const handleClearAiContextTopic = () => {
    setActiveAiContextTopic(null);
  };

  const handleApplyGeneratedPlan = (plan: { subject: Subject; topics: Topic[] }) => {
    // 1. Add subject if not existing
    setSubjects((prev) => {
      const exists = prev.some(
        (s) => s.id === plan.subject.id || s.name.toLowerCase() === plan.subject.name.toLowerCase()
      );
      if (exists) return prev;
      return [...prev, plan.subject];
    });

    // 2. Prepend topics to state
    setTopics((prev) => [...plan.topics, ...prev]);

    // 3. Clear filter so newly generated topics are immediately visible
    setSelectedSubjectId(null);
    setSearchQuery('');

    // 4. Feedback toast notice
    setFeedbackNotice(
      `✨ Created ${plan.topics.length} study topics for "${plan.subject.name}" using Gemini AI! Ready in your Priority Workspace.`
    );
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handleScrollToBook = () => {
    const bookEl = document.getElementById('scroll-book-hero-section');
    if (bookEl) {
      const headerOffset = 64;
      const elementPosition = bookEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen bg-[#06070a] text-stone-200 flex flex-col font-sans selection:bg-amber-400/20 selection:text-amber-200 relative overflow-x-clip"
      style={{ overflowX: 'clip' }}
    >
      {/* Persistent Cosmic Background & Shooting Stars (Comets) Layer */}
      <CosmicBackground />

      {/* Subtle ambient lighting backdrop */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Header */}
      <Header
        onOpenAddTopic={() => {
          setEditingTopic(null);
          setDefaultSubjectIdForModal(undefined);
          setIsAddTopicOpen(true);
        }}
        onOpenWeights={() => setIsWeightsModalOpen(true)}
        onResetData={handleResetData}
        onStudyNow={() => handleOpenStudyNow()}
        totalTopics={topics.length}
        hasApiKey={hasApiKey}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((v) => (v === 'subjects' ? '3d' : 'subjects'))}
        onScrollToBook={handleScrollToBook}
        onOpenAiPlanner={handleScrollToAiPlanner}
        onScrollToPlanner={handleScrollToPlanner}
        onOpenMockTests={() => handleOpenMockTests()}
        onOpenWeeklyReport={handleOpenWeeklyReport}
        onScrollToAiPlanner={handleScrollToAiPlanner}
        mockTestCount={mockTestHistory.length}
      />

      {/* Scroll-Driven 3D Interactive Book Hero */}
      <ScrollBookHero onScrollToPlanner={handleScrollToPlanner} />

      {/* Cinematic Storytelling & 3D Celestial Transition */}
      <CinematicStorytelling onScrollToPlanner={handleScrollToPlanner} />

      {/* AI Study Assistant (StudyMate AI) Section */}
      <StudyMateAiSection
        onApplyGeneratedPlan={handleApplyGeneratedPlan}
        activeContextTopic={activeAiContextTopic}
        onClearContextTopic={handleClearAiContextTopic}
        allScoredTopics={allScoredTopics}
        onScrollToPlanner={handleScrollToPlanner}
        pendingPrompt={pendingAiPrompt}
        onClearPendingPrompt={() => setPendingAiPrompt(null)}
      />

      {/* Main Study Planner Workspace */}
      <main id="study-planner-workspace" className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Adaptive Feedback Toast Banner */}
        {feedbackNotice && (
          <div className="p-4 rounded-xl bg-[#0f131f] text-white flex items-center justify-between gap-3 shadow-2xl border border-white/[0.1] animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-medium text-stone-200">{feedbackNotice}</span>
            </div>
            <button
              onClick={() => setFeedbackNotice(null)}
              className="text-stone-400 hover:text-white text-xs cursor-pointer px-2 py-0.5 rounded hover:bg-white/[0.05] transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Welcome & Dashboard Banner (Screen 1 & 3 summary) */}
        <WelcomeBanner
          topTopic={topTopic}
          scoredTopics={allScoredTopics}
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          onStudyNow={() => handleOpenStudyNow()}
          onOpenAddTopic={() => {
            setEditingTopic(null);
            setIsAddTopicOpen(true);
          }}
        />

        {/* Quick Assessment & Weekly Performance Bar (PART 5 entry point) */}
        <QuickAssessmentBar
          mockTestHistory={mockTestHistory}
          studySessions={studySessions}
          onOpenMockTests={() => handleOpenMockTests()}
          onOpenWeeklyReport={handleOpenWeeklyReport}
        />

        {/* Priority Dashboard Header, View Mode Switcher & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {activeDetailSubject ? activeDetailSubject.subject.name : 'What Should I Study First?'}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                {activeDetailSubject
                  ? 'Subject Deep Dive'
                  : viewMode === 'subjects'
                  ? 'Subject Overview'
                  : viewMode === '3d'
                  ? '3D Universe'
                  : 'Live Ranked Heuristic'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {activeDetailSubject
                ? `Detailed syllabus breakdown, units, and subtopics for ${activeDetailSubject.subject.name}.`
                : viewMode === 'subjects'
                ? 'Structured by subject: One card per course with syllabus progress, weak points, and study actions.'
                : viewMode === '3d'
                ? 'Interactive 3D orbital space mapping priority nodes. Orbit, zoom, and inspect topics.'
                : 'Ordered deterministically by formula: Urgency + Weakness + Importance + Incompleteness.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-[#0d1017] p-1 rounded-xl border border-white/[0.08] text-xs">
              <button
                id="btn-view-subjects"
                onClick={() => {
                  setActiveDetailSubjectId(null);
                  setViewMode('subjects');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'subjects' && !activeDetailSubject
                    ? 'bg-amber-400 text-stone-950 font-semibold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Subjects</span>
              </button>

              <button
                id="btn-view-list"
                onClick={() => {
                  setActiveDetailSubjectId(null);
                  setViewMode('list');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white/[0.1] text-white font-semibold shadow-xs border border-white/[0.1]'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Priority List</span>
              </button>

              <button
                id="btn-view-3d"
                onClick={() => {
                  setActiveDetailSubjectId(null);
                  setViewMode('3d');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === '3d'
                    ? 'bg-amber-400/20 text-amber-300 font-semibold shadow-xs border border-amber-400/30'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>3D View</span>
              </button>
            </div>

            {/* Universal Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={viewMode === 'subjects' ? 'Search subjects, topics...' : 'Search topics...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.09] bg-[#0d1017] text-xs font-medium text-white placeholder:text-stone-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400/60 w-44 sm:w-56"
              />
            </div>

            <button
              id="btn-toolbar-ai-plan"
              onClick={handleScrollToAiPlanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400/20 via-sky-400/15 to-amber-400/20 hover:from-amber-400/30 hover:to-sky-400/25 text-amber-300 hover:text-white border border-amber-400/40 text-xs font-semibold transition-all shadow-md shadow-amber-400/10 cursor-pointer flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>✨ Create with AI</span>
            </button>

            <button
              onClick={() => {
                setEditingTopic(null);
                setDefaultSubjectIdForModal(undefined);
                setIsAddTopicOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold transition-all shadow-md shadow-amber-400/10 cursor-pointer flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
          </div>
        </div>

        {/* View Switch: Active Subject Detail View OR 3D Universe OR Priority List OR Default Subject Grid */}
        {activeDetailSubject ? (
          <div key="view-subject-detail" id="subject-detail-section">
            <SubjectDetailView
              scoredSubject={activeDetailSubject}
              onBack={() => {
                setActiveDetailSubjectId(null);
                handleScrollToPlanner();
              }}
              onStartStudy={(topic) => handleOpenStudyNow(topic)}
              onTakeMockTest={(subject, topic) => {
                handleOpenMockTests(topic || undefined, subject.id);
              }}
              onAskAi={(subject, topic) => {
                if (topic) {
                  handleAskAiAboutTopic(topic);
                } else {
                  setPendingAiPrompt(
                    `I'm studying ${subject.name}. What is the most effective mental framework, high-yield formula breakdown, and exam review plan for my test on ${subject.examDate}?`
                  );
                  handleScrollToAiPlanner();
                }
              }}
              onAddTopic={(subjectId) => {
                setDefaultSubjectIdForModal(subjectId);
                setEditingTopic(null);
                setIsAddTopicOpen(true);
              }}
              onEditTopic={(topic, subject) => {
                setEditingTopic({ topic, subject });
                setIsAddTopicOpen(true);
              }}
              onDeleteTopic={(topic) => handleRequestDeleteTopic(topic.id)}
              onUpdateTopicProgress={(topic) => handleOpenProgressUpdate(topic)}
            />
          </div>
        ) : viewMode === '3d' ? (
          <div key="view-3d">
            <ThreePriorityUniverse
              scoredTopics={allScoredTopics}
              subjects={subjects}
              onStudyNow={handleOpenStudyNow}
              onUpdateProgress={handleOpenProgressUpdate}
            />
          </div>
        ) : viewMode === 'list' ? (
          /* Priority List View (Linear Flat Ranked View) */
          filteredScoredTopics.length > 0 ? (
            <div key="view-list" className="space-y-4">
              {filteredScoredTopics.map((scored, index) => (
                <TopicCard
                  key={scored.topic.id}
                  scored={scored}
                  rank={index + 1}
                  onStudyNow={handleOpenStudyNow}
                  onUpdateProgress={handleOpenProgressUpdate}
                  onEdit={handleEditTopic}
                  onDelete={handleRequestDeleteTopic}
                  onRefreshAi={handleRefreshAi}
                  onAskAi={handleAskAiAboutTopic}
                  onTestTopic={(t) => handleOpenMockTests(t)}
                />
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div
              id="empty-topics-state"
              className="p-12 sm:p-16 text-center rounded-2xl bg-[#0b0d13] border border-white/[0.08] shadow-2xl space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  No study topics yet
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
                  You have cleared all topics from your study plan. Add a new topic to calculate your personalized study priorities, or reload the sample college syllabus.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  id="btn-empty-ai-plan"
                  onClick={handleScrollToAiPlanner}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-400/20 via-sky-400/20 to-amber-400/20 hover:from-amber-400/30 text-amber-200 hover:text-white border border-amber-400/40 cursor-pointer shadow-md shadow-amber-400/10 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Create with AI</span>
                </button>
                <button
                  id="btn-empty-add-topic"
                  onClick={() => {
                    setEditingTopic(null);
                    setDefaultSubjectIdForModal(undefined);
                    setIsAddTopicOpen(true);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow-md shadow-amber-400/10 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Topic</span>
                </button>
                <button
                  id="btn-empty-load-demo"
                  onClick={handleResetData}
                  className="px-4 py-2.5 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/[0.08] cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                  <span>Load Demo Topics</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              id="no-filter-match-state"
              className="p-12 text-center rounded-2xl bg-[#0b0d13] border border-white/[0.08] shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto text-stone-400">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  No matching topics found
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  No topics match the current filter or search criteria.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubjectId(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/[0.08] cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => {
                    setEditingTopic(null);
                    setDefaultSubjectIdForModal(undefined);
                    setIsAddTopicOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow-md shadow-amber-400/10 transition-colors"
                >
                  + Add New Topic
                </button>
              </div>
            </div>
          )
        ) : (
          /* Default: Subject-Level Dashboard (ONE SUBJECT = ONE MAIN CARD) */
          <div key="view-subjects-dashboard" className="space-y-8">
            {/* What Should I Study Next? Focus Recommendation */}
            <StudyNowRecommendation
              topTopic={topTopic}
              onStudyNow={handleOpenStudyNow}
              onOpenSubject={(subId) => {
                setActiveDetailSubjectId(subId);
                handleScrollToPlanner();
              }}
            />

            {/* Subject Status Filter Tabs & Results Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: 'All Subjects', count: subjectStatusCounts.all },
                  { id: 'high', label: 'High Priority', count: subjectStatusCounts.high },
                  { id: 'in_progress', label: 'In Progress', count: subjectStatusCounts.in_progress },
                  { id: 'not_started', label: 'Not Started', count: subjectStatusCounts.not_started },
                  { id: 'completed', label: 'Completed', count: subjectStatusCounts.completed },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubjectStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      subjectStatusFilter === tab.id
                        ? 'bg-amber-400 text-stone-950 shadow-xs'
                        : 'text-stone-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        subjectStatusFilter === tab.id
                          ? 'bg-black/20 text-stone-900 font-bold'
                          : 'bg-white/[0.08] text-stone-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <span className="text-xs text-stone-400">
                Showing <strong className="text-white">{filteredScoredSubjects.length}</strong> of {scoredSubjects.length} subjects
              </span>
            </div>

            {/* Grid of Subject Cards */}
            {filteredScoredSubjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredScoredSubjects.map((scoredSubject) => (
                  <SubjectCard
                    key={scoredSubject.subject.id}
                    scoredSubject={scoredSubject}
                    onOpenSubject={(subjectId) => {
                      setActiveDetailSubjectId(subjectId);
                      handleScrollToPlanner();
                    }}
                    onTakeMockTest={(subjectId) => {
                      handleOpenMockTests(undefined, subjectId);
                    }}
                    onStudyTopic={(topic) => handleOpenStudyNow(topic)}
                  />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              /* Empty State when all subjects/topics are deleted */
              <div
                id="empty-subjects-state"
                className="p-12 sm:p-16 text-center rounded-2xl bg-[#0b0d13] border border-white/[0.08] shadow-2xl space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-400">
                  <FolderKanban className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    No subjects or topics yet
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
                    Get started by adding your first subject syllabus, or reload the sample college syllabus with pre-configured nested units.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    id="btn-empty-ai-plan"
                    onClick={handleScrollToAiPlanner}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-400/20 via-sky-400/20 to-amber-400/20 hover:from-amber-400/30 text-amber-200 hover:text-white border border-amber-400/40 cursor-pointer shadow-md shadow-amber-400/10 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Create with AI</span>
                  </button>
                  <button
                    id="btn-empty-add-topic"
                    onClick={() => {
                      setEditingTopic(null);
                      setDefaultSubjectIdForModal(undefined);
                      setIsAddTopicOpen(true);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow-md shadow-amber-400/10 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Topic</span>
                  </button>
                  <button
                    id="btn-empty-load-demo"
                    onClick={handleResetData}
                    className="px-4 py-2.5 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/[0.08] cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                    <span>Load Demo Topics</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Empty State when filters yield no matches */
              <div
                id="no-subject-filter-match-state"
                className="p-12 text-center rounded-2xl bg-[#0b0d13] border border-white/[0.08] shadow-2xl space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto text-stone-400">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    No matching subjects found
                  </h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    No subjects match the current status filter or search criteria.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSubjectStatusFilter('all');
                      setSelectedSubjectId(null);
                    }}
                    className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 border border-white/[0.08] cursor-pointer transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => {
                      setEditingTopic(null);
                      setDefaultSubjectIdForModal(undefined);
                      setIsAddTopicOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow-md shadow-amber-400/10 transition-colors"
                  >
                    + Add New Topic
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Educational Principle Callout (PRD Section 15) */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-xs text-stone-400 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Product Principle & Academic Transparency</span>
          </div>
          <p className="leading-relaxed">
            &ldquo;Don&rsquo;t give students more things to plan. Give them clarity about what matters most.&rdquo; The Automated Priority Engine provides an objective, transparent heuristic so students avoid spending hours studying familiar topics while critical, high-weightage chapters remain unlearned.
          </p>
        </div>
      </main>

      {/* Screen 4: "Study This Now" Recommendation & Focus Modal */}
      <StudyNowModal
        isOpen={isStudyNowOpen}
        topic={studyNowTopic}
        onClose={() => setIsStudyNowOpen(false)}
        onFinishSession={handleFinishSession}
      />

      {/* Screen 5: "How Did It Go?" Adaptive Progress Modal */}
      <ProgressUpdateModal
        isOpen={isProgressModalOpen}
        topic={progressTopic}
        weights={weights}
        onClose={() => setIsProgressModalOpen(false)}
        onSaveProgress={handleSaveProgress}
      />

      {/* Screen 2: Academic Setup Add / Edit Topic Modal */}
      <AddTopicModal
        isOpen={isAddTopicOpen}
        subjects={subjects}
        editingTopic={editingTopic}
        defaultSubjectId={defaultSubjectIdForModal}
        weights={weights}
        onClose={() => {
          setIsAddTopicOpen(false);
          setEditingTopic(null);
          setDefaultSubjectIdForModal(undefined);
        }}
        onSaveTopic={handleSaveTopic}
      />

      {/* Formula Weight Settings Modal */}
      <WeightConfigModal
        isOpen={isWeightsModalOpen}
        weights={weights}
        onClose={() => setIsWeightsModalOpen(false)}
        onSaveWeights={(newWeights) => {
          setWeights(newWeights);
          setFeedbackNotice('Formula weights updated. Priorities recalculated.');
          setTimeout(() => setFeedbackNotice(null), 3500);
        }}
        onResetWeights={() => {
          setWeights(DEFAULT_WEIGHTS);
          setFeedbackNotice('Formula weights reset to PRD defaults.');
          setTimeout(() => setFeedbackNotice(null), 3500);
        }}
      />

      {/* Delete Topic Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(topicToDelete)}
        topic={topicToDelete?.topic || null}
        subject={topicToDelete?.subject}
        isDeleting={isDeleting}
        onClose={() => {
          if (!isDeleting) setTopicToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTopic}
      />

      {/* Screen 6: AI-Generated Mock Test Modal */}
      <MockTestModal
        isOpen={isMockTestModalOpen}
        subjects={subjects}
        topics={topics}
        scoredTopics={allScoredTopics}
        initialTopic={mockTestTargetTopic}
        initialSubjectId={mockTestTargetSubjectId}
        mockTestHistory={mockTestHistory}
        onClose={() => {
          setIsMockTestModalOpen(false);
          setMockTestTargetTopic(null);
          setMockTestTargetSubjectId(null);
        }}
        onSaveTestResult={handleSaveMockTestResult}
        onAddToStudyPlan={handleAddToStudyPlan}
        onAskStudyMateAi={handleDiscussQuestionWithAi}
      />

      {/* Screen 7: Weekly AI Performance Reports Modal */}
      <WeeklyReportModal
        isOpen={isWeeklyReportModalOpen}
        subjects={subjects}
        topics={topics}
        mockTestHistory={mockTestHistory}
        studySessions={studySessions}
        onClose={() => setIsWeeklyReportModalOpen(false)}
        onStartStudySession={() => {
          setIsWeeklyReportModalOpen(false);
          handleOpenStudyNow();
        }}
        onTakeMockTest={() => {
          setIsWeeklyReportModalOpen(false);
          handleOpenMockTests();
        }}
        onAddNextWeekPlanToTopics={(items) => {
          handleAddToStudyPlan(
            items.map((item) => ({
              title: item.topicName,
              durationMinutes: 45,
              action: item.reason,
              topicName: item.topicName,
            }))
          );
        }}
      />
    </div>
  );
}
