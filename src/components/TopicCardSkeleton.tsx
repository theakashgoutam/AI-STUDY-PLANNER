import React from 'react';

export const TopicCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1017]/50 backdrop-blur-xl p-5 sm:p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/[0.08]" />
            <div className="w-20 h-4 rounded-md bg-white/[0.06]" />
            <div className="w-28 h-4 rounded-md bg-white/[0.04]" />
          </div>
          <div className="w-3/5 h-6 rounded-md bg-white/[0.08]" />
        </div>
        <div className="w-16 h-10 rounded-lg bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="space-y-1.5">
          <div className="w-16 h-3 rounded bg-white/[0.04]" />
          <div className="w-24 h-4 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-3 rounded bg-white/[0.04]" />
          <div className="w-14 h-4 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-3 rounded bg-white/[0.04]" />
          <div className="w-20 h-4 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-1.5">
          <div className="w-16 h-3 rounded bg-white/[0.04]" />
          <div className="w-16 h-4 rounded bg-white/[0.06]" />
        </div>
      </div>

      <div className="h-12 rounded-xl bg-white/[0.03] border border-white/[0.05]" />

      <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 rounded-lg bg-white/[0.08]" />
          <div className="w-24 h-8 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="w-14 h-8 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  );
};
