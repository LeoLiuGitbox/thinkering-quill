"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface JournalEntry {
  id: number;
  knowledgePointCode: string;
  spellName?: string | null;
  title: string;
  storyText: string;
  spotQuestion: string;
  studentAnswer: string | null;
  discoveryStatus?: string;
  discoveryFeedback?: string | null;
  firstDiscoveredAt?: string | null;
  discoveryAttemptCount?: number;
  discoveredAt: string;
}

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  quillEnergy?: number;
  fieldJournalEntries?: JournalEntry[];
  knowledgeMasteries?: Array<{
    knowledgePointCode: string;
    masteryLevel: number;
    masteryScore: number;
  }>;
}

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

const KP_SPELL: Record<string, string> = {
  "QR-02": "🎲 Probability Magic", "QR-03": "🔢 Counting Charm", "QR-06": "⏱️ Rate Spell",
  "QR-08": "📊 Table Reading", "QR-13": "🔍 Logic Deduction", "AR-01": "🔄 Rotation Magic",
  "AR-07": "✨ Combination Rule", "AR-09": "🌀 Multi-change Spell", "RC-03": "💭 Inference Spell",
  "RC-06": "📈 Chart Reading",
};

const SPELL_EXPLANATIONS: Record<string, string> = {
  "QR-01": "Pattern Sight means noticing the rule that makes a sequence keep going.",
  "QR-02": "Probability Magic means thinking about how likely something is to happen.",
  "QR-03": "Counting Charm means working out how many different ways something can happen.",
  "QR-04": "Scale Binding means comparing amounts that grow or shrink together.",
  "QR-05": "Fraction Weave means reasoning with parts of a whole.",
  "QR-06": "Rate Spell means comparing time, speed, or how fast something gets done.",
  "QR-07": "Deduction Rune means using clues to figure out what must be true.",
  "QR-08": "Table Reading means pulling useful information out of a table.",
  "QR-09": "Chart Sight means understanding what a graph or chart is showing.",
  "QR-10": "Measure Craft means thinking about size, space, length, area, or volume.",
  "QR-11": "Coin Logic means solving problems about money and value.",
  "QR-12": "Circle Bind means sorting things into groups, including what belongs in both groups.",
  "QR-13": "Truth Lens means testing clues carefully to solve a logic puzzle.",
  "QR-14": "Mirror Spell means tracking flips, turns, or symmetry.",
  "QR-15": "Chain Casting means linking several steps together to solve one problem.",
  "QR-16": "Nature Sense means using scientific clues to explain what is happening.",
  "AR-01": "Rotation Magic means noticing how a shape turns.",
  "AR-02": "Mirror Glyph means noticing how a shape flips.",
  "AR-03": "Fill Shift means tracking changes in shading or pattern.",
  "AR-04": "Scale Sight means tracking how size changes.",
  "AR-05": "Count Weave means tracking how many items appear.",
  "AR-06": "Path Trace means noticing where a shape moves.",
  "AR-07": "Merge Rune means combining clues from two parts to make a new answer.",
  "AR-08": "Outlier Eye means spotting the one choice that breaks the rule.",
  "AR-09": "Weave Sight means tracking several changing features at once.",
  "AR-10": "Parallel Rune means using one pattern to understand another matching pattern.",
  "RC-01": "Core Sight means finding the main point of a text.",
  "RC-02": "Recall Rune means finding information the text says directly.",
  "RC-03": "Inference Weave means using clues to work out something the text does not say directly.",
  "RC-04": "Word Bind means figuring out what a word means from the sentence around it.",
  "RC-05": "Structure Sight means noticing how a text is organised.",
  "RC-06": "Visual Rune means reading meaning from tables, diagrams, or charts.",
  "RC-07": "Tone Weave means noticing mood, feeling, and figurative language.",
  "RC-08": "Time Thread means tracking order, sequence, and cause and effect.",
  "RC-09": "Symbol Eye means reading meaning from cartoons and visual clues.",
};

