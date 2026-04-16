// ─── Profile & Progression ───────────────────────────────────────────────────

export type AuraAlignment = "bright" | "unstable" | "shadow_creeping" | "shadow_drift";

export type Rank =
  | "Novice Scribe"
  | "Rune Reader"
  | "Arcane Solver"
  | "Pattern Weaver"
  | "Quill Adept"
  | "Archive Guardian"
  | "Spell Scholar"
  | "Astral Archivist"
  | "Grand Magus of the Quill"
  | "Eternal Luminary";

export interface ProfileData {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: Rank;
  auraAlignment: AuraAlignment;
  shadowScore: number;
  weeklyGoal: number;
  quillEnergy: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  createdAt: string;
}

// ─── Regions ─────────────────────────────────────────────────────────────────

export type Region =
  | "Archive Hall"
  | "Clocktower of Logic"
  | "Forest of Patterns"
  | "Lake of Reflection"
  | "Workshop of Runes"
  | "Tower of Ascension"
  | "Shadow Vault";

export type Subject = "QR" | "AR" | "RC" | "CIIW";

export const REGION_TO_SUBJECT: Record<string, Subject> = {
  "Clocktower of Logic": "QR",
  "Forest of Patterns": "AR",
  "Lake of Reflection": "RC",
  "Workshop of Runes": "CIIW",
};

// ─── Knowledge Points ─────────────────────────────────────────────────────────

export type KnowledgePointCode =
  // Quantitative Reasoning
  | "QR-01" | "QR-02" | "QR-03" | "QR-04" | "QR-05" | "QR-06" | "QR-07" | "QR-08"
  | "QR-09" | "QR-10" | "QR-11" | "QR-12" | "QR-13" | "QR-14" | "QR-15" | "QR-16"
  // Abstract Reasoning
  | "AR-01" | "AR-02" | "AR-03" | "AR-04" | "AR-05" | "AR-06" | "AR-07" | "AR-08"
  | "AR-09" | "AR-10"
  // Reading Comprehension
  | "RC-01" | "RC-02" | "RC-03" | "RC-04" | "RC-05" | "RC-06"
  | "RC-07" | "RC-08" | "RC-09";

export interface KnowledgePoint {
  code: KnowledgePointCode;
  name: string;
  description: string;
  spellName: string;
}

export const QR_KNOWLEDGE_POINTS: KnowledgePoint[] = [
  { code: "QR-01", name: "Number Patterns & Sequences", description: "What comes next in a number pattern", spellName: "Pattern Sight" },
  { code: "QR-02", name: "Probability & Chance", description: "Likelihood of events", spellName: "Probability Magic" },
  { code: "QR-03", name: "Combinatorics & Counting", description: "How many ways to combine items", spellName: "Counting Charm" },
  { code: "QR-04", name: "Ratio & Proportion", description: "Scaling and relative amounts", spellName: "Scale Binding" },
  { code: "QR-05", name: "Fractions & Percentages", description: "Parts of a whole", spellName: "Fraction Weave" },
  { code: "QR-06", name: "Time & Rate", description: "Speed, time, and work rates", spellName: "Tempo Spell" },
  { code: "QR-07", name: "Logical Deduction with Numbers", description: "If A > B and B > C, then...", spellName: "Deduction Rune" },
  { code: "QR-08", name: "Data Interpretation — Tables", description: "Reading and comparing table data", spellName: "Table Reading" },
  { code: "QR-09", name: "Data Interpretation — Charts", description: "Bar, line, and pie chart reading", spellName: "Chart Sight" },
  { code: "QR-10", name: "Measurement & Spatial Reasoning", description: "Area, perimeter, volume reasoning", spellName: "Measure Craft" },
  { code: "QR-11", name: "Money & Economic Reasoning", description: "Change, best value, profit/loss", spellName: "Coin Logic" },
  { code: "QR-12", name: "Set Theory & Venn Diagrams", description: "Overlapping groups", spellName: "Circle Bind" },
  { code: "QR-13", name: "Logical Puzzles", description: "Knights & knaves, truth/lie deductions", spellName: "Truth Lens" },
  { code: "QR-14", name: "Symmetry & Transformation", description: "Reflect/rotate number grids", spellName: "Mirror Spell" },
  { code: "QR-15", name: "Multi-step Word Problems", description: "Combining 2–3 concepts in one scenario", spellName: "Chain Casting" },
  { code: "QR-16", name: "Science Reasoning", description: "Mass, forces, simple circuits — no formula recall", spellName: "Nature Sense" },
];

