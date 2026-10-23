import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Robust content generator with fallback across reliable models
async function generateGeminiContentWithFallback(
  client: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.8-flash"];
  let lastError: any = null;
  for (const model of models) {
    try {
      return await client.models.generateContent({
        model,
        ...params,
      });
    } catch (err: any) {
      lastError = err;
      // If a model is busy (e.g. 503 high demand), try next available model smoothly
      continue;
    }
  }
  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
  });
});

// AI Priority Explanation & Study Goal Generator
app.post("/api/ai/explain", async (req, res) => {
  try {
    const {
      subject,
      topic,
      examDaysRemaining,
      completion,
      confidence,
      latestScore,
      importance,
      priorityScore,
    } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required." });
    }

    const client = getGeminiClient();

    // Deterministic fallback generator when Gemini API key is missing or on error
    const generateFallback = () => {
      const urgencyNote = examDaysRemaining <= 7 
        ? `Exam is in only ${examDaysRemaining} days.`
        : examDaysRemaining <= 14 
        ? `Exam is approaching in ${examDaysRemaining} days.` 
        : `Exam is ${examDaysRemaining} days away.`;
      
      const scoreNote = latestScore !== null && latestScore !== undefined
        ? `Recent score is ${latestScore}%`
        : `No diagnostic quiz taken yet`;
      
      const compNote = `${100 - completion}% syllabus unfinished`;

      let reason = `Why prioritized: ${urgencyNote} ${scoreNote}, topic carries ${importance.toLowerCase()} exam weight, and ${compNote}.`;
      let objective = `Master key concepts and definitions for ${topic}, then complete 5–10 targeted practice problems.`;
      let nextAction = `Review core formulas/theories (25m) → Solve 5 active recall problems (20m) → Quick self-check quiz (15m).`;

      if (priorityScore >= 80) {
        reason = `Urgent priority (#1 focus): ${scoreNote} with ${examDaysRemaining} days until exam. High risk of lost points if not addressed immediately.`;
        objective = `Clarify fundamental sticking points in ${topic}, eliminate misconceptions, and practice high-yield exam question types.`;
        nextAction = `Concept deep-dive (30m) → Solve 10 standard problems (25m) → Note down mistakes in an error log (10m).`;
      } else if (priorityScore < 50) {
        reason = `Maintenance priority: Strong current footing with ${completion}% complete and confidence ${confidence}/5. Keep fresh with periodic review.`;
        objective = `Light active recall and timed problem set to consolidate mastery.`;
        nextAction = `Timed 20-minute drill on mixed question styles to maintain fluency without over-studying.`;
      }

      return { reason, objective, nextAction, isAiGenerated: false };
    };

    if (!client) {
      return res.json(generateFallback());
    }

    const prompt = `You are the AI Priority Engine for a student's study planner.
A student has the following strictly recorded academic status:
- Subject: ${subject}
- Topic: ${topic}
- Exam Days Remaining: ${examDaysRemaining}
- Completion: ${completion}%
- Student Confidence: ${confidence}/5
- Latest Quiz/Test Score: ${latestScore !== null && latestScore !== undefined ? latestScore + "%" : "Not yet tested"}
- Importance / Weightage: ${importance}
- Calculated Priority Score: ${priorityScore}/100

CRITICAL RULES:
1. Strictly DO NOT invent or fabricate any marks, exam dates, or topic weightage. Use ONLY the data provided.
2. Provide:
   - "reason": A single punchy, transparent sentence explaining why this topic received its priority rank based on the data.
   - "objective": One specific, high-yield study objective for a 45-60 minute study session.
   - "nextAction": A concrete 3-step action sequence (e.g. "Review concept X → solve 5 practice questions → take quick quiz").

Respond with valid JSON with keys: "reason", "objective", "nextAction".`;

    const response = await generateGeminiContentWithFallback(client, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "";
    try {
      const parsed = JSON.parse(responseText);
      return res.json({
        reason: parsed.reason,
        objective: parsed.objective,
        nextAction: parsed.nextAction,
        isAiGenerated: true,
      });
    } catch {
      return res.json(generateFallback());
    }
  } catch (err: any) {
    console.error("AI Generation error:", err?.message || err);
    // Graceful fallback so student workflow is uninterrupted
    const { subject, topic, examDaysRemaining, completion, confidence, latestScore, importance, priorityScore } = req.body;
    const scoreNote = latestScore !== null && latestScore !== undefined ? `Recent score is ${latestScore}%.` : "Topic is not yet assessed.";
    return res.json({
      reason: `Prioritized based on ${examDaysRemaining} days remaining, ${importance.toLowerCase()} importance, and ${100 - completion}% unfinished syllabus. ${scoreNote}`,
      objective: `Focus on core principles and high-yield problems for ${topic}.`,
      nextAction: `Review core notes (25m) → Solve 5 active recall questions (20m) → Quick self-check quiz (15m).`,
      isAiGenerated: false,
    });
  }
});

