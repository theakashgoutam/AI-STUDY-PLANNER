import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  Target,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { ScoredTopic } from '../types';
import { ThreeFocusCore } from './ThreeFocusCore';

interface StudyNowModalProps {
  isOpen: boolean;
  topic: ScoredTopic | null;
  onClose: () => void;
  onFinishSession: (topic: ScoredTopic) => void;
}

export const StudyNowModal: React.FC<StudyNowModalProps> = ({
  isOpen,
  topic,
  onClose,
  onFinishSession,
}) => {
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (topic) {
      setSecondsRemaining(sessionMinutes * 60);
      setIsActive(false);
      setCompletedSteps([]);
    }
  }, [topic, sessionMinutes]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((sec) => sec - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining]);

  if (!isOpen || !topic) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = sessionMinutes * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - secondsRemaining) / totalSeconds) * 100));

  // Break suggestedAction into sub-steps
  const defaultActionSteps = topic.suggestedAction
    ? topic.suggestedAction.split('→').map((s) => s.trim())
    : [
        'Review core theory & definitions (20m)',
        'Solve 5 targeted practice problems (15m)',
        'Quick self-testing diagnostic quiz (10m)',
      ];

  const toggleStep = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((i) => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const handleStartTimer = () => {
    setIsActive(true);
  };

  const handlePauseTimer = () => {
    setIsActive(false);
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setSecondsRemaining(sessionMinutes * 60);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div
        id="modal-study-now"
        className="bg-[#0b0d13] rounded-2xl max-w-xl w-full border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#0f131f] text-white p-6 flex items-start justify-between relative overflow-hidden border-b border-white/[0.08]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/[0.08] rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended Focus Session
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  topic.priorityLevel === 'High'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                }`}
              >
                {topic.priorityScore}/100 Priority
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
              {topic.topic.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-stone-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-stone-500" />
                {topic.subject.name}
              </span>
              <span className="text-stone-600">•</span>
              <span className="flex items-center gap-1 text-amber-300 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Exam in {topic.examDaysRemaining} days
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-stone-300">
          {/* Why this topic card */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
              Why this was chosen:
            </span>
            <p className="text-stone-300 leading-relaxed font-normal">
              {topic.reason}
            </p>
          </div>

          {/* Today's Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Today’s Study Objective:</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200 font-medium">
              {topic.studyObjective}
            </div>
          </div>

          {/* Integrated Focus Timer */}
          <div className="p-5 rounded-2xl bg-[#121622] border border-white/[0.08] text-white flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-between w-full text-xs text-stone-400 pb-2 border-b border-white/[0.08]">
              <span className="flex items-center gap-1 text-stone-300 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Focus Session Duration
              </span>
              <div className="flex items-center gap-1 bg-white/[0.06] p-0.5 rounded-lg border border-white/[0.06]">
                {[30, 45, 60].map((min) => (
                  <button
                    key={min}
                    disabled={isActive}
                    onClick={() => {
                      setSessionMinutes(min);
                      setSecondsRemaining(min * 60);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      sessionMinutes === min
                        ? 'bg-amber-400 text-stone-950 font-semibold shadow-xs'
                        : 'text-stone-300 hover:text-white'
                    } disabled:opacity-50`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Interactive Gyroscopic Focus Core */}
            <ThreeFocusCore isActive={isActive} progressPercent={progressPercent} />

            {/* Timer Display */}
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-white py-0.5">
              {formattedTime}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-3 pt-1">
              {!isActive ? (
                <button
                  id="btn-timer-start"
                  onClick={handleStartTimer}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/10"
                >
                  <Play className="w-3.5 h-3.5 fill-stone-950" />
                  <span>Start Timer</span>
                </button>
              ) : (
                <button
                  id="btn-timer-pause"
                  onClick={handlePauseTimer}
                  className="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-amber-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/[0.1]"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={handleResetTimer}
                title="Reset timer"
                className="p-2 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-200">
              <span>Session Milestones ({completedSteps.length}/{defaultActionSteps.length})</span>
              <span className="text-[11px] text-stone-500 font-normal">Check off as you progress</span>
            </div>

            <div className="space-y-1.5">
              {defaultActionSteps.map((step, idx) => {
                const isDone = completedSteps.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-80'
                        : 'bg-white/[0.03] border-white/[0.07] text-stone-200 hover:border-white/[0.15] shadow-xs'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-stone-400 bg-white/[0.05]">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isDone ? 'text-emerald-400' : 'text-stone-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#0d1017] border-t border-white/[0.08] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel / Back
          </button>

          <button
            id="btn-complete-and-log"
            onClick={() => {
              onClose();
              onFinishSession(topic);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-amber-400/10 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-stone-950" />
            <span>Finished Session → Update My Priorities</span>
          </button>
        </div>
      </div>
    </div>
  );
};
