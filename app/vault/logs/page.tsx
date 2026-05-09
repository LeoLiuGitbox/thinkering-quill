"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GameNav from "@/components/layout/GameNav";
import {
  parseChallengeLog,
  getSubjectFromFileName,
  type ParsedLog,
  type ParsedQuestLog,
  type ParsedWritingLog,
  type ParsedQuestion,
  type LogSubject,
} from "@/lib/challengeLogParser";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: number;
  mageName: string;
  totalXP: number;
  rank: string;
  avatarColour: string;
};

type ChallengeLogListItem = {
  fileName: string;
  title: string;
  updatedAt: string;
  sizeBytes: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function subjectLabel(s: LogSubject): string {
  const map: Record<LogSubject, string> = {
    QR: "Quantitative",
    AR: "Abstract",
    RC: "Reading",
    Writing: "Writing",
  };
  return map[s];
}

function subjectColour(s: LogSubject): string {
  const map: Record<LogSubject, string> = {
    QR: "#3B82F6",
    AR: "#8B5CF6",
    RC: "#10B981",
    Writing: "#F59E0B",
  };
  return map[s];
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index }: { q: ParsedQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasAnswer = q.studentAnswer !== undefined;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none"
        style={{ background: "#1A2545" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ background: "#B68A3A22", color: "#E7C777" }}
        >
          Q{index + 1}
        </span>
        <span className="text-xs" style={{ color: "#B68A3A" }}>
          {q.kpCode}
        </span>

        {hasAnswer && (
          <span
            className="ml-auto text-lg"
            title={q.isCorrect ? "Correct" : "Incorrect"}
          >
            {q.isCorrect ? "✅" : "❌"}
          </span>
        )}

        {q.hintsUsed !== undefined && q.hintsUsed > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#2A1E0F", color: "#B68A3A" }}>
            {q.hintsUsed} hint{q.hintsUsed > 1 ? "s" : ""}
          </span>
        )}

        {q.timeTaken && q.timeTaken !== "—" && (
          <span className="text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
            {q.timeTaken}
          </span>
        )}

        <span className="ml-2 text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {q.context && (
          <div
            className="mb-3 text-sm px-3 py-2 rounded-xl italic"
            style={{ background: "#1A2545", color: "#EADFC8", opacity: 0.85, borderLeft: "3px solid #B68A3A" }}
          >
            {q.context}
          </div>
        )}

        <p className="mb-4 leading-relaxed" style={{ color: "#EADFC8", fontSize: "0.97rem" }}>
          {q.questionText || <span style={{ opacity: 0.4 }}>No question text</span>}
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2 mb-3 sm:grid-cols-2">
          {q.options.map((opt) => {
            const isCorrect = opt.letter === q.correctAnswer;
            const isStudentPick = opt.letter === q.studentAnswer;

            let bg = "#1A2545";
            let border = "#B68A3A22";
            let textColor = "#EADFC8";

            if (isCorrect && isStudentPick) {
              // Student got it right
              bg = "#0F3B23";
              border = "#10B981";
              textColor = "#6EE7B7";
            } else if (isCorrect) {
              // Correct but student didn't pick it
              bg = "#0F3B23";
              border = "#10B981";
              textColor = "#6EE7B7";
            } else if (isStudentPick && !isCorrect) {
              // Student's wrong pick
              bg = "#3B0F0F";
              border = "#EF4444";
              textColor = "#FCA5A5";
            }

            return (
              <div
                key={opt.letter}
                className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
              >
                <span className="font-bold shrink-0 mt-0.5">{opt.letter}.</span>
                <span>{opt.text}</span>
                {isStudentPick && isCorrect && (
                  <span className="ml-auto shrink-0 text-xs font-bold" style={{ color: "#10B981" }}>
                    ✓ Your answer
                  </span>
                )}
                {isStudentPick && !isCorrect && (
                  <span className="ml-auto shrink-0 text-xs font-bold" style={{ color: "#EF4444" }}>
                    ✗ Your answer
                  </span>
                )}
                {!isStudentPick && isCorrect && hasAnswer && (
                  <span className="ml-auto shrink-0 text-xs font-bold" style={{ color: "#10B981" }}>
                    ✓ Correct
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Expand for explanation + hints */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {q.explanation && (
              <div
                className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
              >
                <p className="font-bold mb-1" style={{ color: "#E7C777" }}>📖 Explanation</p>
                <p>{q.explanation}</p>
              </div>
            )}

            {q.hint1 && q.hint1 !== "Not generated" && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "#2A1E0F", border: "1px solid #B68A3A", color: "#EADFC8" }}
              >
                <p className="font-bold mb-1" style={{ color: "#E7C777" }}>📜 Hint I</p>
                <p className="italic">{q.hint1}</p>
              </div>
            )}

            {q.hint2 && q.hint2 !== "Not generated" && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "#2A1E0F", border: "1px solid #B68A3A", color: "#EADFC8" }}
              >
                <p className="font-bold mb-1" style={{ color: "#E7C777" }}>📜 Hint II</p>
                <p className="italic">{q.hint2}</p>
              </div>
            )}
          </div>
        )}

        {(q.explanation || (q.hint1 && q.hint1 !== "Not generated")) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-xs underline"
            style={{ color: "#B68A3A" }}
          >
            {expanded ? "Hide explanation" : "Show explanation & hints"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Quest Review ─────────────────────────────────────────────────────────────

function QuestReview({ log }: { log: ParsedQuestLog }) {
  const pct = log.questionCount > 0 ? Math.round((log.correctCount / log.questionCount) * 100) : 0;
  const colour = subjectColour(log.subject);

  return (
    <div className="space-y-6">
      {/* Session header */}
      <div
        className="rounded-2xl p-5 flex flex-wrap gap-6 items-center"
        style={{ background: "#16213B", border: `1px solid ${colour}44` }}
      >
        {/* Score ring */}
        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full shrink-0"
          style={{ background: `conic-gradient(${colour} ${pct * 3.6}deg, #1A2545 0deg)`, padding: "3px" }}
        >
          <div className="w-full h-full rounded-full flex flex-col items-center justify-center"
            style={{ background: "#16213B" }}
          >
            <span className="text-xl font-bold" style={{ color: colour }}>{pct}%</span>
            <span className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>score</span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: colour + "33", color: colour }}
            >
              {log.subject}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "#B68A3A22", color: "#E7C777" }}
            >
              {log.difficulty}
            </span>
          </div>
          <p className="font-bold mb-0.5" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
            {log.studentName}
          </p>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.6 }}>
            {log.sessionDate}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-center shrink-0">
          <div>
            <div className="text-2xl font-bold" style={{ color: "#E7C777" }}>{log.correctCount}/{log.questionCount}</div>
            <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "#E7C777" }}>+{log.totalSparks}</div>
            <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>✦ sparks</div>
          </div>
        </div>
      </div>

      {/* Reflection */}
      {log.reflectionText && log.reflectionText.length > 1 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: "#2A1E0F", border: "1px solid #B68A3A" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#E7C777" }}>
            ✍️ Reflection
          </p>
          <p className="italic leading-relaxed" style={{ color: "#EADFC8", opacity: 0.9 }}>
            &ldquo;{log.reflectionText}&rdquo;
          </p>
        </div>
      )}

      {/* Questions */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#B68A3A" }}>
          Questions
        </p>
        <div className="space-y-3">
          {log.questions.map((q, i) => (
            <QuestionCard key={q.num} q={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Writing Review ───────────────────────────────────────────────────────────

function WritingReview({ log }: { log: ParsedWritingLog }) {
  return (
    <div className="space-y-6">
      {/* Session header */}
      <div
        className="rounded-2xl p-5 flex flex-wrap gap-4 items-center"
        style={{ background: "#16213B", border: "1px solid #F59E0B44" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "#F59E0B33", color: "#F59E0B" }}>
              Writing
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "#B68A3A22", color: "#E7C777" }}>
              {log.mode}
            </span>
          </div>
          <p className="font-bold mb-0.5" style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}>
            {log.studentName}
          </p>
          <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.6 }}>{log.sessionDate}</p>
        </div>

        {log.hasSubmission && log.sparksEarned > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "#E7C777" }}>+{log.sparksEarned}</div>
            <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>✦ sparks</div>
          </div>
        )}
      </div>

      {/* Scene */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
      >
        <div className="px-5 py-3" style={{ background: "#1A2545" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "#B68A3A" }}>Scene</p>
        </div>
        <div className="p-5 flex flex-col sm:flex-row gap-5">
          {log.sceneImageUrl && (
            <div className="shrink-0 rounded-xl overflow-hidden" style={{ width: 160, height: 160 }}>
              <Image
                src={log.sceneImageUrl}
                alt="Writing scene"
                width={160}
                height={160}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {log.sceneDescription && (
              <p className="text-sm mb-3 leading-relaxed" style={{ color: "#EADFC8", opacity: 0.8 }}>
                {log.sceneDescription}
              </p>
            )}
            {log.promptCue && (
              <p
                className="text-sm italic px-4 py-3 rounded-xl leading-relaxed"
                style={{ background: "#2A1E0F", borderLeft: "3px solid #B68A3A", color: "#E7C777" }}
              >
                &ldquo;{log.promptCue}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Student's writing */}
      {log.hasSubmission ? (
        <>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
          >
            <div
              className="px-5 py-3 flex items-center gap-3"
              style={{ background: "#1A2545" }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: "#B68A3A" }}>
                Student&apos;s Writing
              </p>
              {log.writingTime && (
                <span className="text-xs ml-auto" style={{ color: "#EADFC8", opacity: 0.5 }}>
                  {log.writingTime}
                </span>
              )}
              {log.wordCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "#B68A3A22", color: "#E7C777" }}
                >
                  {log.wordCount} words
                </span>
              )}
            </div>
            <div className="px-5 py-5">
              <p
                className="leading-relaxed whitespace-pre-wrap"
                style={{ color: "#EADFC8", fontSize: "0.97rem", lineHeight: 1.8 }}
              >
                {log.studentWriting}
              </p>
            </div>
          </div>

          {/* AI Feedback */}
          {(log.feedbackStrength || log.feedbackPriority || log.feedbackRevision) && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
            >
              <div className="px-5 py-3" style={{ background: "#1A2545" }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: "#B68A3A" }}>
                  AI Feedback
                </p>
              </div>
              <div className="p-5 space-y-4">
                {log.feedbackStrength && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "#0F3B23", border: "1px solid #10B981", color: "#6EE7B7" }}
                  >
                    <p className="font-bold mb-1" style={{ color: "#34D399" }}>💪 Strength</p>
                    <p>{log.feedbackStrength}</p>
                  </div>
                )}

                {log.feedbackPriority && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "#3B1F0F", border: "1px solid #F97316", color: "#FED7AA" }}
                  >
                    <p className="font-bold mb-1" style={{ color: "#FB923C" }}>⚡ Priority Issue</p>
                    <p>{log.feedbackPriority}</p>
                  </div>
                )}

                {log.feedbackRevision && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "#1E1A3B", border: "1px solid #8B5CF6", color: "#DDD6FE" }}
                  >
                    <p className="font-bold mb-1" style={{ color: "#A78BFA" }}>🔧 Revision</p>
                    <p>{log.feedbackRevision}</p>
                  </div>
                )}

                {log.feedbackModelExample && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm italic"
                    style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
                  >
                    <p className="font-bold mb-2 not-italic" style={{ color: "#E7C777" }}>✨ Model Example</p>
                    <blockquote style={{ borderLeft: "3px solid #B68A3A", paddingLeft: "12px" }}>
                      {log.feedbackModelExample}
                    </blockquote>
                  </div>
                )}

                {log.rubricRows.length > 0 && (
                  <div
                    className="rounded-xl overflow-hidden text-sm"
                    style={{ border: "1px solid #B68A3A22" }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "#1A2545" }}>
                          <th className="px-4 py-2 text-left text-xs uppercase tracking-wider" style={{ color: "#B68A3A" }}>
                            Dimension
                          </th>
                          <th className="px-4 py-2 text-left text-xs uppercase tracking-wider" style={{ color: "#B68A3A" }}>
                            Feedback
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.rubricRows.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              background: i % 2 === 0 ? "#16213B" : "#1A2545",
                              borderTop: "1px solid #B68A3A11",
                            }}
                          >
                            <td className="px-4 py-2 font-medium" style={{ color: "#E7C777" }}>
                              {row.dimension}
                            </td>
                            <td className="px-4 py-2" style={{ color: "#EADFC8", opacity: 0.85 }}>
                              {row.feedback}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {log.feedbackNextStep && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "#0F1C3F", border: "1px solid #3B82F6", color: "#BFDBFE" }}
                  >
                    <p className="font-bold mb-1" style={{ color: "#60A5FA" }}>🎯 Next Step</p>
                    <p>{log.feedbackNextStep}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="rounded-2xl px-5 py-8 text-center"
          style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
        >
          <div className="text-4xl mb-3">✏️</div>
          <p style={{ color: "#EADFC8", opacity: 0.6 }}>Writing not yet submitted for this session.</p>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar log item ─────────────────────────────────────────────────────────

