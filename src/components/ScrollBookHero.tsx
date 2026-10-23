import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  Brain,
  Flame,
  Clock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Compass,
} from 'lucide-react';

interface ScrollBookHeroProps {
  onScrollToPlanner?: () => void;
}

export const ScrollBookHero: React.FC<ScrollBookHeroProps> = ({
  onScrollToPlanner,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Smooth progress tracking with requestAnimationFrame
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let animId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const headerOffset = 64;
      
      // Total distance that the section scrolls while pinned
      const totalScrollableDistance = rect.height - (windowHeight - headerOffset);
      if (totalScrollableDistance <= 0) return;

      const scrolled = headerOffset - rect.top;
      const rawProgress = scrolled / totalScrollableDistance;
      const clamped = Math.min(1, Math.max(0, rawProgress));
      targetProgressRef.current = clamped;
    };

    const tick = () => {
      const diff = targetProgressRef.current - currentProgressRef.current;
      // Responsive smooth lerp
      if (Math.abs(diff) > 0.0005) {
        currentProgressRef.current += diff * 0.22;
      } else {
        currentProgressRef.current = targetProgressRef.current;
      }
      setScrollProgress(currentProgressRef.current);
      animId = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSkipToPlanner = () => {
    if (onScrollToPlanner) {
      onScrollToPlanner();
      return;
    }
    const plannerEl = document.getElementById('study-planner-workspace');
    if (plannerEl) {
      const headerOffset = 64;
      const elementPosition = plannerEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleJumpToStep = (targetP: number) => {
    if (!containerRef.current) return;
    const headerOffset = 64;
    const windowHeight = window.innerHeight;
    const totalDist = containerRef.current.offsetHeight - (windowHeight - headerOffset);
    const containerTopInDoc = containerRef.current.getBoundingClientRect().top + window.pageYOffset;
    const scrollTarget = containerTopInDoc - headerOffset + targetP * totalDist;
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // Animation Phases Math
  // Phase 0 [0.00 -> 0.10]: Shelf stage -> Center book emerges into center focus
  // Phase 1 [0.10 -> 0.35]: Cover opens (0 -> -180 deg) -> Spread 1 (Ex Libris + Prologue)
  // Phase 2 [0.35 -> 0.60]: Page 1 turns (0 -> -180 deg) -> Spread 2 (Compounding + Deliberate Practice)
  // Phase 3 [0.60 -> 0.85]: Page 2 turns (0 -> -180 deg) -> Spread 3 (Time Scarcity + Roadmap Ready)
  // Phase 4 [0.85 -> 0.93]: 100% Book Open Completion State (All pages open, reading mode)
  // Phase 5 [0.93 -> 1.00]: Smooth exit transition into celestial section
  // -------------------------------------------------------------
  const p = scrollProgress;

  // Shelf separation factor (0 at rest, 1 when side books move away)
  const shelfExit = Math.min(1, Math.max(0, p / 0.10));

  // Center book emergence into focus
  const bookLift = Math.min(1, Math.max(0, p / 0.10));

  // Cover rotation angle [0 to -180]
  const coverProgress = Math.min(1, Math.max(0, (p - 0.10) / 0.25));
  const coverAngle = -coverProgress * 180;

  // Page 1 rotation angle [0 to -180]
  const page1Progress = Math.min(1, Math.max(0, (p - 0.35) / 0.25));
  const page1Angle = -page1Progress * 180;

  // Page 2 rotation angle [0 to -180]
  const page2Progress = Math.min(1, Math.max(0, (p - 0.60) / 0.25));
  const page2Angle = -page2Progress * 180;

  // Phase 4 & 5: Completion and Exit transitions
  const exitProgress = Math.min(1, Math.max(0, (p - 0.93) / 0.07));
  const exitTranslateY = -exitProgress * 50;
  const exitOpacity = 1 - exitProgress * 0.95;
  const exitScale = 1 - exitProgress * 0.05;

  // Shadow calculations based on rotation
  const coverShadow = Math.sin(coverProgress * Math.PI) * 0.45;
  const page1Shadow = Math.sin(page1Progress * Math.PI) * 0.4;
  const page2Shadow = Math.sin(page2Progress * Math.PI) * 0.4;

  // Current active chapter label for HUD
  let currentChapter = 'The Bookshelf';
  if (p >= 0.10 && p < 0.35) currentChapter = 'Spread 1: Prologue & Why Studies Matter';
  else if (p >= 0.35 && p < 0.60) currentChapter = 'Spread 2: Compounding Effort & Deliberate Practice';
  else if (p >= 0.60 && p < 0.85) currentChapter = 'Spread 3: Time Scarcity & The Final Roadmap';
  else if (p >= 0.85 && p < 0.93) currentChapter = '100% Open: Execution Roadmap Ready';
  else if (p >= 0.93) currentChapter = 'Entering Orbital Focus...';

  // Dynamic z-indices so pages never z-fight during rotation
  const coverZIndex = coverProgress > 0 && coverProgress < 1 ? 50 : coverProgress >= 1 ? 5 : 30;
  const page1ZIndex = page1Progress > 0 && page1Progress < 1 ? 50 : page1Progress >= 1 ? 10 : 20;
  const page2ZIndex = page2Progress > 0 && page2Progress < 1 ? 50 : page2Progress >= 1 ? 15 : 10;

  return (
    <section
      ref={containerRef}
      id="scroll-book-hero-section"
      className="relative w-full h-[250vh] sm:h-[270vh] bg-[#06070a] text-[#ededef] select-none"
      style={{ overflow: 'visible' }}
    >
      {/* Sticky Presentation Viewport */}
      <div
        className="sticky top-[64px] h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col justify-between items-center bg-gradient-to-b from-[#06070a] via-[#090c14] to-[#06070a]"
        style={{
          position: 'sticky',
          top: '64px',
          height: 'calc(100vh - 64px)',
          zIndex: 20,
        }}
      >
        {/* Ambient Library Lighting & Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-amber-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[850px] h-[300px] bg-sky-500/[0.04] rounded-full blur-[100px]" />
          {/* Subtle archival woodgrain backdrop */}
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#d4b17b_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Top Control Bar inside Hero */}
        <div className="relative z-20 w-full max-w-6xl px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d1017]/80 border border-white/[0.08] backdrop-blur-md text-amber-300 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Scroll-Driven Discovery</span>
            </div>
            <span className="hidden md:inline-block text-xs text-stone-400 font-medium">
              {currentChapter}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipToPlanner}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white text-xs font-medium border border-white/[0.08] backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Skip to Planner</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>

        {/* 3D BOOKSTAGE CONTAINER */}
        <div
          className="relative z-10 w-full flex-1 flex items-center justify-center px-4 py-2"
          style={{
            opacity: exitOpacity,
            transform: `translateY(${exitTranslateY}px) scale(${exitScale})`,
            transition: 'transform 0.05s linear, opacity 0.05s linear',
          }}
        >
          {/* Bookshelf Wooden Base (fades and lowers as scroll progresses) */}
          <div
            style={{
              transform: `translateY(${shelfExit * 90}px)`,
              opacity: 1 - shelfExit * 0.75,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
            className="absolute bottom-14 sm:bottom-16 w-full max-w-4xl h-10 sm:h-12 bg-gradient-to-r from-stone-900 via-[#2d2217] to-stone-900 rounded-lg shadow-2xl border-t-2 border-[#5c4028] flex items-center justify-center px-8 pointer-events-none"
          >
            {/* Shelf Inlay Brass Plaque */}
            <div className="px-4 py-1 rounded bg-[#3d2e1f] border border-[#785433] shadow-inner text-[10px] tracking-widest font-serif uppercase text-amber-200/70">
              The Architecture of Learning • Knowledge Library
            </div>
          </div>

          {/* SIDE BOOKS (Arranged on shelf, glide away as scroll starts) */}
          {/* Left Book 1 (Emerald Spine) */}
          <div
            style={{
              transform: `translateX(-${shelfExit * 160}px) translateY(${shelfExit * 40}px) rotateZ(-12deg) scale(${
                1 - shelfExit * 0.15
              })`,
              opacity: 1 - shelfExit * 0.7,
            }}
            className="absolute left-8 sm:left-24 bottom-24 sm:bottom-28 w-14 sm:w-20 h-48 sm:h-64 rounded-l-md bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 border border-emerald-700/50 shadow-2xl pointer-events-none hidden md:flex flex-col justify-between p-2.5"
          >
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
            <span className="text-[10px] sm:text-xs font-serif text-amber-200/80 tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 text-center font-bold">
              Cognitive Depth
            </span>
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
          </div>

          {/* Left Book 2 (Cognac Spine) */}
          <div
            style={{
              transform: `translateX(-${shelfExit * 110}px) translateY(${shelfExit * 30}px) rotateZ(-4deg) scale(${
                1 - shelfExit * 0.12
              })`,
              opacity: 1 - shelfExit * 0.65,
            }}
            className="absolute left-20 sm:left-40 bottom-24 sm:bottom-28 w-12 sm:w-16 h-44 sm:h-60 rounded-l-md bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800 border border-amber-700/50 shadow-xl pointer-events-none hidden sm:flex flex-col justify-between p-2.5"
          >
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
            <span className="text-[10px] sm:text-xs font-serif text-amber-200/70 tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 text-center">
              Active Recall
            </span>
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
          </div>

          {/* Right Book 1 (Burgundy Spine) */}
          <div
            style={{
              transform: `translateX(${shelfExit * 110}px) translateY(${shelfExit * 30}px) rotateZ(3deg) scale(${
                1 - shelfExit * 0.12
              })`,
              opacity: 1 - shelfExit * 0.65,
            }}
            className="absolute right-20 sm:right-40 bottom-24 sm:bottom-28 w-12 sm:w-16 h-44 sm:h-60 rounded-r-md bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 border border-rose-700/50 shadow-xl pointer-events-none hidden sm:flex flex-col justify-between p-2.5"
          >
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
            <span className="text-[10px] sm:text-xs font-serif text-amber-200/70 tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 text-center">
              Syllabus Dynamics
            </span>
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
          </div>

          {/* Right Book 2 (Espresso Leaning Spine) */}
          <div
            style={{
              transform: `translateX(${shelfExit * 160}px) translateY(${shelfExit * 40}px) rotateZ(14deg) scale(${
                1 - shelfExit * 0.15
              })`,
              opacity: 1 - shelfExit * 0.7,
            }}
            className="absolute right-8 sm:right-24 bottom-24 sm:bottom-28 w-14 sm:w-20 h-48 sm:h-64 rounded-r-md bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700 border border-stone-600/50 shadow-2xl pointer-events-none hidden md:flex flex-col justify-between p-2.5"
          >
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
            <span className="text-[10px] sm:text-xs font-serif text-stone-300/80 tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 text-center font-bold">
              Time Architecture
            </span>
            <div className="w-full h-1 bg-amber-400/40 rounded-full" />
          </div>

          {/* MAIN 3D HERO BOOK */}
          <div
            className="relative"
            style={{
              perspective: '1800px',
              perspectiveOrigin: '50% 45%',
              // Fixed and centered throughout the entire scroll opening
              transform: isMobile
                ? `scale(0.86) translateY(${p < 0.10 ? (1 - bookLift) * 35 : 0}px)`
                : `scale(1) translateY(${p < 0.10 ? (1 - bookLift) * 45 : 0}px)`,
              transition: 'transform 0.08s linear',
            }}
          >
            {/* The Book Assembly */}
            <div
              className="relative w-[340px] sm:w-[680px] md:w-[740px] lg:w-[780px] h-[450px] sm:h-[480px] select-none"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${10 - bookLift * 10}deg)`,
              }}
            >
              {/* Ground Contact Cast Shadow */}
              <div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/60 blur-xl rounded-full pointer-events-none"
                style={{
                  transform: `scale(${0.8 + coverProgress * 0.25})`,
                }}
              />

              {/* ======================================================== */}
              {/* STATIC BASE LAYER: BACK COVER & PAGE STACK THICKNESS    */}
              {/* ======================================================== */}
              <div
                className="absolute inset-0 rounded-2xl bg-[#141d2b] border border-stone-800 shadow-2xl flex"
                style={{ transform: 'translateZ(-12px)' }}
              >
                {/* Left side book block edge */}
                <div className="w-1/2 h-full border-r border-stone-800 bg-[#f4ebd9] rounded-l-xl opacity-90 shadow-inner" />
                {/* Right side book block edge */}
                <div className="w-1/2 h-full bg-[#f4ebd9] rounded-r-xl opacity-90 shadow-inner" />
              </div>

              {/* Spine Center Groove & Golden Ribbon */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 z-25 pointer-events-none flex flex-col items-center">
                {/* Spine crease shadow */}
                <div className="w-full h-full bg-gradient-to-r from-stone-900/40 via-stone-900/10 to-stone-900/40" />
                {/* Golden Silk Bookmark Ribbon */}
                <div className="absolute top-0 w-2.5 h-[105%] bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 shadow-md rounded-b-sm transform -rotate-1 origin-top">
                  <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%)] bg-[length:4px_4px]" />
                </div>
              </div>

              {/* STATIC BASE LEFT (Dark inner fabric lining underneath turned pages) */}
              <div
                className="absolute top-0 bottom-0 left-0 w-1/2 bg-[#121824] rounded-l-xl shadow-inner z-0 border-l-2 border-stone-800"
                style={{ transform: 'translateZ(-2px)' }}
              />

              {/* ======================================================== */}
              {/* STATIC BASE RIGHT PAGE: Chapter III / Action Call        */}
              {/* Revealed after Page 2 turns fully (100% Book Open state) */}
              {/* ======================================================== */}
              <div
                className="absolute top-0 bottom-0 right-0 w-1/2 bg-[#fdfbf7] text-stone-900 rounded-r-xl p-4 sm:p-6 md:p-7 flex flex-col justify-between border-r-4 border-amber-900/30 shadow-inner z-1 overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0px)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-l from-stone-300/20 via-transparent to-stone-400/25 pointer-events-none" />

                <div className="relative z-10 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-900/80 font-serif tracking-widest uppercase border-b border-stone-300/80 pb-1.5 sm:pb-2">
                    <span>The Climax</span>
                    <span>Active Priority</span>
                  </div>

                  <div className="pt-1 sm:pt-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-900 font-serif font-bold text-xs sm:text-sm mb-1.5 sm:mb-2">
                      ✓
                    </div>
                    <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-stone-900 leading-snug">
                      Your Roadmap Is Ready.
                    </h3>
                  </div>

                  <p className="font-serif text-[11px] sm:text-xs md:text-sm text-stone-700 leading-relaxed">
                    No more staring at an endless syllabus wondering where to begin. The priority engine has calculated your path:
                  </p>

                  <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-stone-700 bg-amber-50/80 p-2 sm:p-2.5 rounded-lg border border-amber-200/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-medium">Exam Urgency: Calculated in days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-medium">Student Weakness: Prioritized first</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                      <span className="font-medium">Syllabus Weight: Scaled & Balanced</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSkipToPlanner}
                    className="w-full mt-1 sm:mt-2 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-[11px] sm:text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer border border-stone-700"
                  >
                    <span>Scroll to Study Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative z-10 text-[9px] sm:text-[10px] text-stone-500 font-serif flex items-center justify-between border-t border-stone-300/80 pt-1.5 sm:pt-2">
                  <span>Page V</span>
                  <span>Execution Awaits</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* TURNING SHEET 2 (Flips from Right to Left on Stage 3)     */}
              {/* Front side = Spread 2 Right, Back side = Spread 3 Left   */}
              {/* ======================================================== */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-1/2 will-change-transform"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${page2Angle}deg)`,
                  zIndex: page2ZIndex,
                }}
              >
                {/* Dynamic Page Turning Shadow Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-r-xl z-30 transition-opacity"
                  style={{
                    backgroundColor: `rgba(0,0,0, ${page2Shadow})`,
                  }}
                />

                {/* FRONT OF PAGE 2: Active Recall & Deliberate Practice */}
                <div
                  className="absolute inset-0 bg-[#fdfbf7] text-stone-900 rounded-r-xl p-4 sm:p-6 md:p-7 flex flex-col justify-between border-r-4 border-amber-900/30 shadow-2xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-stone-300/20 via-transparent to-stone-400/25 pointer-events-none" />

                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-900/80 font-serif tracking-widest uppercase border-b border-stone-300/80 pb-1.5 sm:pb-2">
                      <span>Chapter II</span>
                      <span>Deliberate Practice</span>
                    </div>

                    <div className="pt-1 sm:pt-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-900 font-serif font-bold text-xs sm:text-sm mb-1.5 sm:mb-2">
                        <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-stone-900 leading-snug">
                        Active Recall Over Passive Comfort
                      </h3>
                    </div>

                    <p className="font-serif text-[11px] sm:text-xs md:text-sm text-stone-700 leading-relaxed">
                      Highlighting notes feels productive, but retention fades within days. True mastery demands active retrieval and timed application.
                    </p>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-sky-50 border border-sky-200 space-y-1">
                      <div className="text-[10px] sm:text-[11px] font-semibold text-sky-950 font-serif">
                        Cognitive Restructuring
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-stone-600 leading-normal">
                        When you struggle to retrieve a formula, your brain strengthens synaptic pathways permanently.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 text-[9px] sm:text-[10px] text-stone-500 font-serif flex items-center justify-between border-t border-stone-300/80 pt-1.5 sm:pt-2">
                    <span>Page III</span>
                    <span>Cognitive Science</span>
                  </div>
                </div>

                {/* BACK OF PAGE 2: Time Is Finite / The Urgency Factor */}
                <div
                  className="absolute inset-0 bg-[#fdfbf7] text-stone-900 rounded-l-xl p-4 sm:p-6 md:p-7 flex flex-col justify-between border-l-4 border-amber-900/30 shadow-2xl overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-300/20 via-transparent to-stone-400/25 pointer-events-none" />

                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-900/80 font-serif tracking-widest uppercase border-b border-stone-300/80 pb-1.5 sm:pb-2">
                      <span>Chapter III</span>
                      <span>The Scarcity of Time</span>
                    </div>

                    <div className="pt-1 sm:pt-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-900 font-serif font-bold text-xs sm:text-sm mb-1.5 sm:mb-2">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-stone-900 leading-snug">
                        Time is Your Only Non-Renewable Asset
                      </h3>
                    </div>

                    <p className="font-serif text-[11px] sm:text-xs md:text-sm text-stone-700 leading-relaxed">
                      Exams have fixed calendar dates. When time dwindles, treating all topics equally is fatal. Focus on where points are won or lost.
                    </p>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                      <div className="text-[10px] sm:text-[11px] font-semibold text-rose-950 font-serif">
                        Triage Discipline
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-stone-600 leading-normal">
                        Confront what is difficult first. Confidence is built by conquering your vulnerabilities.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 text-[9px] sm:text-[10px] text-stone-500 font-serif flex items-center justify-between border-t border-stone-300/80 pt-1.5 sm:pt-2">
                    <span>Page IV</span>
                    <span>Strategic Allocation</span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* TURNING SHEET 1 (Flips from Right to Left on Stage 2)     */}
              {/* Front side = Spread 1 Right, Back side = Spread 2 Left   */}
              {/* ======================================================== */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-1/2 will-change-transform"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${page1Angle}deg)`,
                  zIndex: page1ZIndex,
                }}
              >
                {/* Dynamic Page 1 Shadow */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-r-xl z-30 transition-opacity"
                  style={{
                    backgroundColor: `rgba(0,0,0, ${page1Shadow})`,
                  }}
                />

                {/* FRONT OF PAGE 1: Prologue / The Reason to Study (Spread 1 Right) */}
                <div
                  className="absolute inset-0 bg-[#fdfbf7] text-stone-900 rounded-r-xl p-4 sm:p-6 md:p-7 flex flex-col justify-between border-r-4 border-amber-900/30 shadow-2xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-stone-300/20 via-transparent to-stone-400/25 pointer-events-none" />

                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-900/80 font-serif tracking-widest uppercase border-b border-stone-300/80 pb-1.5 sm:pb-2">
                      <span>Prologue</span>
                      <span>Why Studies Matter</span>
                    </div>

                    <div className="pt-1 sm:pt-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-serif font-bold text-sm sm:text-base mb-1.5 sm:mb-2">
                        §
                      </div>
                      <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-stone-900 leading-snug">
                        Knowledge is Not Static. It Compounds.
                      </h3>
                    </div>

                    <p className="font-serif text-[11px] sm:text-xs md:text-sm text-stone-700 leading-relaxed italic">
                      &ldquo;Every concept grasped today reduces the cognitive load of every equation and challenge you will face tomorrow.&rdquo;
                    </p>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50/90 border border-amber-200/90 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[10px] sm:text-xs font-serif">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>The Core Principle</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-stone-600 leading-normal">
                        Education is not about enduring exams—it is the systematic construction of mental sovereignty.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 text-[9px] sm:text-[10px] text-stone-500 font-serif flex items-center justify-between border-t border-stone-300/80 pt-1.5 sm:pt-2">
                    <span>Page I</span>
                    <span>Aristotle • Ethics</span>
                  </div>
                </div>

                {/* BACK OF PAGE 1: Chapter I / Compounding Focus (Spread 2 Left) */}
                <div
                  className="absolute inset-0 bg-[#fdfbf7] text-stone-900 rounded-l-xl p-4 sm:p-6 md:p-7 flex flex-col justify-between border-l-4 border-amber-900/30 shadow-2xl overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-300/20 via-transparent to-stone-400/25 pointer-events-none" />

                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-900/80 font-serif tracking-widest uppercase border-b border-stone-300/80 pb-1.5 sm:pb-2">
                      <span>Chapter I</span>
                      <span>The Architecture of Focus</span>
                    </div>

                    <div className="pt-1 sm:pt-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-serif font-bold text-xs sm:text-sm mb-1.5 sm:mb-2">
                        <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-stone-900 leading-snug">
                        Small Daily Effort Compounds Exponentially
                      </h3>
                    </div>

                    <p className="font-serif text-[11px] sm:text-xs md:text-sm text-stone-700 leading-relaxed">
                      Cramming gives the illusion of memory, but evaporates immediately. Daily structured intervals build permanent intuition.
                    </p>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50 border border-amber-200/90 space-y-1">
                      <div className="text-[10px] sm:text-[11px] font-semibold text-amber-950 font-serif">
                        The 1% Compounding Law
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-stone-600 leading-normal">
                        Just 45 minutes of disciplined focus every single day yields 37 times greater mastery over a semester.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 text-[9px] sm:text-[10px] text-stone-500 font-serif flex items-center justify-between border-t border-stone-300/80 pt-1.5 sm:pt-2">
                    <span>Page II</span>
                    <span>Atomic Study Systems</span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* FRONT COVER ASSEMBLY (Flips from Right to Left on Stage 1) */}
              {/* Front side = Embossed Leather, Back side = Ex Libris Plate */}
              {/* ======================================================== */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-1/2 will-change-transform cursor-pointer"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${coverAngle}deg)`,
                  zIndex: coverZIndex,
                }}
                onClick={() => {
                  if (coverProgress < 0.5) handleJumpToStep(0.35);
                  else handleJumpToStep(0.0);
                }}
              >
                {/* Dynamic Cover Lighting Shadow */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-r-2xl z-30 transition-opacity"
                  style={{
                    backgroundColor: `rgba(0,0,0, ${coverShadow})`,
                  }}
                />

                {/* FRONT COVER (Leather, Gold Foil, Ornate Crest) */}
                <div
                  className="absolute inset-0 rounded-r-2xl bg-gradient-to-br from-[#1b2438] via-[#0f172a] to-[#090d16] border-2 border-amber-500/40 p-6 sm:p-8 flex flex-col justify-between shadow-2xl text-amber-100 overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Embossed Outer Filigree Border */}
                  <div className="absolute inset-3 border border-amber-400/30 rounded-xl pointer-events-none" />
                  <div className="absolute inset-4 border border-amber-500/15 rounded-lg pointer-events-none" />

                  {/* Corner Ornaments */}
                  <div className="absolute top-5 left-5 text-amber-400/60 font-serif text-xs">❖</div>
                  <div className="absolute top-5 right-5 text-amber-400/60 font-serif text-xs">❖</div>
                  <div className="absolute bottom-5 left-5 text-amber-400/60 font-serif text-xs">❖</div>
                  <div className="absolute bottom-5 right-5 text-amber-400/60 font-serif text-xs">❖</div>

                  {/* Top Header Foil */}
                  <div className="relative z-10 text-center space-y-1 pt-2">
                    <span className="text-[10px] sm:text-xs font-serif tracking-[0.25em] text-amber-300/80 uppercase font-semibold">
                      The Philosophical Manual
                    </span>
                    <div className="w-16 h-[1px] bg-amber-400/40 mx-auto" />
                  </div>

                  {/* Center Gilt Seal & Title */}
                  <div className="relative z-10 text-center space-y-3 sm:space-y-4">
                    {/* Golden Crest Emblem */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-b from-amber-400/20 to-amber-600/10 border border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
                    </div>

                    <div className="space-y-1">
                      <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        STUDIES
                        <span className="block text-amber-300">MATTER</span>
                      </h1>
                      <p className="text-[11px] sm:text-xs font-serif tracking-widest text-stone-400 uppercase">
                        The Architecture of Knowledge
                      </p>
                    </div>
                  </div>

                  {/* Bottom Spine Label & Scroll Prompt */}
                  <div className="relative z-10 text-center space-y-2 pb-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] sm:text-xs font-serif text-amber-200">
                      <span>Scroll to Open Book</span>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    </div>
                  </div>
                </div>

                {/* BACK OF COVER (Inside Front Cover Marbled Endpaper & Ex Libris Plate) */}
                <div
                  className="absolute inset-0 rounded-l-2xl bg-[#1c2333] border-2 border-amber-500/30 p-5 sm:p-7 flex flex-col justify-between shadow-2xl text-stone-200 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Marbled Endpaper Graphic Pattern */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Vintage Ex Libris Plate */}
                  <div className="relative z-10 m-auto w-[88%] p-4 sm:p-5 rounded-xl bg-[#fdfbf7] text-stone-900 border-2 border-amber-900/40 shadow-xl text-center space-y-2">
                    <span className="text-[10px] font-serif tracking-widest uppercase text-amber-900 font-bold block">
                      Ex Libris
                    </span>
                    <div className="w-10 h-0.5 bg-amber-800/40 mx-auto" />
                    <h4 className="font-serif text-sm sm:text-base font-bold text-stone-900">
                      The Dedicated Scholar
                    </h4>
                    <p className="text-[11px] font-serif text-stone-600 leading-relaxed italic">
                      &ldquo;Discipline is the bridge between goals and genuine accomplishment.&rdquo;
                    </p>
                    <div className="pt-1.5 text-[10px] font-mono text-stone-500">
                      Curated for High-Yield Mastery
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM HUD / SCROLL STEP PROGRESS CONTROLS */}
        <div className="relative z-20 w-full max-w-4xl px-4 pb-4 sm:pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Visual Step Dots */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0d1017]/80 px-3 py-1.5 rounded-full border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => handleJumpToStep(0.0)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                p < 0.10 ? 'bg-amber-400 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              1. Shelf
            </button>
            <span className="text-stone-600">•</span>
            <button
              onClick={() => handleJumpToStep(0.22)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                p >= 0.10 && p < 0.35
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              2. Prologue
            </button>
            <span className="text-stone-600">•</span>
            <button
              onClick={() => handleJumpToStep(0.48)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                p >= 0.35 && p < 0.60
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              3. Compounding
            </button>
            <span className="text-stone-600">•</span>
            <button
              onClick={() => handleJumpToStep(0.72)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                p >= 0.60 && p < 0.85
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              4. Mastery
            </button>
            <span className="text-stone-600">•</span>
            <button
              onClick={() => handleJumpToStep(0.88)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                p >= 0.85
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              5. Ready
            </button>
          </div>

          {/* Scroll Progress Bar & Down Hint */}
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                style={{ width: `${Math.round(p * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-stone-400 w-9 text-right">
              {Math.round(p * 100)}%
            </span>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400">
              <span>Scroll to explore</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
