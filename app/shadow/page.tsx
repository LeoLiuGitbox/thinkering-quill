"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  quillEnergy: number;
}

const AURA_LABELS: Record<string, { label: string; colour: string; icon: string }> = {
  unstable: { label: "Unstable", colour: "#C47A4A", icon: "🌀" },
  shadow_creeping: { label: "Shadow Creeping", colour: "#9B7DD4", icon: "🌒" },
  shadow_drift: { label: "Shadow Drift", colour: "#6B3A8A", icon: "🌑" },
};

const PROMPTS = [
  "Think of a question that confused you recently. What made it tricky? Write it in your own words.",
  "When you feel rushed, what helps you slow down and think more carefully?",
  "What's one thing you understand now that you didn't understand last week?",
];

type Phase = "intro" | "challenge" | "submitting" | "success";

export default function ShadowPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [promptIndex, setPromptIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }
    fetchProfile(profileId);
  }, [router]);

  async function fetchProfile(id: string) {
    try {
      const res = await fetch(`/api/profile/${id}`);
      const data = await res.json();
      setProfile(data.profile ?? data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitRecovery() {
    if (!profile) return;
    setPhase("submitting");
    setSubmitError(null);
    try {
      const res = await fetch("/api/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          action: "recovery_complete",
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setPhase("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setPhase("challenge");
    }
  }

  function handleAnswerChange(value: string) {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[promptIndex] = value;
      return updated;
    });
  }

  function handleContinue() {
    if (promptIndex < PROMPTS.length - 1) {
      setPromptIndex((i) => i + 1);
    } else {
      submitRecovery();
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌑</div>
          <p style={{ color: "#B68A3A" }}>Entering the Shadow Vault…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Pure aura: show reassurance screen
  if (profile.auraAlignment === "bright") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="text-7xl mb-6">✨</div>
          <h1
            className="text-3xl font-bold mb-4"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
          >
            Your aura is pure
          </h1>
          <p className="text-base mb-8" style={{ color: "#EADFC8", opacity: 0.75 }}>
            No recovery needed — your Quill burns steadily. The Archive is proud of you.
          </p>
          <Link
            href="/home"
            className="inline-block px-8 py-3 rounded-2xl font-bold text-base transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #B68A3A, #E7C777)",
              color: "#0F1C3F",
              fontFamily: "Georgia, serif",
            }}
          >
            Return to Archive Hall
          </Link>
        </main>
      </div>
    );
  }

  const auraInfo = AURA_LABELS[profile.auraAlignment] ?? {
    label: profile.auraAlignment,
    colour: "#9B7DD4",
    icon: "🌑",
  };

  // Success screen
  if (phase === "success") {
    return (
      <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
        <GameNav profile={profile} />
        <main className="max-w-xl mx-auto px-6 py-16 text-center">
          <style>{`
            @keyframes sparkle-float {
              0%   { transform: translateY(0px) scale(1);   opacity: 1; }
              50%  { transform: translateY(-18px) scale(1.2); opacity: 0.8; }
              100% { transform: translateY(0px) scale(1);   opacity: 1; }
            }
            .sparkle-1 { animation: sparkle-float 2.2s ease-in-out infinite; }
            .sparkle-2 { animation: sparkle-float 2.2s ease-in-out 0.4s infinite; }
            .sparkle-3 { animation: sparkle-float 2.2s ease-in-out 0.8s infinite; }
          `}</style>

          {/* Sparkle animation */}
          <div className="flex justify-center gap-6 text-4xl mb-8">
            <span className="sparkle-1">✨</span>
            <span className="sparkle-2">🌟</span>
            <span className="sparkle-3">✨</span>
          </div>

          <h1
            className="text-3xl font-bold mb-4"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 24px rgba(231, 199, 119, 0.5)",
            }}
          >
            Your aura brightens.
          </h1>
          <p
            className="text-lg mb-3"
            style={{ color: "#EADFC8", opacity: 0.85 }}
          >
            The Archive welcomes you back.
          </p>
          <p className="text-sm mb-8" style={{ color: "#EADFC8", opacity: 0.6 }}>
            Reflection and honest thinking are the highest forms of magic.
          </p>

          {/* XP reward */}
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-10"
            style={{
              background: "#1E2E5A",
              border: "1px solid #E7C77744",
              boxShadow: "0 0 20px rgba(231, 199, 119, 0.15)",
            }}
          >
            <span className="text-2xl">⭐</span>
            <div className="text-left">
              <div
                className="text-xl font-bold"
                style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
              >
                +15 ✦
              </div>
              <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>
                Restoration Sparks earned
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/home"
              className="inline-block px-8 py-3 rounded-2xl font-bold text-base transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
                boxShadow: "0 4px 20px rgba(231, 199, 119, 0.3)",
              }}
            >
              Return to Archive Hall
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentAnswer = answers[promptIndex];
  const canContinue = currentAnswer.trim().length >= 20;
  const isLastPrompt = promptIndex === PROMPTS.length - 1;

  return (
    <div className="min-h-screen pb-16" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-80"
          style={{ color: "#B68A3A" }}
        >
          ← Archive Hall
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌑</div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 20px rgba(231, 199, 119, 0.3)",
            }}
          >
            Shadow Vault
          </h1>
          <p
            className="text-base leading-relaxed max-w-md mx-auto"
            style={{ color: "#EADFC8", opacity: 0.8 }}
          >
            The Archive senses unstable magic in your Quill. True mastery comes from understanding —
            take a moment to restore your focus.
          </p>
        </div>

        {/* Aura State Card */}
        <div
          className="rounded-2xl p-5 mb-8 flex items-center gap-4"
          style={{
            background: "#1E2E5A",
            border: `1px solid ${auraInfo.colour}55`,
            boxShadow: `0 0 16px ${auraInfo.colour}22`,
          }}
        >
          <span className="text-4xl">{auraInfo.icon}</span>
          <div>
            <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "#B68A3A" }}>
              Current aura state
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: auraInfo.colour, fontFamily: "Georgia, serif" }}
            >
              {auraInfo.label}
            </p>
            <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.6 }}>
              Completing this restoration will help rebalance your magical alignment.
            </p>
          </div>
        </div>

        {/* Restoration Challenge */}
        {phase === "intro" && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
          >
            <div className="text-4xl mb-4">🪶</div>
            <h2
              className="text-xl font-bold mb-3"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              Restoration Challenge
            </h2>
            <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.7 }}>
              Answer three short reflection prompts honestly. There are no wrong answers — only
              honest ones. Each response restores a little of your magical focus.
            </p>
            <div className="flex justify-center gap-3 mb-8">
              {PROMPTS.map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: "#0F1C3F",
                    color: "#B68A3A",
                    border: "1px solid #B68A3A55",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <button
              onClick={() => setPhase("challenge")}
              className="px-8 py-3 rounded-2xl font-bold text-base transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
                boxShadow: "0 4px 20px rgba(231, 199, 119, 0.25)",
              }}
            >
              Begin Restoration
            </button>
          </div>
        )}

        {(phase === "challenge" || phase === "submitting") && (
          <div
            className="rounded-2xl p-8"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
          >
            {/* Progress dots */}
            <div className="flex items-center gap-3 mb-6">
              {PROMPTS.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < promptIndex
                        ? "#B68A3A"
                        : i === promptIndex
                        ? "linear-gradient(90deg, #B68A3A, #E7C777)"
                        : "#0F1C3F",
                    border: i === promptIndex ? "none" : "1px solid #B68A3A33",
                  }}
                />
              ))}
            </div>

            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#B68A3A" }}>
              Reflection {promptIndex + 1} of {PROMPTS.length}
            </p>

            <p
              className="text-lg leading-relaxed mb-6"
              style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
            >
              {PROMPTS[promptIndex]}
            </p>

            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Write your honest reflection here…"
              rows={5}
              className="w-full rounded-xl p-4 text-sm resize-none outline-none transition-all"
              style={{
                background: "#0F1C3F",
                color: "#EADFC8",
                border: `1px solid ${canContinue ? "#B68A3A" : "#B68A3A33"}`,
                fontFamily: "Georgia, serif",
              }}
              disabled={phase === "submitting"}
            />

            <div className="flex items-center justify-between mt-3 mb-6">
              <span
                className="text-xs"
                style={{
                  color: canContinue ? "#6BC47A" : "#EADFC8",
                  opacity: canContinue ? 1 : 0.45,
                }}
              >
                {currentAnswer.trim().length < 20
                  ? `${20 - currentAnswer.trim().length} more characters to continue`
                  : "✓ Ready to continue"}
              </span>
              <span className="text-xs" style={{ color: "#EADFC8", opacity: 0.4 }}>
                {currentAnswer.length} chars
              </span>
            </div>

            {submitError && (
              <div
                className="p-3 rounded-lg mb-4 text-sm"
                style={{ background: "#3A1A1A", color: "#C47A4A", border: "1px solid #C47A4A55" }}
              >
                {submitError}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={!canContinue || phase === "submitting"}
              className="w-full py-3 rounded-2xl font-bold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canContinue
                  ? "linear-gradient(135deg, #B68A3A, #E7C777)"
                  : "#0F1C3F",
                color: canContinue ? "#0F1C3F" : "#EADFC8",
                fontFamily: "Georgia, serif",
                border: canContinue ? "none" : "1px solid #B68A3A33",
                boxShadow: canContinue ? "0 4px 20px rgba(231, 199, 119, 0.25)" : "none",
              }}
            >
              {phase === "submitting"
                ? "Restoring…"
                : isLastPrompt
                ? "Complete Restoration ✨"
                : "Continue →"}
            </button>

            {/* Previous answer navigation */}
            {promptIndex > 0 && phase !== "submitting" && (
              <button
                onClick={() => setPromptIndex((i) => i - 1)}
                className="w-full mt-3 py-2 rounded-xl text-sm transition-opacity hover:opacity-80"
                style={{ color: "#B68A3A", background: "transparent" }}
              >
                ← Back to previous prompt
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
