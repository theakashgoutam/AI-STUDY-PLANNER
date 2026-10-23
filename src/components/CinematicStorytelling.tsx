import React, { useEffect, useRef, useState } from 'react';
import { ThreePlanetCanvas } from './ThreePlanetCanvas';
import { 
  Compass, 
  Clock, 
  Flame, 
  Brain, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  ShieldAlert, 
  Target,
  BarChart3,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface CinematicStorytellingProps {
  onScrollToPlanner: () => void;
}

export const CinematicStorytelling: React.FC<CinematicStorytellingProps> = ({ onScrollToPlanner }) => {
  // Planet section scroll progress
  const planetSectionRef = useRef<HTMLDivElement>(null);
  const [planetProgress, setPlanetProgress] = useState(0);

  // Alternating sections refs
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  const section5Ref = useRef<HTMLDivElement>(null);

  const [s2Visible, setS2Visible] = useState(false);
  const [s3Visible, setS3Visible] = useState(false);
  const [s4Visible, setS4Visible] = useState(false);
  const [s5Visible, setS5Visible] = useState(false);

  // Scroll listener for Planet transition (Right -> Center)
  useEffect(() => {
    let animFrame: number;

    const handleScroll = () => {
      if (!planetSectionRef.current) return;
      const rect = planetSectionRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      
      // Calculate progress from when top enters to when center reaches top
      const start = windowH * 0.8;
      const end = -windowH * 0.2;
      const current = rect.top;
      
      const rawProgress = (start - current) / (start - end);
      const clamped = Math.min(Math.max(rawProgress, 0), 1);
      setPlanetProgress(clamped);
    };

    const onScrollTick = () => {
      handleScroll();
    };

    window.addEventListener('scroll', onScrollTick, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScrollTick);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Intersection observers for alternating section animations
  useEffect(() => {
    const observerOptions = { threshold: 0.2, rootMargin: '0px 0px -100px 0px' };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === section2Ref.current && entry.isIntersecting) {
          setS2Visible(true);
        }
        if (entry.target === section3Ref.current && entry.isIntersecting) {
          setS3Visible(true);
        }
        if (entry.target === section4Ref.current && entry.isIntersecting) {
          setS4Visible(true);
        }
        if (entry.target === section5Ref.current && entry.isIntersecting) {
          setS5Visible(true);
        }
      });
    }, observerOptions);

    if (section2Ref.current) observer.observe(section2Ref.current);
    if (section3Ref.current) observer.observe(section3Ref.current);
    if (section4Ref.current) observer.observe(section4Ref.current);
    if (section5Ref.current) observer.observe(section5Ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full bg-[#06070a] text-[#ededef] overflow-hidden">
      {/* Background ambient lighting accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-950/20 via-sky-950/10 to-transparent blur-3xl pointer-events-none" />

      {/* =================================================================== */}
      {/* SECTION 1: THE PLANET (Enters from Right → Center)                  */}
      {/* =================================================================== */}
      <div
        ref={planetSectionRef}
        className="relative min-h-[90vh] flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-white/[0.06]"
      >
        {/* 3D WebGL Canvas Layer */}
        <ThreePlanetCanvas progress={planetProgress} />

        {/* Cinematic Content Layer (Positioned on Left/Center for Balance) */}
        <div className="relative z-20 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-widest uppercase text-amber-300">
                Orbital Focus Mechanics
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              The Gravitational Pull of Consistent Study.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-stone-400 font-normal leading-relaxed max-w-xl">
              Sporadic cramming creates high-entropy friction. Daily disciplined intervals establish a stable gravitational field—where complex concepts fall naturally into long-term recall.
            </p>

            {/* Telemetry chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
                <div className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                  Spaced Repetition Orbit
                </div>
                <div className="text-sm font-medium text-white mt-1 flex items-center gap-2">
                  <span className="text-amber-400">T+24h</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-sky-400">T+7d</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-indigo-400">T+30d</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
                <div className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                  Cognitive Drag
                </div>
                <div className="text-sm font-medium text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Eliminated via Priority Engine</span>
                </div>
              </div>
            </div>
          </div>

          {/* Empty spacer for wide screens so 3D planet shines on the right */}
          <div className="hidden lg:block lg:col-span-6 h-96 pointer-events-none" />
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 2: THE COGNITIVE HORIZON (Enters from Left → Center)        */}
      {/* =================================================================== */}
      <div
        ref={section2Ref}
        className="relative min-h-screen flex items-center justify-center py-28 px-4 sm:px-6 lg:px-8 border-b border-white/[0.06]"
      >
        <div className="max-w-6xl w-full mx-auto">
          <div
            className={`transition-all duration-1000 ease-out transform ${
              s2Visible
                ? 'translate-x-0 opacity-100'
                : '-translate-x-24 opacity-0'
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Visual Card on Left */}
              <div className="lg:col-span-6">
                <div className="relative p-6 sm:p-8 rounded-2xl bg-[#0d1017]/80 border border-white/[0.09] backdrop-blur-xl shadow-2xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      <Brain className="w-4 h-4 text-sky-400" />
                      <span>Synaptic Retention vs. Passive Review</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Empirical Data
                    </span>
                  </div>

                  {/* Comparison visual */}
                  <div className="space-y-4">
                    {/* Passive Re-reading */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-400 font-medium">Passive Highlighting & Rereading</span>
                        <span className="text-rose-400 font-semibold">18% Retention @ 7 Days</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div className="w-[18%] h-full bg-rose-500/70 rounded-full" />
                      </div>
                      <p className="text-[11px] text-stone-500 leading-tight">
                        Generates a deceptive feeling of mastery with near-zero synaptic encoding.
                      </p>
                    </div>

                    {/* Active Retrieval */}
                    <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200 font-medium">Algorithmic Retrieval & Problem Solving</span>
                        <span className="text-amber-400 font-semibold">89% Retention @ 7 Days</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div className="w-[89%] h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" />
                      </div>
                      <p className="text-[11px] text-amber-300/80 leading-tight">
                        Retrieval strain anchors neural networks permanently.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-stone-500 flex items-center justify-between">
                    <span>Source: Roediger & Karpicke, Memory Science</span>
                    <span className="text-amber-400/90 font-mono">+394% Efficiency</span>
                  </div>
                </div>
              </div>

              {/* Text on Right */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-[11px] font-medium tracking-widest uppercase text-sky-300">
                    Phase II • Cognitive Horizon
                  </span>
                </div>

                <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                  Confront What Scares You on the Syllabus.
                </h3>

                <p className="text-base sm:text-lg text-stone-400 leading-relaxed font-normal">
                  Students naturally review what feels comfortable. But exam scores are bounded by your single weakest unreviewed gap. The priority engine inverts your comfort zone into your highest scoring lever.
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Confidence Inversion</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>Gap Remediation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 3: THE TRIAD OF PRECISION (Rises from Bottom → Center)      */}
      {/* =================================================================== */}
      <div
        ref={section3Ref}
        className="relative min-h-screen flex items-center justify-center py-28 px-4 sm:px-6 lg:px-8 border-b border-white/[0.06]"
      >
        <div className="max-w-6xl w-full mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-[11px] font-medium tracking-widest uppercase text-indigo-300">
                Phase III • The Triad of Precision
              </span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Three Pillars of Every Decision.
            </h3>
            <p className="text-base sm:text-lg text-stone-400">
              No arbitrary to-do lists. The engine synthesizes three dimensions into a singular mathematical vector.
            </p>
          </div>

          {/* 3 Rising Monolithic Cards */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000 ease-out transform ${
              s3Visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-24 opacity-0'
            }`}
          >
            {/* Card 1: Urgency */}
            <div className="relative p-7 rounded-2xl bg-[#0d1017]/80 border border-white/[0.08] backdrop-blur-xl hover:border-rose-500/30 transition-all group flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold">
                    Vector 01
                  </div>
                  <h4 className="text-xl font-bold text-white mt-1">Exam Proximity</h4>
                </div>
                <p className="text-sm text-stone-400 leading-relaxed">
                  Calendar days until the exam date. Scored using non-linear time decay so urgent milestones rapidly float to the top of your queue.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-stone-500 flex justify-between">
                <span>Weight Default</span>
                <span className="text-rose-400 font-semibold">35%</span>
              </div>
            </div>

            {/* Card 2: Weakness */}
            <div className="relative p-7 rounded-2xl bg-[#0d1017]/80 border border-white/[0.08] backdrop-blur-xl hover:border-amber-500/30 transition-all group flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                    Vector 02
                  </div>
                  <h4 className="text-xl font-bold text-white mt-1">Weakness Inversion</h4>
                </div>
                <p className="text-sm text-stone-400 leading-relaxed">
                  Self-rated or diagnostic mastery level. Gaps with low confidence receive high multipliers, guaranteeing you confront liabilities early.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-stone-500 flex justify-between">
                <span>Weight Default</span>
                <span className="text-amber-400 font-semibold">30%</span>
              </div>
            </div>

            {/* Card 3: Weightage */}
            <div className="relative p-7 rounded-2xl bg-[#0d1017]/80 border border-white/[0.08] backdrop-blur-xl hover:border-sky-500/30 transition-all group flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
                    Vector 03
                  </div>
                  <h4 className="text-xl font-bold text-white mt-1">Syllabus Yield</h4>
                </div>
                <p className="text-sm text-stone-400 leading-relaxed">
                  Percentage of total course grade or historical exam question frequency. Protects against spending 10 hours on a 2% footnote.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-stone-500 flex justify-between">
                <span>Weight Default</span>
                <span className="text-sky-400 font-semibold">20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 4: THE ALGORITHMIC CORE (Scales Small → Large)             */}
      {/* =================================================================== */}
      <div
        ref={section4Ref}
        className="relative min-h-screen flex items-center justify-center py-28 px-4 sm:px-6 lg:px-8 border-b border-white/[0.06]"
      >
        <div className="max-w-5xl w-full mx-auto text-center space-y-12">
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium tracking-widest uppercase text-emerald-300">
                Phase IV • The Mathematical Engine
              </span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Zero Guesswork. Pure Precision.
            </h3>
            <p className="text-base sm:text-lg text-stone-400">
              When your alarm goes off, open the dashboard. Your next 90-minute target is calculated before you even pour your coffee.
            </p>
          </div>

          {/* Scaling Engine Formula Matrix */}
          <div
            className={`transition-all duration-1000 ease-out transform ${
              s4Visible
                ? 'scale-100 opacity-100'
                : 'scale-90 opacity-0'
            }`}
          >
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#101420]/90 to-[#0a0d14]/90 border border-white/[0.1] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              {/* Radial glow background */}
              <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-8">
                {/* Visual Formula Pill */}
                <div className="inline-flex flex-wrap items-center justify-center gap-3 p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/[0.09] font-mono text-sm sm:text-lg text-stone-300">
                  <span className="text-amber-400 font-bold">Priority Score</span>
                  <span className="text-stone-500">=</span>
                  <span className="text-rose-400">(0.35 × Urgency)</span>
                  <span className="text-stone-500">+</span>
                  <span className="text-amber-300">(0.30 × Weakness)</span>
                  <span className="text-stone-500">+</span>
                  <span className="text-sky-400">(0.20 × Yield)</span>
                  <span className="text-stone-500">+</span>
                  <span className="text-indigo-400">(0.15 × Unfinished)</span>
                </div>

                {/* Adaptive properties row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                      Determinism
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">100% Objective</div>
                    <div className="text-[11px] text-stone-400 mt-1">No subjective bias</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                      Adaptability
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">Continuous Recalc</div>
                    <div className="text-[11px] text-stone-400 mt-1">As exams draw nearer</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                      Configurability
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">Custom Weights</div>
                    <div className="text-[11px] text-stone-400 mt-1">Tune engine to syllabus</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                      Execution
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">1-Click Focus</div>
                    <div className="text-[11px] text-stone-400 mt-1">Built-in Pomodoro core</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 5: THE GATEWAY (Blur → Sharp Emergence)                     */}
      {/* =================================================================== */}
      <div
        ref={section5Ref}
        className="relative py-28 px-4 sm:px-6 lg:px-8 text-center"
      >
        <div
          className={`max-w-3xl mx-auto space-y-8 transition-all duration-1000 ease-out transform ${
            s5Visible
              ? 'filter blur-0 opacity-100 translate-y-0'
              : 'filter blur-md opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium tracking-widest uppercase text-amber-300">
              Interactive Workspace
            </span>
          </div>

          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Your Personalized Study Priority Deck.
          </h3>

          <p className="text-base sm:text-lg text-stone-400 font-normal leading-relaxed">
            Every topic in your curriculum, prioritized in descending order of true urgency and academic impact.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onScrollToPlanner}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-stone-950 hover:bg-stone-100 text-sm font-semibold tracking-wide transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Explore Priority Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
