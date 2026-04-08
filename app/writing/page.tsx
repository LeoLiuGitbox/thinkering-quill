"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface WritingFeedback {
  scores: {
    prompt_relevance: number;
    ideas: number;
    style_form: number;
    plot_message: number;
    organisation: number;
    voice_tone: number;
    language: number;
  };
  overall: number;
  praise: string;
  tip: string;
  sparksEarned: number;
}

const WRITING_TIMER_SECONDS = 25 * 60; // 25 minutes

export default function WritingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [phase, setPhase] = useState<"setup" | "writing" | "submitting" | "feedback">("setup");
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneData, setSceneData] = useState<{
    sessionId: string;
    description: string;
    imagePath: string;
    promptCue: string;
  } | null>(null);
  const [writingText, setWritingText] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(WRITING_TIMER_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackComplete, setFeedbackComplete] = useState(false);
  const [sparksEarned, setSparksEarned] = useState(0);
  const [parsedFeedback, setParsedFeedback] = useState<WritingFeedback | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const id = localStorage.getItem("activeProfileId");
    if (!id) { router.push("/login"); return; }
    fetch(`/api/profile/${id}`).then(r => r.json()).then(d => setProfile(d.profile));
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setTimerRunning(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // Auto-save
  useEffect(() => {
    if (phase === "writing") {
      autoSaveRef.current = setInterval(() => {
        if (writingText) localStorage.setItem("writingDraft", writingText);
      }, 30000);
    }
    return () => clearInterval(autoSaveRef.current);
  }, [phase, writingText]);

  async function loadScene() {
    setSceneLoading(true);
    try {
      const res = await fetch("/api/writing/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSceneData(data);

      // Restore any draft
      const draft = localStorage.getItem("writingDraft");
      if (draft) setWritingText(draft);
    } catch (err) {
      console.error("Failed to load scene:", err);
    } finally {
      setSceneLoading(false);
    }
  }

  function startWriting() {
    setPhase("writing");
    setTimerRunning(true);
    setTimeRemaining(WRITING_TIMER_SECONDS);
  }

  async function submitWriting() {
    if (!writingText.trim() || !sceneData || !profile) return;
    setPhase("submitting");
    setFeedbackText("");
    setFeedbackComplete(false);

    const profileId = profile.id;
    let fullFeedback = "";

    try {
      const res = await fetch("/api/writing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          sessionId: sceneData.sessionId,
          imageDescription: sceneData.description,
          imagePath: sceneData.imagePath,
          promptCue: sceneData.promptCue,
          writingText: writingText.trim(),
          writingType: "narrative",
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const data = JSON.parse(payload);
              if (data.text) {
                fullFeedback += data.text;
                setFeedbackText(fullFeedback);
              }
              if (data.done) {
                setSparksEarned(data.sparksEarned || 0);
                setFeedbackComplete(true);
                localStorage.removeItem("writingDraft");

                // Try to parse feedback JSON
                try {
                  const cleaned = fullFeedback
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/```\s*$/i, "")
                    .trim();
                  setParsedFeedback(JSON.parse(cleaned));
                } catch {}
              }
            } catch {}
          }
        }
      }
    } finally {
      setPhase("feedback");
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timerColour =
    timeRemaining <= 120 ? "#C84B31" :
    timeRemaining <= 300 ? "#E7C777" :
    "#B68A3A";

  const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length;

  if (phase === "setup") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-2xl mx-auto px-6 py-12 text-center">
          <div className="text-7xl mb-6">✍️</div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
            Workshop of Runes
          </h1>
          <p className="text-base mb-8" style={{ color: "#EADFC8", opacity: 0.8 }}>
            You&apos;ll receive a magical scene image and a prompt. Write freely for 25 minutes —
            there are no rules except to follow your imagination.
          </p>

          <div className="p-6 rounded-2xl mb-8 text-left" style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}>
            <h3 className="font-bold mb-3" style={{ color: "#E7C777" }}>Marking criteria (7 dimensions)</h3>
            <div className="space-y-1 text-sm" style={{ color: "#EADFC8", opacity: 0.8 }}>
              {[
                "Relevance to the prompt",
                "Complexity, freshness and interest of ideas",
                "Style, form and how they enhance ideas",
                "Strength of plot / message / issue",
                "Organisation and coherence",
                "Distinctiveness of voice and tone",
                "Appropriateness, expressiveness and fluency",
              ].map((c, i) => (
                <p key={i}>✦ {c}</p>
              ))}
            </div>
          </div>

          {!sceneData ? (
            sceneLoading ? (
              <div className="py-10">
                <div
                  className="mx-auto p-8 rounded-2xl text-center max-w-sm"
                  style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
                >
                  {/* Spinning quill animation */}
                  <div className="text-6xl mb-4" style={{ display: "inline-block", animation: "spin 2s linear infinite" }}>
                    🪶
                  </div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
                    Conjuring your scene…
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.7 }}>
                    The Archive is painting a world for you. This takes about 15 seconds.
                  </p>
                  {/* Animated dots */}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: "#B68A3A",
                          animation: `pulse 1.2s ease-in-out ${i * 0.4}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={loadScene}
                className="px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                  color: "#0F1C3F",
                  fontFamily: "Georgia, serif",
                }}
              >
                ✨ Conjure a writing scene
              </button>
            )
          ) : (
            <div>
              {sceneData.imagePath && (
                <div className="mb-6 rounded-2xl overflow-hidden">
                  <img
                    src={sceneData.imagePath}
                    alt="Writing prompt"
                    className="w-full object-cover"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}
              <div
                className="p-4 rounded-xl mb-6"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A" }}
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
                  onClick={loadScene}
                  disabled={sceneLoading}
                  className="px-5 py-3 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#1E2E5A", border: "1px solid #B68A3A44", color: "#B68A3A" }}
                >
                  {sceneLoading ? "⏳ Conjuring…" : "Try another scene"}
                </button>
                <button
                  onClick={startWriting}
                  className="px-8 py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                    color: "#0F1C3F",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Begin writing ✍️
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (phase === "writing") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />

        {/* Timer bar */}
        <div
          className="sticky top-14 z-40 px-6 py-3 flex items-center justify-between border-b"
          style={{ background: "#0F1C3F", borderColor: "#B68A3A33" }}
        >
          <div className="flex items-center gap-4">
            {sceneData?.imagePath && (
              <img
                src={sceneData.imagePath}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <p className="text-sm italic" style={{ color: "#B68A3A" }}>
              &ldquo;{sceneData?.promptCue}&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "#EADFC8", opacity: 0.6 }}>
              {wordCount} words
            </span>
            <div
              className="text-2xl font-mono font-bold"
              style={{
                color: timerColour,
                textShadow: timeRemaining <= 120 ? `0 0 10px ${timerColour}` : "none",
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-6 flex flex-col">
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Begin your story here… let your imagination flow."
            className="flex-1 w-full p-6 rounded-2xl outline-none resize-none text-base leading-relaxed"
            style={{
              background: "#1A2545",
              border: "1px solid #B68A3A44",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
              minHeight: "400px",
            }}
          />

          <div className="flex justify-between items-center mt-4">
            <p className="text-xs" style={{ color: "#EADFC8", opacity: 0.4 }}>
              Auto-saved every 30 seconds
            </p>
            <button
              onClick={submitWriting}
              disabled={!writingText.trim()}
              className="px-8 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
              }}
            >
              Submit for feedback ✨
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "submitting" || phase === "feedback") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{feedbackComplete ? "✨" : "🔮"}</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
              {feedbackComplete ? "The Quill has spoken!" : "The Oracle reads your work…"}
            </h1>
            {feedbackComplete && sparksEarned > 0 && (
              <p className="text-4xl font-bold mb-2" style={{ color: "#E7C777" }}>
                +{sparksEarned} ✦
              </p>
            )}
          </div>

          {/* Parsed feedback display */}
          {parsedFeedback && (
            <div className="space-y-4 mb-8">
              {/* Scores grid */}
              <div className="p-5 rounded-2xl" style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}>
                <h3 className="text-sm uppercase tracking-widest mb-4" style={{ color: "#B68A3A" }}>
                  Assessment
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(parsedFeedback.scores).map(([key, score]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs capitalize" style={{ color: "#EADFC8", opacity: 0.7 }}>
                        {key.replace(/_/g, " ")}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className="w-4 h-4 rounded-sm"
                            style={{
                              background: s <= score ? "#E7C777" : "#B68A3A22",
                              border: `1px solid ${s <= score ? "#E7C777" : "#B68A3A33"}`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Praise */}
              <div className="p-5 rounded-2xl" style={{ background: "#1E3A1E", border: "1px solid #2E6B3A" }}>
                <p className="text-sm font-bold mb-2" style={{ color: "#6BC47A" }}>✦ What shone</p>
                <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                  {parsedFeedback.praise}
                </p>
              </div>

              {/* Tip */}
              <div className="p-5 rounded-2xl" style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}>
                <p className="text-sm font-bold mb-2" style={{ color: "#E7C777" }}>📜 One thing to try next time</p>
                <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                  {parsedFeedback.tip}
                </p>
              </div>
            </div>
          )}

          {/* Raw feedback stream if not parsed yet */}
          {!parsedFeedback && feedbackText && (
            <div
              className="p-5 rounded-2xl mb-8 text-sm leading-relaxed font-mono"
              style={{ background: "#1E2E5A", border: "1px solid #B68A3A44", color: "#EADFC8" }}
            >
              {feedbackText}
              {!feedbackComplete && (
                <span className="animate-pulse" style={{ color: "#B68A3A" }}>▋</span>
              )}
            </div>
          )}

          {!feedbackComplete && !feedbackText && (
            <div className="text-center py-12">
              <div className="text-4xl animate-pulse mb-4">🔮</div>
              <p style={{ color: "#B68A3A" }}>Reading your writing…</p>
            </div>
          )}

          {feedbackComplete && (
            <div className="flex gap-3">
              <Link
                href="/home"
                className="flex-1 py-3 rounded-xl font-bold text-center transition-all hover:opacity-90"
                style={{ background: "transparent", border: "1px solid #B68A3A", color: "#E7C777" }}
              >
                Archive Hall
              </Link>
              <button
                onClick={() => {
                  setPhase("setup");
                  setSceneData(null);
                  setWritingText("");
                  setFeedbackText("");
                  setParsedFeedback(null);
                }}
                className="flex-1 py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                  color: "#0F1C3F",
                  fontFamily: "Georgia, serif",
                }}
              >
                Write again ✍️
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
