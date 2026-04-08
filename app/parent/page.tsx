"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeSummary {
  badgeKey: string;
  tier: string;
  earnedAt: string;
}

interface SubjectStat {
  region: string;
  totalAttempts: number;
  correctAttempts: number;
  totalSparks: number;
  bestStreak: number;
  lastPracticed: string | null;
}

interface KnowledgeMastery {
  knowledgePointCode: string;
  masteryLevel: number;
  totalAttempts: number;
  firstChoiceCorrect: number;
}

interface DailyActivity {
  activityDate: string;
  questCount: number;
  examCount: number;
  writingCount: number;
  sparksEarned: number;
}

interface IntegrityReport {
  hasPatterns: boolean;
  summary: string;
  details: string[];
}

interface ProfileSummary {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  shadowScore: number;
  weeklyGoal: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  badges: BadgeSummary[];
  subjectStats: SubjectStat[];
  knowledgeMasteries: KnowledgeMastery[];
  recentActivity: DailyActivity[];
  integrityReport: IntegrityReport;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAuraInfo(alignment: string): {
  label: string;
  dot: string;
  text: string;
} {
  switch (alignment) {
    case "bright":
      return { label: "🌟 Bright", dot: "#4ADE80", text: "#4ADE80" };
    case "unstable":
      return { label: "⚡ Unstable", dot: "#F59E0B", text: "#F59E0B" };
    case "shadow_creeping":
      return { label: "🌑 Shadow", dot: "#A78BFA", text: "#A78BFA" };
    case "shadow_drift":
      return { label: "🌑 Shadow", dot: "#7C3AED", text: "#C4B5FD" };
    default:
      return { label: "✨ Active", dot: "#6B7280", text: "#9CA3AF" };
  }
}

function getWeeklyXP(activity: DailyActivity[]): number {
  return activity.reduce((sum, d) => sum + d.sparksEarned, 0);
}

// masteryLevel 1–5 maps to labels
const MASTERY_LABELS: Record<number, string> = {
  1: "Seedling",
  2: "Growing",
  3: "Developing",
  4: "Strong",
  5: "Mastered",
};

const MASTERY_COLOURS: Record<number, string> = {
  1: "#6B7280",
  2: "#22C55E",
  3: "#3B82F6",
  4: "#8B5CF6",
  5: "#E7C777",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SparklineBar({ activity }: { activity: DailyActivity[] }) {
  // Ensure 7 slots, oldest first
  const sorted = [...activity].sort((a, b) =>
    a.activityDate.localeCompare(b.activityDate)
  );
  const maxSparks = Math.max(...sorted.map((d) => d.sparksEarned), 1);

  // Build 7-day labels (Mon–Sun style)
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <p
        className="text-xs uppercase tracking-widest mb-3"
        style={{ color: "#B68A3A" }}
      >
        Sparks Earned — Last 7 Days
      </p>
      <div className="flex items-end gap-1.5 h-16">
        {sorted.map((day, i) => {
          const heightPct =
            maxSparks > 0 ? (day.sparksEarned / maxSparks) * 100 : 0;
          const date = new Date(day.activityDate + "T00:00:00");
          const dayLabel = days[date.getDay()];
          return (
            <div
              key={day.activityDate}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  minHeight: day.sparksEarned > 0 ? "6px" : "2px",
                  background:
                    day.sparksEarned > 0
                      ? "linear-gradient(180deg, #E7C777, #B68A3A)"
                      : "#1E2E5A",
                  opacity: day.sparksEarned > 0 ? 1 : 0.4,
                }}
                title={`${day.activityDate}: ${day.sparksEarned} sparks`}
              />
              <span className="text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
                {dayLabel}
              </span>
            </div>
          );
        })}
        {/* Pad to 7 if fewer records */}
        {sorted.length < 7 &&
          Array.from({ length: 7 - sorted.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div
                className="w-full rounded-t"
                style={{ height: "2px", background: "#1E2E5A", opacity: 0.3 }}
              />
              <span className="text-xs" style={{ color: "#EADFC8", opacity: 0.3 }}>
                –
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function AccuracyBar({
  region,
  correct,
  total,
}: {
  region: string;
  correct: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const colour =
    pct >= 80 ? "#4ADE80" : pct >= 60 ? "#E7C777" : pct >= 40 ? "#F59E0B" : "#F87171";

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm" style={{ color: "#EADFC8" }}>
          {region}
        </span>
        <span className="text-sm font-semibold" style={{ color: colour }}>
          {total > 0 ? `${pct}%` : "No data"}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "#0F1C3F" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: colour }}
        />
      </div>
      <p className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.5 }}>
        {correct} correct / {total} attempts
      </p>
    </div>
  );
}

