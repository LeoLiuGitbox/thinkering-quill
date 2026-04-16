"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameNav from "@/components/layout/GameNav";

type WritingMode = "micro_skill_drill" | "guided_writing" | "full_task";
type WritingPhase =
  | "mode_select"
  | "lesson"
  | "draft_1"
  | "coaching"
  | "draft_2"
  | "full_task_setup"
  | "full_task_draft"
  | "complete";

type SkillCode =
  | "show_not_tell"
  | "opening_hook"
  | "paragraph_expansion"
  | "sensory_detail"
  | "sentence_variety"
  | "prompt_interpretation"
  // Narrative skills
  | "word_choice"
  | "dialogue"
  | "idea_generation"
  | "voice_and_tone"
  | "narrative_structure"
  | "main_event"
  // Persuasive / writing craft skills (ExamSuccess WR domain)
  | "persuasive_structure"
  | "teel_framework"
  | "argument_dimensions"
  | "counter_argument"
  | "writing_time_plan"
  | "prompt_analysis";

type LessonPayload = {
  title: string;
  focus: string;
  teachingPoint: string;
  strongExample: string;
  weakExample: string;
  taskPrompt: string;
  revisionGoal: string;
  suggestedTimeMinutes: number;
  scaffoldNotes?: string[];
};

type ScenePayload = {
  sessionId: number;
  description: string;
  imagePath: string;
  promptCue: string;
  writingType: string;
};

type WritingCoachingFeedback = {
  strength: string;
  priorityIssue: string;
  revisionInstruction: string;
  quotedOriginalSnippet?: string;
  revisedSnippet?: string;
  topicConnection?: string;
  modelExample?: string;
  nextStep?: string;
  improvedDraft?: string;
  rubricSummary?: {
    promptRelevance?: string;
    ideas?: string;
    organisation?: string;
    language?: string;
  };
};

const FULL_TASK_TIMER_SECONDS = 25 * 60;

type SkillGroup = {
  group: string;
  skills: { code: SkillCode; label: string; summary: string; guidedOnly?: boolean }[];
};

const SKILL_GROUPS: SkillGroup[] = [
  {
    group: "Craft",
    skills: [
      { code: "show_not_tell", label: "Show, Not Tell", summary: "Turn flat statements into vivid action and detail." },
      { code: "sensory_detail", label: "Sensory Detail", summary: "Use sight, sound, touch, and atmosphere with purpose." },
      { code: "word_choice", label: "Word Choice", summary: "Replace weak words with precise, expressive ones." },
      { code: "sentence_variety", label: "Sentence Variety", summary: "Make the writing flow with stronger rhythm and contrast." },
      { code: "dialogue", label: "Dialogue", summary: "Write dialogue that reveals character or moves the plot." },
    ],
  },
  {
    group: "Structure",
    skills: [
      { code: "opening_hook", label: "Opening Hook", summary: "Create curiosity quickly and cleanly." },
      { code: "paragraph_expansion", label: "Paragraph Expansion", summary: "Stretch one idea into a stronger scene or moment." },
      { code: "narrative_structure", label: "Narrative Structure", summary: "Plan a clear 4–5 paragraph arc within the time limit.", guidedOnly: true },
      { code: "main_event", label: "Main Event (Climax)", summary: "Develop one clear, unforgettable story moment.", guidedOnly: true },
    ],
  },
  {
    group: "Planning",
    skills: [
      { code: "prompt_interpretation", label: "Prompt Interpretation", summary: "Choose a strong angle and stay on track." },
      { code: "idea_generation", label: "Fresh Ideas", summary: "Find a surprising, original angle that avoids the obvious." },
      { code: "voice_and_tone", label: "Voice & Tone", summary: "Keep a consistent narrator voice and emotional register.", guidedOnly: true },
    ],
  },
  {
    group: "Advanced Narrative",
    skills: [
      { code: "narrative_structure", label: "Narrative Structure", summary: "Plan a clear 4–5 paragraph story arc within the time limit.", guidedOnly: true },
      { code: "main_event", label: "Main Event (Climax)", summary: "Develop one clear climax — the single moment everything leads to.", guidedOnly: true },
    ],
  },
  {
    group: "Persuasive Craft",
    skills: [
      { code: "persuasive_structure", label: "Persuasive Writing", summary: "Write a persuasive or discussion piece using TEEL structure." },
      { code: "teel_framework", label: "TEEL Paragraph", summary: "Write one argument using Topic, Explanation, Evidence, Link." },
      { code: "argument_dimensions", label: "3-Dimension Arguments", summary: "Generate strong arguments across Individual, Social, and Broader." },
      { code: "counter_argument", label: "Counter-Argument", summary: "Acknowledge the opposing view and rebut it in 2 sentences." },
      { code: "writing_time_plan", label: "Time Management", summary: "Use the 25–60–15 rule to plan, write, and review on time." },
      { code: "prompt_analysis", label: "Prompt Analysis", summary: "Break down any prompt in 4 steps before you write." },
    ],
  },
];

