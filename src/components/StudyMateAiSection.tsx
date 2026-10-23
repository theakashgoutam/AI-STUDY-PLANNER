import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Bot,
  Brain,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  RotateCw,
  Zap,
  ListFilter,
  Check,
  ChevronRight,
  Lightbulb,
  FileText,
  HelpCircle as QuizIcon,
  Compass,
  X,
  ChevronDown,
} from 'lucide-react';
import { Subject, Topic, ScoredTopic } from '../types';

interface StudyMateAiSectionProps {
  onApplyGeneratedPlan: (plan: { subject: Subject; topics: Topic[] }) => void;
  activeContextTopic?: ScoredTopic | null;
  onClearContextTopic?: () => void;
  onSelectContextTopic?: (topic: ScoredTopic) => void;
  allScoredTopics?: ScoredTopic[];
  onScrollToPlanner?: () => void;
  pendingPrompt?: string | null;
  onClearPendingPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  actionType?: string;
  studyPlanData?: {
    subject: {
      name: string;
      code: string;
      examDate: string;
      color: string;
    };
    summary: string;
    estimatedTotalHours: number;
    dailyScheduleSummary?: { day: number; topic: string; hours: number; isPriority: boolean }[];
    topics: {
      name: string;
      importance: 'High' | 'Medium' | 'Low';
      completion: number;
      confidence: number;
      latestScore: number | null;
      lastStudiedDaysAgo: number;
      needsRevision: boolean;
      notes: string;
      estimatedHours: number;
      dayNumber: number;
    }[];
    isAiGenerated: boolean;
  };
}

