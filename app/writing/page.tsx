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
  | "word_choice"
  | "dialogue"
  | "idea_generation"
  | "voice_and_tone"
  | "narrative_structure"
  | "main_event";

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
  modelExample?: string;
  nextStep?: string;
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
  const [loading, setLoading] = useState(false);
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
    setLoading(false);
    setError("");
    setTimeRemaining(FULL_TASK_TIMER_SECONDS);
    setTimerRunning(false);
  }

  async function startCoachingMode(mode: Exclude<WritingMode, "full_task">) {
    if (!profile) return;

    setLoading(true);
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
    }
  }

  async function startFullTask() {
    if (!profile) return;

    setLoading(true);
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
        <main className="max-w-4xl mx-auto px-6 py-12">
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
                        className="rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                        style={{
                          background: isActive ? "#24386A" : "#1A2545",
                          border: `1px solid ${isActive ? "#E7C777" : "#B68A3A33"}`,
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
        </main>
      </div>
    );
  }

  if (phase === "lesson" && lessonData) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-3xl mx-auto px-6 py-10">
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
            <p className="text-base mb-4" style={{ color: "#EADFC8", opacity: 0.84 }}>
              {lessonData.focus}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.78 }}>
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
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
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
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
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
                  <li key={i} className="flex gap-3 text-sm" style={{ color: "#EADFC8" }}>
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
            <p className="mb-4" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
              {lessonData.taskPrompt}
            </p>
            <p className="text-sm" style={{ color: "#B68A3A" }}>
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
        <main className="max-w-3xl mx-auto px-6 py-10">
          {renderError()}
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: "#B68A3A" }}>
              {selectedMode === "guided_writing" ? "Guided Draft" : "First Draft"}
            </p>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#E7C777" }}>
              {lessonData.title}
            </h1>
            <p style={{ color: "#EADFC8", opacity: 0.82 }}>{lessonData.taskPrompt}</p>
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
                  <li key={i} className="flex gap-2.5 text-sm" style={{ color: "#EADFC8", opacity: 0.88 }}>
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
            style={{
              minHeight: "380px",
              background: "#1A2545",
              border: "1px solid #B68A3A33",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
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
              Get Coaching
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "coaching" && feedback) {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-3xl mx-auto px-6 py-10">
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
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>{feedback.strength}</p>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                Priority Issue
              </p>
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                {feedback.priorityIssue}
              </p>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                Revision Instruction
              </p>
              <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                {feedback.revisionInstruction}
              </p>
            </div>

            {feedback.modelExample && (
              <div
                className="rounded-2xl p-5"
                style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#B68A3A" }}>
                  Model Example
                </p>
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                  {feedback.modelExample}
                </p>
              </div>
            )}
          </div>

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
                className="text-sm whitespace-pre-wrap"
                style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
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
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
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
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
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

        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-6 flex flex-col">
          {renderError()}
          <textarea
            value={fullTaskText}
            onChange={(e) => setFullTaskText(e.target.value)}
            placeholder="Write your full piece here..."
            className="flex-1 w-full p-6 rounded-2xl outline-none resize-none text-base leading-relaxed"
            style={{
              background: "#1A2545",
              border: "1px solid #B68A3A44",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
              minHeight: "420px",
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
        <main className="max-w-3xl mx-auto px-6 py-10">
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
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>{feedback.strength}</p>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                  Priority Issue
                </p>
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                  {feedback.priorityIssue}
                </p>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>
                  Revision Instruction
                </p>
                <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                  {feedback.revisionInstruction}
                </p>
              </div>

              {feedback.modelExample && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: "#B68A3A" }}>
                    Model Example
                  </p>
                  <p style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                    {feedback.modelExample}
                  </p>
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