// Flat list for backward-compatible skill lookup
const SKILL_OPTIONS = SKILL_GROUPS.flatMap((g) => g.skills);

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function tokenizeForDiff(text: string) {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

function buildLcsTable(a: string[], b: string[]) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function diffTokens(original: string, improved: string) {
  const a = tokenizeForDiff(original);
  const b = tokenizeForDiff(improved);
  const dp = buildLcsTable(a, b);
  const originalParts: Array<{ text: string; changed: boolean }> = [];
  const improvedParts: Array<{ text: string; changed: boolean }> = [];

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      originalParts.push({ text: a[i], changed: false });
      improvedParts.push({ text: b[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      originalParts.push({ text: a[i], changed: true });
      i++;
    } else {
      improvedParts.push({ text: b[j], changed: true });
      j++;
    }
  }

  while (i < a.length) {
    originalParts.push({ text: a[i], changed: true });
    i++;
  }
  while (j < b.length) {
    improvedParts.push({ text: b[j], changed: true });
    j++;
  }

  return { originalParts, improvedParts };
}

function renderDiffText(parts: Array<{ text: string; changed: boolean }>, colors: { base: string; changedBg: string; changedText: string }) {
  return parts.map((part, index) => (
    <span
      key={`${part.text}-${index}`}
      style={part.changed
        ? {
            background: colors.changedBg,
            color: colors.changedText,
            borderRadius: "0.35rem",
            padding: "0.08rem 0.14rem",
            fontWeight: 700,
            boxShadow: `0 0 0 1px ${colors.changedText}33`,
          }
        : { color: colors.base }}
    >
      {part.text}
    </span>
  ));
}

function renderCoachText(text: string, tone: "default" | "quote" = "default") {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const baseStyle = {
    color: "#EADFC8",
    fontFamily: "Georgia, serif",
    fontSize: "1.125rem",
    lineHeight: 1.8,
  } as const;

  const quoteStyle = tone === "quote"
    ? {
        paddingLeft: "1rem",
        borderLeft: "3px solid rgba(231, 199, 119, 0.45)",
        fontStyle: "italic" as const,
      }
    : undefined;

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
        const numberedLines = lines.filter((line) => /^\d+\.\s+/.test(line));
        const isBulletList = bulletLines.length === lines.length && lines.length > 0;
        const isNumberedList = numberedLines.length === lines.length && lines.length > 0;

        if (isBulletList) {
          return (
            <ul
              key={`block-${blockIndex}`}
              className="space-y-2 pl-5 list-disc"
              style={baseStyle}
            >
              {lines.map((line, lineIndex) => (
                <li key={`line-${lineIndex}`}>{line.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol
              key={`block-${blockIndex}`}
              className="space-y-2 pl-5 list-decimal"
              style={baseStyle}
            >
              {lines.map((line, lineIndex) => (
                <li key={`line-${lineIndex}`}>{line.replace(/^\d+\.\s+/, "")}</li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`block-${blockIndex}`}
            className="whitespace-pre-wrap"
            style={{ ...baseStyle, ...quoteStyle }}
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}

export default function WritingPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [phase, setPhase] = useState<WritingPhase>("mode_select");
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillCode>("show_not_tell");

  const [lessonSessionId, setLessonSessionId] = useState<number | null>(null);
  const [lessonData, setLessonData] = useState<LessonPayload | null>(null);
  const [sceneData, setSceneData] = useState<ScenePayload | null>(null);

  const [draftText, setDraftText] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [fullTaskText, setFullTaskText] = useState("");

  const [feedback, setFeedback] = useState<WritingCoachingFeedback | null>(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [sparksEarned, setSparksEarned] = useState(0);
  const [wisdomEarned, setWisdomEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modePreparationLabel, setModePreparationLabel] = useState("");
  const [error, setError] = useState("");

  const [timeRemaining, setTimeRemaining] = useState(FULL_TASK_TIMER_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const id = localStorage.getItem("activeProfileId");
    if (!id) {
      router.push("/login");
      return;
    }

    fetch(`/api/profile/${id}`)
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (phase === "full_task_draft" && timerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((current) => {
          if (current <= 1) {
            clearInterval(timerRef.current);
            setTimerRunning(false);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [phase, timerRunning, timeRemaining]);

  const fullTaskTimerColor = useMemo(() => {
    if (timeRemaining <= 120) return "#C84B31";
    if (timeRemaining <= 300) return "#E7C777";
    return "#B68A3A";
  }, [timeRemaining]);

  function resetSessionState() {
    setPhase("mode_select");
    setSelectedMode(null);
    setLessonSessionId(null);
    setLessonData(null);
    setSceneData(null);
    setDraftText("");
    setRevisionText("");
    setFullTaskText("");
    setFeedback(null);
    setCompletionMessage("");
    setSparksEarned(0);
    setWisdomEarned(0);
    setLoading(false);
    setModePreparationLabel("");
    setError("");
    setTimeRemaining(FULL_TASK_TIMER_SECONDS);
    setTimerRunning(false);
  }

  async function startCoachingMode(mode: Exclude<WritingMode, "full_task">) {
    if (!profile) return;

    setLoading(true);
    setModePreparationLabel(mode === "guided_writing" ? "Preparing Guided Writing…" : "Preparing Quick Skill Drill…");
    setError("");

    try {
      const response = await fetch("/api/writing/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          skillCode: selectedSkill,
          mode,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load writing lesson");

      setSelectedMode(mode);
      setLessonSessionId(data.sessionId);
      setLessonData(data.lesson);
      setFeedback(null);
      setSparksEarned(0);
      setDraftText("");
      setRevisionText("");
      setCompletionMessage("");
      setPhase("lesson");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load writing lesson");
    } finally {
      setLoading(false);
      setModePreparationLabel("");
    }
  }

  async function startFullTask() {
    if (!profile) return;

    setLoading(true);
    setModePreparationLabel("Preparing Full Writing Task…");
    setError("");

    try {
      const response = await fetch("/api/writing/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          mode: "full_task",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate full writing task");

      setSelectedMode("full_task");
      setSceneData(data);
      setFeedback(null);
      setSparksEarned(0);
      setFullTaskText("");
      setCompletionMessage("");
      setTimeRemaining(FULL_TASK_TIMER_SECONDS);
      setTimerRunning(false);
      setPhase("full_task_setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load full writing task");
    } finally {
      setLoading(false);
      setModePreparationLabel("");
    }
  }

  async function submitDraftOne() {
    if (!profile || !lessonSessionId || !lessonData || !selectedMode || selectedMode === "full_task") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/writing/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          sessionId: lessonSessionId,
          skillCode: selectedSkill,
          mode: selectedMode,
          promptText: lessonData.taskPrompt,
          draftText,
          stage: "draft_v1",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to coach first draft");

      setFeedback(data.feedback);
      setRevisionText(draftText);
      setPhase("coaching");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to coach first draft");
    } finally {
      setLoading(false);
    }
  }

  async function submitDraftTwo() {
    if (!profile || !lessonSessionId || !lessonData || !selectedMode || selectedMode === "full_task") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/writing/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          sessionId: lessonSessionId,
          skillCode: selectedSkill,
          mode: selectedMode,
          promptText: lessonData.taskPrompt,
          draftText: revisionText,
          stage: "draft_v2",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save revision");

      setSparksEarned(data.sparksEarned || 0);
      setWisdomEarned(data.wisdomEarned || 0);
      setCompletionMessage(data.completionMessage || "Revision complete.");
      setPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save revision");
    } finally {
      setLoading(false);
    }
  }

  async function submitFullTask() {
    if (!profile || !sceneData) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/writing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          sessionId: sceneData.sessionId,
          imageDescription: sceneData.description,
          imagePath: sceneData.imagePath,
          promptCue: sceneData.promptCue,
          writingText: fullTaskText,
          writingType: sceneData.writingType,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to review full writing task");

      setFeedback(data.feedback);
      setSparksEarned(data.sparksEarned || 0);
      setWisdomEarned(data.wisdomEarned || 0);
      setCompletionMessage(
        "Stage review complete. Keep the revision instruction in mind the next time you write a full piece."
      );
      setPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review full writing task");
    } finally {
      setLoading(false);
    }
  }

  function renderError() {
    if (!error) return null;

    return (
      <div
        className="mb-6 rounded-2xl px-4 py-3 text-sm"
        style={{ background: "#3A1F1F", border: "1px solid #C84B31", color: "#F4D7D7" }}
      >
        {error}
      </div>
    );
  }

  if (phase === "mode_select") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-4xl mx-auto px-6 py-12 relative">
          <div className="text-center mb-10">
            <div className="text-7xl mb-5">✍️</div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              Workshop of Runes
            </h1>
            <p className="max-w-2xl mx-auto text-base" style={{ color: "#EADFC8", opacity: 0.82 }}>
              Writing now works like a coaching space: short skill drills, guided drafting,
              and staged full tasks when you are ready.
            </p>
          </div>

          {renderError()}

          <section className="mb-8">
            <h2
              className="text-sm uppercase tracking-[0.3em] mb-5"
              style={{ color: "#B68A3A" }}
            >
              Choose a Writing Skill
            </h2>
            {SKILL_GROUPS.map((group) => (
              <div key={group.group} className="mb-6">
                <p
                  className="text-xs uppercase tracking-[0.22em] mb-3"
                  style={{ color: "#B68A3A", opacity: 0.7 }}
                >
                  {group.group}
                </p>
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {group.skills.map((skill) => {
                    const isActive = selectedSkill === skill.code;
                    return (
                      <button
                        key={skill.code}
                        onClick={() => setSelectedSkill(skill.code)}
                        disabled={loading}
                        className="rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                        style={{
                          background: isActive ? "#24386A" : "#1A2545",
                          border: `1px solid ${isActive ? "#E7C777" : "#B68A3A33"}`,
                          opacity: loading ? 0.55 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-bold" style={{ color: "#E7C777" }}>
                            {skill.label}
                          </p>
                          {skill.guidedOnly && (
                            <span
                              className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: "#1E2E5A", color: "#7EB8E8", border: "1px solid #2E5A8E" }}
                            >
                              Guided
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.78 }}>
                          {skill.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <button
              onClick={() => void startCoachingMode("micro_skill_drill")}
              disabled={loading || !!SKILL_OPTIONS.find((s) => s.code === selectedSkill)?.guidedOnly}
              title={SKILL_OPTIONS.find((s) => s.code === selectedSkill)?.guidedOnly ? "This skill is only available in Guided Writing" : undefined}
              className="rounded-3xl p-6 text-left transition-all hover:scale-[1.015] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
            >
              <div className="text-3xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
                Quick Skill Drill
              </h3>
              <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Train one writing move in a short burst, then revise it straight away.
              </p>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#B68A3A" }}>
                5-8 minutes
              </p>
            </button>

            <button
              onClick={() => void startCoachingMode("guided_writing")}
              disabled={loading}
              className="rounded-3xl p-6 text-left transition-all hover:scale-[1.015] disabled:opacity-50"
              style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
            >
              <div className="text-3xl mb-4">🪶</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
                Guided Writing
              </h3>
              <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Write a stronger paragraph, opening, or focused section with coaching support.
              </p>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#B68A3A" }}>
                10-15 minutes
              </p>
            </button>

            <button
              onClick={() => void startFullTask()}
              disabled={loading}
              className="rounded-3xl p-6 text-left transition-all hover:scale-[1.015] disabled:opacity-50"
              style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
            >
              <div className="text-3xl mb-4">🌌</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
                Full Writing Task
              </h3>
              <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Use a staged full composition to test how your practice transfers to a larger task.
              </p>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#B68A3A" }}>
                25 minutes
              </p>
            </button>
          </section>

          {loading && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-3xl"
              style={{
                background: "rgba(15, 28, 63, 0.82)",
                backdropFilter: "blur(3px)",
                zIndex: 20,
              }}
            >
              <div
                className="px-8 py-7 rounded-3xl text-center max-w-md"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <div
                  className="text-5xl mb-4"
                  style={{ display: "inline-block", animation: "writing-mode-spin 1.4s linear infinite" }}
                >
                  📜
                </div>
                <p className="text-2xl font-bold mb-2" style={{ color: "#E7C777" }}>
                  {modePreparationLabel || "Preparing Writing Session…"}
                </p>
                <p style={{ color: "#EADFC8", opacity: 0.82, lineHeight: 1.7 }}>
                  The page is locked while the workshop prepares your challenge.
                </p>
              </div>
              <style>{`@keyframes writing-mode-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (phase === "lesson" && lessonData) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-4xl mx-auto px-6 py-10">
          {renderError()}
          <div
            className="rounded-3xl p-6 mb-6"
            style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
          >
            <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: "#B68A3A" }}>
              {selectedMode === "guided_writing" ? "Guided Writing" : "Quick Skill Drill"}
            </p>
            <h1 className="text-3xl font-bold mb-3" style={{ color: "#E7C777" }}>
              {lessonData.title}
            </h1>
            <p className="text-xl mb-4" style={{ color: "#EADFC8", opacity: 0.84, lineHeight: 1.7 }}>
              {lessonData.focus}
            </p>
            <p className="text-lg leading-relaxed" style={{ color: "#EADFC8", opacity: 0.78 }}>
              {lessonData.teachingPoint}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div
              className="rounded-2xl p-5"
              style={{ background: "#17361E", border: "1px solid #2E6B3A" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#7DDB8D" }}>
                Strong Example
              </p>
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif", fontSize: "1.125rem", lineHeight: 1.8 }}>
                {lessonData.strongExample}
              </p>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ background: "#3A1F1F", border: "1px solid #C84B31" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#F5A39A" }}>
                Weak Example
              </p>
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif", fontSize: "1.125rem", lineHeight: 1.8 }}>
                {lessonData.weakExample}
              </p>
            </div>
          </div>

          {selectedMode === "guided_writing" && lessonData.scaffoldNotes && lessonData.scaffoldNotes.length > 0 && (
            <div
              className="rounded-2xl p-5 mb-6"
              style={{ background: "#1A2840", border: "1px solid #2E5A8E" }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: "#7EB8E8" }}>
                Planning Frame
              </p>
              <ol className="space-y-2">
                {lessonData.scaffoldNotes.map((step, i) => (
                  <li key={i} className="flex gap-3 text-base" style={{ color: "#EADFC8" }}>
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "#2E5A8E", color: "#EADFC8" }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontFamily: "Georgia, serif" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
          >
            <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
              Your Task
            </p>
            <p className="mb-4" style={{ color: "#EADFC8", fontFamily: "Georgia, serif", fontSize: "1.2rem", lineHeight: 1.8 }}>
              {lessonData.taskPrompt}
            </p>
            <p className="text-base" style={{ color: "#B68A3A", lineHeight: 1.7 }}>
              Revision goal: {lessonData.revisionGoal}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetSessionState}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{ border: "1px solid #B68A3A55", color: "#E7C777" }}
            >
              Back
            </button>
            <button
              onClick={() => setPhase("draft_1")}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              Start Draft
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "draft_1" && lessonData) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-4xl mx-auto px-6 py-10 relative">
          {renderError()}
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: "#B68A3A" }}>
              {selectedMode === "guided_writing" ? "Guided Draft" : "First Draft"}
            </p>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#E7C777" }}>
              {lessonData.title}
            </h1>
            <p style={{ color: "#EADFC8", opacity: 0.82, fontSize: "1.2rem", lineHeight: 1.8 }}>{lessonData.taskPrompt}</p>
          </div>

          {selectedMode === "guided_writing" && lessonData.scaffoldNotes && lessonData.scaffoldNotes.length > 0 && (
            <div
              className="rounded-2xl p-4 mb-5"
              style={{ background: "#1A2840", border: "1px solid #2E5A8E" }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#7EB8E8" }}>
                Planning Frame
              </p>
              <ol className="space-y-1.5">
                {lessonData.scaffoldNotes.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-base" style={{ color: "#EADFC8", opacity: 0.88 }}>
                    <span
                      className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: "#2E5A8E", color: "#EADFC8" }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontFamily: "Georgia, serif" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Write your first draft here..."
            className="w-full rounded-3xl p-6 resize-none outline-none"
            disabled={loading}
            style={{
              minHeight: "380px",
              background: loading ? "#16213B" : "#1A2545",
              border: "1px solid #B68A3A33",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
              fontSize: "1.2rem",
              lineHeight: 1.8,
              opacity: loading ? 0.55 : 1,
              cursor: loading ? "not-allowed" : "text",
            }}
          />

          <div className="flex items-center justify-between mt-4">
            <p style={{ color: "#B68A3A" }}>{getWordCount(draftText)} words</p>
            <button
              onClick={() => void submitDraftOne()}
              disabled={loading || getWordCount(draftText) < 8}
              className="rounded-xl px-8 py-3 font-bold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              {loading ? "Preparing Coaching…" : "Get Coaching"}
            </button>
          </div>

          {loading && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-3xl"
              style={{
                background: "rgba(15, 28, 63, 0.78)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                className="px-8 py-6 rounded-3xl text-center"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <div
                  className="text-5xl mb-4"
                  style={{ display: "inline-block", animation: "writing-spin 1.4s linear infinite" }}
                >
                  🔮
                </div>
                <p className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
                  Getting Coaching…
                </p>
                <p style={{ color: "#EADFC8", opacity: 0.8 }}>
                  Your draft is locked while the coach prepares feedback.
                </p>
              </div>
              <style>{`@keyframes writing-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (phase === "coaching" && feedback) {
    const comparison = feedback.improvedDraft
      ? diffTokens(draftText, feedback.improvedDraft)
      : null;

    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-5xl mx-auto px-6 py-10">
          {renderError()}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#E7C777" }}>
              Revision Coaching
            </h1>
            <p style={{ color: "#EADFC8", opacity: 0.8 }}>
              Focus on one improvement, then rewrite right away.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div
              className="rounded-2xl p-5"
              style={{ background: "#17361E", border: "1px solid #2E6B3A" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#7DDB8D" }}>
                Strength
              </p>
              {renderCoachText(feedback.strength)}
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                Priority Issue
              </p>
              {renderCoachText(feedback.priorityIssue)}
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                Revision Instruction
              </p>
              {renderCoachText(feedback.revisionInstruction)}
            </div>

            {(feedback.quotedOriginalSnippet || feedback.revisedSnippet || feedback.topicConnection) && (
              <div className="grid gap-4 lg:grid-cols-3">
                {feedback.quotedOriginalSnippet && (
                  <div
                    className="rounded-2xl p-5"
                    style={{ background: "#3A1F1F", border: "1px solid #C84B31" }}
                  >
                    <p className="text-sm font-bold mb-2" style={{ color: "#F5A39A" }}>
                      From Your Draft
                    </p>
                    {renderCoachText(feedback.quotedOriginalSnippet, "quote")}
                  </div>
                )}

                {feedback.revisedSnippet && (
                  <div
                    className="rounded-2xl p-5"
                    style={{ background: "#17361E", border: "1px solid #2E6B3A" }}
                  >
                    <p className="text-sm font-bold mb-2" style={{ color: "#7DDB8D" }}>
                      Better Version
                    </p>
                    {renderCoachText(feedback.revisedSnippet, "quote")}
                  </div>
                )}

                {feedback.topicConnection && (
                  <div
                    className="rounded-2xl p-5"
                    style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
                  >
                    <p className="text-sm font-bold mb-2" style={{ color: "#B68A3A" }}>
                      Why This Fits the Topic Better
                    </p>
                    {renderCoachText(feedback.topicConnection)}
                  </div>
                )}
              </div>
            )}

            {feedback.modelExample && (
              <div
                className="rounded-2xl p-5"
                style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#B68A3A" }}>
                  Model Example
                </p>
                {renderCoachText(feedback.modelExample, "quote")}
              </div>
            )}
          </div>

          {comparison && (
            <div className="grid gap-5 lg:grid-cols-2 mb-8">
              <div
                className="rounded-3xl p-5"
                style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
              >
                <p className="text-sm font-bold mb-3" style={{ color: "#E7C777" }}>
                  Your Draft
                </p>
                <p
                  className="text-base whitespace-pre-wrap"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif", lineHeight: 1.85 }}
                >
                  {renderDiffText(comparison.originalParts, {
                    base: "#EADFC8",
                    changedBg: "#5A2430",
                    changedText: "#FFD2D2",
                  })}
                </p>
              </div>

              <div
                className="rounded-3xl p-5"
                style={{ background: "#17361E", border: "1px solid #2E6B3A" }}
              >
                <p className="text-sm font-bold mb-3" style={{ color: "#7DDB8D" }}>
                  Coach’s Revision
                </p>
                <p
                  className="text-base whitespace-pre-wrap"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif", lineHeight: 1.85 }}
                >
                  {renderDiffText(comparison.improvedParts, {
                    base: "#EADFC8",
                    changedBg: "#2E6B3A",
                    changedText: "#E6FFE9",
                  })}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setPhase("draft_2")}
            className="w-full rounded-xl py-3 font-bold"
            style={{
              background: "linear-gradient(135deg, #B68A3A, #E7C777)",
              color: "#0F1C3F",
            }}
          >
            Revise This Piece
          </button>
        </main>
      </div>
    );
  }

  if (phase === "draft_2" && lessonData && feedback) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-4xl mx-auto px-6 py-10">
          {renderError()}
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              className="rounded-3xl p-5"
              style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: "#E7C777" }}>
                Draft 1
              </p>
              <p
                className="text-base whitespace-pre-wrap"
                style={{ color: "#EADFC8", fontFamily: "Georgia, serif", lineHeight: 1.85 }}
              >
                {draftText}
              </p>
            </div>

            <div>
              <div
                className="rounded-2xl p-5 mb-4"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                  Revise toward this goal
                </p>
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif", fontSize: "1.125rem", lineHeight: 1.8 }}>
                  {feedback.revisionInstruction}
                </p>
              </div>

              <textarea
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="Rewrite your draft here..."
                className="w-full rounded-3xl p-6 resize-none outline-none"
                style={{
                  minHeight: "360px",
                  background: "#1A2545",
                  border: "1px solid #B68A3A33",
                  color: "#EADFC8",
                  fontFamily: "Georgia, serif",
                  fontSize: "1.2rem",
                  lineHeight: 1.8,
                }}
              />

              <div className="flex items-center justify-between mt-4">
                <p style={{ color: "#B68A3A" }}>{getWordCount(revisionText)} words</p>
                <button
                  onClick={() => void submitDraftTwo()}
                  disabled={loading || getWordCount(revisionText) < 8}
                  className="rounded-xl px-8 py-3 font-bold disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                    color: "#0F1C3F",
                  }}
                >
                  Finish Revision
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "full_task_setup" && sceneData) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-2xl mx-auto px-6 py-12 text-center">
          {renderError()}
          <div className="text-7xl mb-5">🌌</div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: "#E7C777" }}>
            Staged Full Task
          </h1>
          <p className="mb-8" style={{ color: "#EADFC8", opacity: 0.82 }}>
            Use this longer task to test how your practice transfers into a full composition.
          </p>

          {sceneData.imagePath && (
            <div className="mb-6 rounded-3xl overflow-hidden">
              <img
                src={sceneData.imagePath}
                alt="Writing prompt scene"
                className="w-full object-cover"
                style={{ maxHeight: "320px" }}
              />
            </div>
          )}

          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
          >
            <p
              className="text-lg italic"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif", fontSize: "1.5rem", lineHeight: 1.7 }}
            >
              &ldquo;{sceneData.promptCue}&rdquo;
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => void startFullTask()}
              disabled={loading}
              className="rounded-xl px-5 py-3 font-bold"
              style={{ border: "1px solid #B68A3A55", color: "#E7C777" }}
            >
              New Scene
            </button>
            <button
              onClick={() => {
                setTimeRemaining(FULL_TASK_TIMER_SECONDS);
                setTimerRunning(true);
                setPhase("full_task_draft");
              }}
              className="rounded-xl px-8 py-3 font-bold"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              Begin Full Task
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "full_task_draft" && sceneData) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />

        <div
          className="sticky top-14 z-40 px-6 py-3 flex items-center justify-between border-b"
          style={{ background: "#0F1C3F", borderColor: "#B68A3A33" }}
        >
          <div className="flex items-center gap-4">
            <img
              src={sceneData.imagePath}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
            <p className="text-sm italic" style={{ color: "#B68A3A" }}>
              &ldquo;{sceneData.promptCue}&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "#EADFC8", opacity: 0.6 }}>
              {getWordCount(fullTaskText)} words
            </span>
            <div
              className="text-2xl font-mono font-bold"
              style={{
                color: fullTaskTimerColor,
                textShadow: timeRemaining <= 120 ? `0 0 10px ${fullTaskTimerColor}` : "none",
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 flex flex-col">
          {renderError()}
          <textarea
            value={fullTaskText}
            onChange={(e) => setFullTaskText(e.target.value)}
            placeholder="Write your full piece here..."
            className="flex-1 w-full p-6 rounded-2xl outline-none resize-none text-lg leading-relaxed"
            style={{
              background: "#1A2545",
              border: "1px solid #B68A3A44",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
              minHeight: "420px",
              fontSize: "1.2rem",
              lineHeight: 1.9,
            }}
          />

          <div className="flex justify-between items-center mt-4">
            <p className="text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
              Staged full task review focuses on one revision move, not a full score report.
            </p>
            <button
              onClick={() => void submitFullTask()}
              disabled={loading || !fullTaskText.trim()}
              className="rounded-xl px-8 py-3 font-bold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              Submit for Stage Review
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-4xl mx-auto px-6 py-10">
          {renderError()}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#E7C777" }}>
              {selectedMode === "full_task" ? "Stage Review Complete" : "Revision Complete"}
            </h1>
            {sparksEarned > 0 && (
              <p className="text-4xl font-bold mb-2" style={{ color: "#E7C777" }}>
                +{sparksEarned} ✦
              </p>
            )}
            {wisdomEarned > 0 && (
              <p className="text-lg font-bold mb-2" style={{ color: "#C4A44A" }}>
                +{wisdomEarned} Wisdom
              </p>
            )}
            <p style={{ color: "#EADFC8", opacity: 0.8 }}>{completionMessage}</p>
          </div>

          {feedback && (
            <div className="space-y-4 mb-8">
              <div
                className="rounded-2xl p-5"
                style={{ background: "#17361E", border: "1px solid #2E6B3A" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#7DDB8D" }}>
                  Strength
                </p>
                {renderCoachText(feedback.strength)}
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                  Priority Issue
                </p>
                {renderCoachText(feedback.priorityIssue)}
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                  Revision Instruction
                </p>
                {renderCoachText(feedback.revisionInstruction)}
              </div>

              {feedback.modelExample && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: "#B68A3A" }}>
                    Model Example
                  </p>
                  {renderCoachText(feedback.modelExample, "quote")}
                </div>
              )}

              {feedback.rubricSummary && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
                >
                  <p className="text-sm font-bold mb-3" style={{ color: "#B68A3A" }}>
                    Full Task Snapshot
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {Object.entries(feedback.rubricSummary).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "#B68A3A" }}>
                          {key.replace(/[A-Z]/g, (match) => ` ${match}`).trim()}
                        </p>
                        <p style={{ color: "#EADFC8" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/home"
              className="flex-1 rounded-xl py-3 text-center font-bold"
              style={{ border: "1px solid #B68A3A55", color: "#E7C777" }}
            >
              Archive Hall
            </Link>
            <button
              onClick={resetSessionState}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              Start Another Session
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
