"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";
import { getNextRankInfo } from "@/lib/progression";
import { getAscensionMeta } from "@/lib/ascension";

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  quillEnergy: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  knowledgeMasteries?: Array<{
    knowledgePointCode: string;
    masteryLevel: number;
    masteryScore: number;
  }>;
  questSessions?: Array<{
    id: number;
    region: string;
    totalSparks: number;
    correctCount: number;
    questionCount: number;
    completedAt: string | null;
  }>;
}

const REGIONS = [
  {
    id: "Clocktower of Logic",
    emoji: "⚙️",
    name: "Clocktower of Logic",
    subject: "Quantitative Reasoning",
    description: "Mathematical reasoning, patterns, and relationships",
    colour: "#2E5A8E",
    accent: "#6BA3D6",
    difficulty: "⭐⭐⭐",
    unlockXP: 0,
  },
  {
    id: "Forest of Patterns",
    emoji: "🌿",
    name: "Forest of Patterns",
    subject: "Abstract Reasoning",
    description: "Visual patterns, sequences, and transformations",
    colour: "#2E6B3A",
    accent: "#6BC47A",
    difficulty: "⭐⭐⭐⭐⭐",
    unlockXP: 0,
  },
  {
    id: "Lake of Reflection",
    emoji: "💧",
    name: "Lake of Reflection",
    subject: "Reading Comprehension",
    description: "Passages, inference, and language understanding",
    colour: "#2E5A6B",
    accent: "#6BB4C4",
    difficulty: "⭐⭐⭐",
    unlockXP: 0,
  },
  {
    id: "Workshop of Runes",
    emoji: "✍️",
    name: "Workshop of Runes",
    subject: "Creative Writing",
    description: "Imaginative writing from visual prompts",
    colour: "#6B3A3A",
    accent: "#C47A6B",
    difficulty: "⭐⭐⭐⭐⭐⭐⭐⭐",
    unlockXP: 0,
  },
  {
    id: "Tower of Ascension",
    emoji: "🏰",
    name: "Tower of Ascension",
    subject: "Grand Tournament",
    description: "Full ASET mock examination — all four tests",
    colour: "#4A3A1A",
    accent: "#C4A44A",
    difficulty: "🏆",
    unlockXP: 100,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
      setProfile(data.profile);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  function startRecommendedQuest(region: string, focusKnowledgePointCodes: string[]) {
    if (!profile || focusKnowledgePointCodes.length === 0) return;
    sessionStorage.setItem("questParams", JSON.stringify({
      profileId: profile.id,
      region,
      sessionLength: 10,
      difficulty: "Journeyman",
      focusKnowledgePointCodes,
    }));
    router.push(`/quest/${encodeURIComponent(region)}/play`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🪶</div>
          <p style={{ color: "#B68A3A" }}>Opening the Archive Hall…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">🪶</div>
          <p className="text-lg font-bold mb-2" style={{ color: "#E7C777" }}>
            The Archive couldn't open
          </p>
          <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.7 }}>
            Something went wrong loading your profile. Try again or switch mage.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl font-bold text-sm"
              style={{ background: "#B68A3A", color: "#0F1C3F" }}
            >
              Try again
            </button>
            <Link
              href="/login"
              className="px-5 py-2 rounded-xl text-sm"
              style={{ border: "1px solid #B68A3A", color: "#B68A3A" }}
            >
              Switch mage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const xpForNextRank = getNextRankInfo(profile.totalXP);
  const currentAscension = getAscensionMeta(profile.rank as any);
  const rankedWeakTopics = [...(profile.knowledgeMasteries || [])].sort((a, b) => {
    if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
    return a.masteryScore - b.masteryScore;
  });
  const weakestTopics = rankedWeakTopics.slice(0, 3);
  const recommendedRegion = weakestTopics[0]?.knowledgePointCode.startsWith("QR")
    ? "Clocktower of Logic"
    : weakestTopics[0]?.knowledgePointCode.startsWith("AR")
    ? "Forest of Patterns"
    : weakestTopics[0]?.knowledgePointCode.startsWith("RC")
    ? "Lake of Reflection"
    : null;
  const recommendedFocusCodes = weakestTopics
    .filter((item) =>
      recommendedRegion === "Clocktower of Logic"
        ? item.knowledgePointCode.startsWith("QR")
        : recommendedRegion === "Forest of Patterns"
        ? item.knowledgePointCode.startsWith("AR")
        : recommendedRegion === "Lake of Reflection"
        ? item.knowledgePointCode.startsWith("RC")
        : false
    )
    .map((item) => item.knowledgePointCode);
  const latestQuestReview = profile.questSessions?.[0] ?? null;

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome Banner */}
        <div className="mb-10 text-center">
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              color: "#E7C777",
              textShadow: "0 0 30px rgba(231, 199, 119, 0.4)",
              fontFamily: "Georgia, serif",
            }}
          >
            Welcome back, {profile.mageName}
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            {profile.rank} · {profile.totalXP.toLocaleString()} ✦ Knowledge Sparks
          </p>
          <p className="text-sm mt-2 max-w-2xl mx-auto" style={{ color: "#B68A3A", opacity: 0.92 }}>
            Sanctum power: {currentAscension.powerName} · {currentAscension.powerDescription}
          </p>

          {/* XP Progress Bar */}
          {xpForNextRank && (
            <div className="mt-4 max-w-xs mx-auto">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "#1E2E5A" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${xpForNextRank.progress * 100}%`,
                    background: "linear-gradient(90deg, #B68A3A, #E7C777)",
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "#B68A3A" }}>
                {xpForNextRank.xpNeeded} ✦ to {xpForNextRank.nextRank}
              </p>
            </div>
          )}
        </div>

        {/* Attribute Bar */}
        <div
          className="mb-10 p-6 rounded-2xl"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}
        >
          <h2
            className="text-sm uppercase tracking-widest mb-4"
            style={{ color: "#B68A3A" }}
          >
            Five Schools of Magic
          </h2>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: "Logic", value: profile.attrLogic, colour: "#4A7BC4", icon: "⚙️" },
              { label: "Insight", value: profile.attrInsight, colour: "#8A4AC4", icon: "🔮" },
              { label: "Focus", value: profile.attrFocus, colour: "#4A9EC4", icon: "💧" },
              { label: "Craft", value: profile.attrCraft, colour: "#C47A4A", icon: "✍️" },
              { label: "Wisdom", value: profile.attrWisdom, colour: "#C4A44A", icon: "📖" },
            ].map((attr) => (
              <div key={attr.label}>
                <div className="text-2xl mb-1">{attr.icon}</div>
                <div
                  className="text-xl font-bold mb-0.5"
                  style={{ color: attr.colour }}
                >
                  {attr.value}
                </div>
                <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>
                  {attr.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Region Cards */}
        {(weakestTopics.length > 0 || latestQuestReview) && (
          <div
            className="mb-10 p-6 rounded-2xl"
            style={{ background: "#16213B", border: "1px solid #2E5A8E55" }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <h2
                  className="text-xl font-bold mb-2"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Your Next Best Move
                </h2>
                <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.72 }}>
                  The Archive is tracking your weaker skills so the next quest can target them directly.
                </p>

                {weakestTopics.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {weakestTopics.map((topic) => (
                      <p key={topic.knowledgePointCode} className="text-sm" style={{ color: "#EADFC8" }}>
                        <span style={{ color: "#E7C777" }}>{topic.knowledgePointCode}</span> · mastery level {topic.masteryLevel}
                      </p>
                    ))}
                  </div>
                )}

                {recommendedRegion && recommendedFocusCodes.length > 0 && (
                  <button
                    onClick={() => startRecommendedQuest(recommendedRegion, recommendedFocusCodes)}
                    className="px-5 py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                      color: "#0F1C3F",
                    }}
                  >
                    Start Recommended Quest
                  </button>
                )}
              </div>

              {latestQuestReview && (
                <div
                  className="md:w-80 p-4 rounded-2xl"
                  style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}
                >
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#6BA3D6" }}>
                    Recent saved review
                  </p>
                  <p className="font-bold mb-1" style={{ color: "#E7C777" }}>
                    {latestQuestReview.region}
                  </p>
                  <p className="text-sm mb-3" style={{ color: "#EADFC8", opacity: 0.75 }}>
                    {latestQuestReview.correctCount} / {latestQuestReview.questionCount} correct · +{latestQuestReview.totalSparks} ✦
                  </p>
                  <Link
                    href={`/quest/review/${latestQuestReview.id}`}
                    className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "#0F1C3F", color: "#6BA3D6", border: "1px solid #6BA3D6" }}
                  >
                    Open review
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <h2
          className="text-xl font-bold mb-6"
          style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
        >
          Choose your quest
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {REGIONS.map((region) => {
            const unlocked = profile.totalXP >= region.unlockXP;

            return (
              <Link
                key={region.id}
                href={
                  region.id === "Workshop of Runes"
                    ? "/writing"
                    : region.id === "Tower of Ascension"
                    ? "/tournament"
                    : `/quest/${encodeURIComponent(region.id)}`
                }
                className={`block p-6 rounded-2xl transition-all duration-300 ${
                  unlocked ? "hover:scale-[1.02] hover:shadow-lg cursor-pointer" : "opacity-50 cursor-not-allowed pointer-events-none"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${region.colour}22, #1E2E5A)`,
                  border: `1px solid ${region.colour}66`,
                  boxShadow: unlocked ? `0 4px 20px ${region.colour}22` : "none",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{region.emoji}</span>
                  <span className="text-sm" style={{ color: region.accent }}>
                    {region.difficulty}
                  </span>
                </div>

                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  {region.name}
                </h3>
                <p className="text-sm mb-2" style={{ color: region.accent }}>
                  {region.subject}
                </p>
                <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
                  {region.description}
                </p>

                {!unlocked && (
                  <p className="text-xs mt-3" style={{ color: "#B68A3A" }}>
                    🔒 Unlocks at {region.unlockXP} ✦
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        {/* Oracle Quick Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/tome"
            className="block p-6 rounded-2xl transition-all duration-300 hover:scale-[1.01] hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #2E5A8E22, #1E2E5A)",
              border: "1px solid #6BA3D644",
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">📖</span>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Mastery Report
                </h3>
                <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
                  Check your strongest skills, weakest topics, and how close each region is to mastery.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/tome"
            className="block p-6 rounded-2xl transition-all duration-300 hover:scale-[1.01] hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #4A3612, #1E2E5A)",
              border: "1px solid #E7C77744",
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏛️</span>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Mage Ascension Hall
                </h3>
                <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
                  See sealed forms, rank lore, sacred powers, and the next avatar waiting in the sanctum.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/oracle"
            className="block p-6 rounded-2xl transition-all duration-300 hover:scale-[1.01] hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #2A1E5A22, #1E2E5A)",
              border: "1px solid #6B4AC444",
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔮</span>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                >
                  Ask the Oracle
                </h3>
                <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
                  The Oracle explains any concept — in plain language, with examples
                </p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
