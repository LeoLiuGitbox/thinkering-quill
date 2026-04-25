export const WRITING_SKILL_LABELS = {
  show_not_tell: "Show, Not Tell",
  opening_hook: "Opening Hook",
  paragraph_expansion: "Paragraph Expansion",
  sensory_detail: "Sensory Detail",
  sentence_variety: "Sentence Variety",
  prompt_interpretation: "Prompt Interpretation",
  word_choice: "Word Choice",
  dialogue: "Dialogue",
  idea_generation: "Fresh Ideas",
  voice_and_tone: "Voice & Tone",
  narrative_structure: "Narrative Structure",
  main_event: "Main Event",
  persuasive_structure: "Persuasive Writing",
  teel_framework: "TEEL Paragraph",
  argument_dimensions: "3-Dimension Arguments",
  counter_argument: "Counter-Argument",
  writing_time_plan: "Time Management",
  prompt_analysis: "Prompt Analysis",
} as const;

export type WritingSkillCode = keyof typeof WRITING_SKILL_LABELS;

export const WRITING_LEVEL_LABELS = {
  1: "Seedling",
  2: "Growing",
  3: "Developing",
  4: "Strong",
  5: "Ready to Transfer",
} as const;

export type WritingLevel = keyof typeof WRITING_LEVEL_LABELS;

export type WritingMode = "micro_skill_drill" | "guided_writing" | "full_task";

export const WRITING_COACH_SIGNALS = [
  "prompt_control",
  "detail",
  "structure",
  "show_not_tell",
  "revision_followthrough",
  "language_control",
  "idea_selection",
] as const;

export type WritingCoachSignal = typeof WRITING_COACH_SIGNALS[number];

export type WritingProgressDelta = {
  skillCode: string;
  previousLevel: number;
  newLevel: number;
  reason: string;
};

export type WritingProgressSnapshot = {
  skillCode: string;
  skillLabel: string;
  currentLevel: number;
  levelLabel: string;
  totalSessions: number;
  revisionCompletions: number;
  guidedSessions: number;
  fullTaskCompletions: number;
  lastPracticedAt: string | null;
  lastImprovedAt: string | null;
  recentStrengthNote: string | null;
  recentFocusNote: string | null;
};

export type RecentWritingSession = {
  id: number;
  sessionMode: WritingMode;
  status: string;
  targetSkill: string | null;
  targetSkillLabel: string | null;
  promptText: string | null;
  promptCue: string | null;
  writingType: string;
  revisionCompleted: boolean;
  draft1WordCount: number | null;
  draft2WordCount: number | null;
  coachSignals: WritingCoachSignal[];
  progressDeltas: WritingProgressDelta[];
  feedbackSummary: {
    strength?: string;
    priorityIssue?: string;
    revisionInstruction?: string;
    quotedOriginalSnippet?: string;
    revisedSnippet?: string;
    nextStep?: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
};

export type WritingProgressSummary = {
  thisWeekSessions: number;
  thisWeekRevisionCompletions: number;
  revisionRate: number;
  revisionStreak: number;
  revisedOfRecent: {
    revised: number;
    total: number;
  };
  topGrowingSkills: WritingProgressSnapshot[];
  currentFocusSkill: WritingProgressSnapshot | null;
  recentImprovement: {
    skillLabel: string;
    originalSnippet: string;
    revisedSnippet: string;
    completedAt: string | null;
  } | null;
  nextRecommendation: {
    mode: WritingMode;
    skillCode: string | null;
    skillLabel: string | null;
    reason: string;
  };
};

export type WritingReport = {
  summaryText: string;
  sessionsByMode14d: Record<WritingMode, number>;
  sessionsByMode30d: Record<WritingMode, number>;
  revisionRate: number;
  strongestSkills: WritingProgressSnapshot[];
  supportSkills: WritingProgressSnapshot[];
  recentFullTasks: Array<{
    id: number;
    promptCue: string | null;
    writingType: string;
    completedAt: string | null;
  }>;
  latestCoachingPattern: {
    strength: string | null;
    focus: string | null;
  };
};

export function getWritingSkillLabel(skillCode: string | null | undefined) {
  if (!skillCode) return null;
  return WRITING_SKILL_LABELS[skillCode as WritingSkillCode] ?? skillCode;
}

export function getWritingLevelLabel(level: number) {
  return WRITING_LEVEL_LABELS[level as WritingLevel] ?? WRITING_LEVEL_LABELS[1];
}