// =========================================================================
// AI Chatbot Assistant: StudyMate AI
// =========================================================================
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, context, actionType } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const client = getGeminiClient();

    // Prepare context snippet if provided
    let contextSnippet = "";
    if (context && (context.subject || context.topic)) {
      contextSnippet = `\nCurrent Academic Context:\n- Active Subject: ${context.subject || "General Studies"}\n- Active Topic: ${context.topic || "None selected"}\n- Topic Importance: ${context.importance || "Medium"}\n- Student Mastery/Completion: ${context.completion ?? 0}%\n- Self Confidence: ${context.confidence ?? 3}/5\n- Days to Exam: ${context.examDaysRemaining ?? 14} days\n`;
    }

    const systemInstruction = `You are StudyMate AI, a world-class AI study tutor, academic planner, and intellectual mentor.
Your role is to help students learn deeply, eliminate conceptual confusion, prepare thoroughly for exams, and stay motivated.
Key Directives:
1. Explain concepts simply and intuitively first, using vivid analogies or visual mental models, then provide technical precision.
2. If the user asks for "notes", produce scannable, high-yield bulleted revision summaries with key definitions and formulas.
3. If the user asks for "quiz" or "practice questions", output 3-5 high-yield multiple choice or active-recall conceptual questions with clear answers and explanations.
4. If the user asks to "simplify", explain like they are a complete beginner (Feynman technique).
5. If the user asks for "comparison", highlight key structural, algorithmic, or conceptual differences in a clear table or bullet points.
6. When answering coding, mathematical, or scientific questions, format with clean markdown syntax (code blocks, bold terms, mathematical notation).
7. Speak warmly, concisely, and with encouraging academic authority.${contextSnippet}`;

    // Graceful fallback if Gemini client is unavailable
    if (!client) {
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      let fallbackReply = `I understand you are studying ${context?.topic ? `"${context.topic}" in ${context?.subject || 'your course'}` : 'this subject'}. Here is a concise breakdown:\n\n` +
        `• **Core Concept**: Focus on breaking down the fundamental definitions and structural relations.\n` +
        `• **Active Recall**: Test yourself by writing out the explanation without looking at reference material.\n` +
        `• **Key Application**: Work through standard examples to solidify synaptic retention.\n\n` +
        `*(To enable full dynamic Gemini conversational tutoring, connect your Gemini API key in Settings > Secrets.)*`;

      if (actionType === 'quiz' || lastUserMessage.toLowerCase().includes('quiz')) {
        fallbackReply = `Here is a quick diagnostic quiz for **${context?.topic || 'your topic'}**:\n\n` +
          `1. What is the primary operational trade-off of this concept?\n` +
          `2. Under what edge-case condition does this principle fail or become inefficient?\n` +
          `3. How does this compare to its closest alternative method?\n\n` +
          `*Try answering these in your own words, then verify with your core notes!*`;
      } else if (actionType === 'notes' || lastUserMessage.toLowerCase().includes('notes')) {
        fallbackReply = `### High-Yield Revision Notes: ${context?.topic || 'Study Target'}\n\n` +
          `• **Definition**: Master the foundational theorem and vocabulary.\n` +
          `• **Key Mechanism**: Track the step-by-step state transformation or derivation.\n` +
          `• **Common Exam Trap**: Pay attention to boundary conditions and common sign/index errors.\n` +
          `• **Retention Trigger**: Spaced review scheduled for T+24h and T+7d.`;
      }

      return res.json({
        reply: fallbackReply,
        isAiGenerated: false,
      });
    }

    // Build conversation history for Gemini
    // We convert previous messages to alternating user/model contents
    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === "assistant" ? "model" : "user";
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    const response = await generateGeminiContentWithFallback(client, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm here to help you study! What concept would you like to explore next?";
    return res.json({
      reply,
      isAiGenerated: true,
    });
  } catch (err: any) {
    console.error("AI Chat error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to generate AI response. Please try again.",
      reply: "I encountered a momentary connection glitch. Let's try that question again!",
    });
  }
});