function getSpellName(code: string): string {
  return KP_SPELL[code] ?? `✨ ${KP_NAMES[code] ?? code} Spell`;
}

function getSpellExplanation(code: string): string {
  return SPELL_EXPLANATIONS[code] ?? "This spell is a way of thinking that helps solve the problem in the story.";
}

export default function JournalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [resultByEntry, setResultByEntry] = useState<Record<number, { discovered: boolean; feedback: string; rewardEarned?: number }>>({});
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "QR" | "AR" | "RC">("all");

  useEffect(() => {
    const stored = localStorage.getItem("activeProfileId");
    if (!stored) { router.push("/login"); return; }
    const profileId = parseInt(stored);

    fetch(`/api/profile/${profileId}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data.profile ?? null);
        setEntries(data.profile?.fieldJournalEntries ?? []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [router]);

  const filtered = entries.filter(e =>
    filter === "all" || e.knowledgePointCode.startsWith(filter)
  );

  async function discoverSpells() {
    if (!profile) return;
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const candidates = [...(profile.knowledgeMasteries ?? [])]
        .sort((a, b) => {
          if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
          return a.masteryScore - b.masteryScore;
        })
        .map((item) => item.knowledgePointCode)
        .slice(0, 2);

      const fallbackCodes = ["QR-04", "AR-01"];
      const knowledgePointCodes = candidates.length > 0 ? candidates : fallbackCodes;

      const generatedResponse = await fetch("/api/spells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          knowledgePointCodes,
        }),
      });
      const generated = await generatedResponse.json();

      if (!generatedResponse.ok) {
        throw new Error(
          generated.error ||
            "Spell discovery is unavailable right now. The story engine may be offline."
        );
      }

      const stories = generated.stories ?? [];
      if (stories.length === 0) {
        throw new Error(
          "No spell stories could be generated just now. The story engine may be offline."
        );
      }

      const createdEntries = await Promise.all(
        stories.map((story: any) =>
          fetch("/api/spells", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId: profile.id,
              knowledgePointCode: story.knowledgePointCode,
              spellName: story.spellName,
              title: story.title,
              storyText: story.storyText,
              spotQuestion: story.spotQuestion,
              answerKey: {
                expectedAnswer: story.expectedAnswer,
                acceptedKeywords: story.acceptedKeywords,
                acceptedPhrases: story.acceptedPhrases,
                successFeedback: story.successFeedback,
                retryFeedback: story.retryFeedback,
              },
            }),
          }).then(async (res) => ({
            ok: res.ok,
            data: await res.json(),
          }))
        )
      );

      const newEntries = createdEntries
        .filter((item) => item.ok && item.data?.entry)
        .map((item) => item.data.entry)
        .filter(Boolean);
      const failedCreates = createdEntries.filter((item) => !item.ok || !item.data?.entry);

      if (newEntries.length > 0) {
        setEntries((prev) => {
          const seen = new Set(prev.map((entry) => entry.id));
          return [...newEntries.filter((entry: JournalEntry) => !seen.has(entry.id)), ...prev];
        });
        if (failedCreates.length > 0) {
          setDiscoverError(
            "Some spells were discovered, but a few could not be written into the Journal. Try again to fetch more."
          );
        }
      } else {
        const firstError = failedCreates[0]?.data?.error;
        throw new Error(
          firstError || "The Journal could not save the discovered spells. Please try again."
        );
      }
    } catch (error) {
      console.error("Discover spells failed:", error);
      setDiscoverError(
        error instanceof Error
          ? error.message
          : "Spell discovery failed. The story engine may be offline right now."
      );
    } finally {
      setDiscovering(false);
    }
  }

  const saveAnswer = async (entry: JournalEntry) => {
    const answer = answerDraft[entry.id] ?? entry.studentAnswer ?? "";
    if (!answer.trim()) return;
    setSavingId(entry.id);
    try {
      const data = await fetch(`/api/spells`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, studentAnswer: answer }),
      }).then((res) => res.json());

      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === entry.id ? data.entry : e));
      }
      if (data.result) {
        setResultByEntry(prev => ({ ...prev, [entry.id]: data.result }));
      }
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📔</div>
          <p style={{ color: "#EADFC8" }}>Opening your Field Journal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📔</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#E7C777" }}>Field Journal</h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            Discover where hidden spells appear in real-world thinking
          </p>
          <div className="mt-4">
            <button
              onClick={() => void discoverSpells()}
              disabled={discovering}
              className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "#B68A3A", color: "#0F1C3F" }}
            >
              {discovering ? "Discovering…" : "Discover Spells"}
            </button>
          </div>
          {discoverError && (
            <div
              className="mt-4 max-w-xl mx-auto rounded-xl px-4 py-3 text-sm"
              style={{ background: "#C84B3118", color: "#F5C1B8", border: "1px solid #C84B3160" }}
            >
              {discoverError}
            </div>
          )}
        </div>

        <div
          className="rounded-xl p-5 mb-6 border"
          style={{ background: "#1E2E5A", borderColor: "#B68A3A22" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                How spells appear
              </p>
              <p style={{ color: "#EADFC8", opacity: 0.8, lineHeight: 1.7 }}>
                The Journal draws from the skills you have been training most recently, especially the ones that still
                need strengthening.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                What to do here
              </p>
              <p style={{ color: "#EADFC8", opacity: 0.8, lineHeight: 1.7 }}>
                Read the scene, spot the hidden spell, and answer the question. Your first successful discovery earns
                Sparks and Wisdom.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                Best next step
              </p>
              <p style={{ color: "#EADFC8", opacity: 0.8, lineHeight: 1.7 }}>
                Run a quest first if you want fresher spell prompts. Then return here and discover new entries tied to
                the skills you just practised.
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "QR", "AR", "RC"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: filter === f ? "#B68A3A" : "#1E2E5A",
                color: filter === f ? "#0F1C3F" : "#EADFC8",
                border: `1px solid ${filter === f ? "#B68A3A" : "#B68A3A33"}`,
              }}
            >
              {f === "all" ? "📔 All Spells" : f === "QR" ? "⚙️ Clocktower" : f === "AR" ? "🌿 Forest" : "💧 Lake"}
              {f !== "all" && (
                <span className="ml-1 opacity-70">
                  ({entries.filter(e => e.knowledgePointCode.startsWith(f)).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl p-12 text-center border" style={{ background: "#1E2E5A", borderColor: "#B68A3A33" }}>
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "#E7C777" }}>
              {entries.length === 0 ? "Your journal awaits its first spell…" : "No spells in this section yet"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.7 }}>
              {entries.length === 0
                ? "Start by discovering a spell, or complete a quest first to let the Journal draw from your latest weak skills."
                : "Complete quests in this region to discover more real-world spells."}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => void discoverSpells()}
                disabled={discovering}
                className="inline-block px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: "#B68A3A", color: "#0F1C3F" }}
              >
                {discovering ? "Discovering…" : "Discover Spells"}
              </button>
              <Link href="/home" className="inline-block px-6 py-2 rounded-lg text-sm font-bold"
                style={{ background: "#16213B", color: "#EADFC8", border: "1px solid #B68A3A33" }}>
                Begin a Quest →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered
              .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
              .map(entry => {
                const isExpanded = expandedId === entry.id;
                const spell = entry.spellName || getSpellName(entry.knowledgePointCode);
                const date = new Date(entry.discoveredAt).toLocaleDateString("en-AU", {
                  day: "numeric", month: "short", year: "numeric"
                });
                const isDiscovered = entry.discoveryStatus === "discovered";
                const discoveryResult = resultByEntry[entry.id];
                const currentAnswer = answerDraft[entry.id] ?? entry.studentAnswer ?? "";
                const spellExplanation = getSpellExplanation(entry.knowledgePointCode);

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ background: "#1E2E5A", borderColor: isExpanded ? "#B68A3A" : "#B68A3A33" }}
                  >
                    {/* Entry header */}
                    <button
                      className="w-full text-left p-5 flex items-center gap-4"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <div className="text-2xl">{spell.split(" ")[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "#0F1C3F", color: "#B68A3A" }}>
                            {entry.knowledgePointCode}
                          </span>
                          <span className="text-xs" style={{ color: "#B68A3A" }}>
                            {spell.slice(spell.indexOf(" ") + 1)}
                          </span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: isDiscovered ? "#4ADE8018" : "#0F1C3F",
                              color: isDiscovered ? "#4ADE80" : "#E7C777",
                              border: `1px solid ${isDiscovered ? "#4ADE8040" : "#B68A3A44"}`,
                            }}
                          >
                            {isDiscovered ? "Discovered" : "Undiscovered"}
                          </span>
                        </div>
                        <div className="font-medium text-sm truncate" style={{ color: "#E7C777" }}>
                          {entry.title}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.5 }}>
                          Discovered {date}
                          {entry.studentAnswer && <span className="ml-2">· ✍️ Answer recorded</span>}
                          {typeof entry.discoveryAttemptCount === "number" && entry.discoveryAttemptCount > 0 && (
                            <span className="ml-2">· {entry.discoveryAttemptCount} attempts</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: "#B68A3A" }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </button>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t" style={{ borderColor: "#B68A3A33" }}>
                        <div
                          className="pt-5"
                          style={{ color: "#EADFC8", fontSize: "1.25rem", lineHeight: 2.05 }}
                        >
                          {entry.storyText}
                        </div>

                        {/* Spot the spell */}
                        <div className="mt-5 p-5 rounded-xl border" style={{ background: "#0F1C3F22", borderColor: "#B68A3A44" }}>
                          <p className="font-medium mb-3" style={{ color: "#E7C777", fontSize: "1.15rem", lineHeight: 1.85 }}>
                            💬 {entry.spotQuestion}
                          </p>
                          <p className="mb-4" style={{ color: "#B68A3A", fontSize: "1.08rem", lineHeight: 1.85 }}>
                            {spellExplanation}
                          </p>
                          <div>
                            <textarea
                              value={currentAnswer}
                              onChange={e => setAnswerDraft(prev => ({ ...prev, [entry.id]: e.target.value }))}
                              placeholder="Write where the hidden spell appears in the story…"
                              rows={3}
                              className="w-full rounded-lg p-3 resize-none outline-none"
                              style={{
                                background: "#1E2E5A",
                                color: "#EADFC8",
                                border: "1px solid #B68A3A44",
                                fontSize: "1.12rem",
                                lineHeight: 1.9,
                              }}
                            />
                            <button
                              onClick={() => saveAnswer(entry)}
                              disabled={!currentAnswer.trim() || savingId === entry.id}
                              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                              style={{ background: "#B68A3A", color: "#0F1C3F" }}
                            >
                              {savingId === entry.id ? "Checking…" : isDiscovered ? "Check again" : "Reveal spell"}
                            </button>
                          </div>
                          {(discoveryResult?.feedback || entry.discoveryFeedback) && (
                            <div
                              className="mt-3 rounded-lg p-3"
                              style={{
                                background: (discoveryResult?.discovered ?? isDiscovered) ? "#4ADE8010" : "#16213B",
                                border: `1px solid ${(discoveryResult?.discovered ?? isDiscovered) ? "#4ADE8035" : "#6BA3D644"}`,
                              }}
                            >
                              <p
                                className="text-sm"
                                style={{ color: (discoveryResult?.discovered ?? isDiscovered) ? "#A7F3B8" : "#EADFC8", opacity: 0.88 }}
                              >
                                {discoveryResult?.feedback ?? entry.discoveryFeedback}
                              </p>
                              {(discoveryResult?.rewardEarned ?? 0) > 0 && (
                                <p className="text-xs mt-2" style={{ color: "#E7C777" }}>
                                  +{discoveryResult?.rewardEarned} XP · +1 Wisdom for first successful discovery
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
