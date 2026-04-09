/**
 * Challenge Log — server-side utility
 * Writes structured markdown files to challenge-logs/ for each session.
 * Called from API routes only (never from client components).
 *
 * File naming:
 *   Quest:   challenge-logs/QR_2026-04-09T14-30-00_pid2.md
 *   Writing: challenge-logs/Writing_2026-04-09T16-00-00_sid42.md
 */

import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestLogQuestion {
  idx: number;
  knowledgePointCode: string;
  questionText: string;
  context?: string;
  options?: string[];          // MCQ text options
  options_ar?: unknown[];      // AR cell data
  gridData?: unknown[][];      // AR grid
  type?: string;               // AR type
  correct: string;
  explanation: string;
  hint1: string;
  hint2: string;
}

export interface QuestLogAnswer {
  idx: number;
  knowledgePointCode: string;
  userAnswer: string;
  correct: string;
  isCorrect: boolean;
  hintsUsed: number;
  timeSpentMs?: number;
}

export interface WritingFeedback {
  strength?: string;
  priorityIssue?: string;
  revisionInstruction?: string;
  modelExample?: string;
  rubricSummary?: {
    promptRelevance?: string;
    ideas?: string;
    organisation?: string;
    language?: string;
  };
  nextStep?: string;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

function logDir(): string {
  return path.join(process.cwd(), "challenge-logs");
}

function ensureDir() {
  fs.mkdirSync(logDir(), { recursive: true });
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

function formatDisplayTime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function makeQuestLogPath(subject: string, profileId: number): string {
  const ts = formatTimestamp(new Date());
  return path.join(logDir(), `${subject}_${ts}_pid${profileId}.md`);
}

export function makeWritingLogPath(sessionId: number, createdAt: Date): string {
  const ts = formatTimestamp(createdAt);
  return path.join(logDir(), `Writing_${ts}_sid${sessionId}.md`);
}

// ─── Math / LaTeX formatting ──────────────────────────────────────────────────

/**
 * Wrap simple math expressions in $...$ LaTeX delimiters.
 * Targets: simple fractions (3/5), operators with numbers, equations.
 */
function formatMath(text: string): string {
  if (!text) return text;

  // Fraction: digits/digits not already in LaTeX → $\frac{a}{b}$
  let out = text.replace(
    /(?<!\$)(?<!\w)(\d+)\/(\d+)(?!\w)(?!\$)/g,
    (_m, a, b) => `$\\frac{${a}}{${b}}$`
  );

  // Inline equation with variables: e.g. "x = 15 + 12"
  out = out.replace(
    /(?<!\$)([A-Za-z])\s*=\s*(\d[\d\s+\-×÷*/]*\d)/g,
    (_m, lhs, rhs) => `$${lhs} = ${rhs.trim()}$`
  );

  // Arithmetic operators: × ÷ between numbers
  out = out.replace(
    /(?<!\$)(\d+)\s*([×÷])\s*(\d+)/g,
    (_m, a, op, b) => `$${a} ${op} ${b}$`
  );

  return out;
}

// ─── AR grid → ASCII table ────────────────────────────────────────────────────

const SHAPE_EMOJI: Record<string, string> = {
  triangle: "▲", circle: "●", square: "■",
  pentagon: "⬠", star: "★", arrow: "▶", cross: "✚", empty: "·",
};

function cellToString(cell: unknown): string {
  if (!cell || typeof cell !== "object") return "·";
  const c = cell as Record<string, unknown>;
  const shape = SHAPE_EMOJI[String(c.shape || "empty")] || "·";
  const fill = c.fill ? String(c.fill).slice(0, 3) : "";
  const rot = c.rotation !== undefined ? `${c.rotation}°` : "";
  const size = c.size ? String(c.size).slice(0, 2) : "";
  return `${shape} ${fill} ${rot} ${size}`.trim();
}

function formatARGrid(gridData: unknown[][], type?: string): string {
  if (!gridData || gridData.length === 0) return "_No grid data_";

  const rows = gridData.map((row) => {
    if (!Array.isArray(row)) return `| ${cellToString(row)} |`;
    return "| " + row.map(cellToString).join(" | ") + " |";
  });

  const firstRow = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0]];
  const header = "| " + firstRow.map(() => "---").join(" | ") + " |";

  const typeLabel = type ? `_Type: ${type}_\n\n` : "";
  return typeLabel + rows[0] + "\n" + header + "\n" + rows.slice(1).join("\n");
}

// ─── Chart context → Mermaid ──────────────────────────────────────────────────

/**
 * If context looks like "Bar chart: Label = N, Label = N ..."
 * convert to a mermaid xychart-beta block.
 */