// =========================================================================
// Structured AI Study Plan Generator
// =========================================================================
app.post("/api/ai/create-study-plan", async (req, res) => {
  try {
    const rawSub = req.body.subjectName || req.body.subject || req.body.courseName || req.body.name;
    const subjectName = typeof rawSub === "string" ? rawSub.trim() : "";

    if (!subjectName) {
      return res.status(400).json({ error: "Subject or course name is required." });
    }

    let calculatedDays = 21;
    if (req.body.examDays) {
      calculatedDays = parseInt(String(req.body.examDays), 10) || 21;
    } else if (req.body.examDate) {
      const diff = Math.ceil((new Date(req.body.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (!isNaN(diff) && diff > 0) calculatedDays = diff;
    }

    const examDays = Math.max(1, calculatedDays);
    const dailyHours = Math.max(0.5, parseFloat(String(req.body.dailyHours || req.body.dailyStudyHours || 2)) || 2);
    const completionPercent = Math.min(
      100,
      Math.max(0, parseInt(String(req.body.completionPercent || req.body.syllabusProgress || 0), 10) || 0)
    );
    const difficultTopics = req.body.difficultTopics || "";
    const additionalNotes = req.body.additionalNotes || req.body.userGoal || "";

    const client = getGeminiClient();
    const days = examDays;
    const hours = dailyHours;
    const existingComp = completionPercent;
    const rawDifficult = Array.isArray(difficultTopics)
      ? difficultTopics.join(", ")
      : String(difficultTopics || "");

    // Fallback generator if Gemini is unavailable
    const generateFallbackPlan = () => {
      const sub = subjectName.trim();
      const subjectCode = sub
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4) + (Math.floor(Math.random() * 800) + 100);

      // Derive smart topics based on subject name
      let topicNames: { name: string; isDifficult: boolean; importance: "High" | "Medium" | "Low" }[] = [];
      const lower = sub.toLowerCase();

      if (lower.includes("data structure") || lower.includes("dsa") || lower.includes("algorithm")) {
        topicNames = [
          { name: "Arrays & Dynamic Lists", isDifficult: false, importance: "Medium" },
          { name: "Linked Lists & Pointer Logic", isDifficult: false, importance: "Medium" },
          { name: "Stacks & Queues Applications", isDifficult: false, importance: "Medium" },
          { name: "Binary Trees & BST Traversals", isDifficult: true, importance: "High" },
          { name: "Balanced Trees & Heaps", isDifficult: true, importance: "High" },
          { name: "Graph BFS/DFS & Shortest Paths", isDifficult: true, importance: "High" },
          { name: "Sorting & Search Optimization", isDifficult: false, importance: "Low" },
          { name: "Dynamic Programming Foundations", isDifficult: true, importance: "High" },
        ];
      } else if (lower.includes("operating system") || lower.includes("os")) {
        topicNames = [
          { name: "Process Management & PCB", isDifficult: false, importance: "Medium" },
          { name: "CPU Scheduling Algorithms", isDifficult: true, importance: "High" },
          { name: "Synchronization & Semaphores", isDifficult: true, importance: "High" },
          { name: "Deadlock Detection & Avoidance", isDifficult: true, importance: "High" },
          { name: "Memory Management & Paging", isDifficult: true, importance: "High" },
          { name: "Virtual Memory & Page Replacement", isDifficult: true, importance: "High" },
          { name: "File System Architecture", isDifficult: false, importance: "Medium" },
          { name: "I/O Systems & Disk Scheduling", isDifficult: false, importance: "Low" },
        ];
      } else if (lower.includes("database") || lower.includes("dbms") || lower.includes("sql")) {
        topicNames = [
          { name: "ER Modeling & Relational Schema", isDifficult: false, importance: "Medium" },
          { name: "Relational Algebra & Tuple Calculus", isDifficult: true, importance: "High" },
          { name: "SQL Queries & Aggregations", isDifficult: false, importance: "Medium" },
          { name: "Normal Forms (1NF to BCNF)", isDifficult: true, importance: "High" },
          { name: "Transaction Processing & ACID", isDifficult: false, importance: "High" },
          { name: "Concurrency Control Protocols", isDifficult: true, importance: "High" },
          { name: "Indexing & B+ Trees", isDifficult: true, importance: "High" },
          { name: "Crash Recovery & WAL", isDifficult: false, importance: "Medium" },
        ];
      } else {
        // General syllabus breakdown
        topicNames = [
          { name: `${sub}: Core Principles & Definitions`, isDifficult: false, importance: "Medium" },
          { name: `${sub}: Fundamental Mechanics & Models`, isDifficult: false, importance: "Medium" },
          { name: `${sub}: Intermediate Analytical Methods`, isDifficult: true, importance: "High" },
          { name: `${sub}: Advanced Applications & Problem Solving`, isDifficult: true, importance: "High" },
          { name: `${sub}: Edge Cases & Complex Scenarios`, isDifficult: true, importance: "High" },
          { name: `${sub}: Practice & Synthesis Review`, isDifficult: false, importance: "High" },
        ];
      }

      // Mark user-specified difficult topics
      if (rawDifficult) {
        const diffWords = rawDifficult.toLowerCase().split(/[ ,]+/);
        topicNames.forEach((t) => {
          if (diffWords.some((w) => w.length > 2 && t.name.toLowerCase().includes(w))) {
            t.isDifficult = true;
            t.importance = "High";
          }
        });
      }

      // Calculate future exam date ISO
      const examDateObj = new Date();
      examDateObj.setDate(examDateObj.getDate() + days);
      const examDateStr = examDateObj.toISOString().split("T")[0];

      const topics = topicNames.map((t, idx) => {
        const estHours = t.isDifficult ? hours * 1.5 : hours;
        return {
          id: `topic-ai-${Date.now()}-${idx}`,
          name: t.name,
          importance: t.importance,
          completion: existingComp > 0 ? Math.max(0, Math.min(100, Math.round(existingComp * (t.isDifficult ? 0.6 : 1.1)))) : 0,
          confidence: t.isDifficult ? 2 : 3,
          latestScore: null,
          lastStudiedDaysAgo: 5,
          needsRevision: t.isDifficult,
          notes: t.isDifficult
            ? `★ Priority: Difficult topic highlighted by student. Recommended: ${estHours}h focused deep dive.`
            : `Scheduled review: ${estHours}h standard study block.`,
          estimatedHours: estHours,
          dayNumber: Math.min(days, Math.round(((idx + 1) / topicNames.length) * days)),
        };
      });

      return {
        subject: {
          name: sub,
          code: subjectCode,
          examDate: examDateStr,
          color: "amber",
        },
        summary: `Tailored ${days}-day study roadmap for ${sub}. Allocating ${hours} hours daily with boosted weightage on complex topics.`,
        estimatedTotalHours: Math.round(topics.reduce((acc, curr) => acc + curr.estimatedHours, 0)),
        dailyScheduleSummary: topics.map((t) => ({
          day: t.dayNumber,
          topic: t.name,
          hours: t.estimatedHours,
          isPriority: t.importance === "High",
        })),
        topics,
        isAiGenerated: false,
      };
    };

    if (!client) {
      return res.json(generateFallbackPlan());
    }

    const prompt = `You are the master curriculum planner of StudyMate AI.
Generate a comprehensive, scientifically sequenced, and highly effective academic study plan for a student.

Student Academic Input:
- Subject/Course Name: ${subjectName}
- Days Remaining until Exam: ${days} days
- Available Study Time: ${hours} hours per day
- Difficult/Weak Topics Identified: ${rawDifficult || "None specified, balance uniformly"}
- Current Syllabus Completion: ${existingComp}%
- Additional Context / Syllabus Notes: ${additionalNotes || "Standard college/high-school curriculum"}

REQUIREMENTS:
1. Divide this syllabus into 6 to 9 distinct, logical, cohesive study topics.
2. For any topic that matches the student's difficult areas, set:
   - "importance" to "High"
   - "confidence" to 1 or 2
   - "needsRevision" to true
   - In notes, explicitly mark "★ Priority: Difficult Topic" and explain what to master.
3. For easier or baseline topics, set completion appropriately (reflecting ${existingComp}%), confidence 3-4, and importance "Medium" or "Low".
4. Sequence the topics logically (prerequisites first, followed by synthesis and high-yield problem solving).
5. Suggest an exam date exactly ${days} days from today (Current date: ${new Date().toISOString().split("T")[0]}).
6. Choose a badge color for the subject among: 'amber', 'sky', 'indigo', 'emerald', 'rose', 'violet'.

Respond strictly with valid JSON conforming to this schema:
{
  "subject": {
    "name": string,
    "code": string,
    "examDate": string (YYYY-MM-DD),
    "color": string
  },
  "summary": string,
  "estimatedTotalHours": number,
  "dailyScheduleSummary": [
    {
      "day": number,
      "topic": string,
      "hours": number,
      "isPriority": boolean
    }
  ],
  "topics": [
    {
      "name": string,
      "importance": "High" | "Medium" | "Low",
      "completion": number (0-100),
      "confidence": number (1-5),
      "latestScore": null,
      "lastStudiedDaysAgo": number,
      "needsRevision": boolean,
      "notes": string,
      "estimatedHours": number,
      "dayNumber": number
    }
  ]
}`;

    let response: any = null;
    try {
      response = await generateGeminiContentWithFallback(client, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });
    } catch (err: any) {
      console.warn("Gemini generation failed, using intelligent fallback planner:", err?.message || err);
      return res.json(generateFallbackPlan());
    }

    const responseText = response?.text?.trim() || "";
    try {
      const parsed = JSON.parse(responseText);
      if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
        return res.json(generateFallbackPlan());
      }
      return res.json({
        ...parsed,
        isAiGenerated: true,
      });
    } catch {
      return res.json(generateFallbackPlan());
    }
  } catch (err: any) {
    console.error("AI Create Study Plan error:", err?.message || err);
    // Return gracefully
    return res.status(200).json({
      subject: {
        name: "General Studies",
        code: "GEN101",
        examDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
        color: "amber",
      },
      summary: "Custom study roadmap generated based on your academic goals.",
      estimatedTotalHours: 40,
      dailyScheduleSummary: [],
      topics: [],
      isAiGenerated: false,
    });
  }
});

