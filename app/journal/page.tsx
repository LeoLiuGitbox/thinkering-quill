"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface JournalEntry {
  id: number;
  knowledgePointCode: string;
  title: string;
  storyText: string;
  spotQuestion: string;
  studentAnswer: string | null;
  discoveredAt: string;
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

function getSpellName(code: string): string {
  return KP_SPELL[code] ?? `✨ ${KP_NAMES[code] ?? code} Spell`;
}

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "QR" | "AR" | "RC">("all");

  useEffect(() => {
    const stored = localStorage.getItem("activeProfileId");
    if (!stored) { router.push("/login"); return; }
    const profileId = parseInt(stored);

    fetch(`/api/profile/${profileId}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.profile?.fieldJournalEntries ?? []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [router]);

  const filtered = entries.filter(e =>
    filter === "all" || e.knowledgePointCode.startsWith(filter)
  );

  const saveAnswer = async (entry: JournalEntry) => {
    const answer = answerDraft[entry.id] ?? entry.studentAnswer ?? "";
    if (!answer.trim()) return;
    setSavingId(entry.id);
    try {
      await fetch(`/api/spells`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, studentAnswer: answer }),
      });
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, studentAnswer: answer } : e));
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
      <GameNav />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📔</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#E7C777" }}>Field Journal</h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            Spells you've discovered living in the real world
          </p>
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
                ? "Complete quests to discover how magic lives in the real world."
                : "Complete quests in this region to discover more real-world spells."}
            </p>
            <Link href="/home" className="inline-block px-6 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#B68A3A", color: "#0F1C3F" }}>
              Begin a Quest →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered
              .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
              .map(entry => {
                const isExpanded = expandedId === entry.id;
                const spell = getSpellName(entry.knowledgePointCode);
                const date = new Date(entry.discoveredAt).toLocaleDateString("en-AU", {
                  day: "numeric", month: "short", year: "numeric"
                });

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
                        </div>
                        <div className="font-medium text-sm truncate" style={{ color: "#E7C777" }}>
                          {entry.title}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.5 }}>
                          Discovered {date}
                          {entry.studentAnswer && <span className="ml-2">· ✍️ Answer recorded</span>}
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: "#B68A3A" }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </button>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t" style={{ borderColor: "#B68A3A33" }}>
                        <div className="pt-4 text-sm leading-relaxed" style={{ color: "#EADFC8" }}>
                          {entry.storyText}
                        </div>

                        {/* Spot the spell */}
                        <div className="mt-4 p-4 rounded-lg border" style={{ background: "#0F1C3F22", borderColor: "#B68A3A44" }}>
                          <p className="text-sm font-medium mb-3" style={{ color: "#E7C777" }}>
                            💬 {entry.spotQuestion}
                          </p>
                          {entry.studentAnswer ? (
                            <div>
                              <p className="text-xs mb-1" style={{ color: "#B68A3A" }}>Your observation:</p>
                              <p className="text-sm italic" style={{ color: "#EADFC8", opacity: 0.8 }}>
                                "{entry.studentAnswer}"
                              </p>
                              <button
                                className="mt-2 text-xs underline"
                                style={{ color: "#B68A3A" }}
                                onClick={() => setAnswerDraft(prev => ({ ...prev, [entry.id]: entry.studentAnswer ?? "" }))}
                              >
                                Edit answer
                              </button>
                            </div>
                          ) : (
                            <div>
                              <textarea
                                value={answerDraft[entry.id] ?? ""}
                                onChange={e => setAnswerDraft(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                placeholder="Write your observation here… (+5 ✦ Sparks)"
                                rows={3}
                                className="w-full rounded-lg p-3 text-sm resize-none outline-none"
                                style={{ background: "#1E2E5A", color: "#EADFC8", border: "1px solid #B68A3A44" }}
                              />
                              <button
                                onClick={() => saveAnswer(entry)}
                                disabled={!answerDraft[entry.id]?.trim() || savingId === entry.id}
                                className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                                style={{ background: "#B68A3A", color: "#0F1C3F" }}
                              >
                                {savingId === entry.id ? "Saving…" : "Save (+5 ✦)"}
                              </button>
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