function parseChartContext(context: string): string {
  // Pattern: "Bar chart showing X:\nLabel = N\nLabel = N"
  const barPattern = /(?:Bar chart[^:]*:)?\s*([\w\s]+\s*=\s*\d+(?:[^\n,]*(?:,|\n)[\w\s]+\s*=\s*\d+)+)/i;
  const match = context.match(barPattern);
  if (!match) return context; // not a chart — return as-is

  // Parse key=value pairs
  const pairs: { label: string; value: number }[] = [];
  const kvRegex = /([\w\s]+?)\s*=\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = kvRegex.exec(match[1])) !== null) {
    pairs.push({ label: m[1].trim(), value: parseInt(m[2]) });
  }
  if (pairs.length < 2) return context;

  const labels = pairs.map((p) => `"${p.label}"`).join(", ");
  const values = pairs.map((p) => p.value).join(", ");
  const maxVal = Math.max(...pairs.map((p) => p.value));

  return (
    "```mermaid\n" +
    "xychart-beta\n" +
    `  x-axis [${labels}]\n` +
    `  y-axis 0 --> ${Math.ceil(maxVal * 1.2)}\n` +
    `  bar [${values}]\n` +
    "```"
  );
}

// ─── Write Quest Log (Phase 1) ────────────────────────────────────────────────

export function writeQuestLog(p: {
  profileId: number;
  profileName: string;
  subject: string;
  difficulty: string;
  systemPrompt: string;
  userPrompt: string;
  questions: QuestLogQuestion[];
}): string {
  try {
    ensureDir();
    const logPath = makeQuestLogPath(p.subject, p.profileId);
    const now = new Date();

    const subjectLabels: Record<string, string> = {
      QR: "Quantitative Reasoning",
      AR: "Abstract Reasoning",
      RC: "Reading Comprehension",
    };
    const subjectLabel = subjectLabels[p.subject] || p.subject;

    let md = `# ${p.subject} Session — ${formatDisplayTime(now)}\n`;
    md += `**Student:** ${p.profileName} (ID: ${p.profileId}) · `;
    md += `**Subject:** ${subjectLabel} · `;
    md += `**Difficulty:** ${p.difficulty} · `;
    md += `**Questions:** ${p.questions.length}\n\n---\n\n`;

    // Prompts in collapsible blocks
    md += `## Generation Prompts\n\n`;
    md += `<details><summary>System Prompt</summary>\n\n`;
    md += "```text\n" + p.systemPrompt + "\n```\n\n</details>\n\n";
    md += `<details><summary>User Prompt</summary>\n\n`;
    md += "```text\n" + p.userPrompt + "\n```\n\n</details>\n\n---\n\n";

    // Questions
    for (const q of p.questions) {
      md += `## Question ${q.idx + 1} — ${q.knowledgePointCode}\n\n`;

      // Context / passage
      if (q.context && q.context.trim()) {
        const chartMd = parseChartContext(q.context.trim());
        if (chartMd !== q.context.trim()) {
          md += chartMd + "\n\n";
        } else if (q.context.includes("|")) {
          // Already a markdown table
          md += q.context.trim() + "\n\n";
        } else {
          md += `> **Context:** ${q.context.trim()}\n\n`;
        }
      }

      // AR grid
      if (q.gridData && q.gridData.length > 0) {
        md += formatARGrid(q.gridData, q.type) + "\n\n";
        if (q.options_ar && Array.isArray(q.options_ar)) {
          md += "**Options:**\n\n";
          (q.options_ar as unknown[]).forEach((cell, i) => {
            const label = ["A", "B", "C", "D"][i] || String(i + 1);
            md += `- **${label}.** ${cellToString(cell)}\n`;
          });
          md += "\n";
        }
      } else if (q.options && q.options.length > 0) {
        // MCQ text options
        md += "| Option | Value |\n|--------|-------|\n";
        q.options.forEach((opt, i) => {
          const label = ["A", "B", "C", "D"][i] || String(i + 1);
          const cleaned = typeof opt === "string" ? opt.replace(/^[A-D]\.\s*/, "") : String(opt);
          md += `| ${label} | ${cleaned} |\n`;
        });
        md += "\n";
      }

      md += `> **Question:** ${formatMath(q.questionText)}\n\n`;
      md += `**Correct Answer:** \`${q.correct}\`\n\n`;
      md += `**Explanation:** ${formatMath(q.explanation)}\n\n`;
      md += `**Hint I:**\n${q.hint1 || "_Not generated_"}\n\n`;
      md += `**Hint II:**\n${q.hint2 || "_Not generated_"}\n\n---\n\n`;
    }

    fs.writeFileSync(logPath, md, "utf8");
    console.log(`[challengeLog] Quest log written: ${logPath}`);
    return logPath;
  } catch (err) {
    console.error("[challengeLog] Failed to write quest log:", err);
    return "";
  }
}

// ─── Append Student Answers (Phase 2) ────────────────────────────────────────