// =========================================================================
// AI Mock Test Generator
// =========================================================================
app.post("/api/ai/mock-test/generate", async (req, res) => {
  try {
    const {
      subjectName,
      syllabusTopics = [],
      coverage = "full",
      selectedTopicIds = [],
      difficulty = "Adaptive",
      questionCount = 10,
      durationMinutes = 20,
      questionTypes = ["mcq", "conceptual", "application", "numerical"],
      syllabusInput = "",
    } = req.body;

    const count = Math.min(30, Math.max(3, parseInt(String(questionCount), 10) || 10));
    const sub = (subjectName || "General Course").trim();

    // Determine candidate topics
    let candidateTopics: any[] = [];
    if (coverage === "selected" && Array.isArray(selectedTopicIds) && selectedTopicIds.length > 0) {
      candidateTopics = syllabusTopics.filter((t: any) => selectedTopicIds.includes(t.id));
    } else if (coverage === "weak") {
      candidateTopics = syllabusTopics.filter(
        (t: any) => (t.latestScore !== null && t.latestScore < 65) || t.confidence <= 2 || t.needsRevision
      );
    }
    if (candidateTopics.length === 0) {
      candidateTopics = syllabusTopics.length > 0 ? syllabusTopics : [{ name: sub, importance: "High" }];
    }

    const topicNames = candidateTopics.map((t: any) => t.name);

    // Fallback generator for rich, authentic syllabus-aligned questions
    const generateFallbackMockQuestions = () => {
      const questions: any[] = [];
      const difficulties: ("Easy" | "Medium" | "Hard")[] =
        difficulty === "Adaptive"
          ? ["Easy", "Easy", "Medium", "Medium", "Medium", "Hard", "Hard", "Medium"]
          : [difficulty as "Easy" | "Medium" | "Hard"];

      for (let i = 0; i < count; i++) {
        const targetTopic = candidateTopics[i % candidateTopics.length];
        const topicName = targetTopic.name;
        const qDiff = difficulties[i % difficulties.length];
        const qType = questionTypes[i % questionTypes.length] || "conceptual";

        let qText = "";
        let opts: { id: "A" | "B" | "C" | "D"; text: string }[] = [];
        let correctOpt: "A" | "B" | "C" | "D" = "B";
        let explanation = "";
        let concept = "";
        let whyIncorrect = "";

        const lowerT = topicName.toLowerCase();
        if (lowerT.includes("normal") || lowerT.includes("bcnf") || lowerT.includes("1nf")) {
          qText = `In relational database design for "${topicName}", what condition strictly distinguishes Boyce-Codd Normal Form (BCNF) from Third Normal Form (3NF)?`;
          opts = [
            { id: "A", text: "Every non-prime attribute must depend on the whole candidate key." },
            { id: "B", text: "For every non-trivial functional dependency X → Y, X must be a superkey." },
            { id: "C", text: "There can be no multi-valued dependencies across relations." },
            { id: "D", text: "All attributes must be atomic and prime keys cannot be decomposed." },
          ];
          correctOpt = "B";
          concept = "BCNF Superkey Determinant Rule";
          explanation = "BCNF eliminates all redundancy by demanding that every determinant (LHS) of a functional dependency is a superkey, whereas 3NF permits Y to be a prime attribute.";
          whyIncorrect = "Confusing 3NF's alternative condition (Y is prime) with BCNF's strict requirement that X must be a superkey.";
        } else if (lowerT.includes("sql") || lowerT.includes("query") || lowerT.includes("join")) {
          qText = `When optimizing execution for "${topicName}", which join algorithm provides the lowest I/O cost when one relation is small enough to fit entirely in main memory?`;
          opts = [
            { id: "A", text: "Sort-Merge Join with external two-pass sorting." },
            { id: "B", text: "Block Nested-Loop Hash Join with the small relation as build input." },
            { id: "C", text: "Cartesian product followed by pipelined index filter." },
            { id: "D", text: "Naive Index scan on both unindexed tables." },
          ];
          correctOpt = "B";
          concept = "In-Memory Hash Join Optimization";
          explanation = "Building an in-memory hash table for the smaller table requires scanning each outer block only once, minimizing total page I/O.";
          whyIncorrect = "Sort-Merge requires initial sort overhead, whereas an in-memory hash build eliminates sorting entirely.";
        } else if (lowerT.includes("memory") || lowerT.includes("page") || lowerT.includes("lru")) {
          qText = `In virtual memory systems studying "${topicName}", under which page replacement policy does Belady's Anomaly (where increasing page frames increases page faults) theoretically occur?`;
          opts = [
            { id: "A", text: "Least Recently Used (LRU) stack algorithm." },
            { id: "B", text: "First-In, First-Out (FIFO) queue policy." },
            { id: "C", text: "Optimal Page Replacement (MIN/OPT)." },
            { id: "D", text: "Least Frequently Used with decay aging." },
          ];
          correctOpt = "B";
          concept = "Belady's Anomaly & Stack Algorithms";
          explanation = "FIFO is not a stack algorithm; the set of pages in memory with n frames is not guaranteed to be a subset of those with n+1 frames, enabling anomalous fault rates.";
          whyIncorrect = "LRU and Optimal are provably stack algorithms and can never exhibit Belady's Anomaly.";
        } else if (lowerT.includes("trans") || lowerT.includes("acid") || lowerT.includes("concurr")) {
          qText = `Regarding "${topicName}", what critical property is guaranteed by strict Two-Phase Locking (Strict 2PL) that basic 2PL does NOT guarantee?`;
          opts = [
            { id: "A", text: "Complete prevention of deadlocks without timeout." },
            { id: "B", text: "Prevention of cascading aborts and ensuring strict recoverability." },
            { id: "C", text: "Linear execution speed without locking overhead." },
            { id: "D", text: "Automatic upgrade of shared locks to exclusive locks." },
          ];
          correctOpt = "B";
          concept = "Strict 2PL & Cascading Abort Prevention";
          explanation = "Strict 2PL holds all exclusive locks until transaction commit or abort, guaranteeing that no other transaction can read uncommitted data, preventing cascading aborts.";
          whyIncorrect = "Strict 2PL does not prevent deadlocks; in fact, holding locks until commit can increase deadlock probability.";
        } else if (lowerT.includes("dynamic") || lowerT.includes("knapsack") || lowerT.includes("dp")) {
          qText = `For the 0/1 Knapsack problem in "${topicName}", why is the dynamic programming solution considered pseudo-polynomial rather than purely polynomial?`;
          opts = [
            { id: "A", text: "Because recursion depth exceeds heap memory limits." },
            { id: "B", text: "Because runtime O(n · W) depends on the magnitude of W, which is exponential in its binary input length." },
            { id: "C", text: "Because it cannot compute items with fractional weights." },
            { id: "D", text: "Because memoization tables require quadratic hashing collision resolution." },
          ];
          correctOpt = "B";
          concept = "Pseudo-Polynomial Complexity & Input Encoding";
          explanation = "The time complexity is polynomial with respect to the numerical value of capacity W, but exponential in the number of bits required to write W.";
          whyIncorrect = "Confusing the numerical parameter value with the representation size in bits.";
        } else if (lowerT.includes("sched") || lowerT.includes("deadlock") || lowerT.includes("banker")) {
          qText = `In Banker's Algorithm for deadlock avoidance in "${topicName}", a state is defined as 'safe' if and only if:`;
          opts = [
            { id: "A", text: "No process holds more than one resource instance." },
            { id: "B", text: "There exists a safe sequence of processes that can all finish without deadlocking." },
            { id: "C", text: "Total available resources exceed the sum of all future maximum claims." },
            { id: "D", text: "All circular wait conditions are preempted by priority inversion." },
          ];
          correctOpt = "B";
          concept = "Safe Sequence in Banker's Algorithm";
          explanation = "A safe state guarantees at least one execution ordering where every process can satisfy maximum claims and release resources safely.";
          whyIncorrect = "Available resources do not need to satisfy all maximum claims at once, only sequentially.";
        } else if (lowerT.includes("tcp") || lowerT.includes("flow") || lowerT.includes("congest")) {
          qText = `During TCP Reno Congestion Control for "${topicName}", what immediate adjustment occurs upon detecting three duplicate ACKs (Fast Retransmit)?`;
          opts = [
            { id: "A", text: "Congestion window (cwnd) drops to 1 MSS and slow start restarts." },
            { id: "B", text: "ssthresh is set to cwnd/2, cwnd is set to ssthresh + 3 MSS, and Fast Recovery begins." },
            { id: "C", text: "All pending packets are dropped and receiver advertised window resets to 0." },
            { id: "D", text: "TCP enters exponential backoff and doubles the retransmission timer." },
          ];
          correctOpt = "B";
          concept = "TCP Fast Retransmit & Fast Recovery";
          explanation = "Three duplicate ACKs signal that packets are still traversing the network (no timeout), so TCP halves ssthresh and uses fast recovery rather than dropping cwnd to 1.";
          whyIncorrect = "Dropping cwnd to 1 MSS only occurs on retransmission timeouts (RTO), not on triple duplicate ACKs.";
        } else if (lowerT.includes("calculus") || lowerT.includes("integral") || lowerT.includes("vector")) {
          qText = `In vector calculus for "${topicName}", Green's Theorem converts a line integral around a positively oriented simple closed curve C into:`;
          opts = [
            { id: "A", text: "A triple volume integral over the bounded 3D solid." },
            { id: "B", text: "A double integral over the plane region D bounded by C of (∂Q/∂x - ∂P/∂y) dA." },
            { id: "C", text: "The scalar dot product of the gradient vector with unit normal n." },
            { id: "D", text: "A line integral along the surface boundary in spherical coordinates." },
          ];
          correctOpt = "B";
          concept = "Green's Theorem & Circulation Density";
          explanation = "Green's theorem relates circulation around the boundary curve C to the curl's k-component integrated across region D.";
          whyIncorrect = "Confusing Green's Theorem in the plane with Divergence Theorem in 3D or Stokes' Theorem on arbitrary curved surfaces.";
        } else {
          // General high-yield question for custom user syllabus topic
          qText = `For ${topicName} in ${sub}, what is the foundational principle or trade-off governing its application?`;
          opts = [
            { id: "A", text: `Ignoring boundary constraints and optimizing purely for static execution speed.` },
            { id: "B", text: `Balancing systematic resource utilization against algorithmic complexity and stability.` },
            { id: "C", text: `Eliminating all prerequisite validation checks to minimize latency overhead.` },
            { id: "D", text: `Relying strictly on unindexed linear search across partitioned datasets.` },
          ];
          correctOpt = "B";
          concept = `${topicName} Fundamental Mechanics`;
          explanation = `Mastery of ${topicName} requires balancing architectural trade-offs between efficiency, safety invariants, and implementation complexity.`;
          whyIncorrect = `Overlooking invariant constraints and edge conditions leads to failure under peak loads.`;
        }

        questions.push({
          id: `q-${i + 1}`,
          question: qText,
          type: qType,
          difficulty: qDiff,
          topicId: targetTopic.id || `topic-${i}`,
          topicName,
          options: opts,
          correctAnswer: correctOpt,
          explanation,
          conceptTested: concept,
          whyIncorrectExplanation: whyIncorrect,
        });
      }

      return questions;
    };

    const client = getGeminiClient();
    if (!client) {
      const fallbackQs = generateFallbackMockQuestions();
      return res.json({
        title: `${sub} Mock Examination`,
        subjectName: sub,
        difficulty,
        questionCount: fallbackQs.length,
        durationMinutes,
        questions: fallbackQs,
        isAiGenerated: false,
      });
    }

    const syllabusSummary = topicNames.join(", ");
    const prompt = `You are the master examiner for StudyMate AI.
Generate a rigorous, syllabus-aligned, academic mock test.

Exam Specification:
- Course / Subject: ${sub}
- Syllabus Scope / Topics: ${syllabusSummary}
${syllabusInput ? `- Custom Syllabus Input: ${syllabusInput}` : ""}
- Coverage Mode: ${coverage}
- Difficulty Mode: ${difficulty} (If Adaptive, provide an even progression from foundational/Easy to intermediate/Medium and challenging/Hard)
- Number of Questions: ${count}
- Allowed Question Types: ${questionTypes.join(", ")}
- Test Duration: ${durationMinutes} minutes

CRITICAL RULES:
1. Every question MUST be strictly aligned with the specified syllabus topics (${syllabusSummary}). Do NOT generate random generic questions.
2. Ensure clear, academically rigorous phrasing without ambiguity.
3. Distribute questions across topics proportionally.
4. Each question MUST provide:
   - "id": "q-1", "q-2", etc.
   - "question": string
   - "type": "mcq" | "numerical" | "conceptual" | "application"
   - "difficulty": "Easy" | "Medium" | "Hard"
   - "topicName": string (must match one of: ${syllabusSummary})
   - "options": Array of 4 distinct choices [{ "id": "A", "text": "..." }, { "id": "B", "text": "..." }, { "id": "C", "text": "..." }, { "id": "D", "text": "..." }]
   - "correctAnswer": "A" | "B" | "C" | "D"
   - "explanation": Clear, step-by-step reason why the correct option is right.
   - "conceptTested": Key theoretical principle or formula tested.
   - "whyIncorrectExplanation": Clear diagnosis of why common wrong answers are chosen (e.g. calculation trap, sign error, concept confusion).

Respond strictly with valid JSON conforming to this schema:
{
  "title": string,
  "questions": [
    {
      "id": string,
      "question": string,
      "type": "mcq" | "numerical" | "conceptual" | "application",
      "difficulty": "Easy" | "Medium" | "Hard",
      "topicName": string,
      "options": [
        { "id": "A", "text": string },
        { "id": "B", "text": string },
        { "id": "C", "text": string },
        { "id": "D", "text": string }
      ],
      "correctAnswer": "A" | "B" | "C" | "D",
      "explanation": string,
      "conceptTested": string,
      "whyIncorrectExplanation": string
    }
  ]
}`;

    let response: any = null;
    try {
      response = await generateGeminiContentWithFallback(client, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });
    } catch (err: any) {
      console.warn("Gemini Mock Test generation failed, using fallback:", err?.message || err);
      const fallbackQs = generateFallbackMockQuestions();
      return res.json({
        title: `${sub} Mock Examination`,
        subjectName: sub,
        difficulty,
        questionCount: fallbackQs.length,
        durationMinutes,
        questions: fallbackQs,
        isAiGenerated: false,
      });
    }

    const responseText = response?.text?.trim() || "";
    try {
      const parsed = JSON.parse(responseText);
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("No questions in response");
      }

      // Map topicId if available
      const mappedQuestions = parsed.questions.map((q: any, idx: number) => {
        const matchingTopic = candidateTopics.find(
          (t: any) => t.name.toLowerCase() === (q.topicName || "").toLowerCase()
        );
        return {
          ...q,
          id: q.id || `q-${idx + 1}`,
          topicId: matchingTopic ? matchingTopic.id : `topic-${idx}`,
        };
      });

      return res.json({
        title: parsed.title || `${sub} Mock Test`,
        subjectName: sub,
        difficulty,
        questionCount: mappedQuestions.length,
        durationMinutes,
        questions: mappedQuestions,
        isAiGenerated: true,
      });
    } catch {
      const fallbackQs = generateFallbackMockQuestions();
      return res.json({
        title: `${sub} Mock Examination`,
        subjectName: sub,
        difficulty,
        questionCount: fallbackQs.length,
        durationMinutes,
        questions: fallbackQs,
        isAiGenerated: false,
      });
    }
  } catch (err: any) {
    console.error("Mock Test Generate Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to generate mock test" });
  }
});