export const AR_KNOWLEDGE_POINTS: KnowledgePoint[] = [
  { code: "AR-01", name: "Shape Rotation", description: "Clockwise/anticlockwise rotation", spellName: "Turn Rune" },
  { code: "AR-02", name: "Shape Reflection", description: "Mirror reflection", spellName: "Mirror Glyph" },
  { code: "AR-03", name: "Fill Attribute Changes", description: "Solid → outline → striped", spellName: "Fill Shift" },
  { code: "AR-04", name: "Size Attribute Changes", description: "Big → small → big", spellName: "Scale Sight" },
  { code: "AR-05", name: "Element Count Changes", description: "1 → 2 → 3 shapes per cell", spellName: "Count Weave" },
  { code: "AR-06", name: "Position Changes", description: "Shape moves within cell grid", spellName: "Path Trace" },
  { code: "AR-07", name: "Combination Rules", description: "Cell = sum of two previous cells", spellName: "Merge Rune" },
  { code: "AR-08", name: "Odd-One-Out", description: "3 share a rule, 1 doesn't", spellName: "Outlier Eye" },
  { code: "AR-09", name: "Multi-Attribute Change", description: "Multiple attributes changing simultaneously", spellName: "Weave Sight" },
  { code: "AR-10", name: "Analogy", description: "A:B as C:?", spellName: "Parallel Rune" },
];

export const RC_KNOWLEDGE_POINTS: KnowledgePoint[] = [
  { code: "RC-01", name: "Main Idea / Author's Purpose", description: "What the text is mainly about", spellName: "Core Sight" },
  { code: "RC-02", name: "Explicit Information Retrieval", description: "Finding stated facts", spellName: "Recall Rune" },
  { code: "RC-03", name: "Inference & Implied Meaning", description: "Reading between the lines", spellName: "Inference Weave" },
  { code: "RC-04", name: "Vocabulary in Context", description: "Word meanings from context", spellName: "Word Bind" },
  { code: "RC-05", name: "Text Structure & Organisation", description: "How the text is arranged", spellName: "Structure Sight" },
  { code: "RC-06", name: "Table / Diagram / Chart Comprehension", description: "Reading non-text information", spellName: "Visual Rune" },
  { code: "RC-07", name: "Figurative Language & Tone", description: "Simile, metaphor, hyperbole, personification; mood and tone analysis", spellName: "Tone Weave" },
  { code: "RC-08", name: "Sequence & Chronology", description: "Ordering events, cause-effect chains, what happened first/next/because", spellName: "Time Thread" },
  { code: "RC-09", name: "Cartoon & Visual Literacy", description: "Symbolism, exaggeration, visual analogy, cartoonist perspective", spellName: "Symbol Eye" },
];

export const ALL_KNOWLEDGE_POINTS = [
  ...QR_KNOWLEDGE_POINTS,
  ...AR_KNOWLEDGE_POINTS,
  ...RC_KNOWLEDGE_POINTS,
];

// ─── Mastery ──────────────────────────────────────────────────────────────────

export type MasteryLevel = 1 | 2 | 3 | 4 | 5;

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  1: "🌱 Seedling",
  2: "🌿 Growing",
  3: "🌳 Developing",
  4: "⭐ Strong",
  5: "💎 Mastered",
};

export const MASTERY_THRESHOLDS: [number, MasteryLevel][] = [
  [0.9, 5],
  [0.75, 4],
  [0.55, 3],
  [0.3, 2],
  [0, 1],
];

// ─── Questions ────────────────────────────────────────────────────────────────

export interface MCQQuestion {
  questionText: string;
  context?: string;          // optional passage or scenario
  options: [string, string, string, string]; // exactly 4
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  knowledgePointCode: KnowledgePointCode;
  estimatedReadTimeMs: number;
  difficulty: "Apprentice" | "Journeyman" | "Archmage";
}

export interface ARQuestion {
  type: "sequence" | "pattern" | "odd_one_out" | "analogy";
  gridData: ARCell[][];
  questionText: string;
  options: ARCell[];         // 4 options for the answer
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  knowledgePointCode: KnowledgePointCode;
  estimatedReadTimeMs: number;
}