function LogListItem({
  log,
  active,
  onClick,
}: {
  log: ChallengeLogListItem;
  active: boolean;
  onClick: () => void;
}) {
  const subject = getSubjectFromFileName(log.fileName);
  const colour = subjectColour(subject);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
      style={{
        background: active ? "#24386A" : "#16213B",
        border: `1px solid ${active ? "#E7C777" : "#B68A3A22"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ background: colour + "33", color: colour }}
        >
          {subject}
        </span>
        <p
          className="font-bold text-sm truncate flex-1"
          style={{ color: active ? "#E7C777" : "#EADFC8", fontFamily: "Georgia, serif" }}
        >
          {log.title}
        </p>
      </div>
      <p className="text-xs" style={{ color: "#B68A3A" }}>
        {formatUpdatedAt(log.updatedAt)}
      </p>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterType = "All" | LogSubject;

export default function ChallengeLogReviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ChallengeLogListItem[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [parsedLog, setParsedLog] = useState<ParsedLog | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }

    void Promise.all([
      fetch(`/api/profile/${profileId}`).then((res) => res.json()),
      fetch("/api/challenge-logs").then((res) => res.json()),
    ])
      .then(([profileData, logData]) => {
        setProfile(profileData.profile ?? profileData);
        const nextLogs: ChallengeLogListItem[] = logData.logs ?? [];
        setLogs(nextLogs);
        if (nextLogs[0]?.fileName) {
          setSelectedFile(nextLogs[0].fileName);
        }
      })
      .catch((err) => {
        console.error("Failed to load challenge logs:", err);
        setError("Failed to load challenge logs.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedContent("");
      setParsedLog(null);
      return;
    }

    setContentLoading(true);
    setError("");
    setShowRaw(false);
    void fetch(`/api/challenge-logs/${encodeURIComponent(selectedFile)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error as string);
        const content: string = data.content ?? "";
        setSelectedContent(content);
        try {
          setParsedLog(parseChallengeLog(content, selectedFile));
        } catch (parseErr) {
          console.error("Failed to parse challenge log:", parseErr);
          setParsedLog(null);
          setShowRaw(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load challenge log content:", err);
        setError("Failed to load selected challenge log.");
        setSelectedContent("");
        setParsedLog(null);
      })
      .finally(() => setContentLoading(false));
  }, [selectedFile]);

  const filteredLogs =
    filter === "All"
      ? logs
      : logs.filter((l) => getSubjectFromFileName(l.fileName) === filter);

  const filterButtons: FilterType[] = ["All", "QR", "AR", "RC", "Writing"];

  // When filter changes, auto-select first visible log if current file is not in the list
  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    const newList = f === "All" ? logs : logs.filter((l) => getSubjectFromFileName(l.fileName) === f);
    if (!newList.find((l) => l.fileName === selectedFile) && newList.length > 0) {
      setSelectedFile(newList[0].fileName);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📜</div>
          <p style={{ color: "#B68A3A" }}>Opening the challenge archive…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 text-sm mb-3 transition-opacity hover:opacity-80"
              style={{ color: "#B68A3A" }}
            >
              ← Back to Vault
            </Link>
            <h1
              className="text-3xl font-bold"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              Challenge Log Review
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#EADFC8", opacity: 0.7 }}>
              Review past quest sessions and writing tasks.
            </p>
          </div>
          <div
            className="px-4 py-3 rounded-2xl shrink-0"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22", color: "#EADFC8" }}
          >
            {logs.length} log{logs.length === 1 ? "" : "s"}
          </div>
        </div>

        {error && (
          <div
            className="mb-6 rounded-2xl px-4 py-3"
            style={{ background: "#3A1F1F", border: "1px solid #C84B31", color: "#F4D7D7" }}
          >
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <aside
            className="rounded-3xl p-4"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22" }}
          >
            {/* Filter chips */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
              {filterButtons.map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background:
                      filter === f
                        ? f === "All"
                          ? "#B68A3A"
                          : subjectColour(f as LogSubject)
                        : "#16213B",
                    color: filter === f ? "#0F1C3F" : "#EADFC8",
                    border: `1px solid ${filter === f ? "transparent" : "#B68A3A22"}`,
                  }}
                >
                  {f === "All" ? "All" : f}
                </button>
              ))}
            </div>

            {filteredLogs.length === 0 ? (
              <div
                className="rounded-2xl p-5 text-sm"
                style={{ background: "#16213B", color: "#EADFC8", opacity: 0.78 }}
              >
                No logs found for this filter.
              </div>
            ) : (
              <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
                {filteredLogs.map((log) => (
                  <LogListItem
                    key={log.fileName}
                    log={log}
                    active={selectedFile === log.fileName}
                    onClick={() => setSelectedFile(log.fileName)}
                  />
                ))}
              </div>
            )}
          </aside>

          {/* ── Content panel ──────────────────────────────────────────────── */}
          <section
            className="rounded-3xl p-6 min-h-[72vh]"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22" }}
          >
            {contentLoading ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-5xl mb-4">📖</div>
                  <p style={{ color: "#B68A3A" }}>Loading log…</p>
                </div>
              </div>
            ) : parsedLog ? (
              <div>
                {/* Raw toggle */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-xs underline"
                    style={{ color: "#B68A3A" }}
                  >
                    {showRaw ? "← Structured view" : "View raw markdown"}
                  </button>
                </div>

                {showRaw ? (
                  <pre
                    className="text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[70vh]"
                    style={{ color: "#EADFC8", fontFamily: "monospace", opacity: 0.85 }}
                  >
                    {selectedContent}
                  </pre>
                ) : parsedLog.type === "quest" ? (
                  <QuestReview log={parsedLog as ParsedQuestLog} />
                ) : (
                  <WritingReview log={parsedLog as ParsedWritingLog} />
                )}
              </div>
            ) : selectedContent ? (
              /* Fallback raw view */
              <div>
                <div className="flex justify-end mb-4">
                  <span className="text-xs" style={{ color: "#B68A3A" }}>Raw markdown (parse failed)</span>
                </div>
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[70vh]"
                  style={{ color: "#EADFC8", fontFamily: "monospace", opacity: 0.85 }}
                >
                  {selectedContent}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-5xl mb-4">🗂️</div>
                  <p style={{ color: "#EADFC8", opacity: 0.75 }}>
                    Choose a log from the file list to review it here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