// =========================================================================
// AI Mock Test Diagnostic Analyzer
// =========================================================================
app.post("/api/ai/mock-test/analyze", async (req, res) => {
  try {
    const {
      subjectName,
      difficulty,
      score,
      accuracy,
      timeTakenSeconds,
      questionResults = [],
      weakTopics = [],
    } = req.body;

    const sub = subjectName || "Course Examination";

    const generateFallbackAnalysis = () => {
      const incorrectQuestions = questionResults.filter((q: any) => !q.isCorrect);
      const correctQuestions = questionResults.filter((q: any) => q.isCorrect);

      const whatYouDidWell = [
        correctQuestions.length > 0
          ? `Accurately answered ${correctQuestions.length} questions, demonstrating solid baseline comprehension.`
          : `Maintained good pacing through the allotted test duration.`,
        `Comfortable with foundational definitions and direct theoretical queries.`,
        `Demonstrated steady time management (~${Math.round(timeTakenSeconds / Math.max(1, questionResults.length))}s per question).`,
      ];

      const areasToImprove =
        weakTopics.length > 0
          ? weakTopics.map((w: any) => `${w.topicName} (${Math.round(w.accuracy)}% accuracy) — vulnerable to boundary-condition questions.`)
          : [`Review edge cases and multi-step computational problems.`];

      const aiDiagnosis =
        incorrectQuestions.length === 0
          ? `Flawless execution! You demonstrated comprehensive conceptual clarity across all tested syllabus areas with zero false deductions.`
          : `Marks were predominantly lost on application-level questions where boundary conditions or secondary theorems applied. Rather than simple recall errors, mistakes resulted from confounding similar architectural rules or rushing through multi-step deductions. Targeted revision on your weakest topics will rapidly boost test resilience.`;

      const followUpSteps = [
        ...(weakTopics.slice(0, 2).map((w: any) => ({
          title: `Revise ${w.topicName}`,
          durationMinutes: 30,
          action: `Focus on core formulas and solve 5 active recall problems.`,
          topicName: w.topicName,
        }))),
        {
          title: `Review ${incorrectQuestions.length} Incorrect Questions`,
          durationMinutes: 15,
          action: `Examine the detailed explanations and log mistakes into your review journal.`,
        },
        {
          title: `Retake a Short Diagnostic Drill`,
          durationMinutes: 20,
          action: `Test yourself on targeted weak areas tomorrow to solidify neural retention.`,
        },
      ];

      return {
        whatYouDidWell,
        areasToImprove,
        aiDiagnosis,
        followUpSteps,
        isAiGenerated: false,
      };
    };

    const client = getGeminiClient();
    if (!client) {
      return res.json(generateFallbackAnalysis());
    }

    const incorrectSummary = questionResults
      .filter((q: any) => !q.isCorrect)
      .map(
        (q: any) =>
          `- Topic: ${q.topicName} | Concept: ${q.conceptTested || "General"} | Student Answer: ${q.userAnswer || "None"} | Correct: ${q.correctAnswer}`
      )
      .join("\n");

    const prompt = `You are StudyMate AI's master academic diagnostic coach.
Analyze this student's completed mock test performance:
- Subject: ${sub}
- Overall Score: ${score}/100
- Accuracy: ${accuracy}%
- Time Spent: ${Math.round(timeTakenSeconds / 60)} minutes
- Difficulty: ${difficulty}
- Summary of Missed Questions:
${incorrectSummary || "None! Student scored 100%."}
- Identified Weak Topics:
${weakTopics.map((w: any) => `- ${w.topicName}: ${w.accuracy}% accuracy`).join("\n")}

CRITICAL DIRECTIVES:
1. "whatYouDidWell": 3 specific, encouraging points highlighting concrete academic strengths.
2. "areasToImprove": 2-3 specific topics or conceptual traps where points were dropped.
3. "aiDiagnosis": A deep, explanatory 2-3 sentence diagnosis explaining WHY the user lost marks. Do not just say "You missed 3 questions." Explain the underlying conceptual confusion or trap (e.g., misinterpreting boundary conditions, confusing similar theorems, or rushing through multi-step applications).
4. "followUpSteps": 3-4 concrete next steps with specific durations in minutes.

Respond strictly with valid JSON conforming to this schema:
{
  "whatYouDidWell": [string],
  "areasToImprove": [string],
  "aiDiagnosis": string,
  "followUpSteps": [
    {
      "title": string,
      "durationMinutes": number,
      "action": string,
      "topicName": string (optional)
    }
  ]
}`;

    let response: any = null;
    try {
      response = await generateGeminiContentWithFallback(client, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });
      const parsed = JSON.parse(response?.text?.trim() || "{}");
      if (!parsed.whatYouDidWell || !parsed.aiDiagnosis) {
        return res.json(generateFallbackAnalysis());
      }
      return res.json({
        ...parsed,
        isAiGenerated: true,
      });
    } catch {
      return res.json(generateFallbackAnalysis());
    }
  } catch (err: any) {
    console.error("Mock Test Analysis error:", err?.message || err);
    return res.status(500).json({ error: "Failed to analyze mock test" });
  }
});

