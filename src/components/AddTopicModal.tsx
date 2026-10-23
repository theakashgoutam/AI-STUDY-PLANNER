import React, { useState, useMemo } from 'react';
import { X, Plus, Sparkles, BookOpen, Calendar, HelpCircle } from 'lucide-react';
import { Subject, Topic, TopicImportance, PriorityWeights } from '../types';
import { calculateTopicPriority, DEFAULT_WEIGHTS } from '../utils/priorityEngine';

interface AddTopicModalProps {
  isOpen: boolean;
  subjects: Subject[];
  editingTopic?: { topic: Topic; subject: Subject } | null;
  defaultSubjectId?: string;
  weights?: PriorityWeights;
  onClose: () => void;
  onSaveTopic: (
    topicData: Omit<Topic, 'id'> & { id?: string },
    subjectData?: { name: string; examDate: string; code?: string }
  ) => void;
}

export const AddTopicModal: React.FC<AddTopicModalProps> = ({
  isOpen,
  subjects,
  editingTopic,
  defaultSubjectId,
  weights = DEFAULT_WEIGHTS,
  onClose,
  onSaveTopic,
}) => {
  if (!isOpen) return null;

  return (
    <AddTopicModalContent
      subjects={subjects}
      editingTopic={editingTopic}
      defaultSubjectId={defaultSubjectId}
      weights={weights}
      onClose={onClose}
      onSaveTopic={onSaveTopic}
    />
  );
};

interface ContentProps {
  subjects: Subject[];
  editingTopic?: { topic: Topic; subject: Subject } | null;
  defaultSubjectId?: string;
  weights: PriorityWeights;
  onClose: () => void;
  onSaveTopic: (
    topicData: Omit<Topic, 'id'> & { id?: string },
    subjectData?: { name: string; examDate: string; code?: string }
  ) => void;
}

