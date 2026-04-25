"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";
import ARGridView from "@/components/game/ARGridView";
import MarkdownContext from "@/components/game/MarkdownContext";
import QuestReviewCards from "@/components/quest/QuestReviewCards";
import { WeakPointSummary } from "@/types/game";

interface Question {
  questionText: string;
  context?: string;
  passageTitle?: string;
  options?: (string | Record<string, unknown>)[];
  correct: string;
  explanation: string;
  knowledgePointCode: string;
  microSkillCode?: string;
  estimatedReadTimeMs: number;
  difficulty?: string;
  // AR fields
  type?: string;
  gridData?: any[][];
  options_ar?: any[];
  // Static AR (paper folding)
  staticSvg?: string;
  optionSvgs?: [string, string, string, string];
  isStatic?: boolean;
}

interface QuestionState {
  question: Question;
  questionHash: string;
  userAnswer?: string;
  firstChoice?: string;
  startTimeMs?: number;
  timeSpentMs?: number;
  hintsUsed: number;
  flagged: boolean;
  hint1?: string;
  hint2?: string;
  showHint1: boolean;
  showHint2: boolean;
}

function hashQ(text: string, opts: string[]): string {
  const raw = [text, ...opts].join("|");
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return hash.toString(16).padStart(8, "0");
}

function getOptionLabel(idx: number): string {
  return ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
}