export const StudyMateAiSection: React.FC<StudyMateAiSectionProps> = ({
  onApplyGeneratedPlan,
  activeContextTopic,
  onClearContextTopic,
  allScoredTopics = [],
  onScrollToPlanner,
  pendingPrompt,
  onClearPendingPrompt,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Animation trigger states (presentation sequence)
  const [isInView, setIsInView] = useState(false);
  const [animStage, setAnimStage] = useState<0 | 1 | 2 | 3 | 4>(0);

  // Chat & Plan Wizard State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedPlanId, setAppliedPlanId] = useState<string | null>(null);

  // Plan creation step-by-step state
  const [planWizardActive, setPlanWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [wizardData, setWizardData] = useState({
    subjectName: '',
    examDays: '21',
    dailyHours: '2',
    difficultTopics: '',
    completionPercent: 0,
  });

  // IntersectionObserver for cinematic arrival animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Choreographed introduction animation:
  // 1. Orb appears from side
  // 2. Moves to position
  // 3. Pulse occurs
  // 4. Initial greeting bubble appears
  useEffect(() => {
    if (!isInView || animStage > 0) return;

    // Stage 1: Orb slides into position
    const t1 = setTimeout(() => setAnimStage(1), 150);
    // Stage 2: Glow/pulse ring expands
    const t2 = setTimeout(() => setAnimStage(2), 700);
    // Stage 3: Chat bubble appears
    const t3 = setTimeout(() => {
      setAnimStage(3);
      if (messages.length === 0) {
        setMessages([
          {
            id: 'msg-intro',
            role: 'assistant',
            content:
              "Hi! I'm your AI Study Assistant. Tell me what you need to study, and I'll help you plan it.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isInView, animStage, messages.length]);

  // Scroll internal chat container smoothly to bottom (NEVER scrolls document/window)
  const scrollToChatBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (force || shouldAutoScrollRef.current) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Calculate if user is near the bottom (within 90px)
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 90;
    shouldAutoScrollRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
  };

  // Dedicated wheel listener on chat container:
  // Strictly isolates mouse wheel / trackpad scrolling to the conversation area.
  // When cursor is inside the chat, wheel scrolls the chat and NEVER moves the outer page.
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // Check if conversation container has scrollable content
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop >= maxScroll - 1;

      // When reaching edges of the chat box, prevent the wheel event from propagating
      // to the parent window so the main page does not unexpectedly jump.
      if ((isScrollingDown && atBottom) || (isScrollingUp && atTop)) {
        e.preventDefault();
      }
      e.stopPropagation();
    };

    el.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelEvent);
  }, []);

  // Smart Auto-scroll: Scroll ONLY internal chat container when messages change
  // BUT ONLY IF the user is currently near the bottom. If they scrolled up to read older messages,
  // do NOT force them back to the bottom!
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (shouldAutoScrollRef.current) {
      const raf = requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [messages, isLoading, wizardStep, planWizardActive]);

  // Handle conversational message sending
  const handleSendMessage = async (textToSend?: string, actionType?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    // User is deliberately initiating chat activity: re-anchor to bottom
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionType,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build context if user has active topic
      const context = activeContextTopic
        ? {
            subject: activeContextTopic.subject.name,
            topic: activeContextTopic.topic.name,
            importance: activeContextTopic.topic.importance,
            completion: activeContextTopic.topic.completion,
            confidence: activeContextTopic.topic.confidence,
            examDaysRemaining: activeContextTopic.examDaysRemaining,
            notes: activeContextTopic.topic.notes,
          }
        : undefined;

      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          context,
          actionType,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I'm here to help you study! What concept should we explore?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content:
            "I ran into a temporary connection issue. You can click 'Try Again' or ask another question!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pendingPrompt && pendingPrompt.trim()) {
      handleSendMessage(pendingPrompt.trim());
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt]);

  // Trigger Study Plan Creation Flow
  const startPlanWizard = () => {
    setPlanWizardActive(true);
    setWizardStep(1);
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
    const wizardIntro: ChatMessage = {
      id: `wizard-prompt-${Date.now()}`,
      role: 'assistant',
      content:
        "Let's build your custom study plan! Step 1 of 5: What subject, course, or exam are you preparing for?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, wizardIntro]);
  };

  const handleWizardSubmit = async () => {
    if (!wizardData.subjectName.trim() || isLoading) return;

    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
    setIsLoading(true);
    const summaryMsg: ChatMessage = {
      id: `user-plan-req-${Date.now()}`,
      role: 'user',
      content: `Create a study plan for "${wizardData.subjectName}". Exam in ${wizardData.examDays} days. Available study time: ${wizardData.dailyHours}h/day. Difficult areas: ${wizardData.difficultTopics || 'None specified'}. Current progress: ${wizardData.completionPercent}%.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, summaryMsg]);
    setPlanWizardActive(false);

    try {
      const res = await fetch('/api/ai/create-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: wizardData.subjectName,
          examDays: wizardData.examDays,
          dailyHours: wizardData.dailyHours,
          difficultTopics: wizardData.difficultTopics,
          completionPercent: wizardData.completionPercent,
        }),
      });

      const data = await res.json();

      if (data && data.topics && data.topics.length > 0) {
        const planMsg: ChatMessage = {
          id: `assistant-plan-${Date.now()}`,
          role: 'assistant',
          content: `I've synthesized a customized ${data.dailyScheduleSummary?.length || data.topics.length}-part study roadmap for **${data.subject?.name || wizardData.subjectName}** based on your timeline and high-yield areas:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          studyPlanData: data,
        };
        setMessages((prev) => [...prev, planMsg]);
      } else {
        throw new Error('Invalid plan format');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-plan-err-${Date.now()}`,
          role: 'assistant',
          content:
            "I couldn't complete the full plan generation right now. Would you like me to try again?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert AI Plan into Real Application State & LocalStorage
  const handleApplyPlan = (planData: NonNullable<ChatMessage['studyPlanData']>, messageId: string) => {
    const subjectId = `subj-${Date.now()}`;
    const newSubject: Subject = {
      id: subjectId,
      name: planData.subject.name,
      code: planData.subject.code || planData.subject.name.slice(0, 4).toUpperCase(),
      examDate: planData.subject.examDate,
      color: planData.subject.color || 'amber',
    };

    const newTopics: Topic[] = planData.topics.map((t, idx) => ({
      id: `topic-${Date.now()}-${idx}`,
      subjectId: subjectId,
      name: t.name,
      importance: t.importance,
      completion: t.completion,
      confidence: t.confidence,
      latestScore: t.latestScore,
      lastStudiedDaysAgo: t.lastStudiedDaysAgo || 2,
      needsRevision: t.needsRevision,
      notes: t.notes,
    }));

    onApplyGeneratedPlan({
      subject: newSubject,
      topics: newTopics,
    });

    setAppliedPlanId(messageId);

    // Confirmation message from StudyMate AI
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-confirm-${Date.now()}`,
          role: 'assistant',
          content: `✓ Successfully applied **${planData.subject.name}** (${newTopics.length} topics) directly to your Priority Workspace and 3D Constellation! You can start studying right away.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 400);
  };

  return (
    <div
      id="ai-study-assistant-section"
      ref={sectionRef}
      className="relative py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#06080e] overflow-hidden"
    >
      {/* Background ambient light & space dust */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-gradient-to-b from-amber-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* ================================================================= */}
        {/* SECTION HEADER & PRESENTATION                                    */}
        {/* ================================================================= */}
        <div className="text-center space-y-4">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.09] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-300">
              Powered by Google Gemini
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400">StudyMate AI</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-stone-400 font-normal leading-relaxed">
            Tell AI what you need to study. It understands your goals, generates your prioritized study plan, tracks your progress, and guides you whenever you get stuck.
          </p>
        </div>

        {/* ================================================================= */}
        {/* CHOREOGRAPHED AI ORB & INTRO BANNER                              */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {/* Animated AI Orb Avatar */}
            <div
              className={`relative flex items-center justify-center transition-all duration-700 ease-out transform ${
                animStage >= 1
                  ? 'translate-x-0 opacity-100 scale-100'
                  : '-translate-x-12 opacity-0 scale-75'
              }`}
            >
              {/* Outer pulsing ring */}
              <div
                className={`absolute inset-0 w-12 h-12 rounded-full bg-amber-400/20 blur-md transition-all duration-1000 ${
                  animStage >= 2 ? 'scale-125 animate-ping opacity-35' : 'opacity-0'
                }`}
              />
              {/* Orb core */}
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-sky-400 p-[2px] shadow-lg shadow-amber-400/25">
                <div className="w-full h-full rounded-full bg-[#080a12] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">StudyMate AI</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Online Tutor
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Context-aware academic planner & conversational mentor
              </p>
            </div>
          </div>

          {/* Quick Trigger Button to Create Plan */}
          <div className="flex items-center gap-2">
            <button
              id="btn-ai-start-plan"
              type="button"
              onClick={startPlanWizard}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-stone-950 text-xs font-bold transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-950" />
              <span>Create Plan with AI</span>
            </button>
            {onScrollToPlanner && (
              <button
                type="button"
                onClick={onScrollToPlanner}
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-stone-300 hover:text-white text-xs font-medium border border-white/[0.08] transition-all cursor-pointer"
              >
                View Cards
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* ACTIVE CONTEXT PILL (Displays active study topic if selected)    */}
        {/* ================================================================= */}
        {activeContextTopic && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-xs text-sky-200 min-w-0">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0" />
              <span className="font-semibold text-sky-400 flex-shrink-0">Active Context:</span>
              <span className="font-medium text-white truncate">
                {activeContextTopic.subject.name} → {activeContextTopic.topic.name}
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {activeContextTopic.topic.importance} Yield • {activeContextTopic.topic.completion}% Done
              </span>
            </div>
            {onClearContextTopic && (
              <button
                type="button"
                onClick={onClearContextTopic}
                className="p-1 rounded-md text-sky-400 hover:text-white hover:bg-sky-500/20 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                title="Clear topic context"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">General Mode</span>
              </button>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN CHAT & PLANNER CONTAINER (Dark Glassmorphism)               */}
        {/* ================================================================= */}
        <div className="relative rounded-2xl border border-white/[0.1] bg-[#090c14]/90 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col h-[360px] sm:h-[380px]">
          {/* Messages Flow Area - scrolls independently of window */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            style={{
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 chat-scroll-container select-text"
          >
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-400 text-stone-950 font-medium rounded-tr-xs shadow-md shadow-amber-400/10'
                      : 'bg-white/[0.04] border border-white/[0.08] text-stone-200 rounded-tl-xs backdrop-blur-md'
                  }`}
                >
                  {/* Message body with basic markdown line formatting */}
                  <div className="whitespace-pre-wrap space-y-2">
                    {msg.content}
                  </div>

                  {/* STRUCTURED STUDY PLAN CARD (If AI returned a plan) */}
                  {msg.studyPlanData && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-4 p-4 rounded-xl bg-black/40 border border-white/[0.1] space-y-4"
                    >
                      {/* Plan Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {msg.studyPlanData.subject.name}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30">
                              {msg.studyPlanData.subject.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-500" />
                              Exam: {msg.studyPlanData.subject.examDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-stone-500" />
                              Est: ~{msg.studyPlanData.estimatedTotalHours}h total
                            </span>
                          </p>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {msg.studyPlanData.topics.length} Topics
                        </span>
                      </div>

                      {/* Topics List Preview */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {msg.studyPlanData.topics.map((t, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                              t.importance === 'High'
                                ? 'bg-amber-500/[0.06] border-amber-500/25 text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-stone-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">{t.name}</span>
                                {t.notes?.includes('Priority') && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-rose-500/20 text-rose-300 font-medium">
                                    Weak Gap
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">
                                {t.notes || `Target completion: ${t.completion}%`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  t.importance === 'High'
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                    : 'bg-white/[0.05] text-stone-400'
                                }`}
                              >
                                {t.importance}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                ~{t.estimatedHours}h
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Call to Action: Apply to workspace */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleApplyPlan(msg.studyPlanData!, msg.id)}
                          disabled={appliedPlanId === msg.id}
                          className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            appliedPlanId === msg.id
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-md shadow-amber-400/20'
                          }`}
                        >
                          {appliedPlanId === msg.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Plan Applied to Workspace</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-stone-950" />
                              <span>Apply to Study Plan & Create Cards</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="text-[10px] text-right mt-1 opacity-50 font-mono">
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* STEP-BY-STEP GUIDED WIZARD OVERLAY */}
            {planWizardActive && (
              <div className="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/30 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      AI Study Plan Architect • Step {wizardStep} of 5
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanWizardActive(false)}
                    className="text-stone-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Step 1: Subject Name */}
                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-stone-300 block">
                      1. What subject, course, or exam do you want to study?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Data Structures & Algorithms, Organic Chemistry, AP Physics..."
                      value={wizardData.subjectName}
                      onChange={(e) =>
                        setWizardData((prev) => ({ ...prev, subjectName: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && wizardData.subjectName.trim()) setWizardStep(2);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d111c] border border-white/[0.12] text-xs text-white placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400/60"
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['Data Structures', 'Operating Systems', 'Calculus III', 'Microbiology'].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setWizardData((prev) => ({ ...prev, subjectName: preset }));
                              setWizardStep(2);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 border border-white/[0.08] cursor-pointer"
                          >
                            + {preset}
                          </button>
                        )
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        disabled={!wizardData.subjectName.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Deadline */}
                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-stone-300 block">
                      2. When is your exam or target completion deadline?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '7 Days', val: '7' },
                        { label: '14 Days', val: '14' },
                        { label: '21 Days', val: '21' },
                        { label: '30 Days', val: '30' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setWizardData((prev) => ({ ...prev, examDays: item.val }))}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                            wizardData.examDays === item.val
                              ? 'bg-amber-400 text-stone-950 border-amber-400 font-bold'
                              : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-stone-400">Custom Days:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={wizardData.examDays}
                        onChange={(e) =>
                          setWizardData((prev) => ({ ...prev, examDays: e.target.value }))
                        }
                        className="w-24 px-3 py-1.5 rounded-xl bg-[#0d111c] border border-white/[0.12] text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Daily Study Time */}
                {wizardStep === 3 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-stone-300 block">
                      3. How much time can you realistically study each day?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '1 Hour/day', val: '1' },
                        { label: '2 Hours/day', val: '2' },
                        { label: '3 Hours/day', val: '3' },
                        { label: '4+ Hours/day', val: '4' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setWizardData((prev) => ({ ...prev, dailyHours: item.val }))}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                            wizardData.dailyHours === item.val
                              ? 'bg-amber-400 text-stone-950 border-amber-400 font-bold'
                              : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Difficult Topics */}
                {wizardStep === 4 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-stone-300 block">
                      4. Which topics are most difficult for you? (AI will boost priority & hours)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Trees & Graphs, Dynamic Programming, Pointer arithmetic..."
                      value={wizardData.difficultTopics}
                      onChange={(e) =>
                        setWizardData((prev) => ({ ...prev, difficultTopics: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setWizardStep(5);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d111c] border border-white/[0.12] text-xs text-white placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400/60"
                    />
                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(5)}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5: Syllabus Completion */}
                {wizardStep === 5 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-stone-300 block">
                      5. How much of this syllabus have you completed so far? ({wizardData.completionPercent}%)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Not Started (0%)', val: 0 },
                        { label: 'A Little (25%)', val: 25 },
                        { label: 'Halfway (50%)', val: 50 },
                        { label: 'Most (75%)', val: 75 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() =>
                            setWizardData((prev) => ({ ...prev, completionPercent: item.val }))
                          }
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                            wizardData.completionPercent === item.val
                              ? 'bg-amber-400 text-stone-950 border-amber-400 font-bold'
                              : 'bg-white/[0.03] border-white/[0.08] text-stone-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleWizardSubmit}
                        disabled={isLoading}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-stone-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                        <span>Generate My Study Plan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Thinking / Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 mt-1">
                  <Brain className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white/[0.04] border border-white/[0.08] text-stone-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  <span className="text-stone-300 font-medium">StudyMate AI is thinking...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Floating 'Scroll to latest' button if user scrolled up */}
          {showScrollBottomBtn && (
            <div className="absolute bottom-24 right-5 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  shouldAutoScrollRef.current = true;
                  setShowScrollBottomBtn(false);
                  scrollToChatBottom('smooth', true);
                }}
                className="px-3 py-1.5 rounded-full bg-[#121624]/95 hover:bg-[#1a2034] text-amber-300 hover:text-amber-200 text-xs font-medium border border-amber-400/30 shadow-xl flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>Scroll to latest</span>
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* QUICK ACTIONS ROW                                               */}
          {/* =============================================================== */}
          <div className="px-4 py-2 border-t border-white/[0.06] bg-[#070910] flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-stone-500 flex-shrink-0 font-medium">Quick:</span>
            <button
              type="button"
              onClick={startPlanWizard}
              className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Create Plan</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Explain this topic in simple terms with an analogy', 'explain')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white border border-white/[0.08] flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Lightbulb className="w-3 h-3 text-sky-400" />
              <span>Explain this</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Give me concise high-yield revision notes and formulas for this', 'notes')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white border border-white/[0.08] flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>Make notes</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Quiz me on this topic with 3 challenging multiple-choice questions', 'quiz')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white border border-white/[0.08] flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <QuizIcon className="w-3 h-3 text-amber-400" />
              <span>Quiz me</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Simplify this concept like I am 12 years old (Feynman technique)', 'simplify')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 hover:text-white border border-white/[0.08] flex-shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Simplify</span>
            </button>
          </div>

          {/* =============================================================== */}
          {/* INPUT BAR                                                       */}
          {/* =============================================================== */}
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#070a12]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                id="input-ai-chat"
                type="text"
                placeholder={
                  activeContextTopic
                    ? `Ask StudyMate AI about ${activeContextTopic.topic.name}...`
                    : 'Ask StudyMate AI anything or tell it what to plan...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-hidden focus:border-amber-400/60 focus:bg-white/[0.07] transition-all"
              />
              <button
                id="btn-ai-chat-send"
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 text-stone-950 transition-all cursor-pointer shadow-md shadow-amber-400/10 flex-shrink-0"
                title="Send to StudyMate AI"
              >
                <Send className="w-4 h-4 text-stone-950" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
