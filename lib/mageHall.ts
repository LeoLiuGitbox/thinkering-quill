import { ASCENSION_RANKS, getAscensionMeta } from "@/lib/ascension";
import { KnowledgePointCode, Rank } from "@/types/game";

type MasteryLike = {
  knowledgePointCode: KnowledgePointCode | string;
  masteryLevel: number;
  masteryScore: number;
};

type QuestSessionLike = {
  id: number;
  region: string;
  totalSparks: number;
  correctCount: number;
  questionCount: number;
  completedAt: string | null;
};

type ProfileLike = {
  rank: Rank | string;
  totalXP: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  knowledgeMasteries?: MasteryLike[];
  questSessions?: QuestSessionLike[];
};

type ArtifactSummaryLike = {
  unlockedCount: number;
  equippedCount: number;
  totalCount: number;
};

export type HallSchoolSummary = {
  code: "logic" | "insight" | "focus" | "craft" | "wisdom";
  label: string;
  icon: string;
  colour: string;
  region: string;
  attributeValue: number;
  avgMastery: number;
  strongCount: number;
  masteredCount: number;
  hallStatus: "nascent" | "forming" | "anchored" | "exalted";
  story: string;
};

export type HallRequirementSummary = {
  key: string;
  label: string;
  current: number;
  target: number;
  met: boolean;
  suffix?: string;
};

export type MageHallState = {
  currentRank: ReturnType<typeof getAscensionMeta>;
  nextRank: ReturnType<typeof getAscensionMeta> | null;
  hallTierName: string;
  hallTierLore: string;
  riteTitle: string;
  riteSummary: string;
  completedQuestCount: number;
  averageAccuracy: number;
  strongSkillCount: number;
  masteredSkillCount: number;
  schoolSummaries: HallSchoolSummary[];
  requirementSummaries: HallRequirementSummary[];
  readiness: number;
  readyCount: number;
  recommendation: {
    title: string;
    summary: string;
    region: string;
    focusCodes: string[];
  } | null;
};

const SUBJECT_REGION: Record<string, string> = {
  QR: "Clocktower of Logic",
  AR: "Forest of Patterns",
  RC: "Lake of Reflection",
};

const HALL_TIER_BY_INDEX = [
  {
    name: "Outer Ring",
    lore: "New scribes learn the map of the Hall here. Every solved puzzle lights one more lantern in the corridor.",
  },
  {
    name: "Glyph Gallery",
    lore: "The Hall begins to remember you. Symbols, patterns, and passages no longer feel separate.",
  },
  {
    name: "Convergence Walk",
    lore: "Different schools of magic start to answer each other. The Hall looks for control, not just effort.",
  },
  {
    name: "Inner Sanctum",
    lore: "You are trusted with guarded knowledge. Advancement now depends on balance across the schools.",
  },
  {
    name: "Luminary Chamber",
    lore: "The Hall measures whether your magic is stable enough to guide others, not only yourself.",
  },
] as const;

const RITE_COPY = [
  {
    title: "First Seal Rite",
    summary: "Prove that your spark can hold shape. Early quests and your first strong skills matter most here.",
  },
  {
    title: "Runic Alignment",
    summary: "The Hall is looking for repeated control across regions, not one lucky streak.",
  },
  {
    title: "Pattern Binding",
    summary: "Advance by turning scattered strengths into a dependable practice loop.",
  },
  {
    title: "Archive Stewardship",
    summary: "The next ascension expects discipline, reviewed sessions, and relics earned with intent.",
  },
  {
    title: "Luminary Trial",
    summary: "Only balanced mastery across the five schools will open the last chamber.",
  },
] as const;

