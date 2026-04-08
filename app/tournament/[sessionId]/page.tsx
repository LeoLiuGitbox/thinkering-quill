"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamQuestion {
  questionText: string;
  optionsJson: string;
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: string;
  userAnswer?: string | null;
  isCorrect?: boolean | null;
}

interface ExamSection {
  subject: string;
  questions: ExamQuestion[];
  timeMinutes: number;
  completed: boolean;
}

interface ExamSession {
  id: number;
  status: string;
  sections: ExamSection[];
}

type PageState =
  | "loading"
  | "section_intro"
  | "in_progress"
  | "section_break"
  | "completed"
  | "review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimerColour(seconds: number, totalSeconds: number): string {
  if (seconds <= 120) return "#C44A4A"; // crimson ≤ 2 min
  if (seconds <= 300) return "#C4843A"; // amber ≤ 5 min
  return "#E7C777"; // gold
}

function getOptionLabel(idx: number): string {
  return ["A", "B", "C", "D"][idx] ?? String.fromCharCode(65 + idx);
}

const SECTION_INSTRUCTIONS: Record<string, string> = {
  "Quantitative Reasoning":
    "This section tests your mathematical reasoning and problem-solving skills. Read each question carefully. You may use working-out space on your paper. All answers must be selected from the four options provided.",
  "Abstract Reasoning":
    "This section tests your ability to identify patterns and relationships in visual sequences. Study each pattern carefully before selecting your answer. Trust your instincts on first impressions.",
  "Reading Comprehension":
    "This section tests your ability to understand and interpret written passages. Read each passage thoroughly before answering the questions that follow. Refer back to the passage as needed.",
  "Creative Writing":
    "This section tests your ability to write imaginatively and expressively. Read the prompt carefully and plan your response before writing. Focus on clear structure, vivid description, and engaging storytelling.",
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TournamentSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [profile, setProfile] = useState<any>(null);
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");

  // Section navigation
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  // Within a section
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // key: "sec-q"
  const [seenQuestions, setSeenQuestions] = useState<Set<number>>(new Set());
  const [writingText, setWritingText] = useState("");

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerTotalRef = useRef(0);

  // Break timer
  const [breakTimeLeft, setBreakTimeLeft] = useState(600);
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Section results
  const [sectionResults, setSectionResults] = useState<
    Record<number, { score: number; total: number; correct: number }>
  >({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }
    Promise.all([
      fetch(`/api/profile/${profileId}`).then((r) => r.json()),
      fetch(`/api/exam/${sessionId}`).then((r) => r.json()),
    ])
      .then(([profileData, examData]) => {
        setProfile(profileData.profile);
        setExam(examData);
        // Restore any existing answers
        const existingAnswers: Record<string, string> = {};
        examData.sections?.forEach((section: ExamSection, si: number) => {
          section.questions.forEach((q: ExamQuestion, qi: number) => {
            if (q.userAnswer) {
              existingAnswers[`${si}-${qi}`] = q.userAnswer;
            }
          });
        });
        setAnswers(existingAnswers);
        setPageState("section_intro");
      })
      .catch((err) => {
        console.error("Failed to load exam:", err);
      });
  }, [sessionId, router]);

  // ---------------------------------------------------------------------------
  // Timer management
  // ---------------------------------------------------------------------------

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startSectionTimer = useCallback(
    (minutes: number) => {
      stopTimer();
      const seconds = minutes * 60;
      setTimeLeft(seconds);
      timerTotalRef.current = seconds;

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            // Auto-submit: trigger via state — we'll watch for 0 in an effect
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (pageState === "in_progress" && timeLeft === 0 && exam) {
      alert("⏰ The tower bell has rung! Your section has been submitted.");
      handleSubmitSection(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, pageState]);

  // Break timer
  const startBreakTimer = useCallback(() => {
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    setBreakTimeLeft(600);
    breakTimerRef.current = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(breakTimerRef.current!);
          breakTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // When break reaches 0, advance
  useEffect(() => {
    if (pageState === "section_break" && breakTimeLeft === 0) {
      advanceToNextSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakTimeLeft, pageState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    };
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // Section flow
  // ---------------------------------------------------------------------------

  function beginSection() {
    if (!exam) return;
    const section = exam.sections[currentSectionIdx];
    setCurrentQuestionIdx(0);
    setSeenQuestions(new Set([0]));
    startSectionTimer(section.timeMinutes);
    setPageState("in_progress");
  }

  async function handleSubmitSection(autoSubmit = false) {
    if (!exam || submitting) return;

    const section = exam.sections[currentSectionIdx];
    const unansweredCount = section.questions.filter(
      (_, qi) => !answers[`${currentSectionIdx}-${qi}`]
    ).length;

    if (!autoSubmit && unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Submit anyway?`
      );
      if (!confirmed) return;
    }

    stopTimer();
    setSubmitting(true);

    try {
      // For writing sections, the "answer" is in writingText
      if (section.subject === "Creative Writing" && writingText.trim()) {
        const numId = parseInt(sessionId);
        const firstQ = section.questions[0];
        // Find global questionIndex from the question's topic
        const qi = exam.sections
          .slice(0, currentSectionIdx)
          .reduce((sum, s) => sum + s.questions.length, 0);

        await fetch("/api/exam/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: numId,
            sectionIndex: currentSectionIdx,
            questionIndex: qi,
            answer: writingText,
          }),
        });
      }

      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: parseInt(sessionId),
          sectionIndex: currentSectionIdx,
        }),
      });

      const data = await res.json();
      setSectionResults((prev) => ({
        ...prev,
        [currentSectionIdx]: {
          score: data.score,
          total: data.total,
          correct: data.correct,
        },
      }));

      if (data.completed) {
        setPageState("completed");
        return;
      }

      // Determine next: break after RC (index 2) before QR? or between section 2 and 3?
      // ASET has a break between the two halves. Mirror: break after section index 2 (RC)
      // when all 4 sections are present.
      const nextIdx = currentSectionIdx + 1;
      if (nextIdx < exam.sections.length) {
        const shouldBreak =
          currentSectionIdx === 2 &&
          exam.sections.length === 4;

        if (shouldBreak) {
          startBreakTimer();
          setPageState("section_break");
        } else {
          setCurrentSectionIdx(nextIdx);
          setCurrentQuestionIdx(0);
          setWritingText("");
          setPageState("section_intro");
        }
      } else {
        setPageState("completed");
      }
    } catch (err) {
      console.error("Failed to submit section:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function advanceToNextSection() {
    if (!exam) return;
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    const nextIdx = currentSectionIdx + 1;
    if (nextIdx < exam.sections.length) {
      setCurrentSectionIdx(nextIdx);
      setCurrentQuestionIdx(0);
      setWritingText("");
      setPageState("section_intro");
    } else {
      setPageState("completed");
    }
  }

  // ---------------------------------------------------------------------------
  // Answering
  // ---------------------------------------------------------------------------

  async function selectAnswer(answer: string) {
    if (submitting) return;
    const key = `${currentSectionIdx}-${currentQuestionIdx}`;
    setAnswers((prev) => ({ ...prev, [key]: answer }));

    // Persist to API
    const section = exam!.sections[currentSectionIdx];
    const globalQIdx =
      exam!.sections
        .slice(0, currentSectionIdx)
        .reduce((sum, s) => sum + s.questions.length, 0) + currentQuestionIdx;

    try {
      await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: parseInt(sessionId),
          sectionIndex: currentSectionIdx,
          questionIndex: globalQIdx,
          answer,
        }),
      });
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  }

  function navigateTo(qi: number) {
    setCurrentQuestionIdx(qi);
    setSeenQuestions((prev) => new Set([...prev, qi]));
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const currentSection = exam?.sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions[currentQuestionIdx];
  const currentAnswer = answers[`${currentSectionIdx}-${currentQuestionIdx}`];
  const answeredInSection = currentSection
    ? currentSection.questions.filter((_, qi) => answers[`${currentSectionIdx}-${qi}`]).length
    : 0;
  const allSeen =
    currentSection !== undefined &&
    seenQuestions.size >= currentSection.questions.length;
  const timerColour = getTimerColour(timeLeft, timerTotalRef.current);
  const isShaking = timeLeft <= 120 && timeLeft > 0;

  const totalScore = Object.values(sectionResults).reduce((sum, r) => sum + r.correct, 0);
  const totalQuestions = Object.values(sectionResults).reduce((sum, r) => sum + r.total, 0);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderOptions() {
    if (!currentQuestion) return null;
    let options: string[] = [];
    try {
      options = JSON.parse(currentQuestion.optionsJson || "[]");
    } catch {
      options = [];
    }
    if (options.length === 0) return null;

    return (
      <div className="space-y-3 mt-6">
        {options.map((opt, i) => {
          const label = getOptionLabel(i);
          const selected = currentAnswer === label;
          return (
            <button
              key={i}
              onClick={() => selectAnswer(label)}
              className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-90"
              style={{
                background: selected ? "#B68A3A22" : "#0F1C3F",
                border: `2px solid ${selected ? "#E7C777" : "#B68A3A44"}`,
                color: "#EADFC8",
                fontFamily: "Georgia, serif",
              }}
            >
              <span className="font-bold mr-2" style={{ color: "#B68A3A" }}>
                {label}.
              </span>
              {opt.replace(/^[A-D]\.\s*/, "")}
            </button>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Page states
  // ---------------------------------------------------------------------------

  if (pageState === "loading" || !exam) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        {profile && <GameNav profile={profile} />}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏰</div>
          <p style={{ color: "#B68A3A" }}>Loading your tournament…</p>
        </div>
      </div>
    );
  }

  // --- Section Intro ---
  if (pageState === "section_intro" && currentSection) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        {profile && <GameNav profile={profile} />}
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl mb-4">
            {currentSection.subject === "Quantitative Reasoning"
              ? "⚙️"
              : currentSection.subject === "Abstract Reasoning"
              ? "🌿"
              : currentSection.subject === "Reading Comprehension"
              ? "💧"
              : "✍️"}
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
          >
            {currentSection.subject}
          </h1>
          <p className="text-sm mb-1" style={{ color: "#B68A3A" }}>
            Section {currentSectionIdx + 1} of {exam.sections.length}
          </p>
          <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.7 }}>
            {currentSection.subject === "Creative Writing"
              ? `1 task · ${currentSection.timeMinutes} minutes`
              : `${currentSection.questions.length} questions · ${currentSection.timeMinutes} minutes`}
          </p>

          <div
            className="p-5 rounded-xl mb-8 text-sm text-left leading-relaxed"
            style={{
              background: "#1E2E5A",
              border: "1px solid #B68A3A44",
              color: "#EADFC8",
            }}
          >
            <p className="font-bold mb-2" style={{ color: "#B68A3A" }}>
              Official Instructions
            </p>
            <p>
              {SECTION_INSTRUCTIONS[currentSection.subject] ||
                "Read each question carefully and select the best answer."}
            </p>
          </div>

          <button
            onClick={beginSection}
            className="px-10 py-4 rounded-2xl text-lg font-bold transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #B68A3A, #E7C777)",
              color: "#0F1C3F",
              fontFamily: "Georgia, serif",
              boxShadow: "0 4px 20px rgba(182,138,58,0.3)",
            }}
          >
            Begin Section →
          </button>
        </div>
      </div>
    );
  }

  // --- In Progress ---
  if (pageState === "in_progress" && currentSection && currentQuestion) {
    let options: string[] = [];
    try {
      options = JSON.parse(currentQuestion.optionsJson || "[]");
    } catch {
      options = [];
    }
    const isWriting = currentSection.subject === "Creative Writing";

    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        {profile && <GameNav profile={profile} />}

        {/* Top Bar */}
        <div
          className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between"
          style={{
            background: "#0F1C3F",
            borderBottom: "1px solid #B68A3A33",
          }}
        >
          <div>
            <span
              className="text-sm font-semibold"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              {currentSection.subject}
            </span>
            {!isWriting && (
              <span className="text-xs ml-3" style={{ color: "#B68A3A" }}>
                Q {currentQuestionIdx + 1} / {currentSection.questions.length}
              </span>
            )}
          </div>

          {/* Timer */}
          <div
            className={isShaking ? "animate-bounce" : ""}
            style={{
              color: timerColour,
              fontFamily: "monospace",
              fontSize: "1.25rem",
              fontWeight: "bold",
              transition: "color 0.5s",
            }}
          >
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-6 py-6">
          {isWriting ? (
            /* Writing Section */
            <div>
              <div
                className="p-6 rounded-2xl mb-6"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: "#B68A3A" }}
                >
                  Writing Prompt
                </p>
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
                >
                  {currentQuestion.questionText}
                </p>
              </div>
              <textarea
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                placeholder="Write your response here…"
                rows={16}
                className="w-full px-5 py-4 rounded-2xl outline-none resize-none mb-6"
                style={{
                  background: "#1E2E5A",
                  border: "1px solid #B68A3A44",
                  color: "#EADFC8",
                  fontFamily: "Georgia, serif",
                  fontSize: "1rem",
                  lineHeight: "1.7",
                }}
              />
              <div className="text-right mb-6">
                <span className="text-xs" style={{ color: "#B68A3A" }}>
                  {writingText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <button
                onClick={() => handleSubmitSection()}
                disabled={submitting}
                className="w-full py-4 rounded-2xl font-bold transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                  color: "#0F1C3F",
                  fontFamily: "Georgia, serif",
                }}
              >
                {submitting ? "Submitting…" : "Submit Writing Section"}
              </button>
            </div>
          ) : (
            /* MCQ Section */
            <>
              {/* Crystal Navigator */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {currentSection.questions.map((_, qi) => {
                  const key = `${currentSectionIdx}-${qi}`;
                  const hasAnswer = !!answers[key];
                  const isCurrent = qi === currentQuestionIdx;
                  return (
                    <button
                      key={qi}
                      onClick={() => navigateTo(qi)}
                      className="w-8 h-8 rounded-full text-xs font-bold transition-all hover:scale-110"
                      style={{
                        background: isCurrent
                          ? "#E7C777"
                          : hasAnswer
                          ? "#2E6B3A"
                          : "#1E2E5A",
                        color: isCurrent ? "#0F1C3F" : "#EADFC8",
                        border: `2px solid ${isCurrent ? "#E7C777" : hasAnswer ? "#2E6B3A" : "#B68A3A22"}`,
                      }}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>

              {/* Question Card */}
              <div
                className="p-6 rounded-2xl mb-4"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
                >
                  {currentQuestion.questionText}
                </p>

                {/* Options */}
                <div className="space-y-3 mt-6">
                  {options.map((opt, i) => {
                    const label = getOptionLabel(i);
                    const selected = currentAnswer === label;
                    return (
                      <button
                        key={i}
                        onClick={() => selectAnswer(label)}
                        className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-90"
                        style={{
                          background: selected ? "#B68A3A22" : "#0F1C3F",
                          border: `2px solid ${selected ? "#E7C777" : "#B68A3A44"}`,
                          color: "#EADFC8",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        <span className="font-bold mr-2" style={{ color: "#B68A3A" }}>
                          {label}.
                        </span>
                        {opt.replace(/^[A-D]\.\s*/, "")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 mt-4">
                <button
                  onClick={() => navigateTo(Math.max(0, currentQuestionIdx - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-30"
                  style={{
                    background: "#1E2E5A",
                    border: "1px solid #B68A3A44",
                    color: "#EADFC8",
                  }}
                >
                  ← Prev
                </button>

                <div className="flex gap-2">
                  {currentQuestionIdx < currentSection.questions.length - 1 ? (
                    <>
                      <button
                        onClick={() =>
                          navigateTo(
                            Math.min(
                              currentSection.questions.length - 1,
                              currentQuestionIdx + 1
                            )
                          )
                        }
                        className="px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                        style={{
                          background: "#1E2E5A",
                          border: "1px solid #B68A3A44",
                          color: "#B68A3A",
                        }}
                      >
                        Skip →
                      </button>
                      <button
                        onClick={() =>
                          navigateTo(
                            Math.min(
                              currentSection.questions.length - 1,
                              currentQuestionIdx + 1
                            )
                          )
                        }
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
                      onClick={() => handleSubmitSection()}
                      disabled={submitting || (!allSeen && answeredInSection < currentSection.questions.length)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                        color: "#0F1C3F",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {submitting
                        ? "Submitting…"
                        : `Submit Section (${answeredInSection}/${currentSection.questions.length})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Submit section button (accessible from any question after seeing all) */}
              {allSeen && currentQuestionIdx < currentSection.questions.length - 1 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => handleSubmitSection()}
                    disabled={submitting}
                    className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{
                      background: "#1E2E5A",
                      border: "1px solid #B68A3A",
                      color: "#E7C777",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {submitting
                      ? "Submitting…"
                      : `Submit Section (${answeredInSection}/${currentSection.questions.length} answered)`}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  // --- Section Break ---
  if (pageState === "section_break") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        {profile && <GameNav profile={profile} />}
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">☕</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
          >
            Section Break
          </h1>
          <p className="mb-6" style={{ color: "#EADFC8", opacity: 0.7 }}>
            Great work on the first half! Take a breath and prepare for the
            next challenge.
          </p>
          <div
            className="text-5xl font-bold mb-6"
            style={{ color: "#B68A3A", fontFamily: "monospace" }}
          >
            {formatTime(breakTimeLeft)}
          </div>
          <p className="text-sm mb-8" style={{ color: "#EADFC8", opacity: 0.5 }}>
            Break ends automatically. Next section begins after the timer.
          </p>
          <button
            onClick={advanceToNextSection}
            className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: "transparent",
              border: "1px solid #B68A3A",
              color: "#B68A3A",
            }}
          >
            Skip break →
          </button>
        </div>
      </div>
    );
  }

  // --- Completed ---
  if (pageState === "completed" || pageState === "review") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        {profile && <GameNav profile={profile} />}

        <div className="max-w-2xl mx-auto px-6 py-12">
          {pageState === "completed" ? (
            <>
              {/* Score reveal */}
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🏆</div>
                <h1
                  className="text-4xl font-bold mb-2"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Tournament Complete!
                </h1>
                <div
                  className="text-6xl font-bold my-4"
                  style={{ color: "#E7C777" }}
                >
                  {totalScore}
                </div>
                <p className="text-xl" style={{ color: "#EADFC8" }}>
                  out of {totalQuestions}
                </p>
                {totalQuestions > 0 && (
                  <p
                    className="text-2xl font-bold mt-2"
                    style={{ color: "#B68A3A" }}
                  >
                    {Math.round((totalScore / totalQuestions) * 100)}%
                  </p>
                )}
              </div>

              {/* Per-section breakdown */}
              <div
                className="p-6 rounded-2xl mb-6"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <h2
                  className="text-sm uppercase tracking-widest mb-4"
                  style={{ color: "#B68A3A" }}
                >
                  Section Breakdown
                </h2>
                <div className="space-y-3">
                  {exam.sections.map((section, si) => {
                    const result = sectionResults[si];
                    const emoji =
                      section.subject === "Quantitative Reasoning"
                        ? "⚙️"
                        : section.subject === "Abstract Reasoning"
                        ? "🌿"
                        : section.subject === "Reading Comprehension"
                        ? "💧"
                        : "✍️";
                    return (
                      <div
                        key={si}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: "1px solid #B68A3A22" }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{emoji}</span>
                          <span
                            className="text-sm"
                            style={{ color: "#EADFC8" }}
                          >
                            {section.subject}
                          </span>
                        </div>
                        <span style={{ color: "#E7C777", fontWeight: "bold" }}>
                          {result
                            ? `${result.correct} / ${result.total}`
                            : section.subject === "Creative Writing"
                            ? "Submitted"
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPageState("review")}
                  className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  style={{
                    background: "#1E2E5A",
                    border: "1px solid #B68A3A",
                    color: "#E7C777",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Review Answers
                </button>
                <Link
                  href="/home"
                  className="flex-1 py-3 rounded-xl font-bold text-center transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                    color: "#0F1C3F",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Back to Archive Hall
                </Link>
              </div>
            </>
          ) : (
            /* Review Mode */
            <>
              <div className="flex items-center justify-between mb-6">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Review Answers
                </h1>
                <button
                  onClick={() => setPageState("completed")}
                  className="text-sm px-4 py-2 rounded-xl"
                  style={{
                    color: "#B68A3A",
                    border: "1px solid #B68A3A44",
                    background: "#1E2E5A",
                  }}
                >
                  ← Back to Results
                </button>
              </div>

              {exam.sections.map((section, si) => {
                if (section.subject === "Creative Writing") return null;
                return (
                  <div key={si} className="mb-8">
                    <h2
                      className="text-sm uppercase tracking-widest mb-3"
                      style={{ color: "#B68A3A" }}
                    >
                      {section.subject}
                    </h2>
                    <div className="space-y-3">
                      {section.questions.map((q, qi) => {
                        const userAns = answers[`${si}-${qi}`] || q.userAnswer || null;
                        const correct = q.correctAnswer;
                        const isCorrect = userAns === correct;
                        let opts: string[] = [];
                        try {
                          opts = JSON.parse(q.optionsJson || "[]");
                        } catch {
                          opts = [];
                        }
                        return (
                          <div
                            key={qi}
                            className="p-4 rounded-xl"
                            style={{
                              background: "#1E2E5A",
                              border: `1px solid ${
                                !userAns
                                  ? "#B68A3A33"
                                  : isCorrect
                                  ? "#2E6B3A"
                                  : "#6B2E2E"
                              }`,
                            }}
                          >
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <p
                                className="text-sm flex-1"
                                style={{ color: "#EADFC8" }}
                              >
                                <span
                                  className="font-bold mr-1"
                                  style={{ color: "#B68A3A" }}
                                >
                                  {qi + 1}.
                                </span>
                                {q.questionText.slice(0, 120)}
                                {q.questionText.length > 120 ? "…" : ""}
                              </p>
                              <span className="text-lg flex-shrink-0">
                                {!userAns ? "⬜" : isCorrect ? "✅" : "❌"}
                              </span>
                            </div>
                            <div
                              className="text-xs flex gap-4"
                              style={{ color: "#EADFC8", opacity: 0.7 }}
                            >
                              <span>
                                Your answer:{" "}
                                <strong style={{ color: isCorrect ? "#6BC47A" : "#C44A4A" }}>
                                  {userAns || "skipped"}
                                </strong>
                              </span>
                              {!isCorrect && (
                                <span>
                                  Correct:{" "}
                                  <strong style={{ color: "#6BC47A" }}>{correct}</strong>
                                </span>
                              )}
                            </div>
                            {!isCorrect && q.explanation && (
                              <p
                                className="text-xs mt-2 italic"
                                style={{ color: "#EADFC8", opacity: 0.6 }}
                              >
                                {q.explanation.slice(0, 200)}
                                {q.explanation.length > 200 ? "…" : ""}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 text-center">
                <Link
                  href="/home"
                  className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                    color: "#0F1C3F",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Back to Archive Hall
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