export interface ARCell {
  shape: "triangle" | "circle" | "square" | "pentagon" | "star" | "arrow" | "cross" | "empty";
  rotation: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  fill: "solid" | "outline" | "striped";
  size: "small" | "large";
  count?: number;            // for multi-element cells (AR-05)
  position?: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "C"; // compass position (AR-06)
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface QuestionState {
  question: MCQQuestion | ARQuestion;
  questionHash: string;
  userAnswer?: "A" | "B" | "C" | "D";
  firstChoice?: "A" | "B" | "C" | "D";
  startTimeMs?: number;
  timeSpentMs?: number;
  hintsUsed: number;
  flagged: boolean;
}

export type SessionDifficulty = "Apprentice" | "Journeyman" | "Archmage";
export type SessionLength = 5 | 10 | 15 | 35;
export type QuestDifficulty = SessionDifficulty;
export type QuestSessionStatus = "in_progress" | "completed" | "abandoned";

export interface QuestSessionSummary {
  id: number;
  profileId: number;
  region: Region | string;
  sessionLength: number;
  difficulty: QuestDifficulty;
  status: QuestSessionStatus;
  totalSparks: number;
  correctCount: number;
  questionCount: number;
  reflectionText?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface QuestAttemptReviewItem {
  id: number;
  questSessionId?: number | null;
  knowledgePointCode?: KnowledgePointCode | string | null;
  microSkillCode?: string | null;
  questionText: string;
  context?: string;
  passageTitle?: string | null;
  options: string[];
  userAnswer?: "A" | "B" | "C" | "D" | string | null;
  correctAnswer: "A" | "B" | "C" | "D" | string;
  isCorrect: boolean;
  explanation: string;
  hintsUsed: number;
  timeSpentMs?: number | null;
  minimumReadTimeMs?: number | null;
  attemptedAt: string;
}

export interface WeakPointSummary {
  code: KnowledgePointCode | string;
  label: string;
  masteryLevel: MasteryLevel;
  masteryScore?: number;
  recentWrongCount?: number;
  recommended: boolean;
}

export interface QuestReviewPayload {
  session: QuestSessionSummary;
  attempts: QuestAttemptReviewItem[];
  weakKnowledgePoints: WeakPointSummary[];
  recommendedNextFocus: WeakPointSummary[];
}

// ─── Sparks Economy ───────────────────────────────────────────────────────────

export const SPARKS = {
  MCQ_CORRECT_NO_HINT: 10,
  MCQ_CORRECT_WITH_HINT: 7,
  MCQ_CORRECT_AFTER_RETRY: 5,
  SPEED_BONUS: 2,
  REFLECTION_ANSWERED: 8,
  ORACLE_QUESTION: 5,
  RECOVERY_QUEST: 15,
  WRITING_MAX: 50,
  FIELD_JOURNAL_ANSWER: 5,
} as const;

// ─── Rank thresholds ─────────────────────────────────────────────────────────

export const RANK_THRESHOLDS: { rank: Rank; xpRequired: number }[] = [
  { rank: "Novice Scribe", xpRequired: 0 },
  { rank: "Rune Reader", xpRequired: 150 },
  { rank: "Arcane Solver", xpRequired: 450 },
  { rank: "Pattern Weaver", xpRequired: 900 },
  { rank: "Quill Adept", xpRequired: 1500 },
  { rank: "Archive Guardian", xpRequired: 2300 },
  { rank: "Spell Scholar", xpRequired: 3300 },
  { rank: "Astral Archivist", xpRequired: 4600 },
  { rank: "Grand Magus of the Quill", xpRequired: 6200 },
  { rank: "Eternal Luminary", xpRequired: 8200 },
];

// ─── Integrity ────────────────────────────────────────────────────────────────

export type IntegrityEventType =
  | "rapid_retry"
  | "fast_answer"
  | "hint_abuse"
  | "skip_reflection"
  | "impossible_score"
  | "repeated_wrong_after_hint";

export const INTEGRITY_WEIGHTS: Record<IntegrityEventType, number> = {
  fast_answer: 15,
  rapid_retry: 20,
  hint_abuse: 12,
  repeated_wrong_after_hint: 10,
  impossible_score: 8,
  skip_reflection: 5,
};

// ─── Shadow aura states ───────────────────────────────────────────────────────

export const AURA_THRESHOLDS: { min: number; state: AuraAlignment; label: string; description: string }[] = [
  { min: 80, state: "shadow_drift", label: "🌑 Shadow Drift", description: "The Quill senses deep instability in your magic…" },
  { min: 60, state: "shadow_creeping", label: "🌑 Shadow Creeping", description: "A shadow touches your aura…" },
  { min: 30, state: "unstable", label: "⚡ Unstable Magic", description: "The Quill senses some instability in your spellwork…" },
  { min: 0, state: "bright", label: "✨ Bright Aura", description: "" },
];