const SCHOOL_DEFS = [
  {
    code: "logic",
    label: "Logic",
    icon: "⚙️",
    colour: "#4A7BC4",
    region: "Clocktower of Logic",
    prefixes: ["QR"],
    attrKey: "attrLogic" as const,
    stories: [
      "The gears are still loose. More clean reasoning will steady this school.",
      "The school is forming. The learner can see rules, but not always hold them.",
      "The school is anchored. Multi-step logic is starting to feel deliberate.",
      "The school is exalted. Numerical reasoning now supports the rest of the Hall.",
    ],
  },
  {
    code: "insight",
    label: "Insight",
    icon: "🔮",
    colour: "#8A4AC4",
    region: "Forest of Patterns",
    prefixes: ["AR"],
    attrKey: "attrInsight" as const,
    stories: [
      "The forest is still misted. Pattern recognition needs more repetition.",
      "The canopy is opening. Changes are noticed more often, but not yet fast enough.",
      "The school is anchored. Transformations and analogies now arrive with confidence.",
      "The school is exalted. Visual reasoning has become one of the Hall's brightest threads.",
    ],
  },
  {
    code: "focus",
    label: "Focus",
    icon: "💧",
    colour: "#4A9EC4",
    region: "Lake of Reflection",
    prefixes: ["RC"],
    attrKey: "attrFocus" as const,
    stories: [
      "The lake is unsettled. Attention drifts before meaning fully lands.",
      "The surface is calming. Reading stamina is improving and details are sticking.",
      "The school is anchored. Inference and evidence are starting to work together.",
      "The school is exalted. The learner can hold tone, structure, and detail at once.",
    ],
  },
  {
    code: "craft",
    label: "Craft",
    icon: "✍️",
    colour: "#C47A4A",
    region: "Workshop of Runes",
    prefixes: ["WR", "CW"],
    attrKey: "attrCraft" as const,
    stories: [
      "The ink is waking slowly. Craft will rise through revision and guided writing.",
      "The workshop is active. Stronger control is appearing in openings and details.",
      "The school is anchored. Revision is becoming a deliberate spell rather than repair.",
      "The school is exalted. Writing now carries mood, clarity, and intent together.",
    ],
  },
  {
    code: "wisdom",
    label: "Wisdom",
    icon: "📖",
    colour: "#C4A44A",
    region: "Mage Hall",
    prefixes: [],
    attrKey: "attrWisdom" as const,
    stories: [
      "The Hall has not yet woven the schools together into wisdom.",
      "The learner is beginning to connect review, reflection, and next-step choices.",
      "The school is anchored. Practice choices are now more strategic and self-aware.",
      "The school is exalted. Reflection itself has become part of the magic.",
    ],
  },
] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getRankIndex(rank: string) {
  const index = ASCENSION_RANKS.findIndex((item) => item.rank === rank);
  return index >= 0 ? index : 0;
}

function getHallTier(index: number) {
  return HALL_TIER_BY_INDEX[Math.min(HALL_TIER_BY_INDEX.length - 1, Math.floor(index / 2))];
}

function getRiteCopy(index: number) {
  return RITE_COPY[Math.min(RITE_COPY.length - 1, Math.floor(index / 2))];
}

function getRequirementTargets(nextRankIndex: number) {
  return {
    strongSkills: Math.min(10, Math.max(2, 2 + nextRankIndex)),
    completedQuests: Math.max(3, 3 + nextRankIndex * 2),
    unlockedRelics: Math.max(1, 1 + Math.floor(nextRankIndex / 2)),
  };
}

function getSchoolStatus(avgMastery: number, strongCount: number) {
  if (avgMastery >= 4 || strongCount >= 5) return "exalted";
  if (avgMastery >= 3 || strongCount >= 3) return "anchored";
  if (avgMastery >= 2 || strongCount >= 1) return "forming";
  return "nascent";
}

function getSchoolStory(status: HallSchoolSummary["hallStatus"], stories: readonly string[]) {
  if (status === "exalted") return stories[3];
  if (status === "anchored") return stories[2];
  if (status === "forming") return stories[1];
  return stories[0];
}