// =========================================================================
// AI Weekly Report Insights Generator
// =========================================================================
app.post("/api/ai/weekly-report", async (req, res) => {
  try {
    const {
      weeklyStudyMinutes = 0,
      sessionsCount = 0,
      mockTestsCount = 0,
      averageScore = 0,
      topicsCompletedCount = 0,
      strongestAreas = [],
      areasNeedingAttention = [],
      longestStreakDays = 0,
    } = req.body;

    const hours = Math.floor(weeklyStudyMinutes / 60);
    const mins = weeklyStudyMinutes % 60;
    const timeStr = `${hours}h ${mins}m`;

    const generateFallbackReport = () => {
      const strongNames = strongestAreas.map((a: any) => a.topicName).slice(0, 2).join(" and ");
      const weakNames = areasNeedingAttention.map((a: any) => a.topicName).slice(0, 2).join(" and ");

      let aiSummary = `You dedicated ${timeStr} across ${sessionsCount} study sessions and ${mockTestsCount} mock tests this week.`;
      if (strongNames) {
        aiSummary += ` You showed impressive mastery in ${strongNames}.`;
      }
      if (weakNames) {
        aiSummary += ` Attention should now pivot toward ${weakNames} to close remaining gaps before exams.`;
      }

      const aiCoachingInsight = {
        whatImproved: `Consistency in study frequency and diagnostic self-testing pacing.`,
        whatDeclined: `Retention in multi-step problem solving under timed exam pressure.`,
        biggestWeakness: weakNames || `Complex boundary-condition topics with multiple dependencies.`,
        biggestStrength: strongNames || `Core theoretical definitions and structured memory recall.`,
        focusNextWeek: `Allocate two dedicated active-problem solving sessions to your lowest-scoring topics.`,
        suggestedStrategy: `Apply the Feynman technique on weak topics followed immediately by 5 timed past-paper questions.`,
      };

      const nextWeekPlan = [
        ...(areasNeedingAttention.slice(0, 2).map((a: any, i: number) => ({
          id: `plan-rec-${Date.now()}-${i}`,
          topicName: a.topicName,
          subjectName: a.subjectName,
          priorityLabel: "High Priority" as const,
          sessionsCount: 3,
          minutesPerSession: 45,
          reason: `Accuracy is currently at ${Math.round(a.score)}%, below your course benchmark.`,
        }))),
        {
          id: `plan-rec-${Date.now()}-rev`,
          topicName: strongestAreas[0]?.topicName || "Comprehensive Review",
          subjectName: strongestAreas[0]?.subjectName,
          priorityLabel: "Revision" as const,
          sessionsCount: 1,
          minutesPerSession: 30,
          reason: `Maintenance review to ensure long-term retention.`,
        },
      ];

      return {
        aiSummary,
        aiCoachingInsight,
        nextWeekPlan,
        isAiGenerated: false,
      };
    };

    const client = getGeminiClient();
    if (!client) {
      return res.json(generateFallbackReport());
    }

    const prompt = `You are StudyMate AI, the intellectual academic mentor.
Analyze this student's actual 7-day academic study activity:
- Total Study Time: ${timeStr}
- Sessions Completed: ${sessionsCount}
- Mock Tests Taken: ${mockTestsCount}
- Average Mock Test Score: ${averageScore}%
- Topics Completed: ${topicsCompletedCount}
- Current Study Streak: ${longestStreakDays} days
- Strongest Topics: ${strongestAreas.map((s: any) => `${s.topicName} (${s.score}%)`).join(", ") || "None recorded"}
- Topics Needing Attention: ${areasNeedingAttention.map((w: any) => `${w.topicName} (${w.score}%)`).join(", ") || "None recorded"}

CRITICAL RULES:
1. Strict adherence to truth: Ground everything strictly in the data provided. Do NOT fabricate numbers or facts.
2. "aiSummary": A 2-sentence conversational, encouraging "Your week at a glance" summary.
3. "aiCoachingInsight":
   - "whatImproved": specific academic improvement
   - "whatDeclined": specific vulnerability or area with dropped accuracy
   - "biggestWeakness": the top topic/skill needing repair
   - "biggestStrength": the top mastered domain
   - "focusNextWeek": specific actionable advice
   - "suggestedStrategy": pedagogical study technique (e.g. active recall, interleaved practice)
4. "nextWeekPlan": Array of 2 to 3 priority topics with:
   - "topicName": string
   - "priorityLabel": "High Priority" | "Medium Priority" | "Revision"
   - "sessionsCount": number
   - "minutesPerSession": number
   - "reason": string

Respond strictly with valid JSON matching the schema.`;

    let response: any = null;
    try {
      response = await generateGeminiContentWithFallback(client, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });
      const parsed = JSON.parse(response?.text?.trim() || "{}");
      if (!parsed.aiSummary || !parsed.aiCoachingInsight) {
        return res.json(generateFallbackReport());
      }
      return res.json({
        ...parsed,
        isAiGenerated: true,
      });
    } catch {
      return res.json(generateFallbackReport());
    }
  } catch (err: any) {
    console.error("Weekly Report AI error:", err?.message || err);
    return res.status(500).json({ error: "Failed to generate weekly report insight" });
  }
});

async function startServer() {

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
