import {
  Subject,
  Topic,
  PriorityWeights,
  PriorityFactorBreakdown,
  ScoredTopic,
  ScoredSubject,
  PriorityLevel,
} from '../types';

export const DEFAULT_WEIGHTS: PriorityWeights = {
  urgency: 0.25,
  weakness: 0.25,
  importance: 0.20,
  incompleteness: 0.15,
  revision: 0.10,
  confidenceGap: 0.05,
};

export function getDaysUntilExam(examDateStr: string): number {
  if (!examDateStr) return 30;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const examDate = new Date(examDateStr);
  examDate.setHours(0, 0, 0, 0);
  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateRawUrgency(daysRemaining: number): number {
  if (daysRemaining <= 1) return 100;
  if (daysRemaining <= 3) return 96;
  if (daysRemaining <= 5) return 92;
  if (daysRemaining <= 8) return 88;
  if (daysRemaining <= 14) return 74;
  if (daysRemaining <= 21) return 55;
  if (daysRemaining <= 30) return 38;
  if (daysRemaining <= 45) return 25;
  return Math.max(10, Math.round(100 - daysRemaining * 1.5));
}

export function calculateRawWeakness(
  latestScore: number | null,
  confidence: number,
  mockTestAccuracy?: number | null
): number {
  // If mock test accuracy is available, synthesize with quiz score
  const effectiveScore =
    mockTestAccuracy !== undefined && mockTestAccuracy !== null
      ? latestScore !== null
        ? Math.round(mockTestAccuracy * 0.6 + latestScore * 0.4)
        : mockTestAccuracy
      : latestScore;

  if (effectiveScore !== null && !isNaN(effectiveScore)) {
    return Math.max(0, Math.min(100, 100 - effectiveScore));
  }
  // If no quiz has been recorded, weakness is inferred from student self-reported confidence
  const confGap = ((5 - Math.max(1, Math.min(5, confidence))) / 4) * 100;
  return Math.round(confGap);
}

export function calculateRawImportance(importance: Topic['importance']): number {
  switch (importance) {
    case 'High':
      return 100;
    case 'Medium':
      return 60;
    case 'Low':
      return 30;
  }
}

export function calculateRawIncompleteness(completion: number): number {
  return Math.max(0, Math.min(100, 100 - completion));
}

export function calculateRawRevision(
  lastStudiedDaysAgo: number,
  needsRevision: boolean
): number {
  if (needsRevision) return 95;
  if (lastStudiedDaysAgo >= 14) return 90;
  if (lastStudiedDaysAgo >= 8) return 78;
  if (lastStudiedDaysAgo >= 5) return 55;
  if (lastStudiedDaysAgo >= 3) return 35;
  return 10;
}

export function calculateRawConfidenceGap(confidence: number): number {
  const bounded = Math.max(1, Math.min(5, confidence));
  return Math.round(((5 - bounded) / 4) * 100);
}

export function calculateTopicPriority(
  topic: Topic,
  subject: Subject,
  weights: PriorityWeights = DEFAULT_WEIGHTS
): ScoredTopic {
  const daysRemaining = getDaysUntilExam(subject.examDate);

  const rawUrgency = calculateRawUrgency(daysRemaining);
  const rawWeakness = calculateRawWeakness(
    topic.latestScore,
    topic.confidence,
    topic.mockTestAccuracy
  );
  const rawImportance = calculateRawImportance(topic.importance);
  const rawIncompleteness = calculateRawIncompleteness(topic.completion);
  const rawRevision = calculateRawRevision(topic.lastStudiedDaysAgo, topic.needsRevision);
  const rawConfidenceGap = calculateRawConfidenceGap(topic.confidence);

  const weightedUrgency = rawUrgency * weights.urgency;
  const weightedWeakness = rawWeakness * weights.weakness;
  const weightedImportance = rawImportance * weights.importance;
  const weightedIncompleteness = rawIncompleteness * weights.incompleteness;
  const weightedRevision = rawRevision * weights.revision;
  const weightedConfidenceGap = rawConfidenceGap * weights.confidenceGap;

  const totalRaw =
    weightedUrgency +
    weightedWeakness +
    weightedImportance +
    weightedIncompleteness +
    weightedRevision +
    weightedConfidenceGap;

  // Clamped 0 - 100
  const priorityScore = Math.min(100, Math.max(0, Math.round(totalRaw)));

  let priorityLevel: PriorityLevel = 'Low';
  if (priorityScore >= 75) {
    priorityLevel = 'High';
  } else if (priorityScore >= 50) {
    priorityLevel = 'Medium';
  }

  const breakdown: PriorityFactorBreakdown = {
    rawUrgency,
    rawWeakness,
    rawImportance,
    rawIncompleteness,
    rawRevision,
    rawConfidenceGap,
    weightedUrgency: Math.round(weightedUrgency * 10) / 10,
    weightedWeakness: Math.round(weightedWeakness * 10) / 10,
    weightedImportance: Math.round(weightedImportance * 10) / 10,
    weightedIncompleteness: Math.round(weightedIncompleteness * 10) / 10,
    weightedRevision: Math.round(weightedRevision * 10) / 10,
    weightedConfidenceGap: Math.round(weightedConfidenceGap * 10) / 10,
  };

  // Generate deterministic human-readable explanation
  const reason = generateDeterministicReason(topic, daysRemaining, priorityScore);
  const studyObjective = generateDeterministicObjective(topic);
  const suggestedAction = generateDeterministicAction(topic);

  return {
    topic,
    subject,
    priorityScore,
    priorityLevel,
    examDaysRemaining: daysRemaining,
    breakdown,
    reason,
    suggestedAction,
    studyObjective,
  };
}

function generateDeterministicReason(
  topic: Topic,
  daysRemaining: number,
  score: number
): string {
  const parts: string[] = [];

  if (topic.mockTestAccuracy !== undefined && topic.mockTestAccuracy !== null && topic.mockTestAccuracy < 65) {
    parts.push(`Mock test accuracy is low (${topic.mockTestAccuracy}%)`);
  } else if (topic.latestScore !== null && topic.latestScore <= 50) {
    parts.push(`Recent performance is weak (${topic.latestScore}%)`);
  } else if (topic.latestScore !== null && topic.latestScore >= 80) {
    parts.push(`Strong test score (${topic.latestScore}%)`);
  } else if (topic.confidence <= 2) {
    parts.push(`Low reported confidence (${topic.confidence}/5)`);
  }

  if (daysRemaining <= 10) {
    parts.push(`exam is in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`);
  } else if (daysRemaining <= 21) {
    parts.push(`exam is in ${daysRemaining} days`);
  }

  if (topic.importance === 'High') {
    parts.push(`topic carries high exam weight`);
  }

  if (topic.completion <= 50) {
    parts.push(`${100 - topic.completion}% remains incomplete`);
  } else if (topic.completion >= 85) {
    parts.push(`mostly completed (${topic.completion}%)`);
  }

  if (parts.length === 0) {
    if (score >= 75) {
      return `Critical exam priority due to high weightage and upcoming deadlines.`;
    }
    return `Moderate priority topic with balanced progress and medium urgency.`;
  }

  const capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const rest = parts.slice(1).join(', ');
  return rest ? `${capitalized}, ${rest}.` : `${capitalized}.`;
}

function generateDeterministicObjective(topic: Topic): string {
  if (topic.completion < 50) {
    return `Master core principles of ${topic.name} and review fundamental definitions.`;
  } else if (topic.latestScore !== null && topic.latestScore < 60) {
    return `Clarify high-frequency exam questions and fix common test pitfalls in ${topic.name}.`;
  } else if (topic.completion < 80) {
    return `Finish remaining syllabus sections for ${topic.name} and practice 5 intermediate questions.`;
  }
  return `Quick active recall session and 10-minute diagnostic drill on ${topic.name}.`;
}

function generateDeterministicAction(topic: Topic): string {
  if (topic.completion < 40) {
    return `Study theory & concepts (25m) → Solve 5 foundational questions (20m) → Quick recap notes (10m)`;
  }
  if (topic.latestScore !== null && topic.latestScore < 55) {
    return `Review error log & formulas (20m) → Solve 10 targeted practice problems (25m) → Take short quiz (15m)`;
  }
  return `Active recall with flashcards (15m) → Solve 5 exam-style questions (25m) → Rate final confidence (5m)`;
}

export function rankTopics(
  topics: Topic[],
  subjects: Subject[],
  weights: PriorityWeights = DEFAULT_WEIGHTS
): ScoredTopic[] {
  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const scoredList: ScoredTopic[] = [];

  for (const topic of topics) {
    const subject = subjectMap.get(topic.subjectId) || {
      id: topic.subjectId,
      name: 'General Subject',
      examDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      color: 'blue',
    };
    scoredList.push(calculateTopicPriority(topic, subject, weights));
  }

  // Sort descending by priorityScore
  return scoredList.sort((a, b) => b.priorityScore - a.priorityScore);
}

// Group topics into their parent subjects and compute subject-level statistics & priority
export function groupAndScoreSubjects(
  subjects: Subject[],
  scoredTopics: ScoredTopic[]
): ScoredSubject[] {
  // Map topics to their subject
  const subjectTopicsMap = new Map<string, ScoredTopic[]>();
  subjects.forEach((s) => subjectTopicsMap.set(s.id, []));

  scoredTopics.forEach((st) => {
    const list = subjectTopicsMap.get(st.subject.id);
    if (list) {
      list.push(st);
    } else {
      // If an orphan topic exists, register under its subject id
      subjectTopicsMap.set(st.subject.id, [st]);
    }
  });

  const scoredSubjects: ScoredSubject[] = subjects.map((subject) => {
    const list = subjectTopicsMap.get(subject.id) || [];
    // Sort topics in this subject by priority score descending
    const sortedTopics = [...list].sort((a, b) => b.priorityScore - a.priorityScore);

    const totalTopics = sortedTopics.length;
    const completedTopicsCount = sortedTopics.filter((t) => (t.topic.completion ?? 0) >= 100).length;
    const inProgressTopicsCount = sortedTopics.filter(
      (t) => (t.topic.completion ?? 0) > 0 && (t.topic.completion ?? 0) < 100
    ).length;
    const notStartedTopicsCount = sortedTopics.filter((t) => (t.topic.completion ?? 0) === 0).length;

    // Subject overall progress dynamically derived from child topics!
    const overallProgress =
      totalTopics > 0
        ? Math.round(
            sortedTopics.reduce((sum, t) => sum + (t.topic.completion || 0), 0) / totalTopics
          )
        : 0;

    // Average confidence (1 to 5)
    const totalConfidence = sortedTopics.reduce((sum, t) => sum + (t.topic.confidence || 3), 0);
    const averageConfidence =
      totalTopics > 0 ? Number((totalConfidence / totalTopics).toFixed(1)) : 3;

    // Highest priority score
    const highestPriorityScore =
      sortedTopics.length > 0 ? sortedTopics[0].priorityScore : 0;

    let priorityLevel: PriorityLevel = 'Low';
    if (highestPriorityScore >= 75) {
      priorityLevel = 'High';
    } else if (highestPriorityScore >= 50) {
      priorityLevel = 'Medium';
    }

    const topPriorityTopic = sortedTopics[0] || null;

    // Weakest topic: lowest test score or lowest confidence
    const weakestTopic =
      [...sortedTopics].sort((a, b) => {
        const aScore = a.topic.latestScore ?? a.topic.mockTestAccuracy ?? (a.topic.confidence * 20);
        const bScore = b.topic.latestScore ?? b.topic.mockTestAccuracy ?? (b.topic.confidence * 20);
        return aScore - bScore;
      })[0] || null;

    // Last studied days ago (minimum across topics)
    const validDays = sortedTopics
      .map((t) => t.topic.lastStudiedDaysAgo)
      .filter((d) => typeof d === 'number' && !isNaN(d));
    const lastStudiedDaysAgo = validDays.length > 0 ? Math.min(...validDays) : null;

    // Latest mock score
    const testScores = sortedTopics
      .map((t) => t.topic.mockTestAccuracy ?? t.topic.latestScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));
    const latestMockScore =
      testScores.length > 0 ? Math.round(testScores.reduce((a, b) => a + b, 0) / testScores.length) : null;

    // Small AI recommendation snippet
    let aiRecommendation = '';
    if (topPriorityTopic && topPriorityTopic.topic.completion < 100) {
      aiRecommendation = `Focus next on ${topPriorityTopic.topic.name}.`;
    } else if (weakestTopic && weakestTopic.topic.confidence <= 2) {
      aiRecommendation = `Revise ${weakestTopic.topic.name} to boost confidence.`;
    } else if (completedTopicsCount === totalTopics && totalTopics > 0) {
      aiRecommendation = `All topics completed! Take a mock test to verify mastery.`;
    } else {
      aiRecommendation = `Review core concepts and solve targeted practice problems.`;
    }

    return {
      subject,
      topics: sortedTopics,
      totalTopics,
      completedTopicsCount,
      inProgressTopicsCount,
      notStartedTopicsCount,
      overallProgress,
      averageConfidence,
      highestPriorityScore,
      priorityLevel,
      topPriorityTopic,
      weakestTopic,
      lastStudiedDaysAgo,
      latestMockScore,
      aiRecommendation,
    };
  });

  // Sort subjects by highestPriorityScore descending
  return scoredSubjects.sort((a, b) => b.highestPriorityScore - a.highestPriorityScore);
}

// Client helper to request server-side AI enhancement
export async function fetchAiExplanation(
  scored: ScoredTopic
): Promise<{ reason: string; objective: string; nextAction: string; isAiGenerated: boolean } | null> {
  try {
    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: scored.subject.name,
        topic: scored.topic.name,
        examDaysRemaining: scored.examDaysRemaining,
        completion: scored.topic.completion,
        confidence: scored.topic.confidence,
        latestScore: scored.topic.latestScore,
        importance: scored.topic.importance,
        priorityScore: scored.priorityScore,
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