export default function QuestPlayPage() {
  const router = useRouter();
  const params = useParams();
  const region = decodeURIComponent(params.region as string);

  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [questSessionId, setQuestSessionId] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    totalSparks: number;
    correctCount: number;
    totalCount: number;
    wisdomEarned?: number;
    rankUp?: string;
    weakKnowledgePoints?: WeakPointSummary[];
    recommendedNextFocus?: WeakPointSummary[];
  } | null>(null);
  const [optionsUnlocked, setOptionsUnlocked] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Preparing your challenges…");
  const [showExplanation, setShowExplanation] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [showAbandonPrompt, setShowAbandonPrompt] = useState(false);
  const [parentHandoffNotice, setParentHandoffNotice] = useState<{
    mageName?: string;
  } | null>(null);

  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logPathRef = useRef<string>("");
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) { router.push("/login"); return; }

    const paramsStr = sessionStorage.getItem("questParams");
    if (!paramsStr) { router.push(`/quest/${encodeURIComponent(region)}`); return; }

    const questParams = JSON.parse(paramsStr);
    if (questParams.launchSource === "parent_report") {
      setParentHandoffNotice({
        mageName: questParams.launchedForMageName,
      });
    }
    loadProfileAndGenerate(profileId, questParams);
  }, [region, router]);

  useEffect(() => {
    if (sessionComplete || showReflection) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!questions.length) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (!questions.length || sessionComplete || showReflection) return;
      window.history.pushState(null, "", window.location.href);
      setShowAbandonPrompt(true);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [questions.length, sessionComplete, showReflection]);

  async function loadProfileAndGenerate(profileId: string, questParams: any) {
    try {
      const profileRes = await fetch(`/api/profile/${profileId}`);
      const profileData = await profileRes.json();
      setProfile(profileData.profile);

      // Phase 1: Generate questions
      setLoadingStatus("Summoning your challenges…");
      const res = await fetch("/api/quest/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questParams),
      });
      const data = await res.json();
      setQuestSessionId(data.questSessionId ?? null);

      const isAR = region === "Forest of Patterns";
      const rawQs: Question[] = data.questions || [];
      const genSystemPrompt: string = data.systemPrompt || "";
      const genUserPrompt: string = data.userPrompt || "";

      const states: QuestionState[] = rawQs.map((q: Question) => {
        const opts = (q.options || []) as string[];
        return {
          question: q,
          questionHash: hashQ(q.questionText, opts),
          hintsUsed: 0,
          flagged: false,
          showHint1: false,
          showHint2: false,
        };
      });

      // Phase 2: Write challenge log in background (fire-and-forget)
      const statesWithHints = states;
      const profileName = profileData.profile?.mageName || `Profile ${profileId}`;
      const logQuestions = statesWithHints.map((s, i) => ({
        idx: i,
        knowledgePointCode: s.question.knowledgePointCode,
        questionText: s.question.questionText,
        context: s.question.context,
        options: s.question.options as string[] | undefined,
        options_ar: s.question.options_ar,
        gridData: s.question.gridData,
        type: s.question.type,
        correct: s.question.correct,
        explanation: s.question.explanation,
        hint1: s.hint1 || "",
        hint2: s.hint2 || "",
      }));

      fetch("/api/quest/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: parseInt(profileId),
          profileName,
          subject: data.subject,
          difficulty: questParams.difficulty,
          systemPrompt: genSystemPrompt,
          userPrompt: genUserPrompt,
          questions: logQuestions,
        }),
      }).then(r => r.json()).then(d => {
        if (d.logPath) logPathRef.current = d.logPath;
      }).catch(err => console.error("Failed to write quest log:", err));

      setQuestions(statesWithHints);
      setGenerating(false);
      setLoading(false);

      // Start read timer for first question
      startReadTimer(0, statesWithHints);
    } catch (err) {
      console.error("Failed to generate questions:", err);
      setLoading(false);
      setGenerating(false);
    }
  }

  function startReadTimer(idx: number, qs?: QuestionState[]) {
    const pool = qs || questions;
    const q = pool[idx];
    if (!q) return;

    setOptionsUnlocked(false);
    // Update start time
    const updated = [...pool];
    updated[idx] = { ...updated[idx], startTimeMs: Date.now() };
    if (qs) setQuestions(updated);
    else setQuestions(updated);

    const minTime = Math.min(q.question.estimatedReadTimeMs || 4000, 5000);
    clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => setOptionsUnlocked(true), minTime);
  }

  useEffect(() => {
    if (questions.length > 0 && !generating) {
      startReadTimer(currentIdx);
    }
    return () => clearTimeout(unlockTimerRef.current);
  }, [currentIdx, generating]);

  // Countdown timer — resets to 60 on each new question
  useEffect(() => {
    if (generating || questions.length === 0) return;
    setCountdown(60);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [currentIdx, generating]);

  function navigateTo(idx: number) {
    // Save time spent on current question
    if (questions[currentIdx]?.startTimeMs) {
      const updated = [...questions];
      updated[currentIdx] = {
        ...updated[currentIdx],
        timeSpentMs: Date.now() - (updated[currentIdx].startTimeMs || Date.now()),
      };
      setQuestions(updated);
    }
    setCurrentIdx(idx);
    setShowExplanation(false);
  }

  function selectAnswer(answer: string) {
    if (submitting) return;
    const q = questions[currentIdx];

    const updated = [...questions];
    if (!q.firstChoice) {
      updated[currentIdx] = { ...updated[currentIdx], firstChoice: answer, userAnswer: answer };
    } else {
      updated[currentIdx] = { ...updated[currentIdx], userAnswer: answer };
    }
    setQuestions(updated);
  }

  function toggleFlag() {
    const updated = [...questions];
    updated[currentIdx] = { ...updated[currentIdx], flagged: !updated[currentIdx].flagged };
    setQuestions(updated);
  }

  async function loadHint(level: 1 | 2) {
    const updated = [...questions];
    const q = updated[currentIdx];
    const alreadyShown = level === 1 ? q.showHint1 : q.showHint2;
    const alreadyFetched = level === 1 ? q.hint1 : q.hint2;

    // Toggle visibility if already fetched
    if (alreadyShown || alreadyFetched) {
      updated[currentIdx] = level === 1
        ? { ...q, showHint1: true }
        : { ...q, showHint2: true };
      setQuestions(updated);
      return;
    }

    // Mark as loading and show
    updated[currentIdx] = level === 1
      ? { ...q, showHint1: true, hint1: "✦ Consulting the Archive…", hintsUsed: q.hintsUsed + 1 }
      : { ...q, showHint2: true, hint2: "✦ Consulting the Archive…", hintsUsed: q.hintsUsed + 1 };
    setQuestions(updated);

    try {
      const isAR = region === "Forest of Patterns";
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: q.question.questionText,
          options: q.question.options || [],
          knowledgePointName: q.question.knowledgePointCode,
          isAbstractReasoning: isAR,
          wrongOption: (q.question.options as string[])?.[3] || "",
          hintLevel: level,
        }),
      });
      const data = await res.json();
      const hint = data.hint as string || "";
      setQuestions(prev => {
        const next = [...prev];
        next[currentIdx] = level === 1
          ? { ...next[currentIdx], hint1: hint }
          : { ...next[currentIdx], hint2: hint };
        return next;
      });
    } catch {
      setQuestions(prev => {
        const next = [...prev];
        next[currentIdx] = level === 1
          ? { ...next[currentIdx], hint1: "Hint scroll unavailable." }
          : { ...next[currentIdx], hint2: "Hint scroll unavailable." };
        return next;
      });
    }
  }

  async function submitSession() {
    setSubmitting(true);
    const profileId = parseInt(localStorage.getItem("activeProfileId") || "0");
    let totalSparks = 0;
    let correctCount = 0;
    const oldRank = profile?.rank;

    for (const state of questions) {
      if (!state.userAnswer) continue;
      try {
        const res = await fetch("/api/quest/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questSessionId,
            profileId,
            region,
            questionText: state.question.questionText,
            passageTitle: state.question.passageTitle,
            contextText: state.question.context,
            optionsJson: JSON.stringify(state.question.options || []),
            correctAnswer: state.question.correct,
            explanationText: state.question.explanation,
            userAnswer: state.userAnswer,
            firstChoice: state.firstChoice,
            knowledgePointCode: state.question.knowledgePointCode,
            microSkillCode: state.question.microSkillCode,
            hintsUsed: state.hintsUsed,
            timeSpentMs: state.timeSpentMs,
            minimumReadTimeMs: state.question.estimatedReadTimeMs,
          }),
        });
        const data = await res.json();
        totalSparks += data.sparksEarned || 0;
        if (data.isCorrect) correctCount++;

        // Log integrity signals
        if (data.integritySignal) {
          await fetch("/api/integrity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId,
              ...data.integritySignal,
            }),
          });
        }
      } catch (err) {
        console.error("Failed to submit attempt:", err);
      }
    }

    // Show reflection prompt (every session)
    setShowReflection(true);
    setSessionResults({
      totalSparks,
      correctCount,
      totalCount: questions.length,
    });
    setSubmitting(false);
  }

  async function completeReflection() {
    const profileId = parseInt(localStorage.getItem("activeProfileId") || "0");
    if (!questSessionId) {
      setShowReflection(false);
      setSessionComplete(true);
      return;
    }

    let completionData: {
      summary?: { totalSparks: number; correctCount: number; questionCount: number; wisdomEarned?: number };
      weakKnowledgePoints?: WeakPointSummary[];
      recommendedNextFocus?: WeakPointSummary[];
    } | null = null;

    try {
      const response = await fetch("/api/quest/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questSessionId,
          profileId,
          reflectionText: reflectionText.trim(),
        }),
      });
      completionData = await response.json();
    } catch (err) {
      console.error("Failed to complete quest session:", err);
    }

    // Finalize challenge log in background
    if (logPathRef.current) {
      const answers = questions.map((s, i) => ({
        idx: i,
        knowledgePointCode: s.question.knowledgePointCode,
        userAnswer: s.userAnswer || "",
        correct: s.question.correct,
        isCorrect: s.userAnswer === s.question.correct,
        hintsUsed: s.hintsUsed,
        timeSpentMs: s.timeSpentMs,
      }));
      fetch("/api/quest/log/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logPath: logPathRef.current,
          answers,
          totalSparks: completionData?.summary?.totalSparks || sessionResults?.totalSparks || 0,
          correctCount: completionData?.summary?.correctCount || sessionResults?.correctCount || 0,
          reflection: reflectionText.trim(),
        }),
      }).catch(err => console.error("Failed to finalize quest log:", err));
    }

    if (completionData?.summary) {
      setSessionResults({
        totalSparks: completionData.summary.totalSparks,
        correctCount: completionData.summary.correctCount,
        totalCount: completionData.summary.questionCount,
        wisdomEarned: completionData.summary.wisdomEarned || 0,
        weakKnowledgePoints: completionData.weakKnowledgePoints,
        recommendedNextFocus: completionData.recommendedNextFocus,
      });
    }

    setShowReflection(false);
    setSessionComplete(true);
  }

  const current = questions[currentIdx];
  const isAR = region === "Forest of Patterns";
  const isRC = region === "Lake of Reflection";
  const answeredCount = questions.filter((q) => q.userAnswer).length;

  function restartSession() {
    setQuestions([]);
    setCurrentIdx(0);
    setLoading(true);
    setGenerating(true);
    setSubmitting(false);
    setSessionComplete(false);
    setSessionResults(null);
    setOptionsUnlocked(false);
    setLoadingStatus("Preparing your challenges…");
    setShowExplanation(false);
    setReflectionText("");
    setShowReflection(false);
    setQuestSessionId(null);
    logPathRef.current = "";
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    const profileId = localStorage.getItem("activeProfileId");
    const paramsStr = sessionStorage.getItem("questParams");
    if (!profileId || !paramsStr) { router.push(`/quest/${encodeURIComponent(region)}`); return; }
    loadProfileAndGenerate(profileId, JSON.parse(paramsStr));
  }

  function getUnbankedSparksEstimate() {
    return questions.reduce((sum, state) => {
      if (state.userAnswer && state.userAnswer === state.question.correct) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }

  function abandonQuest() {
    setShowAbandonPrompt(false);
    sessionStorage.removeItem("questParams");
    router.push(`/quest/${encodeURIComponent(region)}`);
  }
  const allViewed = currentIdx === questions.length - 1 || answeredCount === questions.length;

  if (generating) {
    const isHintPhase = loadingStatus.startsWith("Inscribing");
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-7xl mb-6" style={{ animation: "spin 3s linear infinite", display: "inline-block" }}>
            {isHintPhase ? "📜" : "⚗️"}
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
            {loadingStatus}
          </h2>
          <p style={{ color: "#B68A3A" }}>
            {isHintPhase
              ? "Your hint scrolls will be ready before the first question appears"
              : "The Archive prepares questions tailored to your mastery"}
          </p>
          {/* Progress bar */}
          <div className="mt-8 w-64 h-1 rounded-full overflow-hidden" style={{ background: "#1E2E5A" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background: "#E7C777",
                width: isHintPhase
                  ? (() => {
                      const m = loadingStatus.match(/(\d+)\s*\/\s*(\d+)/);
                      return m ? `${Math.round((parseInt(m[1]) / parseInt(m[2])) * 100)}%` : "10%";
                    })()
                  : "30%",
              }}
            />
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (sessionComplete && sessionResults) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="text-7xl mb-6">✨</div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
              Quest Complete!
            </h1>
            <p className="text-5xl font-bold mb-2" style={{ color: "#E7C777" }}>
              +{sessionResults.totalSparks} ✦
            </p>
            {sessionResults.wisdomEarned ? (
              <p className="text-lg font-bold mb-2" style={{ color: "#C4A44A" }}>
                +{sessionResults.wisdomEarned} Wisdom
              </p>
            ) : null}
            <p className="text-lg mb-8" style={{ color: "#EADFC8" }}>
              {sessionResults.correctCount} / {sessionResults.totalCount} correct
            </p>
          </div>

          {sessionResults.weakKnowledgePoints && sessionResults.weakKnowledgePoints.length > 0 && (
            <div
              className="mb-8 p-5 rounded-2xl text-left"
              style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}
            >
              <h3 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#B68A3A" }}>
                Needs more work
              </h3>
              <div className="space-y-2">
                {sessionResults.weakKnowledgePoints.slice(0, 3).map((item) => (
                  <p key={item.code} className="text-sm" style={{ color: "#EADFC8" }}>
                    <span style={{ color: "#E7C777" }}>{item.code}</span> · {item.label}
                  </p>
                ))}
              </div>
            </div>
          )}

          {sessionResults.recommendedNextFocus && sessionResults.recommendedNextFocus.length > 0 && (
            <div
              className="mb-8 p-5 rounded-2xl text-left"
              style={{ background: "#16213B", border: "1px solid #2E5A8E55" }}
            >
              <h3 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#6BA3D6" }}>
                Next quest focus
              </h3>
              <div className="space-y-2">
                {sessionResults.recommendedNextFocus.map((item) => (
                  <p key={item.code} className="text-sm" style={{ color: "#EADFC8" }}>
                    <span style={{ color: "#E7C777" }}>{item.code}</span> · {item.label}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Review answers */}
          <div className="mb-8 text-left">
            <QuestReviewCards
              items={questions.map((state, index) => ({
                id: index + 1,
                order: index + 1,
                questionText: state.question.questionText,
                context: state.question.context,
                passageTitle: state.question.passageTitle,
                options: ((state.question.options || []) as Array<string | Record<string, unknown>>).map((opt) =>
                  typeof opt === "string" ? opt : JSON.stringify(opt)
                ),
                correctAnswer: state.question.correct,
                userAnswer: state.userAnswer,
                isCorrect: state.userAnswer === state.question.correct,
                explanation: state.question.explanation,
                hintsUsed: state.hintsUsed,
                timeSpentMs: state.timeSpentMs,
                knowledgePointCode: state.question.knowledgePointCode,
                microSkillCode: state.question.microSkillCode,
                attemptedAt: "",
                flagged: state.flagged,
              }))}
            />
          </div>

          <div className="flex gap-3">
            <Link
              href="/home"
              className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-90"
              style={{
                background: "transparent",
                border: "1px solid #B68A3A",
                color: "#E7C777",
                fontFamily: "Georgia, serif",
                textAlign: "center",
              }}
            >
              Archive Hall
            </Link>
            {questSessionId && (
              <Link
                href={`/quest/review/${questSessionId}`}
                className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-90"
                style={{
                  background: "#1E2E5A",
                  border: "1px solid #6BA3D6",
                  color: "#6BA3D6",
                  fontFamily: "Georgia, serif",
                  textAlign: "center",
                }}
              >
                Save review
              </Link>
            )}
            <button
              onClick={restartSession}
              className="flex-1 py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
              }}
            >
              Play again ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showReflection) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="max-w-lg w-full mx-auto px-6 py-12 text-center">
          <div className="text-6xl mb-6">🤔</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
            A moment of reflection
          </h2>
          <p className="text-base mb-6" style={{ color: "#EADFC8", opacity: 0.8 }}>
            How did you figure out the trickiest question? What strategy helped you most?
          </p>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Write your thoughts here (optional)…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl mb-6 outline-none resize-none"
            style={{
              background: "#1E2E5A",
              border: "1px solid #B68A3A",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
            }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => completeReflection()}
              className="flex-1 py-3 rounded-xl text-sm transition-all"
              style={{ color: "#B68A3A", border: "1px solid #B68A3A33" }}
            >
              Skip (+0 ✦)
            </button>
            <button
              onClick={completeReflection}
              className="flex-1 py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
              }}
            >
              {reflectionText.trim() ? "Submit (+8 ✦)" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {showAbandonPrompt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(15, 28, 63, 0.84)", backdropFilter: "blur(3px)" }}
          >
            <div
              className="w-full max-w-md rounded-3xl p-6"
              style={{ background: "#1A2545", border: "1px solid #C84B31" }}
            >
              <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: "#F5A39A" }}>
                Leave Active Quest
              </p>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
                Continue this quest or abandon it?
              </h2>
              <p className="mb-6" style={{ color: "#EADFC8", lineHeight: 1.75 }}>
                The current quest is still in progress. If you leave through the Hall navigation now, this run will be treated as abandoned.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAbandonPrompt(false)}
                  className="flex-1 rounded-xl py-3 font-bold"
                  style={{ border: "1px solid #B68A3A55", color: "#E7C777" }}
                >
                  Return to quest
                </button>
                <button
                  onClick={abandonQuest}
                  className="flex-1 rounded-xl py-3 font-bold"
                  style={{ background: "#C84B31", color: "#FDF1E1" }}
                >
                  Abandon and leave
                </button>
              </div>
            </div>
          </div>
        )}

        {parentHandoffNotice && (
          <div
            className="mb-6 p-4 rounded-2xl flex items-start justify-between gap-4"
            style={{ background: "#16213B", border: "1px solid #2E5A8E55" }}
          >
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "#6BA3D6" }}>
                Parent handoff active
              </p>
              <p className="text-sm" style={{ color: "#EADFC8" }}>
                This quest was launched from the parent report{parentHandoffNotice.mageName ? ` for ${parentHandoffNotice.mageName}` : ""}.
                The recommended weak-skill focus has already been loaded.
              </p>
            </div>
            <button
              onClick={() => setParentHandoffNotice(null)}
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "#0F1C3F", color: "#6BA3D6", border: "1px solid #2E5A8E55" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAbandonPrompt(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#1A2545", color: "#F5A39A", border: "1px solid #C84B31" }}
            >
              Back
            </button>
            <span style={{ color: "#B68A3A" }} className="text-sm">
              Question {currentIdx + 1} of {questions.length}
            </span>
            {current.question.knowledgePointCode && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "#1E2E5A", color: "#B68A3A", border: "1px solid #B68A3A33" }}
              >
                {current.question.knowledgePointCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Calm countdown */}
            {(() => {
              const r = 14;
              const circ = 2 * Math.PI * r;
              const progress = countdown / 60;
              return (
                <div className="flex items-center gap-1.5" title={`${countdown}s remaining`}>
                  <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r={r} fill="none" stroke="#1E2E5A" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r={r}
                      fill="none"
                      stroke="#B68A3A"
                      strokeWidth="3"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - progress)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="text-sm tabular-nums" style={{ color: "#B68A3A", minWidth: "2ch" }}>
                    {countdown}
                  </span>
                </div>
              );
            })()}
            <button
              onClick={toggleFlag}
              className="p-2 rounded-lg text-sm transition-all"
              style={{
                background: current.flagged ? "#B68A3A22" : "transparent",
                color: current.flagged ? "#E7C777" : "#B68A3A",
              }}
            >
              {current.flagged ? "⚑ Flagged" : "⚑ Flag"}
            </button>
          </div>
        </div>

        {/* Crystal Navigator */}
        <div className="flex items-center gap-1 flex-wrap mb-6">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => navigateTo(i)}
              className="w-8 h-8 rounded-full text-xs font-bold transition-all hover:scale-110 border"
              style={{
                background: i === currentIdx
                  ? "#E7C777"
                  : q.userAnswer
                  ? "#2E4A7A"
                  : q.flagged
                  ? "#B68A3A33"
                  : "#1E2E5A",
                color: i === currentIdx ? "#0F1C3F" : "#EADFC8",
                borderColor: i === currentIdx ? "#E7C777" : q.flagged ? "#B68A3A" : "#B68A3A22",
              }}
            >
              {q.flagged && !q.userAnswer ? "⚑" : i + 1}
            </button>
          ))}
        </div>

        {/* RC Split Layout: passage left, question+options right */}
        {isRC && current.question.context ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,4fr)_minmax(280px,1fr)] gap-4 mb-6">
            {/* Left: Passage */}
            <div
              className="min-w-0 p-6 rounded-xl text-lg leading-relaxed overflow-y-auto"
              style={{
                background: "#1A2545",
                border: "1px solid #B68A3A33",
                color: "#EADFC8",
                maxHeight: "70vh",
              }}
            >
              {current.question.passageTitle && (
                <p className="font-bold mb-2" style={{ color: "#E7C777" }}>
                  {current.question.passageTitle}
                </p>
              )}
              <MarkdownContext text={current.question.context} />
            </div>

            {/* Right: Question + Options */}
            <div className="min-w-0 flex flex-col gap-3">
              <div
                className="p-5 rounded-2xl"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p
                  className="text-xl leading-relaxed mb-5"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
                >
                  {current.question.questionText}
                </p>

                {!optionsUnlocked && (
                  <div className="text-center py-4">
                    <p className="text-sm animate-pulse" style={{ color: "#B68A3A" }}>
                      📖 Reading the question…
                    </p>
                  </div>
                )}

                {optionsUnlocked && (
                  <div className="space-y-2">
                    {(current.question.options || []).map((opt, i: number) => {
                      const label = getOptionLabel(i);
                      const isSelected = current.userAnswer === label;
                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(label)}
                          className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-90 text-lg"
                          style={{
                            background: isSelected ? "#B68A3A22" : "#0F1C3F",
                            border: `2px solid ${isSelected ? "#E7C777" : "#B68A3A44"}`,
                            color: "#EADFC8",
                            fontFamily: "Georgia, serif",
                          }}
                        >
                          <span className="font-bold mr-2" style={{ color: "#B68A3A" }}>{label}.</span>
                          {typeof opt === "string" ? opt.replace(/^[A-D]\.\s*/, "") : JSON.stringify(opt)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Non-RC: context above (for QR charts/tables) */}
            {current.question.context && (
              <div
                className="p-6 rounded-xl mb-6 text-lg leading-relaxed"
                style={{ background: "#1A2545", border: "1px solid #B68A3A33", color: "#EADFC8" }}
              >
                {current.question.passageTitle && (
                  <p className="font-bold mb-2" style={{ color: "#E7C777" }}>
                    {current.question.passageTitle}
                  </p>
                )}
                <MarkdownContext text={current.question.context} />
              </div>
            )}

            {/* Question Card */}
            <div
              className="p-6 rounded-2xl mb-6"
              style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
            >
              <p
                className="text-2xl leading-relaxed mb-6"
                style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
              >
                {current.question.questionText}
              </p>

              {/* AR Grid — static paper folding */}
              {isAR && current.question.isStatic && current.question.staticSvg && (
                <div
                  className="mb-6 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: current.question.staticSvg }}
                />
              )}

              {/* AR Grid — generated SVG cells */}
              {isAR && !current.question.isStatic && current.question.gridData && (
                <div className="mb-6">
                  <ARGridView
                    gridData={current.question.gridData}
                    type={(current.question.type || "sequence") as "sequence" | "pattern" | "odd_one_out" | "analogy"}
                  />
                </div>
              )}

              {/* Options */}
              {!optionsUnlocked && (
                <div className="text-center py-4">
                  <p className="text-sm animate-pulse" style={{ color: "#B68A3A" }}>
                    📖 Reading the question…
                  </p>
                </div>
              )}

              {optionsUnlocked && (
                <div className="space-y-3">
                  {isAR && current.question.isStatic && current.question.optionSvgs ? (
                    // Static AR options (paper folding)
                    <div className="grid grid-cols-2 gap-3">
                      {(current.question.optionSvgs as string[]).map((svg: string, i: number) => {
                        const label = getOptionLabel(i);
                        const isSelected = current.userAnswer === label;
                        return (
                          <button
                            key={i}
                            onClick={() => selectAnswer(label)}
                            className="p-3 rounded-xl transition-all hover:scale-[1.02]"
                            style={{
                              background: isSelected ? "#B68A3A22" : "#0F1C3F",
                              border: `2px solid ${isSelected ? "#E7C777" : "#B68A3A44"}`,
                            }}
                          >
                            <div className="text-xs mb-1" style={{ color: "#B68A3A" }}>{label}</div>
                            <div dangerouslySetInnerHTML={{ __html: svg }} />
                          </button>
                        );
                      })}
                    </div>
                  ) : isAR && current.question.options_ar ? (
                    // Generated AR options rendered as small grids
                    <div className="grid grid-cols-2 gap-3">
                      {(current.question.options_ar || []).map((cell: any, i: number) => {
                        const label = getOptionLabel(i);
                        const isSelected = current.userAnswer === label;
                        return (
                          <button
                            key={i}
                            onClick={() => selectAnswer(label)}
                            className="p-3 rounded-xl transition-all hover:scale-[1.02]"
                            style={{
                              background: isSelected ? "#B68A3A22" : "#0F1C3F",
                              border: `2px solid ${isSelected ? "#E7C777" : "#B68A3A44"}`,
                            }}
                          >
                            <div className="text-xs mb-1" style={{ color: "#B68A3A" }}>{label}</div>
                            <ARGridView gridData={[[cell]]} type="single" size="small" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // MCQ options
                    (current.question.options || []).map((opt, i: number) => {
                      const label = getOptionLabel(i);
                      const isSelected = current.userAnswer === label;
                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(label)}
                          className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-90"
                          style={{
                            background: isSelected ? "#B68A3A22" : "#0F1C3F",
                            border: `2px solid ${isSelected ? "#E7C777" : "#B68A3A44"}`,
                            color: "#EADFC8",
                            fontFamily: "Georgia, serif",
                            fontSize: "1.125rem",
                            lineHeight: 1.8,
                          }}
                        >
                          <span className="font-bold mr-2" style={{ color: "#B68A3A" }}>{label}.</span>
                          {typeof opt === "string" ? opt.replace(/^[A-D]\.\s*/, "") : JSON.stringify(opt)}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Hint Scrolls */}
        {optionsUnlocked && (
          <div className="mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => loadHint(1)}
                disabled={false}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-90"
                style={{
                  background: current.showHint1 ? "#B68A3A22" : "#1E2E5A",
                  border: "1px solid #B68A3A44",
                  color: "#B68A3A",
                }}
              >
                📜 Hint Scroll I {current.showHint1 ? "▾" : ""}
              </button>
              {current.hintsUsed >= 1 && (
                <button
                  onClick={() => loadHint(2)}
                  disabled={false}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{
                    background: current.showHint2 ? "#B68A3A22" : "#1E2E5A",
                    border: "1px solid #B68A3A44",
                    color: "#B68A3A",
                  }}
                >
                  📜 Hint Scroll II {current.showHint2 ? "▾" : ""}
                </button>
              )}
            </div>

            {/* Hint content */}
            {current.showHint1 && current.hint1 && (
              <div
                className="mt-3 p-4 rounded-xl text-sm leading-relaxed"
                style={{ background: "#2A1E0F", border: "1px solid #B68A3A", color: "#EADFC8" }}
              >
                <p className="font-bold mb-1" style={{ color: "#E7C777" }}>📜 Ancient Scroll I</p>
                <p style={{ fontStyle: "italic" }}>{current.hint1}</p>
              </div>
            )}
            {current.showHint2 && current.hint2 && (
              <div
                className="mt-3 p-4 rounded-xl text-sm leading-relaxed"
                style={{ background: "#2A1E0F", border: "1px solid #E7C777", color: "#EADFC8" }}
              >
                <p className="font-bold mb-1" style={{ color: "#E7C777" }}>📜 Ancient Scroll II</p>
                <p style={{ fontStyle: "italic" }}>{current.hint2}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigateTo(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-30"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A44", color: "#EADFC8" }}
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {currentIdx < questions.length - 1 ? (
              <>
                <button
                  onClick={() => {
                    toggleFlag();
                    navigateTo(currentIdx + 1);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: "#1E2E5A", border: "1px solid #B68A3A44", color: "#B68A3A" }}
                >
                  Skip ⚑
                </button>
                <button
                  onClick={() => navigateTo(currentIdx + 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                    color: "#0F1C3F",
                  }}
                >
                  Next →
                </button>
              </>
            ) : (
              <button
                onClick={submitSession}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                  color: "#0F1C3F",
                  fontFamily: "Georgia, serif",
                }}
              >
                {submitting ? "Submitting…" : `Submit Quest (${answeredCount}/${questions.length} answered)`}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