export function buildMageHallState(profile: ProfileLike, artifactSummary?: ArtifactSummaryLike | null): MageHallState {
  const knowledgeMasteries = profile.knowledgeMasteries ?? [];
  const questSessions = profile.questSessions ?? [];
  const currentRank = getAscensionMeta((profile.rank as Rank) ?? "Novice Scribe");
  const currentRankIndex = getRankIndex(currentRank.rank);
  const nextRank = ASCENSION_RANKS[currentRankIndex + 1] ?? null;
  const tier = getHallTier(currentRankIndex);
  const rite = getRiteCopy(currentRankIndex);
  const completedQuestCount = questSessions.filter((item) => item.completedAt).length;
  const strongSkillCount = knowledgeMasteries.filter((item) => item.masteryLevel >= 4).length;
  const masteredSkillCount = knowledgeMasteries.filter((item) => item.masteryLevel >= 5).length;
  const averageAccuracy = questSessions.length > 0
    ? Math.round(
        questSessions.reduce((sum, item) => {
          const pct = item.questionCount > 0 ? item.correctCount / item.questionCount : 0;
          return sum + pct;
        }, 0) / questSessions.length * 100
      )
    : 0;

  const schoolSummaries: HallSchoolSummary[] = SCHOOL_DEFS.map((school) => {
    const schoolItems =
      school.code === "wisdom"
        ? knowledgeMasteries
        : knowledgeMasteries.filter((item) =>
            school.prefixes.some((prefix) => item.knowledgePointCode.startsWith(prefix))
          );
    const avgMastery = schoolItems.length > 0
      ? schoolItems.reduce((sum, item) => sum + item.masteryLevel, 0) / schoolItems.length
      : 0;
    const strongCount = schoolItems.filter((item) => item.masteryLevel >= 4).length;
    const masteredCount = schoolItems.filter((item) => item.masteryLevel >= 5).length;
    const hallStatus = getSchoolStatus(avgMastery, strongCount);

    return {
      code: school.code,
      label: school.label,
      icon: school.icon,
      colour: school.colour,
      region: school.region,
      attributeValue: profile[school.attrKey] ?? 0,
      avgMastery,
      strongCount,
      masteredCount,
      hallStatus,
      story: getSchoolStory(hallStatus, school.stories),
    };
  });

  const weaknessRanked = [...knowledgeMasteries].sort((a, b) => {
    if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
    return a.masteryScore - b.masteryScore;
  });
  const focusCodes = weaknessRanked.slice(0, 3).map((item) => String(item.knowledgePointCode));
  const firstWeakCode = focusCodes[0] ?? "";
  const recommendationRegion = SUBJECT_REGION[firstWeakCode.slice(0, 2)] ?? "Clocktower of Logic";

  const requirementTargets = nextRank
    ? getRequirementTargets(currentRankIndex + 1)
    : null;

  const requirementSummaries: HallRequirementSummary[] = nextRank
    ? [
        {
          key: "xp",
          label: "Knowledge sparks",
          current: profile.totalXP,
          target: nextRank.xpRequired,
          met: profile.totalXP >= nextRank.xpRequired,
          suffix: " XP",
        },
        {
          key: "strong",
          label: "Strong skills",
          current: strongSkillCount,
          target: requirementTargets?.strongSkills ?? strongSkillCount,
          met: strongSkillCount >= (requirementTargets?.strongSkills ?? strongSkillCount),
        },
        {
          key: "quests",
          label: "Completed quests",
          current: completedQuestCount,
          target: requirementTargets?.completedQuests ?? completedQuestCount,
          met: completedQuestCount >= (requirementTargets?.completedQuests ?? completedQuestCount),
        },
        {
          key: "relics",
          label: "Unsealed relics",
          current: artifactSummary?.unlockedCount ?? 0,
          target: requirementTargets?.unlockedRelics ?? (artifactSummary?.unlockedCount ?? 0),
          met: (artifactSummary?.unlockedCount ?? 0) >= (requirementTargets?.unlockedRelics ?? 0),
        },
      ]
    : [];

  const readyCount = requirementSummaries.filter((item) => item.met).length;
  const readiness = nextRank && requirementSummaries.length > 0
    ? clamp01(readyCount / requirementSummaries.length)
    : 1;

  return {
    currentRank,
    nextRank,
    hallTierName: tier.name,
    hallTierLore: tier.lore,
    riteTitle: rite.title,
    riteSummary: rite.summary,
    completedQuestCount,
    averageAccuracy,
    strongSkillCount,
    masteredSkillCount,
    schoolSummaries,
    requirementSummaries,
    readiness,
    readyCount,
    recommendation: focusCodes.length > 0
      ? {
          title: "Next Hall-sanctioned study path",
          summary: "The Hall is asking for one focused return to your weakest thread before the next rite.",
          region: recommendationRegion,
          focusCodes,
        }
      : null,
  };
}
