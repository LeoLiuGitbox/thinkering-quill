import { SPARKS } from "@/types/game";

export interface BadgeDefinition {
  key: string;
  name: string;
  school: string;
  loreText: string;
  tiers: {
    tier: "bronze" | "silver" | "gold";
    label: string;
    condition: string;
  }[];
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "pattern_prophet",
    name: "Pattern Prophet",
    school: "Insight",
    loreText: "The Forest of Patterns whispers its secrets to those who listen with their eyes.",
    tiers: [
      { tier: "bronze", label: "Pattern Prophet I", condition: "Earn 50✦ from Forest of Patterns" },
      { tier: "silver", label: "Pattern Prophet II", condition: "Earn 200✦ from Forest of Patterns" },
      { tier: "gold", label: "Pattern Prophet III", condition: "Earn 500✦ from Forest of Patterns" },
    ],
  },
  {
    key: "logic_keeper",
    name: "Logic Keeper",
    school: "Logic",
    loreText: "The gears of the Clocktower sing for those whose reasoning rings true.",
    tiers: [
      { tier: "bronze", label: "Logic Keeper I", condition: "Earn 50✦ from Clocktower of Logic" },
      { tier: "silver", label: "Logic Keeper II", condition: "Earn 200✦ from Clocktower of Logic" },
      { tier: "gold", label: "Logic Keeper III", condition: "Earn 500✦ from Clocktower of Logic" },
    ],
  },
  {
    key: "focus_bearer",
    name: "Focus Bearer",
    school: "Focus",
    loreText: "Still waters run deep. The Lake reveals itself only to the patient reader.",
    tiers: [
      { tier: "bronze", label: "Focus Bearer I", condition: "Earn 50✦ from Lake of Reflection" },
      { tier: "silver", label: "Focus Bearer II", condition: "Earn 200✦ from Lake of Reflection" },
      { tier: "gold", label: "Focus Bearer III", condition: "Earn 500✦ from Lake of Reflection" },
    ],
  },
  {
    key: "story_weaver",
    name: "Story Weaver",
    school: "Craft",
    loreText: "Words cast the most enduring spells. The Workshop remembers every tale.",
    tiers: [
      { tier: "bronze", label: "Story Weaver I", condition: "Complete 3 writing sessions" },
      { tier: "silver", label: "Story Weaver II", condition: "Complete 10 writing sessions" },
      { tier: "gold", label: "Story Weaver III", condition: "Complete 25 writing sessions" },
    ],
  },
  {
    key: "speed_caster",
    name: "Speed Caster",
    school: "",
    loreText: "Swift thought and certain aim — the mark of a true duelist.",
    tiers: [
      { tier: "bronze", label: "Speed Caster I", condition: "Answer 10 questions in under 45 seconds each" },
      { tier: "silver", label: "Speed Caster II", condition: "Answer 50 questions in under 45 seconds each" },
      { tier: "gold", label: "Speed Caster III", condition: "Answer 150 questions in under 45 seconds each" },
    ],
  },
  {
    key: "perfect_potion",
    name: "Perfect Potion",
    school: "",
    loreText: "Not one ingredient wrong. Not one step astray.",
    tiers: [
      { tier: "bronze", label: "Perfect Potion I", condition: "Complete 1 quiz with 100% accuracy" },
      { tier: "silver", label: "Perfect Potion II", condition: "Complete 5 quizzes with 100% accuracy" },
      { tier: "gold", label: "Perfect Potion III", condition: "Complete 15 quizzes with 100% accuracy" },
    ],
  },
  {
    key: "tournament_victor",
    name: "Tournament Victor",
    school: "",
    loreText: "The Tower of Ascension bows to those who climb it with honour.",
    tiers: [
      { tier: "bronze", label: "Tournament Victor I", condition: "Complete 1 exam" },
      { tier: "silver", label: "Tournament Victor II", condition: "Complete 5 exams" },
      { tier: "gold", label: "Tournament Victor III", condition: "Score 80%+ on 3 exams" },
    ],
  },
  {
    key: "archivists_promise",
    name: "Archivist's Promise",
    school: "Wisdom",
    loreText: "Every day at the Archive Hall. Every day, the Quill grows stronger.",
    tiers: [
      { tier: "bronze", label: "Archivist's Promise I", condition: "7-day streak" },
      { tier: "silver", label: "Archivist's Promise II", condition: "14-day streak" },
      { tier: "gold", label: "Archivist's Promise III", condition: "30-day streak" },
    ],
  },
  {
    key: "shadow_recovered",
    name: "Shadow Recovered",
    school: "Wisdom",
    loreText: "From shadow, light. From doubt, understanding.",
    tiers: [
      { tier: "bronze", label: "Shadow Recovered", condition: "Complete 1 recovery quest" },
    ],
  },
  {
    key: "first_honest_spell",
    name: "First Honest Spell",
    school: "Wisdom",
    loreText: "Your first unaided victory. The Quill remembers.",
    tiers: [
      { tier: "bronze", label: "First Honest Spell", condition: "First correct answer without hints" },
    ],
  },
];

/** Calculate sparks earned for an MCQ attempt */
export function calculateMCQSparks(params: {
  isCorrect: boolean;
  hintsUsed: number;
  timeSpentMs: number;
  isRetry: boolean;
  shadowDrift: boolean;
}): number {
  if (!params.isCorrect) return 0;

  let base: number;
  if (params.isRetry) {
    base = SPARKS.MCQ_CORRECT_AFTER_RETRY;
  } else if (params.hintsUsed > 0) {
    base = SPARKS.MCQ_CORRECT_WITH_HINT;
  } else {
    base = SPARKS.MCQ_CORRECT_NO_HINT;
  }

  // Speed bonus if answered in < 45s
  if (params.timeSpentMs < 45_000 && params.hintsUsed === 0) {
    base += SPARKS.SPEED_BONUS;
  }

  // Shadow Drift halves XP rewards
  if (params.shadowDrift) {
    base = Math.floor(base / 2);
  }

  return base;
}

/** Calculate writing sparks from score (1–5 per criterion, 7 criteria) */
export function calculateWritingSparks(scores: number[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round((avg / 5) * SPARKS.WRITING_MAX);
}