function MasteryBreakdown({ masteries }: { masteries: KnowledgeMastery[] }) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const m of masteries) {
    const level = Math.min(Math.max(m.masteryLevel, 1), 5);
    counts[level] = (counts[level] || 0) + 1;
  }

  const total = masteries.length;

  if (total === 0) {
    return (
      <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.5 }}>
        No knowledge points practised yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {([1, 2, 3, 4, 5] as const).map((level) => (
        <div
          key={level}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
          style={{
            background: `${MASTERY_COLOURS[level]}18`,
            border: `1px solid ${MASTERY_COLOURS[level]}40`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: MASTERY_COLOURS[level] }}
          />
          <span style={{ color: MASTERY_COLOURS[level] }}>
            {MASTERY_LABELS[level]}
          </span>
          <span
            className="font-bold"
            style={{ color: "#EADFC8" }}
          >
            {counts[level]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly Goal Editor ───────────────────────────────────────────────────────

function WeeklyGoalEditor({
  profileId,
  currentGoal,
  onUpdated,
}: {
  profileId: number;
  currentGoal: number;
  onUpdated: (newGoal: number) => void;
}) {
  const [goal, setGoal] = useState(currentGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (goal === currentGoal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parent/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoal: goal }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.weeklyGoal);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
    >
      <p
        className="text-xs uppercase tracking-widest mb-3"
        style={{ color: "#B68A3A" }}
      >
        Weekly Quest Goal
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGoal((g) => Math.max(1, g - 1))}
            className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-colors"
            style={{ background: "#1E2E5A", color: "#E7C777" }}
            aria-label="Decrease goal"
          >
            −
          </button>
          <span
            className="text-2xl font-bold w-10 text-center"
            style={{ color: "#E7C777" }}
          >
            {goal}
          </span>
          <button
            onClick={() => setGoal((g) => Math.min(100, g + 1))}
            className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-colors"
            style={{ background: "#1E2E5A", color: "#E7C777" }}
            aria-label="Increase goal"
          >
            +
          </button>
        </div>
        <span className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
          quests per week
        </span>
        <button
          onClick={handleSave}
          disabled={saving || goal === currentGoal}
          className="ml-auto px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
          style={{
            background: saved ? "#4ADE8033" : "#B68A3A",
            color: saved ? "#4ADE80" : "#0F1C3F",
            border: saved ? "1px solid #4ADE80" : "none",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Integrity Report ─────────────────────────────────────────────────────────

function IntegritySection({
  report,
  auraAlignment,
}: {
  report: IntegrityReport;
  auraAlignment: string;
}) {
  const isBright = auraAlignment === "bright";

  if (isBright) {
    return (
      <div
        className="p-4 rounded-xl"
        style={{
          background: "#4ADE8010",
          border: "1px solid #4ADE8033",
        }}
      >
        <p className="text-sm" style={{ color: "#4ADE80" }}>
          ✨ Learning patterns look healthy — no shortcut behaviour detected.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "#B68A3A15",
        border: "1px solid #B68A3A44",
      }}
    >
      <p className="text-sm font-semibold mb-2" style={{ color: "#E7C777" }}>
        A note on learning patterns
      </p>
      <p className="text-sm mb-3" style={{ color: "#EADFC8" }}>
        {report.summary}
      </p>
      {report.details.length > 0 && (
        <ul className="space-y-1">
          {report.details.map((detail, i) => (
            <li
              key={i}
              className="text-xs flex items-start gap-2"
              style={{ color: "#EADFC8", opacity: 0.8 }}
            >
              <span style={{ color: "#B68A3A" }}>•</span>
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Profile Detail Panel ─────────────────────────────────────────────────────

function ProfileDetailPanel({
  profile,
  onGoalUpdated,
}: {
  profile: ProfileSummary;
  onGoalUpdated: (profileId: number, newGoal: number) => void;
}) {
  return (
    <div
      className="mt-4 p-6 rounded-2xl space-y-6"
      style={{
        background: "#0F1C3F",
        border: "1px solid #B68A3A44",
      }}
    >
      {/* Subject accuracy */}
      <div>
        <h4
          className="text-sm uppercase tracking-widest mb-4"
          style={{ color: "#B68A3A" }}
        >
          Subject Accuracy
        </h4>
        {profile.subjectStats.length === 0 ? (
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.5 }}>
            No subject data yet.
          </p>
        ) : (
          profile.subjectStats.map((stat) => (
            <AccuracyBar
              key={stat.region}
              region={stat.region}
              correct={stat.correctAttempts}
              total={stat.totalAttempts}
            />
          ))
        )}
      </div>

      {/* Weekly sparkline */}
      <div>
        <SparklineBar activity={profile.recentActivity} />
      </div>

      {/* Mastery breakdown */}
      <div>
        <h4
          className="text-sm uppercase tracking-widest mb-3"
          style={{ color: "#B68A3A" }}
        >
          Knowledge Mastery Progress
        </h4>
        <MasteryBreakdown masteries={profile.knowledgeMasteries} />
      </div>

      {/* Integrity report */}
      <div>
        <h4
          className="text-sm uppercase tracking-widest mb-3"
          style={{ color: "#B68A3A" }}
        >
          Learning Behaviour
        </h4>
        <IntegritySection
          report={profile.integrityReport}
          auraAlignment={profile.auraAlignment}
        />
      </div>

      {/* Weekly goal */}
      <div>
        <h4
          className="text-sm uppercase tracking-widest mb-3"
          style={{ color: "#B68A3A" }}
        >
          Goal Setting
        </h4>
        <WeeklyGoalEditor
          profileId={profile.id}
          currentGoal={profile.weeklyGoal}
          onUpdated={(newGoal) => onGoalUpdated(profile.id, newGoal)}
        />
      </div>

      {/* Badge summary */}
      <div>
        <h4
          className="text-sm uppercase tracking-widest mb-3"
          style={{ color: "#B68A3A" }}
        >
          Badges
        </h4>
        {profile.badges.length === 0 ? (
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.5 }}>
            No badges earned yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(["gold", "silver", "bronze"] as const).map((tier) => {
              const count = profile.badges.filter((b) => b.tier === tier).length;
              if (count === 0) return null;
              const colours: Record<string, { bg: string; text: string }> = {
                gold: { bg: "#E7C77720", text: "#E7C777" },
                silver: { bg: "#D1D5DB20", text: "#D1D5DB" },
                bronze: { bg: "#B68A3A20", text: "#B68A3A" },
              };
              return (
                <span
                  key={tier}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    background: colours[tier].bg,
                    color: colours[tier].text,
                    border: `1px solid ${colours[tier].text}40`,
                  }}
                >
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                </span>
              );
            })}
            <span
              className="px-3 py-1.5 rounded-full text-sm"
              style={{
                background: "#1E2E5A",
                color: "#EADFC8",
                opacity: 0.7,
              }}
            >
              Total: {profile.badges.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  isExpanded,
  onToggle,
  onGoalUpdated,
}: {
  profile: ProfileSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onGoalUpdated: (profileId: number, newGoal: number) => void;
}) {
  const aura = getAuraInfo(profile.auraAlignment);
  const weeklyXP = getWeeklyXP(profile.recentActivity);

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300"
      style={{
        background: "#1E2E5A",
        border: isExpanded ? "1px solid #B68A3A66" : "1px solid #B68A3A22",
        boxShadow: isExpanded ? "0 4px 24px #B68A3A18" : "none",
      }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{
            background: `${profile.avatarColour}33`,
            border: `2px solid ${profile.avatarColour}`,
            color: profile.avatarColour,
          }}
        >
          {getInitials(profile.mageName)}
        </div>
        <div className="min-w-0">
          <h3
            className="text-lg font-bold leading-tight truncate"
            style={{ color: "#E7C777" }}
          >
            {profile.mageName}
          </h3>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
            {profile.rank}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: "#0F1C3F" }}
        >
          <p
            className="text-xl font-bold"
            style={{ color: "#E7C777" }}
          >
            {weeklyXP.toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.6 }}>
            ✦ This week
          </p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: "#0F1C3F" }}
        >
          <p
            className="text-xl font-bold"
            style={{ color: "#E7C777" }}
          >
            {profile.totalXP.toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.6 }}>
            ✦ Total XP
          </p>
        </div>
      </div>

      {/* Aura badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: aura.dot }}
        />
        <span className="text-sm font-medium" style={{ color: aura.text }}>
          {aura.label}
        </span>
      </div>

      {/* View details button */}
      <button
        onClick={onToggle}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{
          background: isExpanded ? "#B68A3A22" : "#B68A3A",
          color: isExpanded ? "#B68A3A" : "#0F1C3F",
          border: isExpanded ? "1px solid #B68A3A" : "none",
        }}
      >
        {isExpanded ? "Hide Details ↑" : "View Details ↓"}
      </button>

      {/* Expanded detail panel */}
      {isExpanded && (
        <ProfileDetailPanel
          profile={profile}
          onGoalUpdated={onGoalUpdated}
        />
      )}
    </div>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({ profiles }: { profiles: ProfileSummary[] }) {
  if (profiles.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #B68A3A22" }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ background: "#1E2E5A" }}>
            <th
              className="text-left px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              Mage
            </th>
            <th
              className="text-right px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              Total XP
            </th>
            <th
              className="text-right px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              This Week
            </th>
            <th
              className="text-right px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              Badges
            </th>
            <th
              className="text-left px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              Aura
            </th>
            <th
              className="text-right px-5 py-3 text-xs uppercase tracking-widest"
              style={{ color: "#B68A3A" }}
            >
              Weekly Goal
            </th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p, i) => {
            const aura = getAuraInfo(p.auraAlignment);
            const weeklyXP = getWeeklyXP(p.recentActivity);
            return (
              <tr
                key={p.id}
                style={{
                  background: i % 2 === 0 ? "#0F1C3F" : "#111E40",
                  borderTop: "1px solid #1E2E5A",
                }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `${p.avatarColour}22`,
                        border: `1.5px solid ${p.avatarColour}`,
                        color: p.avatarColour,
                      }}
                    >
                      {getInitials(p.mageName)}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#EADFC8" }}
                      >
                        {p.mageName}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "#EADFC8", opacity: 0.5 }}
                      >
                        {p.rank}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  className="px-5 py-3 text-right font-semibold"
                  style={{ color: "#E7C777" }}
                >
                  {p.totalXP.toLocaleString()} ✦
                </td>
                <td
                  className="px-5 py-3 text-right"
                  style={{ color: "#EADFC8", opacity: 0.8 }}
                >
                  {weeklyXP.toLocaleString()} ✦
                </td>
                <td
                  className="px-5 py-3 text-right"
                  style={{ color: "#EADFC8" }}
                >
                  {p.badges.length}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-sm flex items-center gap-1.5"
                    style={{ color: aura.text }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: aura.dot }}
                    />
                    {aura.label}
                  </span>
                </td>
                <td
                  className="px-5 py-3 text-right"
                  style={{ color: "#EADFC8", opacity: 0.7 }}
                >
                  {p.weeklyGoal} / week
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await fetch("/api/parent");
        if (!res.ok) throw new Error("Failed to load profiles");
        const data = await res.json();
        setProfiles(data.profiles ?? []);
      } catch (err) {
        setError("Could not load dashboard data. Please refresh.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfiles();
  }, []);

  function handleToggleExpand(profileId: number) {
    setExpandedId((current) => (current === profileId ? null : profileId));
  }

  function handleGoalUpdated(profileId: number, newGoal: number) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, weeklyGoal: newGoal } : p))
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">👨‍👩‍👧</div>
          <p style={{ color: "#B68A3A" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        <div
          className="p-6 rounded-2xl max-w-md text-center"
          style={{ background: "#1E2E5A", border: "1px solid #F87171" }}
        >
          <p className="text-lg font-semibold mb-2" style={{ color: "#F87171" }}>
            Something went wrong
          </p>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">👨‍👩‍👧</span>
            <h1
              className="text-3xl font-bold"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              Parent Dashboard
            </h1>
          </div>
          <p className="text-base ml-14" style={{ color: "#EADFC8", opacity: 0.7 }}>
            Monitor learning progress across all profiles
          </p>
        </div>

        {profiles.length === 0 ? (
          <div
            className="p-10 rounded-2xl text-center"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A22" }}
          >
            <p className="text-lg" style={{ color: "#EADFC8", opacity: 0.6 }}>
              No learner profiles found. Create a profile to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Profile cards grid — up to 3 per row */}
            <section className="mb-12">
              <h2
                className="text-sm uppercase tracking-widest mb-6"
                style={{ color: "#B68A3A" }}
              >
                Learner Profiles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isExpanded={expandedId === profile.id}
                    onToggle={() => handleToggleExpand(profile.id)}
                    onGoalUpdated={handleGoalUpdated}
                  />
                ))}
              </div>
            </section>

            {/* All profiles overview table */}
            <section>
              <h2
                className="text-sm uppercase tracking-widest mb-6"
                style={{ color: "#B68A3A" }}
              >
                All Profiles Overview
              </h2>
              <ComparisonTable profiles={profiles} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
