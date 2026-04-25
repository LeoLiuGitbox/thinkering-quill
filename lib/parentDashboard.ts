import { prisma } from "@/lib/prisma";
import { buildParentWritingReport } from "@/lib/writingProgress";

const PARENT_PROFILE_SELECT = {
  id: true,
  mageName: true,
  avatarColour: true,
  totalXP: true,
  rank: true,
  auraAlignment: true,
  shadowScore: true,
  weeklyGoal: true,
  attrLogic: true,
  attrInsight: true,
  attrFocus: true,
  attrCraft: true,
  attrWisdom: true,
  badges: {
    select: {
      badgeKey: true,
      tier: true,
      earnedAt: true,
    },
  },
  subjectStats: {
    select: {
      region: true,
      totalAttempts: true,
      correctAttempts: true,
      totalSparks: true,
      bestStreak: true,
      lastPracticed: true,
    },
  },
  knowledgeMastery: {
    select: {
      knowledgePointCode: true,
      masteryLevel: true,
      totalAttempts: true,
      firstChoiceCorrect: true,
    },
  },
  integrityEvents: {
    select: {
      eventType: true,
      severity: true,
      sourceSignal: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  dailyActivity: {
    orderBy: { activityDate: "desc" as const },
    take: 7,
    select: {
      activityDate: true,
      questCount: true,
      examCount: true,
      writingCount: true,
      sparksEarned: true,
    },
  },
} as const;

function mapParentProfile(profile: any) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCutoff = sevenDaysAgo.toISOString();
  const recentIntegrityEvents = profile.integrityEvents.filter(
    (event: any) => event.createdAt.toISOString() >= recentCutoff && event.severity >= 10
  );

  const hasPatterns = recentIntegrityEvents.length > 0;

  const eventTypeLabels: Record<string, string> = {
    rapid_retry: "Repeated rapid retries on questions",
    fast_answer: "Answers submitted faster than minimum reading time",
    hint_abuse: "Excessive hint usage before attempting",
    skip_reflection: "Reflection steps skipped",
    impossible_score: "Score pattern inconsistent with session length",
  };

  const details = Array.from(
    new Set<string>(recentIntegrityEvents.map((event: any) => String(event.eventType)))
  ).map((type) => eventTypeLabels[type] ?? type);

  const summary = hasPatterns
    ? "Some patterns that may indicate quick guessing were detected. This is common and normal. Encourage your child to read each question fully before answering."
    : "Learning patterns look healthy — no shortcut behaviour detected.";

  const { knowledgeMastery, integrityEvents, dailyActivity, ...rest } = profile;

  return {
    ...rest,
    knowledgeMasteries: knowledgeMastery,
    recentActivity: dailyActivity,
    integrityReport: {
      hasPatterns,
      summary,
      details,
    },
  };
}

export async function getParentProfiles() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      ...PARENT_PROFILE_SELECT,
      integrityEvents: {
        ...PARENT_PROFILE_SELECT.integrityEvents,
        where: { createdAt: { gte: thirtyDaysAgo } },
      },
    },
  });

  return profiles.map(mapParentProfile);
}

export async function getParentProfile(profileId: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      ...PARENT_PROFILE_SELECT,
      integrityEvents: {
        ...PARENT_PROFILE_SELECT.integrityEvents,
        where: { createdAt: { gte: thirtyDaysAgo } },
      },
    },
  });

  if (!profile) return null;
  const writingPayload = await buildParentWritingReport(profileId);
  return {
    ...mapParentProfile(profile),
    ...writingPayload,
  };
}
