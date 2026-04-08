"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface KnowledgeMastery {
  knowledgePointCode: string;
  masteryLevel: number;
  masteryScore: number;
  totalAttempts: number;
  firstChoiceCorrect: number;
  avgTimeMs: number;
  lastAttemptedAt: string | null;
}

interface Badge {
  badgeKey: string;
  tier: string;
  earnedAt: string;
}

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  knowledgeMasteries: KnowledgeMastery[];
  badges: Badge[];
}

const RANK_ORDER = [
  "Novice Scribe",
  "Rune Apprentice",
  "Arcane Solver",
  "Puzzle Adept",
  "Spell Scholar",
  "Logic Mage",
  "Master of the Quill",
];

const RANK_XP = [0, 100, 300, 600, 1000, 1600, 2500];

const MASTERY_LABEL: Record<number, { label: string; icon: string; colour: string }> = {
  1: { label: "Seedling", icon: "🌱", colour: "#ef4444" },
  2: { label: "Growing", icon: "🌿", colour: "#f97316" },
  3: { label: "Developing", icon: "🌳", colour: "#eab308" },
  4: { label: "Strong", icon: "⭐", colour: "#22c55e" },
  5: { label: "Mastered", icon: "💎", colour: "#B68A3A" },
};

const KP_NAMES: Record<string, string> = {
  "QR-01": "Number Patterns", "QR-02": "Probability", "QR-03": "Combinatorics",
  "QR-04": "Ratio & Proportion", "QR-05": "Fractions & Percentages", "QR-06": "Time & Rate",
  "QR-07": "Logical Deduction", "QR-08": "Data Tables", "QR-09": "Charts & Graphs",
  "QR-10": "Measurement", "QR-11": "Money & Economics", "QR-12": "Venn Diagrams",
  "QR-13": "Logic Puzzles", "QR-14": "Symmetry & Transformation", "QR-15": "Multi-step Problems",
  "QR-16": "Science Reasoning",
  "AR-01": "Rotation", "AR-02": "Reflection", "AR-03": "Fill Changes",
  "AR-04": "Size Changes", "AR-05": "Element Count", "AR-06": "Position Changes",
  "AR-07": "Combination Rules", "AR-08": "Odd-one-out", "AR-09": "Multi-attribute Change",
  "AR-10": "Analogy",
  "RC-01": "Main Idea", "RC-02": "Explicit Info", "RC-03": "Inference",
  "RC-04": "Vocabulary in Context", "RC-05": "Text Structure", "RC-06": "Charts & Diagrams",
};

const BADGE_DEFS: Record<string, { name: string; icon: string; school: string }> = {
  pattern_prophet: { name: "Pattern Prophet", icon: "🔮", school: "Insight" },
  logic_keeper: { name: "Logic Keeper", icon: "⚙️", school: "Logic" },
  focus_bearer: { name: "Focus Bearer", icon: "💧", school: "Focus" },
  story_weaver: { name: "Story Weaver", icon: "✍️", school: "Craft" },
  speed_caster: { name: "Speed Caster", icon: "⚡", school: "—" },
  perfect_potion: { name: "Perfect Potion", icon: "🧪", school: "—" },
  tournament_victor: { name: "Tournament Victor", icon: "🏆", school: "—" },
  archivists_promise: { name: "Archivist's Promise", icon: "📖", school: "Wisdom" },
  shadow_recovered: { name: "Shadow Recovered", icon: "🌟", school: "Wisdom" },
  first_honest_spell: { name: "First Honest Spell", icon: "✨", school: "Wisdom" },
};

const TIER_COLOUR: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
};

const ATTRIBUTES = [
  { key: "attrLogic", label: "Logic", icon: "⚙️", colour: "#6BA3D6", school: "Logic" },
  { key: "attrInsight", label: "Insight", icon: "🔮", colour: "#9B7DD4", school: "Insight" },
  { key: "attrFocus", label: "Focus", icon: "💧", colour: "#6BB4C4", school: "Focus" },
  { key: "attrCraft", label: "Craft", icon: "🔨", colour: "#C47A6B", school: "Craft" },
  { key: "attrWisdom", label: "Wisdom", icon: "✨", colour: "#E7C777", school: "Wisdom" },
];

