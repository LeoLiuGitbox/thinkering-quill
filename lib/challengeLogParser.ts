/**
 * challengeLogParser.ts
 *
 * Pure TypeScript parser for QR / AR / RC / Writing challenge log markdown files.
 * No API calls — all processing happens client-side.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogSubject = "QR" | "AR" | "RC" | "Writing";

export interface ParsedOption {
  letter: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface ParsedQuestion {
  num: number;
  kpCode: string;
  context: string;
  questionText: string;
  options: ParsedOption[];
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
  hint1: string;
  hint2: string;
  // Merged from student answers table
  studentAnswer?: string;
  isCorrect?: boolean;
  hintsUsed?: number;
  timeTaken?: string;
}

export interface ParsedQuestLog {
  type: "quest";
  subject: LogSubject;
  sessionDate: string;
  studentName: string;
  studentId: number;
  difficulty: string;
  questionCount: number;
  totalSparks: number;
  correctCount: number;
  reflectionText: string;
  questions: ParsedQuestion[];
}

export interface RubricRow {
  dimension: string;
  feedback: string;
}

export interface ParsedWritingLog {
  type: "writing";
  sessionDate: string;
  studentName: string;
  studentId: number;
  mode: string;
  sceneImageUrl: string; // rewritten to /api/writing-image/uuid.png
  sceneDescription: string;
  promptCue: string;
  studentWriting: string;
  wordCount: number;
  writingTime: string;
  feedbackStrength: string;
  feedbackPriority: string;
  feedbackRevision: string;
  feedbackModelExample: string;
  feedbackNextStep: string;
  rubricRows: RubricRow[];
  sparksEarned: number;
  hasSubmission: boolean;
}

export type ParsedLog = ParsedQuestLog | ParsedWritingLog;

// ─── Public entry point ───────────────────────────────────────────────────────

export function parseChallengeLog(content: string, fileName: string): ParsedLog {
  const subject = getSubjectFromFileName(fileName);
  if (subject === "Writing") return parseWritingLog(content);
  return parseQuestLog(content, subject);
}

export function getSubjectFromFileName(fileName: string): LogSubject {
  if (fileName.startsWith("QR_")) return "QR";
  if (fileName.startsWith("AR_")) return "AR";
  if (fileName.startsWith("RC_")) return "RC";
  return "Writing";
}

// ─── Quest log parser ─────────────────────────────────────────────────────────

function parseQuestLog(content: string, subject: LogSubject): ParsedQuestLog {
  // Header date
  const headerMatch = content.match(/^# \w+ Session — (.+)$/m);
  const sessionDate = headerMatch?.[1]?.trim() ?? "";

  // Metadata line
  const metaMatch = content.match(
    /\*\*Student:\*\* (.+?) \(ID: (\d+)\) · \*\*Subject:\*\* (.+?) · \*\*Difficulty:\*\* (.+?) · \*\*Questions:\*\* (\d+)/
  );
  const studentName = metaMatch?.[1]?.trim() ?? "";
  const studentId = parseInt(metaMatch?.[2] ?? "0", 10);
  const difficulty = metaMatch?.[4]?.trim() ?? "";
  const questionCount = parseInt(metaMatch?.[5] ?? "0", 10);

  // Split into top-level sections on lines that are exactly "---"
  const sections = content.split(/\n---\n/);

  const questions: ParsedQuestion[] = [];
  let totalSparks = 0;
  let correctCount = 0;
  let reflectionText = "";
  let answerRows: ReturnType<typeof parseAnswersSection>["rows"] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    const qMatch = trimmed.match(/^## Question (\d+) — (.+)$/m);
    if (qMatch) {
      const q = parseQuestionSection(trimmed, parseInt(qMatch[1], 10), qMatch[2].trim());
      if (q) questions.push(q);
      continue;
    }
    if (/^## Student Answers/m.test(trimmed)) {
      const parsed = parseAnswersSection(trimmed);
      answerRows = parsed.rows;
      totalSparks = parsed.totalSparks;
      correctCount = parsed.correctCount;
      reflectionText = parsed.reflectionText;
    }
  }

  // Merge answer rows into questions
  for (const row of answerRows) {
    const q = questions.find((q) => q.num === row.num);
    if (q) {
      q.studentAnswer = row.studentAnswer;
      q.isCorrect = row.isCorrect;
      q.hintsUsed = row.hints;
      q.timeTaken = row.time;
    }
  }

  return {
    type: "quest",
    subject,
    sessionDate,
    studentName,
    studentId,
    difficulty,
    questionCount,
    totalSparks,
    correctCount,
    reflectionText,
    questions,
  };
}

function parseQuestionSection(
  section: string,
  num: number,
  kpCode: string
): ParsedQuestion | null {
  // Context line: "> **Context:** ..."
  const contextMatch = section.match(/^> \*\*Context:\*\* (.+)$/m);
  const context = contextMatch?.[1]?.trim() ?? "";

  // Options table
  const options: ParsedOption[] = [];
  const optionMatches = section.matchAll(/^\| ([A-D]) \| (.+?) \|$/gm);
  for (const m of optionMatches) {
    options.push({ letter: m[1], text: m[2].trim() });
  }

  // Question text: "> **Question:** ..."
  const questionMatch = section.match(/^> \*\*Question:\*\* (.+)$/m);
  const questionText = questionMatch?.[1]?.trim() ?? "";

  // Correct answer: **Correct Answer:** `X`
  const correctMatch = section.match(/\*\*Correct Answer:\*\* `([A-D])`/);
  const correctAnswer = correctMatch?.[1] ?? "";

  // Explanation: everything after "**Explanation:**" up to the next "**Hint"
  const explanationMatch = section.match(/\*\*Explanation:\*\* ([\s\S]+?)(?=\*\*Hint I:|$)/);
  const explanation = explanationMatch?.[1]?.trim() ?? "";

  // Hints
  const hint1Match = section.match(/\*\*Hint I:\*\*\s*\n_(.+?)_/);
  const hint2Match = section.match(/\*\*Hint II:\*\*\s*\n_(.+?)_/);
  const hint1 = hint1Match?.[1]?.trim() ?? "";
  const hint2 = hint2Match?.[1]?.trim() ?? "";

  return {
    num,
    kpCode,
    context,
    questionText,
    options,
    correctAnswer,
    explanation,
    hint1,
    hint2,
  };
}

function parseAnswersSection(section: string) {
  const rows: {
    num: number;
    topic: string;
    studentAnswer: string;
    isCorrect: boolean;
    hints: number;
    time: string;
  }[] = [];

  // Table rows: | 1 | QR-04 | A | A | ✅ | 0 | 76s |
  const rowMatches = section.matchAll(
    /^\| (\d+) \| ([\w-]+) \| ([A-Z]) \| ([A-Z]) \| ([✅❌]) \| (\d+) \| (.+?) \|$/gm
  );
  for (const m of rowMatches) {
    rows.push({
      num: parseInt(m[1], 10),
      topic: m[2],
      studentAnswer: m[3],
      isCorrect: m[5] === "✅",
      hints: parseInt(m[6], 10),
      time: m[7].trim(),
    });
  }

  // Sparks + Score
  const sparksMatch = section.match(/\*\*Sparks:\*\* \+(\d+) ✦ · \*\*Score:\*\* (\d+)\/(\d+)/);
  const totalSparks = parseInt(sparksMatch?.[1] ?? "0", 10);
  const correctCount = parseInt(sparksMatch?.[2] ?? "0", 10);

  // Reflection: everything after "> " on the reflection line
  const reflectionMatch = section.match(/\*\*Reflection:\*\*\s*\n> (.+)/);
  const reflectionText = reflectionMatch?.[1]?.trim() ?? "";

  return { rows, totalSparks, correctCount, reflectionText };
}

// ─── Writing log parser ────────────────────────────────────────────────────────

function parseWritingLog(content: string): ParsedWritingLog {
  // Header date
  const headerMatch = content.match(/^# Writing Session — (.+)$/m);
  const sessionDate = headerMatch?.[1]?.trim() ?? "";

  // Metadata
  const metaMatch = content.match(
    /\*\*Student:\*\* (.+?) \(ID: (\d+)\) · \*\*Mode:\*\* (.+)$/m
  );
  const studentName = metaMatch?.[1]?.trim() ?? "";
  const studentId = parseInt(metaMatch?.[2] ?? "0", 10);
  const mode = metaMatch?.[3]?.trim() ?? "";

  // Scene image URL — rewrite filesystem path to API route
  const imageMatch = content.match(/!\[Writing Scene\]\((.+?)\)/);
  const rawImagePath = imageMatch?.[1] ?? "";
  const uuidMatch = rawImagePath.match(/([0-9a-f-]{36})\.png/i);
  const sceneImageUrl = uuidMatch
    ? `/api/writing-image/${uuidMatch[1]}.png`
    : "";

  // Image description
  const descMatch = content.match(/\*\*Image Description:\*\* (.+)$/m);
  const sceneDescription = descMatch?.[1]?.trim() ?? "";

  // Prompt cue (between *"...")
  const cueMatch = content.match(/\*"(.+?)"\*/);
  const promptCue = cueMatch?.[1]?.trim() ?? "";

  // Student's Writing section
  const writingMatch = content.match(
    /## Student's Writing · (.+?)\n\*Word Count: (\d+)\*\n\n([\s\S]+?)\n---/
  );
  const hasSubmission = !!writingMatch;
  const writingTime = writingMatch?.[1]?.trim() ?? "";
  const wordCount = parseInt(writingMatch?.[2] ?? "0", 10);
  const studentWriting = writingMatch?.[3]?.trim() ?? "";

  // AI Feedback section
  const feedbackSection = content.match(/## AI Feedback\n\n([\s\S]+?)(?:\n\n---|\n*$)/)?.[1] ?? "";

  const strengthMatch = feedbackSection.match(/\*\*Strength:\*\* ([^\n]+)/);
  const priorityMatch = feedbackSection.match(/\*\*Priority Issue:\*\* ([^\n]+)/);
  const revisionMatch = feedbackSection.match(/\*\*Revision Instruction:\*\* ([^\n]+)/);
  const modelMatch = feedbackSection.match(/\*\*Model Example:\*\*\n> ([^\n]+)/);
  const nextStepMatch = feedbackSection.match(/\*\*Next Step:\*\* ([^\n]+)/);
  const sparksMatch = content.match(/\*\*Sparks Earned:\*\* \+(\d+) ✦/);

  // Rubric table rows: | Dimension | Feedback |
  const rubricRows: RubricRow[] = [];
  const rubricMatches = feedbackSection.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm);
  for (const m of rubricMatches) {
    const dim = m[1].trim();
    const fb = m[2].trim();
    // Skip header row
    if (dim === "Dimension" || dim.startsWith("---")) continue;
    rubricRows.push({ dimension: dim, feedback: fb });
  }

  return {
    type: "writing",
    sessionDate,
    studentName,
    studentId,
    mode,
    sceneImageUrl,
    sceneDescription,
    promptCue,
    studentWriting,
    wordCount,
    writingTime,
    feedbackStrength: strengthMatch?.[1]?.trim() ?? "",
    feedbackPriority: priorityMatch?.[1]?.trim() ?? "",
    feedbackRevision: revisionMatch?.[1]?.trim() ?? "",
    feedbackModelExample: modelMatch?.[1]?.trim() ?? "",
    feedbackNextStep: nextStepMatch?.[1]?.trim() ?? "",
    rubricRows,
    sparksEarned: parseInt(sparksMatch?.[1] ?? "0", 10),
    hasSubmission,
  };
}
