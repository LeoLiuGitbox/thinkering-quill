"use client";

import { useState } from "react";
import MarkdownContext from "@/components/game/MarkdownContext";
import { QuestAttemptReviewItem } from "@/types/game";
import { getMicroSkillLabel } from "@/lib/knowledge/microSkills";

interface ReviewCardItem extends QuestAttemptReviewItem {
  order: number;
  flagged?: boolean;
}

function getOptionLabel(idx: number): string {
  return ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
}

function formatTimeSpent(timeSpentMs?: number | null) {
  if (!timeSpentMs) return "—";
  const totalSeconds = Math.max(1, Math.round(timeSpentMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function getTakeaway(explanation: string) {
  const cleaned = explanation.trim();
  if (!cleaned) return "Review the explanation and try a similar question next.";
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() || cleaned;
  return firstSentence.length <= 140 ? firstSentence : `${firstSentence.slice(0, 137)}...`;
}

export default function QuestReviewCards({ items }: { items: ReviewCardItem[] }) {
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "flagged">("wrong");

  const filteredItems = items.filter((item) => {
    if (reviewFilter === "wrong") return !item.isCorrect;
    if (reviewFilter === "flagged") return Boolean(item.flagged);
    return true;
  });

  return (
    <div className="text-left">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm uppercase tracking-widest mb-1" style={{ color: "#B68A3A" }}>
            Review your answers
          </h3>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.72 }}>
            Use the explanation and takeaway below to learn from each question before your next quest.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "wrong", label: "Wrong only" },
            { key: "flagged", label: "Flagged" },
            { key: "all", label: "All questions" },
          ] as const).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setReviewFilter(filter.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: reviewFilter === filter.key ? "#B68A3A" : "#1E2E5A",
                color: reviewFilter === filter.key ? "#0F1C3F" : "#EADFC8",
                border: `1px solid ${reviewFilter === filter.key ? "#E7C777" : "#B68A3A33"}`,
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => {
          const visibleOptions = item.options || [];
          const microSkillLabel = getMicroSkillLabel(item.microSkillCode);
          return (
            <div
              key={`${item.id}-${item.order}`}
              className="p-5 rounded-2xl"
              style={{
                background: "#1E2E5A",
                border: `1px solid ${item.isCorrect ? "#2E6B3A" : "#6B2E2E"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#B68A3A" }}>
                    Review item {item.order}
                  </p>
                  <p className="text-2xl leading-relaxed" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
                    {item.questionText}
                  </p>
                </div>
                <span className="text-2xl flex-shrink-0">{item.isCorrect ? "✅" : "❌"}</span>
              </div>

              {item.context && (
                <div
                  className="mb-4 p-4 rounded-xl text-base leading-relaxed"
                  style={{ background: "#16213B", border: "1px solid #2E5A8E44", color: "#EADFC8" }}
                >
                  {item.passageTitle && (
                    <p className="font-bold mb-2" style={{ color: "#E7C777" }}>
                      {item.passageTitle}
                    </p>
                  )}
                  <MarkdownContext text={item.context} />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {item.knowledgePointCode && (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#0F1C3F", color: "#E7C777" }}>
                    {item.knowledgePointCode}
                  </span>
                )}
                {microSkillLabel && (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#16213B", color: "#6BA3D6" }}>
                    {microSkillLabel}
                  </span>
                )}
                {item.flagged && (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#B68A3A22", color: "#E7C777" }}>
                    Flagged
                  </span>
                )}
              </div>

              {visibleOptions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {visibleOptions.map((opt, optionIdx) => {
                    const label = getOptionLabel(optionIdx);
                    const isUserChoice = item.userAnswer === label;
                    const isCorrectChoice = item.correctAnswer === label;
                    return (
                      <div
                        key={label}
                        className="px-4 py-3 rounded-xl"
                        style={{
                          background: isCorrectChoice ? "#1B3A2E" : isUserChoice ? "#3A1F26" : "#0F1C3F",
                          border: `1px solid ${isCorrectChoice ? "#2E6B3A" : isUserChoice ? "#7F1D1D" : "#B68A3A22"}`,
                          color: "#EADFC8",
                        }}
                      >
                        <span className="font-bold mr-2" style={{ color: isCorrectChoice ? "#4ADE80" : "#B68A3A" }}>
                          {label}.
                        </span>
                        {typeof opt === "string" ? opt.replace(/^[A-D]\.\s*/, "") : JSON.stringify(opt)}
                        {isCorrectChoice && <span style={{ color: "#4ADE80" }}>  Correct answer</span>}
                        {!isCorrectChoice && isUserChoice && <span style={{ color: "#FCA5A5" }}>  Your choice</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3 mb-4">
                <div className="rounded-xl p-3" style={{ background: "#0F1C3F" }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#B68A3A" }}>Your answer</p>
                  <p className="text-sm" style={{ color: "#EADFC8" }}>{item.userAnswer || "Skipped"}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "#0F1C3F" }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#B68A3A" }}>Hints used</p>
                  <p className="text-sm" style={{ color: "#EADFC8" }}>{item.hintsUsed}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "#0F1C3F" }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#B68A3A" }}>Time spent</p>
                  <p className="text-sm" style={{ color: "#EADFC8" }}>{formatTimeSpent(item.timeSpentMs)}</p>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-3" style={{ background: "#16213B", border: "1px solid #2E5A8E44" }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#6BA3D6" }}>
                  Explanation
                </p>
                <p className="text-base leading-relaxed" style={{ color: "#EADFC8" }}>
                  {item.explanation}
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: "#1A2545", border: "1px solid #B68A3A33" }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#E7C777" }}>
                  Takeaway
                </p>
                <p className="text-base leading-relaxed" style={{ color: "#EADFC8" }}>
                  {getTakeaway(item.explanation)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-5 rounded-2xl mt-4" style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.78 }}>
            No questions match this filter.
          </p>
        </div>
      )}
    </div>
  );
}
