import React, { useEffect } from 'react';
import { Trash2, X, AlertTriangle, BookOpen, Calendar, Star } from 'lucide-react';
import { Topic, Subject } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  topic: Topic | null;
  subject?: Subject | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  topic,
  subject,
  isDeleting = false,
  onClose,
  onConfirm,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !topic) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        id="modal-delete-topic"
        className="bg-[#0b0d13] rounded-2xl max-w-md w-full border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3
                id="delete-modal-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight"
              >
                Delete this study topic?
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                This will permanently remove this topic from your study plan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Topic Information Preview Card */}
        <div className="px-5 sm:px-6 pb-5 space-y-3">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {subject && (
                <span className="font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-stone-300 border border-white/[0.08]">
                  {subject.name}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                  topic.importance === 'High'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                    : topic.importance === 'Medium'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                }`}
              >
                {topic.importance} Importance
              </span>
            </div>

            <div className="font-semibold text-sm text-white">{topic.name}</div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-[11px] text-stone-400">
              <div>
                <span className="text-stone-500 block text-[10px]">Completion</span>
                <span className="font-semibold text-stone-200 font-mono">
                  {topic.completion}%
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Confidence</span>
                <span className="font-semibold text-amber-300 font-mono">
                  {topic.confidence}/5 ★
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Latest Score</span>
                <span className="font-semibold text-stone-200 font-mono">
                  {topic.latestScore !== null ? `${topic.latestScore}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            <span>Priority scores and rankings for remaining topics will recalculate automatically.</span>
          </p>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border-t border-white/[0.08] flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