export function appendQuestAnswers(
  logPath: string,
  p: {
    answers: QuestLogAnswer[];
    totalSparks: number;
    correctCount: number;
    reflection?: string;
    submittedAt: string;
  }
): void {
  try {
    if (!logPath || !fs.existsSync(logPath)) {
      console.error("[challengeLog] Quest log not found:", logPath);
      return;
    }

    let md = `\n---\n\n## Student Answers · ${p.submittedAt}\n\n`;
    md += "| # | Topic | Answer | Correct | Result | Hints | Time |\n";
    md += "|---|-------|--------|---------|--------|-------|------|\n";

    for (const a of p.answers) {
      const result = a.isCorrect ? "✅" : "❌";
      const time = a.timeSpentMs ? `${Math.round(a.timeSpentMs / 1000)}s` : "—";
      md += `| ${a.idx + 1} | ${a.knowledgePointCode} | ${a.userAnswer || "—"} | ${a.correct} | ${result} | ${a.hintsUsed} | ${time} |\n`;
    }

    md += `\n**Sparks:** +${p.totalSparks} ✦ · **Score:** ${p.correctCount}/${p.answers.length}\n`;

    if (p.reflection?.trim()) {
      md += `\n**Reflection:**\n> ${p.reflection.trim()}\n`;
    }

    fs.appendFileSync(logPath, md, "utf8");
    console.log(`[challengeLog] Answers appended: ${logPath}`);
  } catch (err) {
    console.error("[challengeLog] Failed to append answers:", err);
  }
}

// ─── Write Writing Log (Phase 1) ─────────────────────────────────────────────

export function writeWritingLog(p: {
  sessionId: number;
  createdAt: Date;
  profileId: number;
  profileName: string;
  imageDescription: string;
  imagePath: string;
  promptCue: string;
  sceneSystemPrompt: string;
  sceneUserPrompt: string;
}): string {
  try {
    ensureDir();
    const logPath = makeWritingLogPath(p.sessionId, p.createdAt);
    const now = p.createdAt;

    // Build relative path from challenge-logs/ to public/writing-images/
    const imgFile = path.basename(p.imagePath);
    const imgRelPath = `../../public/writing-images/${imgFile}`;

    let md = `# Writing Session — ${formatDisplayTime(now)}\n`;
    md += `**Student:** ${p.profileName} (ID: ${p.profileId}) · **Mode:** Full Task\n\n---\n\n`;

    md += `## Scene\n\n`;
    md += `![Writing Scene](${imgRelPath})\n\n`;
    md += `**Image Description:** ${p.imageDescription}\n\n`;
    md += `**Prompt Cue:**\n*"${p.promptCue}"*\n\n---\n\n`;

    md += `## Scene Generation Prompts\n\n`;
    md += `<details><summary>System Prompt</summary>\n\n`;
    md += "```text\n" + p.sceneSystemPrompt + "\n```\n\n</details>\n\n";
    md += `<details><summary>User Prompt</summary>\n\n`;
    md += "```text\n" + p.sceneUserPrompt + "\n```\n\n</details>\n\n";

    fs.writeFileSync(logPath, md, "utf8");
    console.log(`[challengeLog] Writing log created: ${logPath}`);
    return logPath;
  } catch (err) {
    console.error("[challengeLog] Failed to write writing log:", err);
    return "";
  }
}

// ─── Append Writing Submission (Phase 2) ─────────────────────────────────────

export function appendWritingSubmission(
  logPath: string,
  p: {
    writingText: string;
    wordCount: number;
    feedback: WritingFeedback;
    sparksEarned: number;
    submittedAt: string;
  }
): void {
  try {
    if (!logPath || !fs.existsSync(logPath)) {
      console.error("[challengeLog] Writing log not found:", logPath);
      return;
    }

    let md = `\n---\n\n## Student's Writing · ${p.submittedAt}\n`;
    md += `*Word Count: ${p.wordCount}*\n\n`;
    // Indent each paragraph
    const lines = p.writingText.split("\n").map((l) => (l.trim() ? l : ""));
    md += lines.join("\n") + "\n\n---\n\n";

    md += `## AI Feedback\n\n`;
    if (p.feedback.strength) {
      md += `**Strength:** ${p.feedback.strength}\n\n`;
    }
    if (p.feedback.priorityIssue) {
      md += `**Priority Issue:** ${p.feedback.priorityIssue}\n\n`;
    }
    if (p.feedback.revisionInstruction) {
      md += `**Revision Instruction:** ${p.feedback.revisionInstruction}\n\n`;
    }
    if (p.feedback.modelExample) {
      md += `**Model Example:**\n> ${p.feedback.modelExample}\n\n`;
    }

    const rs = p.feedback.rubricSummary;
    if (rs && Object.keys(rs).length > 0) {
      md += `| Dimension | Feedback |\n|-----------|----------|\n`;
      if (rs.promptRelevance) md += `| Prompt Relevance | ${rs.promptRelevance} |\n`;
      if (rs.ideas) md += `| Ideas | ${rs.ideas} |\n`;
      if (rs.organisation) md += `| Organisation | ${rs.organisation} |\n`;
      if (rs.language) md += `| Language | ${rs.language} |\n`;
      md += "\n";
    }

    if (p.feedback.nextStep) {
      md += `**Next Step:** ${p.feedback.nextStep}\n\n`;
    }

    md += `**Sparks Earned:** +${p.sparksEarned} ✦\n`;

    fs.appendFileSync(logPath, md, "utf8");
    console.log(`[challengeLog] Writing submission appended: ${logPath}`);
  } catch (err) {
    console.error("[challengeLog] Failed to append writing submission:", err);
  }
}