const AddTopicModalContent: React.FC<ContentProps> = ({
  subjects,
  editingTopic,
  defaultSubjectId,
  weights,
  onClose,
  onSaveTopic,
}) => {
  const isEditing = Boolean(editingTopic);

  // Subject state
  const initialSubjectId =
    editingTopic?.subject.id ||
    defaultSubjectId ||
    subjects[0]?.id ||
    'NEW_SUBJECT';

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [isNewSubject, setIsNewSubject] = useState<boolean>(
    !editingTopic && !defaultSubjectId && (subjects.length === 0 || initialSubjectId === 'NEW_SUBJECT')
  );
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectExamDate, setNewSubjectExamDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState<boolean>(false);

  // Topic state
  const [topicName, setTopicName] = useState<string>(editingTopic?.topic.name || '');
  const [subtopicsText, setSubtopicsText] = useState<string>(
    editingTopic?.topic.subtopics?.join(', ') || ''
  );
  const [importance, setImportance] = useState<TopicImportance>(
    editingTopic?.topic.importance || 'High'
  );
  const [completion, setCompletion] = useState<number>(editingTopic?.topic.completion ?? 30);
  const [confidence, setConfidence] = useState<number>(editingTopic?.topic.confidence ?? 2);
  const [hasScore, setHasScore] = useState<boolean>(
    editingTopic ? editingTopic.topic.latestScore !== null : true
  );
  const [latestScore, setLatestScore] = useState<number>(
    editingTopic?.topic.latestScore ?? 45
  );
  const [notes, setNotes] = useState<string>(editingTopic?.topic.notes || '');

  // Intelligent duplicate subject detection (Requirement 28)
  const matchingExistingSubject = useMemo(() => {
    if (!isNewSubject || dismissedDuplicateWarning || !newSubjectName.trim()) return null;
    const query = newSubjectName.trim().toLowerCase();
    return (
      subjects.find((s) => {
        const sName = s.name.toLowerCase();
        return (
          sName === query ||
          sName.includes(query) ||
          query.includes(sName) ||
          (query.includes('python') && sName.includes('python'))
        );
      }) || null
    );
  }, [isNewSubject, dismissedDuplicateWarning, newSubjectName, subjects]);

  // Calculate live preview score
  const livePreview = useMemo(() => {
    const activeSubject: Subject = isNewSubject
      ? {
          id: 'preview-sub',
          name: newSubjectName || 'New Subject',
          examDate: newSubjectExamDate,
          color: 'blue',
        }
      : subjects.find((s) => s.id === selectedSubjectId) || {
          id: 'preview-sub',
          name: 'General',
          examDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          color: 'blue',
        };

    const mockTopic: Topic = {
      id: editingTopic?.topic.id || 'preview-topic',
      subjectId: activeSubject.id,
      name: topicName || 'Sample Topic',
      importance,
      completion,
      confidence,
      latestScore: hasScore ? latestScore : null,
      lastStudiedDaysAgo: editingTopic?.topic.lastStudiedDaysAgo ?? 7,
      needsRevision: false,
    };

    return calculateTopicPriority(mockTopic, activeSubject, weights);
  }, [
    isNewSubject,
    newSubjectName,
    newSubjectExamDate,
    selectedSubjectId,
    subjects,
    topicName,
    importance,
    completion,
    confidence,
    hasScore,
    latestScore,
    editingTopic,
    weights,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    if (isNewSubject && !newSubjectName.trim()) return;

    const subtopics = subtopicsText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const topicPayload = {
      ...(editingTopic ? { id: editingTopic.topic.id } : {}),
      subjectId: isNewSubject ? '' : selectedSubjectId,
      name: topicName.trim(),
      importance,
      completion,
      confidence,
      latestScore: hasScore ? latestScore : null,
      lastStudiedDaysAgo: editingTopic?.topic.lastStudiedDaysAgo ?? 0,
      needsRevision: editingTopic?.topic.needsRevision ?? false,
      notes: notes.trim(),
      subtopics: subtopics.length > 0 ? subtopics : undefined,
    };

    onSaveTopic(
      topicPayload,
      isNewSubject
        ? {
            name: newSubjectName.trim(),
            examDate: newSubjectExamDate,
          }
        : undefined
    );
    onClose();
  };

  const handleApplyPreset = (preset: {
    topic: string;
    subject: string;
    importance: TopicImportance;
    completion: number;
    score: number;
    confidence: number;
  }) => {
    setTopicName(preset.topic);
    setImportance(preset.importance);
    setCompletion(preset.completion);
    setLatestScore(preset.score);
    setConfidence(preset.confidence);
    setHasScore(true);

    const existingSub = subjects.find(
      (s) => s.name.toLowerCase().includes(preset.subject.toLowerCase())
    );
    if (existingSub) {
      setSelectedSubjectId(existingSub.id);
      setIsNewSubject(false);
    } else {
      setIsNewSubject(true);
      setNewSubjectName(preset.subject);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        id="modal-add-topic"
        className="bg-[#0b0d13] rounded-2xl max-w-xl w-full border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-[#0f131f]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isEditing ? 'Edit Academic Topic' : 'Academic Setup — Add Study Topic'}
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Enter academic metrics so the Automated Priority Engine can rank this topic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-stone-300">
          {/* Quick Presets for Fast Setup */}
          {!isEditing && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Quick Academic Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    topic: 'Normalization & BCNF',
                    subject: 'DBMS',
                    importance: 'High' as TopicImportance,
                    completion: 40,
                    score: 42,
                    confidence: 2,
                  },
                  {
                    topic: 'Deadlock Avoidance & Bankers',
                    subject: 'Operating Systems',
                    importance: 'High' as TopicImportance,
                    completion: 30,
                    score: 45,
                    confidence: 2,
                  },
                  {
                    topic: 'Dynamic Programming (Knapsack)',
                    subject: 'Algorithms',
                    importance: 'High' as TopicImportance,
                    completion: 50,
                    score: 55,
                    confidence: 3,
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-stone-300 hover:text-white font-medium transition-colors cursor-pointer"
                  >
                    + {preset.subject}: {preset.topic.split('&')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Calculated Priority Preview */}
          <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.08] text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                Engine Preview Score
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-amber-400 font-mono">
                  {livePreview.priorityScore}/100
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    livePreview.priorityLevel === 'High'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      : livePreview.priorityLevel === 'Medium'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {livePreview.priorityLevel} Priority
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-stone-400">
              <span>Exam in {livePreview.examDaysRemaining} days</span>
              <span className="block text-stone-500">Auto-ranked upon save</span>
            </div>
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label className="text-stone-300 font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Subject / Course
            </label>

            {!isNewSubject ? (
              <div className="flex gap-2">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_SUBJECT') {
                      setIsNewSubject(true);
                    } else {
                      setSelectedSubjectId(e.target.value);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#141824] text-white">
                      {s.name} (Exam: {s.examDate})
                    </option>
                  ))}
                  <option value="NEW_SUBJECT" className="bg-[#141824] text-amber-300">+ Add New Subject...</option>
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewSubject(true)}
                  className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer"
                >
                  New
                </button>
              </div>
            ) : (
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">New Subject Details</span>
                  {subjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsNewSubject(false)}
                      className="text-amber-400 hover:text-amber-300 text-[11px] underline cursor-pointer"
                    >
                      Select existing
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Subject name (e.g. DBMS, OS)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                    className="px-3 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <input
                      type="date"
                      value={newSubjectExamDate}
                      onChange={(e) => setNewSubjectExamDate(e.target.value)}
                      required
                      className="w-full px-2 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Duplicate Subject Detection Banner (Requirement 28) */}
                {matchingExistingSubject && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-sm">⚠️</span>
                      <div className="text-xs text-amber-200">
                        A subject named <strong className="text-white">"{matchingExistingSubject.name}"</strong> already exists.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(matchingExistingSubject.id);
                          setIsNewSubject(false);
                          setNewSubjectName('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 transition-colors cursor-pointer"
                      >
                        Add as Topic under "{matchingExistingSubject.name}"
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedDuplicateWarning(true)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 text-xs transition-colors cursor-pointer"
                      >
                        Create Separate Subject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Topic Name */}
          <div className="space-y-1.5">
            <label htmlFor="input-topic-name" className="text-stone-300 font-medium block">
              Topic / Chapter Name *
            </label>
            <input
              id="input-topic-name"
              type="text"
              placeholder="e.g. Normalization (1NF, 2NF, 3NF, BCNF)"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500"
            />
          </div>

          {/* Subtopics / Key Learning Units */}
          <div className="space-y-1.5">
            <label htmlFor="input-subtopics" className="text-stone-300 font-medium flex items-center justify-between">
              <span>Subtopics / Key Learning Units (Optional)</span>
              <span className="text-[11px] text-stone-500 font-normal">Comma-separated</span>
            </label>
            <input
              id="input-subtopics"
              type="text"
              placeholder="e.g. Classes & Objects, Inheritance, Polymorphism"
              value={subtopicsText}
              onChange={(e) => setSubtopicsText(e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500"
            />
          </div>

          {/* Importance & Confidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Importance */}
            <div className="space-y-1.5">
              <label className="text-stone-300 font-medium block">
                Exam Importance / Weightage
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['High', 'Medium', 'Low'] as TopicImportance[]).map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setImportance(level)}
                    className={`py-2 rounded-xl font-semibold text-center border transition-all cursor-pointer ${
                      importance === level
                        ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-sm'
                        : 'bg-white/[0.04] text-stone-300 border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div className="space-y-1.5">
              <label className="text-stone-300 font-medium block">
                Confidence Level (1–5 stars)
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setConfidence(star)}
                    className={`py-2 rounded-xl font-semibold text-center border transition-all cursor-pointer ${
                      confidence === star
                        ? 'bg-amber-400 text-stone-950 border-amber-400 shadow-sm'
                        : 'bg-white/[0.04] text-stone-400 border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Completion & Test Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Completion */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <label htmlFor="input-completion-range" className="text-stone-300">
                  Syllabus Completion
                </label>
                <span className="font-bold text-white font-mono">{completion}%</span>
              </div>
              <input
                id="input-completion-range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={completion}
                onChange={(e) => setCompletion(Number(e.target.value))}
                className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[11px] text-stone-400 block">
                {100 - completion}% remains to be studied
              </span>
            </div>

            {/* Latest Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-medium">
                <label className="text-stone-300">Recent Quiz / Test Score</label>
                <label className="flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasScore}
                    onChange={(e) => setHasScore(e.target.checked)}
                    className="rounded border-white/[0.2] bg-white/[0.05] accent-amber-400"
                  />
                  <span>Has quiz</span>
                </label>
              </div>
              {hasScore ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={latestScore}
                    onChange={(e) => setLatestScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-20 px-3 py-1.5 border border-white/[0.1] rounded-xl text-xs font-semibold text-white bg-[#141824] font-mono"
                  />
                  <span className="text-stone-400 text-xs">% score</span>
                </div>
              ) : (
                <div className="py-1.5 text-stone-500 italic">
                  Will estimate weakness from confidence
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="input-notes" className="text-stone-300 font-medium block">
              Study Notes / Weakness Details (Optional)
            </label>
            <input
              id="input-notes"
              type="text"
              placeholder="e.g. Trouble with candidate keys and multi-valued dependencies"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-white/[0.1] rounded-xl text-xs font-medium text-white bg-[#141824] focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-calculate-priority"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-amber-400/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>{isEditing ? 'Save Changes' : 'Calculate My Priorities'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
