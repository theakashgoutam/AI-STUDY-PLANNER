export type TopicImportance = 'High' | 'Medium' | 'Low';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  examDate: string; // ISO date YYYY-MM-DD
  color: string; // Color key for badge
  icon?: string; // Optional icon or emoji
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  importance: TopicImportance;
  completion: number; // 0 - 100
  confidence: number; // 1 - 5
  latestScore: number | null; // 0 - 100 or null if not yet taken
  lastStudiedDaysAgo: number; // days since last study session
  needsRevision: boolean;
  notes?: string;
  subtopics?: string[]; // Nested subtopics / learning items
  // Mock Test Enrichment
  mockTestAccuracy?: number | null; // 0 - 100 %
  lastTestedDaysAgo?: number | null;
  lastTestedTimestamp?: number | null;
  mockTestRecommendation?: string;
  attemptsCount?: number;
}

export interface PriorityWeights {
  urgency: number; // default 0.25
  weakness: number; // default 0.25
  importance: number; // default 0.20
  incompleteness: number; // default 0.15
  revision: number; // default 0.10
  confidenceGap: number; // default 0.05
}

export interface PriorityFactorBreakdown {
  rawUrgency: number; // 0 - 100
  rawWeakness: number; // 0 - 100
  rawImportance: number; // 0 - 100
  rawIncompleteness: number; // 0 - 100
  rawRevision: number; // 0 - 100
  rawConfidenceGap: number; // 0 - 100

  weightedUrgency: number;
  weightedWeakness: number;
  weightedImportance: number;
  weightedIncompleteness: number;
  weightedRevision: number;
  weightedConfidenceGap: number;
}

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface ScoredTopic {
  topic: Topic;
  subject: Subject;
  priorityScore: number; // 0 - 100
  priorityLevel: PriorityLevel;
  examDaysRemaining: number;
  breakdown: PriorityFactorBreakdown;
  reason: string;
  suggestedAction: string;
  studyObjective: string;
  isAiGenerated?: boolean;
}

export interface ScoredSubject {
  subject: Subject;
  topics: ScoredTopic[];
  totalTopics: number;
  completedTopicsCount: number;
  inProgressTopicsCount: number;
  notStartedTopicsCount: number;
  overallProgress: number; // 0 - 100 % (calculated dynamically from child topics)
  averageConfidence: number; // 1 - 5 (average of child topics)
  highestPriorityScore: number;
  priorityLevel: PriorityLevel;
  topPriorityTopic: ScoredTopic | null;
  weakestTopic: ScoredTopic | null;
  lastStudiedDaysAgo: number | null;
  latestMockScore: number | null;
  aiRecommendation: string;
}

export interface ActiveStudySession {
  topicId: string;
  topicName: string;
  subjectName: string;
  startTime: number;
  durationMinutes: number;
  studyObjective: string;
  nextAction: string;
}

// =========================================================================
// AI-GENERATED MOCK TEST TYPES
// =========================================================================

export type QuestionType = 'mcq' | 'numerical' | 'conceptual' | 'application';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MockTestOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MockTestQuestion {
  id: string;
  question: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  topicId?: string;
  topicName: string;
  options: MockTestOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  conceptTested: string;
  whyIncorrectExplanation?: string;
}

export interface MockTestSetupOptions {
  subjectId: string;
  subjectName: string;
  coverage: 'full' | 'selected' | 'weak';
  selectedTopicIds: string[];
  difficulty: 'Adaptive' | 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  durationMinutes: number;
  questionTypes: QuestionType[];
  syllabusInput?: string;
}

export interface MockTestAiAnalysis {
  whatYouDidWell: string[];
  areasToImprove: string[];
  aiDiagnosis: string;
}

export interface MockTestWeakTopic {
  topicName: string;
  topicId?: string;
  accuracy: number; // %
  totalQuestions: number;
  correctQuestions: number;
}

export interface MockTestFollowUpStep {
  title: string;
  durationMinutes: number;
  action: string;
  topicName?: string;
}

export interface MockTestResult {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  difficulty: 'Adaptive' | 'Easy' | 'Medium' | 'Hard';
  durationMinutes: number;
  timeTakenSeconds: number;
  completedAt: number; // timestamp
  score: number; // 0 - 100
  accuracy: number; // %
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  performanceGrade: 'Strong' | 'Moderate' | 'Needs Revision';
  questions: MockTestQuestion[];
  userAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  reviewFlags: Record<string, boolean>;
  aiAnalysis: MockTestAiAnalysis;
  weakTopics: MockTestWeakTopic[];
  followUpSteps: MockTestFollowUpStep[];
}

// =========================================================================
// STUDY SESSION & ACTIVITY LOGGING
// =========================================================================

export interface StudySessionRecord {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  timestamp: number;
  durationMinutes: number;
  completionBefore?: number;
  completionAfter?: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  notes?: string;
}

// =========================================================================
// WEEKLY AI PERFORMANCE REPORT TYPES
// =========================================================================

export interface DailyActivityPoint {
  dayKey: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  dayName: string;
  dateStr: string;
  studyMinutes: number;
  sessions: number;
  mockTests: number;
  scoreAvg: number | null;
  isToday?: boolean;
}

export interface WeeklyReportData {
  dateRangeStr: string;
  overallProgress: number;
  weeklyStudyMinutes: number;
  sessionsCount: number;
  mockTestsCount: number;
  averageScore: number;
  topicsCompletedCount: number;
  hasEnoughData: boolean;
  dailyActivity: DailyActivityPoint[];
  longestStreakDays: number;
  currentStreakDays: number;
  mostProductiveDay: string;
  strongestAreas: { topicName: string; score: number; subjectName: string }[];
  areasNeedingAttention: { topicName: string; score: number; subjectName: string; aiNote: string }[];
  weekOverWeekComparison: {
    hasPriorWeek: boolean;
    studyTimeChangePercent: number;
    accuracyChangePercent: number;
    topicsCompletedChange: number;
    mockTestScoreChangePercent: number;
  } | null;
  aiSummary: string;
  aiCoachingInsight: {
    whatImproved: string;
    whatDeclined: string;
    biggestWeakness: string;
    biggestStrength: string;
    focusNextWeek: string;
    suggestedStrategy: string;
  };
  nextWeekPlan: {
    id: string;
    topicName: string;
    subjectName?: string;
    priorityLabel: 'High Priority' | 'Medium Priority' | 'Revision';
    sessionsCount: number;
    minutesPerSession: number;
    reason: string;
  }[];
}

