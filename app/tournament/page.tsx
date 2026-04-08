"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameNav from "@/components/layout/GameNav";

type ExamMode = "full" | "practice";
type AppState = "setup" | "loading";

const SECTIONS = [
  {
    id: "Quantitative Reasoning",
    emoji: "⚙️",
    label: "Quantitative Reasoning",
    fullQuestions: 35,
    fullMinutes: 35,
    practiceQuestions: 18,
    practiceMinutes: 18,
  },
  {
    id: "Abstract Reasoning",
    emoji: "🌿",
    label: "Abstract Reasoning",
    fullQuestions: 35,
    fullMinutes: 20,
    practiceQuestions: 18,
    practiceMinutes: 10,
  },
  {
    id: "Reading Comprehension",
    emoji: "💧",
    label: "Reading Comprehension",
    fullQuestions: 35,
    fullMinutes: 35,
    practiceQuestions: 18,
    practiceMinutes: 18,
  },
  {
    id: "Creative Writing",
    emoji: "✍️",
    label: "Creative Writing",
    fullQuestions: 1,
    fullMinutes: 25,
    practiceQuestions: 1,
    practiceMinutes: 15,
  },
];

export default function TournamentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: number; mageName: string; avatarColour: string; totalXP: number; rank: string; auraAlignment: string; quillEnergy: number } | null>(null);
  const [appState, setAppState] = useState<AppState>("setup");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id))
  );
  const [mode, setMode] = useState<ExamMode>("full");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }
    fetch(`/api/profile/${profileId}`)
      .then((r) => r.json())
      .then((data) => setProfile(data.profile))
      .catch(console.error);
  }, [router]);

  function toggleSection(id: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleStart() {
    if (selectedSections.size === 0) {
      setError("Please select at least one section.");
      return;
    }
    setError(null);
    setAppState("loading");

    try {
      const profileId = parseInt(localStorage.getItem("activeProfileId") || "0");
      // Preserve canonical ordering
      const sections = SECTIONS.filter((s) => selectedSections.has(s.id)).map((s) => s.id);

      const res = await fetch("/api/exam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, sections, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create exam");
      }

      const { sessionId } = await res.json();
      router.push(`/tournament/${sessionId}`);
    } catch (err) {
      console.error("Failed to start tournament:", err);
      setError("Failed to prepare the exam. Please try again.");
      setAppState("setup");
    }
  }

  const allSelected = selectedSections.size === SECTIONS.length;

  if (appState === "loading") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        {profile && <GameNav profile={profile} />}
        <div className="text-center mt-20">
          <div className="text-7xl mb-6 animate-bounce">🏰</div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
          >
            Preparing your challenges…
          </h2>
          <p className="mb-4" style={{ color: "#B68A3A" }}>
            The Tower is conjuring your exam questions
          </p>
          <div className="flex justify-center gap-1.5 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: "#B68A3A",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-sm mt-4" style={{ color: "#EADFC8", opacity: 0.5 }}>
            This may take up to a minute…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      {profile && <GameNav profile={profile} />}

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🏰</div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 30px rgba(231,199,119,0.3)",
            }}
          >
            Tower of Ascension
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            The Grand Tournament — mirror the real ASET exam
          </p>
        </div>

        {/* Mode Selector */}
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
        >
          <h2
            className="text-sm uppercase tracking-widest mb-4"
            style={{ color: "#B68A3A" }}
          >
            Exam Mode
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(["full", "practice"] as ExamMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="p-4 rounded-xl text-left transition-all"
                style={{
                  background: mode === m ? "#B68A3A22" : "#0F1C3F",
                  border: `2px solid ${mode === m ? "#E7C777" : "#B68A3A33"}`,
                }}
              >
                <div
                  className="font-bold mb-1"
                  style={{ color: mode === m ? "#E7C777" : "#EADFC8" }}
                >
                  {m === "full" ? "Full Mode" : "Practice Mode"}
                </div>
                <div className="text-xs" style={{ color: "#B68A3A" }}>
                  {m === "full"
                    ? "Official question counts & times"
                    : "Half questions, half time"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section Selector */}
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
        >
          <h2
            className="text-sm uppercase tracking-widest mb-4"
            style={{ color: "#B68A3A" }}
          >
            Regions to Conquer
          </h2>

          <div className="space-y-3">
            {SECTIONS.map((section) => {
              const checked = selectedSections.has(section.id);
              const questions =
                mode === "full" ? section.fullQuestions : section.practiceQuestions;
              const minutes =
                mode === "full" ? section.fullMinutes : section.practiceMinutes;

              return (
                <label
                  key={section.id}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: checked ? "#B68A3A11" : "#0F1C3F",
                    border: `1px solid ${checked ? "#B68A3A66" : "#B68A3A22"}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSection(section.id)}
                    className="sr-only"
                  />
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: checked ? "#B68A3A" : "transparent",
                      border: `2px solid ${checked ? "#B68A3A" : "#B68A3A66"}`,
                    }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="#0F1C3F"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <span className="text-xl">{section.emoji}</span>

                  <div className="flex-1">
                    <div
                      className="font-semibold"
                      style={{
                        color: checked ? "#E7C777" : "#EADFC8",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {section.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#B68A3A" }}>
                      {section.id === "Creative Writing"
                        ? `1 task · ${minutes} min`
                        : `${questions} questions · ${minutes} min`}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {!allSelected && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "#2A1E0F",
                border: "1px solid #B68A3A66",
                color: "#E7C777",
              }}
            >
              ⚠️ All regions must be checked to mirror the official ASET exam
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedSections.size > 0 && (
          <div
            className="p-4 rounded-xl mb-6 text-sm"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}
          >
            <div className="flex justify-between" style={{ color: "#EADFC8" }}>
              <span style={{ color: "#B68A3A" }}>Total sections</span>
              <span>{selectedSections.size}</span>
            </div>
            <div className="flex justify-between mt-1" style={{ color: "#EADFC8" }}>
              <span style={{ color: "#B68A3A" }}>Total time</span>
              <span>
                {SECTIONS.filter((s) => selectedSections.has(s.id)).reduce(
                  (sum, s) =>
                    sum + (mode === "full" ? s.fullMinutes : s.practiceMinutes),
                  0
                )}{" "}
                min
              </span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 rounded-xl mb-4 text-sm"
            style={{
              background: "#3A1E1E",
              border: "1px solid #C44A4A",
              color: "#EADFC8",
            }}
          >
            {error}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={selectedSections.size === 0}
          className="w-full py-4 rounded-2xl text-lg font-bold transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "linear-gradient(135deg, #B68A3A, #E7C777)",
            color: "#0F1C3F",
            fontFamily: "Georgia, serif",
            boxShadow: "0 4px 20px rgba(182,138,58,0.3)",
          }}
        >
          Begin Tournament 🏰
        </button>
      </main>
    </div>
  );
}