export default function TomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"progress" | "mastery" | "badges">("progress");
  const [masteryFilter, setMasteryFilter] = useState<"all" | "QR" | "AR" | "RC">("all");

  useEffect(() => {
    const stored = localStorage.getItem("activeProfileId");
    if (!stored) { router.push("/login"); return; }
    const profileId = parseInt(stored);

    fetch(`/api/profile/${profileId}`)
      .then(r => r.json())
      .then(data => setProfile(data.profile))
      .catch(() => router.push("/login"));
  }, [router]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📖</div>
          <p style={{ color: "#EADFC8" }}>Opening the Tome…</p>
        </div>
      </div>
    );
  }

  const rankIdx = RANK_ORDER.indexOf(profile.rank);
  const currentRankXP = RANK_XP[rankIdx] ?? 0;
  const nextRankXP = RANK_XP[rankIdx + 1] ?? currentRankXP + 500;
  const xpProgress = Math.min(100, ((profile.totalXP - currentRankXP) / (nextRankXP - currentRankXP)) * 100);

  const filteredMasteries = profile.knowledgeMasteries.filter(m =>
    masteryFilter === "all" || m.knowledgePointCode.startsWith(masteryFilter)
  );

  const earnedBadges = profile.badges;
  const allBadgeKeys = Object.keys(BADGE_DEFS);

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📖</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#E7C777" }}>
            Wizard's Tome
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            {profile.mageName}'s chronicle of knowledge and mastery
          </p>
        </div>

        {/* Rank card */}
        <div className="rounded-xl p-6 mb-6 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A" }}>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2"
              style={{ background: profile.avatarColour, borderColor: "#E7C777", color: "#0F1C3F" }}
            >
              {profile.mageName[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#E7C777" }}>{profile.mageName}</h2>
              <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.8 }}>{profile.rank}</p>
              <p className="text-sm" style={{ color: "#B68A3A" }}>{profile.totalXP} ✦ total</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs mb-1" style={{ color: "#EADFC8", opacity: 0.7 }}>
                {rankIdx < RANK_ORDER.length - 1 ? `Next: ${RANK_ORDER[rankIdx + 1]}` : "Max Rank!"}
              </p>
              {rankIdx < RANK_ORDER.length - 1 && (
                <p className="text-xs" style={{ color: "#B68A3A" }}>
                  {nextRankXP - profile.totalXP} ✦ to go
                </p>
              )}
            </div>
          </div>
          {rankIdx < RANK_ORDER.length - 1 && (
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "#EADFC8", opacity: 0.6 }}>
                <span>{profile.rank}</span>
                <span>{RANK_ORDER[rankIdx + 1]}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: "#0F1C3F" }}>
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${xpProgress}%`, background: "linear-gradient(to right, #B68A3A, #E7C777)" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Attributes */}
        <div className="rounded-xl p-5 mb-6 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A33" }}>
          <h3 className="font-bold mb-4" style={{ color: "#E7C777" }}>Five Schools of Magic</h3>
          <div className="grid grid-cols-5 gap-3">
            {ATTRIBUTES.map(attr => {
              const val = profile[attr.key as keyof Profile] as number;
              const maxVal = 100;
              const pct = Math.min(100, (val / maxVal) * 100);
              return (
                <div key={attr.key} className="text-center">
                  <div className="text-2xl mb-1">{attr.icon}</div>
                  <div className="text-xs font-bold mb-2" style={{ color: attr.colour }}>{attr.label}</div>
                  <div className="w-full rounded-full h-24 relative flex flex-col-reverse overflow-hidden"
                    style={{ background: "#0F1C3F" }}>
                    <div
                      className="w-full rounded-b-full transition-all duration-700"
                      style={{ height: `${pct}%`, background: attr.colour, opacity: 0.8 }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-bold" style={{ color: "#EADFC8" }}>{val}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["progress", "mastery", "badges"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
              style={{
                background: activeTab === tab ? "#B68A3A" : "#1E2E5A",
                color: activeTab === tab ? "#0F1C3F" : "#EADFC8",
                border: `1px solid ${activeTab === tab ? "#B68A3A" : "#B68A3A33"}`,
              }}
            >
              {tab === "progress" ? "📊 Progress" : tab === "mastery" ? "🎯 Mastery Map" : "🏅 Badges"}
            </button>
          ))}
        </div>

        {/* Tab: Progress */}
        {activeTab === "progress" && (
          <div className="space-y-4">
            <div className="rounded-xl p-5 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A33" }}>
              <h3 className="font-bold mb-4" style={{ color: "#E7C777" }}>Rank Journey</h3>
              <div className="space-y-2">
                {RANK_ORDER.map((rank, idx) => {
                  const reached = profile.totalXP >= RANK_XP[idx];
                  const isCurrent = rank === profile.rank;
                  return (
                    <div key={rank} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: reached ? "#B68A3A" : "#0F1C3F",
                          color: reached ? "#0F1C3F" : "#EADFC8",
                          border: `2px solid ${reached ? "#E7C777" : "#B68A3A33"}`,
                        }}
                      >
                        {reached ? "✓" : idx + 1}
                      </div>
                      <span
                        className="text-sm"
                        style={{
                          color: isCurrent ? "#E7C777" : reached ? "#EADFC8" : "#EADFC8",
                          opacity: isCurrent ? 1 : reached ? 0.7 : 0.4,
                          fontWeight: isCurrent ? "bold" : "normal",
                        }}
                      >
                        {rank}
                        {isCurrent && <span className="ml-2 text-xs" style={{ color: "#B68A3A" }}>(current)</span>}
                      </span>
                      <span className="ml-auto text-xs" style={{ color: "#B68A3A" }}>
                        {RANK_XP[idx]} ✦
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl p-5 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A33" }}>
              <h3 className="font-bold mb-4" style={{ color: "#E7C777" }}>Sparks Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
                  <div className="text-3xl font-bold" style={{ color: "#E7C777" }}>{profile.totalXP}</div>
                  <div className="text-xs mt-1" style={{ color: "#EADFC8", opacity: 0.7 }}>Total Sparks ✦</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
                  <div className="text-3xl font-bold" style={{ color: "#6BA3D6" }}>{profile.knowledgeMasteries.length}</div>
                  <div className="text-xs mt-1" style={{ color: "#EADFC8", opacity: 0.7 }}>Topics Practised</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
                  <div className="text-3xl font-bold" style={{ color: "#22c55e" }}>
                    {profile.knowledgeMasteries.filter(m => m.masteryLevel >= 4).length}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#EADFC8", opacity: 0.7 }}>Topics Mastered ⭐</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
                  <div className="text-3xl font-bold" style={{ color: "#E7C777" }}>{profile.badges.length}</div>
                  <div className="text-xs mt-1" style={{ color: "#EADFC8", opacity: 0.7 }}>Badges Earned 🏅</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Mastery Map */}
        {activeTab === "mastery" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["all", "QR", "AR", "RC"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setMasteryFilter(f)}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{
                    background: masteryFilter === f ? "#B68A3A" : "#1E2E5A",
                    color: masteryFilter === f ? "#0F1C3F" : "#EADFC8",
                    border: `1px solid ${masteryFilter === f ? "#B68A3A" : "#B68A3A33"}`,
                  }}
                >
                  {f === "all" ? "All" : f === "QR" ? "⚙️ Clocktower" : f === "AR" ? "🌿 Forest" : "💧 Lake"}
                </button>
              ))}
            </div>

            {filteredMasteries.length === 0 ? (
              <div className="rounded-xl p-8 text-center border" style={{ background: "#1E2E5A", borderColor: "#B68A3A33" }}>
                <div className="text-4xl mb-3">🌱</div>
                <p style={{ color: "#EADFC8", opacity: 0.7 }}>No mastery data yet. Complete quests to grow your knowledge map!</p>
                <Link href="/home" className="mt-4 inline-block px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "#B68A3A", color: "#0F1C3F" }}>
                  Start a Quest →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMasteries.sort((a, b) => b.masteryLevel - a.masteryLevel).map(m => {
                  const info = MASTERY_LABEL[m.masteryLevel] ?? MASTERY_LABEL[1];
                  const firstChoicePct = m.totalAttempts > 0
                    ? Math.round((m.firstChoiceCorrect / m.totalAttempts) * 100)
                    : 0;
                  return (
                    <div key={m.knowledgePointCode}
                      className="rounded-lg p-4 border flex items-center gap-4"
                      style={{ background: "#1E2E5A", borderColor: "#B68A3A22" }}>
                      <div className="text-2xl">{info.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "#0F1C3F", color: "#B68A3A" }}>
                            {m.knowledgePointCode}
                          </span>
                          <span className="text-sm font-medium truncate" style={{ color: "#EADFC8" }}>
                            {KP_NAMES[m.knowledgePointCode] ?? m.knowledgePointCode}
                          </span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ background: "#0F1C3F" }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${(m.masteryLevel / 5) * 100}%`, background: info.colour }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color: info.colour }}>{info.label}</div>
                        <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>
                          {firstChoicePct}% first-try · {m.totalAttempts} attempts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Badges */}
        {activeTab === "badges" && (
          <div>
            {/* Legend */}
            <div className="flex gap-3 mb-4 text-xs" style={{ color: "#EADFC8", opacity: 0.7 }}>
              <span>🟤 Bronze</span>
              <span>⚪ Silver</span>
              <span>🟡 Gold</span>
              <span style={{ opacity: 0.4 }}>☐ Not yet earned</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {allBadgeKeys.map(key => {
                const def = BADGE_DEFS[key];
                const earned = earnedBadges.filter(b => b.badgeKey === key);
                const hasBronze = earned.some(b => b.tier === "bronze");
                const hasSilver = earned.some(b => b.tier === "silver");
                const hasGold = earned.some(b => b.tier === "gold");
                const anyEarned = earned.length > 0;

                return (
                  <div
                    key={key}
                    className="rounded-xl p-4 border"
                    style={{
                      background: anyEarned ? "#1E2E5A" : "#1E2E5A",
                      borderColor: anyEarned ? "#B68A3A" : "#B68A3A22",
                      opacity: anyEarned ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: anyEarned ? "#E7C777" : "#EADFC8" }}>
                          {def.name}
                        </div>
                        <div className="text-xs" style={{ color: "#B68A3A" }}>{def.school}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(["bronze", "silver", "gold"] as const).map(tier => (
                        <div
                          key={tier}
                          className="flex-1 h-6 rounded text-xs flex items-center justify-center font-bold"
                          style={{
                            background: (tier === "bronze" && hasBronze) || (tier === "silver" && hasSilver) || (tier === "gold" && hasGold)
                              ? TIER_COLOUR[tier]
                              : "#0F1C3F",
                            color: "#0F1C3F",
                            border: `1px solid ${TIER_COLOUR[tier]}40`,
                          }}
                        >
                          {(tier === "bronze" && hasBronze) || (tier === "silver" && hasSilver) || (tier === "gold" && hasGold)
                            ? "✓" : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
