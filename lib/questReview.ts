import { prisma } from "@/lib/prisma";
import {
  ALL_KNOWLEDGE_POINTS,
  KnowledgePointCode,
  QuestReviewPayload,
  WeakPointSummary,
} from "@/types/game";

function getKnowledgePointLabel(code: string): string {
  return ALL_KNOWLEDGE_POINTS.find((kp) => kp.code === code)?.name ?? code;
}

export async function buildWeakPointSummary(
  profileId: number,
  region: string,
  questSessionId?: number
): Promise<WeakPointSummary[]> {
  const [masteries, recentWrongAttempts] = await Promise.all([
    prisma.knowledgeMastery.findMany({
      where: { profileId, region },
      orderBy: [{ masteryLevel: "asc" }, { masteryScore: "asc" }],
    }),
    questSessionId
      ? prisma.quizAttempt.findMany({
          where: { profileId, region, questSessionId, isCorrect: false, knowledgePointCode: { not: null } },
          select: { knowledgePointCode: true },
        })
      : Promise.resolve([]),
  ]);

  const wrongCounts = new Map<string, number>();
  for (const attempt of recentWrongAttempts) {
    const code = attempt.knowledgePointCode;
    if (!code) continue;
    wrongCounts.set(code, (wrongCounts.get(code) ?? 0) + 1);
  }

  const summaries = masteries.map((mastery) => ({
    code: mastery.knowledgePointCode as KnowledgePointCode,
    label: getKnowledgePointLabel(mastery.knowledgePointCode),
    masteryLevel: mastery.masteryLevel as 1 | 2 | 3 | 4 | 5,
    masteryScore: mastery.masteryScore,
    recentWrongCount: wrongCounts.get(mastery.knowledgePointCode) ?? 0,
    recommended: mastery.masteryLevel <= 2 || (wrongCounts.get(mastery.knowledgePointCode) ?? 0) > 0,
  }));

  summaries.sort((a, b) => {
    if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
    if ((b.recentWrongCount ?? 0) !== (a.recentWrongCount ?? 0)) {
      return (b.recentWrongCount ?? 0) - (a.recentWrongCount ?? 0);
    }
    return (a.masteryScore ?? 0) - (b.masteryScore ?? 0);
  });

  return summaries;
}

export async function buildQuestReviewPayload(questSessionId: number): Promise<QuestReviewPayload | null> {
  const session = await prisma.questSession.findUnique({
    where: { id: questSessionId },
    include: {
      attempts: {
        orderBy: { attemptedAt: "asc" },
      },
    },
  });

  if (!session) return null;

  const weakKnowledgePoints = await buildWeakPointSummary(session.profileId, session.region, session.id);
  const recommendedNextFocus = weakKnowledgePoints.filter((item) => item.recommended).slice(0, 3);

  return {
    session: {
      id: session.id,
      profileId: session.profileId,
      region: session.region,
      sessionLength: session.sessionLength,
      difficulty: session.difficulty as "Apprentice" | "Journeyman" | "Archmage",
      status: session.status as "in_progress" | "completed" | "abandoned",
      totalSparks: session.totalSparks,
      correctCount: session.correctCount,
      questionCount: session.questionCount,
      reflectionText: session.reflectionText,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
    },
    attempts: session.attempts.map((attempt) => ({
      id: attempt.id,
      questSessionId: attempt.questSessionId,
      knowledgePointCode: attempt.knowledgePointCode,
      microSkillCode: attempt.microSkillCode,
      questionText: attempt.questionText,
      context: attempt.contextText ?? undefined,
      passageTitle: attempt.passageTitle ?? undefined,
      options: JSON.parse(attempt.optionsJson || "[]"),
      userAnswer: attempt.userAnswer,
      correctAnswer: attempt.correctAnswer,
      isCorrect: attempt.isCorrect,
      explanation: attempt.explanationText ?? "",
      hintsUsed: attempt.hintsUsed,
      timeSpentMs: attempt.timeSpentMs,
      minimumReadTimeMs: attempt.minimumReadTimeMs,
      attemptedAt: attempt.attemptedAt.toISOString(),
    })),
    weakKnowledgePoints: weakKnowledgePoints.slice(0, 5),
    recommendedNextFocus,
  };
}
