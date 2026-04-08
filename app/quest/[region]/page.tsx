"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

const SESSION_LENGTHS = [5, 10, 15, 35] as const;
const DIFFICULTIES = ["Apprentice", "Journeyman", "Archmage"] as const;

const REGION_META: Record<string, { emoji: string; colour: string; description: string; pace: string }> = {
  "Clocktower of Logic": {
    emoji: "⚙️",
    colour: "#2E5A8E",
    description: "Master quantitative reasoning — the maths of logic, not curriculum arithmetic.",
    pace: "~60 seconds per question",
  },
  "Forest of Patterns": {
    emoji: "🌿",
    colour: "#2E6B3A",
    description: "Recognise visual patterns across sequences and grids — the language of shapes.",
    pace: "~34 seconds per question (fast pace!)",
  },
  "Lake of Reflection": {
    emoji: "💧",
    colour: "#2E5A6B",
    description: "Read passages carefully and answer questions about meaning, inference, and structure.",
    pace: "~60 seconds per question",
  },
};

export default function QuestHubPage() {
  const router = useRouter();
  const params = useParams();
  const region = decodeURIComponent(params.region as string);

  const [profile, setProfile] = useState<any>(null);
  const [sessionLength, setSessionLength] = useState<5 | 10 | 15 | 35>(10);
  const [difficulty, setDifficulty] = useState<"Apprentice" | "Journeyman" | "Archmage">("Journeyman");
  const [loading, setLoading] = useState(true);

  const meta = REGION_META[region] || { emoji: "🪄", colour: "#B68A3A", description: "", pace: "" };

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) { router.push("/login"); return; }
    fetchProfile(profileId);
  }, [router]);

  async function fetchProfile(id: string) {
    try {
      const res = await fetch(`/api/profile/${id}`);
      const data = await res.json();
      setProfile(data.profile);
    } finally {
      setLoading(false);
    }
  }

  function startQuest() {
    // Store session params for the play page
    sessionStorage.setItem("questParams", JSON.stringify({
      profileId: profile.id,
      region,
      sessionLength,
      difficulty,
    }));
    router.push(`/quest/${encodeURIComponent(region)}/play`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-4xl animate-pulse">{meta.emoji}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-80"
          style={{ color: "#B68A3A" }}
        >
          ← Archive Hall
        </Link>

        {/* Region Header */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">{meta.emoji}</div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 20px rgba(231, 199, 119, 0.3)",
            }}
          >
            {region}
          </h1>
          <p className="text-base mb-2" style={{ color: "#EADFC8", opacity: 0.8 }}>
            {meta.description}
          </p>
          <p className="text-sm" style={{ color: "#B68A3A" }}>
            ⏱ {meta.pace}
          </p>
        </div>

        {/* Session Config */}
        <div
          className="p-8 rounded-2xl mb-8"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
        >
          {/* Number of Questions */}
          <div className="mb-8">
            <h3 className="text-sm uppercase tracking-widest mb-4" style={{ color: "#B68A3A" }}>
              Number of challenges
            </h3>
            <div className="flex gap-3">
              {SESSION_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => setSessionLength(len)}
                  className="flex-1 py-3 rounded-xl font-bold transition-all duration-200"
                  style={{
                    background: sessionLength === len
                      ? "linear-gradient(135deg, #B68A3A, #E7C777)"
                      : "#0F1C3F",
                    color: sessionLength === len ? "#0F1C3F" : "#EADFC8",
                    border: `1px solid ${sessionLength === len ? "#E7C777" : "#B68A3A44"}`,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <h3 className="text-sm uppercase tracking-widest mb-4" style={{ color: "#B68A3A" }}>
              Difficulty
            </h3>
            <div className="flex gap-3">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className="flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all duration-200"
                  style={{
                    background: difficulty === diff
                      ? "linear-gradient(135deg, #B68A3A, #E7C777)"
                      : "#0F1C3F",
                    color: difficulty === diff ? "#0F1C3F" : "#EADFC8",
                    border: `1px solid ${difficulty === diff ? "#E7C777" : "#B68A3A44"}`,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "#EADFC8", opacity: 0.5 }}>
              {difficulty === "Apprentice" && "Accessible — great for building confidence"}
              {difficulty === "Journeyman" && "Standard — matches ASET difficulty"}
              {difficulty === "Archmage" && "Challenging — harder than the real exam"}
            </p>
          </div>
        </div>

        {/* Info box */}
        <div
          className="p-4 rounded-xl mb-8 text-sm"
          style={{ background: "#0F1C3F", border: "1px solid #B68A3A22" }}
        >
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            🪶 Questions will be prepared before you start. You can navigate freely between
            questions, skip and return, and use hint scrolls if needed.
          </p>
        </div>

        {/* Quill Energy Warning */}
        {profile && profile.quillEnergy < sessionLength && (
          <div
            className="p-4 rounded-xl mb-6 text-sm"
            style={{ background: "#3A2A1D", border: "1px solid #B68A3A" }}
          >
            <p style={{ color: "#E7C777" }}>
              ⚠️ You only have {profile.quillEnergy} 🪶 Quill Energy — hints will use your remaining energy.
              Energy restores daily (10 per day).
            </p>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={startQuest}
          className="w-full py-4 rounded-2xl font-bold text-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #B68A3A, #E7C777)",
            color: "#0F1C3F",
            fontFamily: "Georgia, serif",
            boxShadow: "0 4px 20px rgba(231, 199, 119, 0.3)",
          }}
        >
          Begin Quest — {sessionLength} challenges ✨
        </button>
      </main>
    </div>
  );
}
