import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuestReviewPayload } from "@/lib/questReview";
import { getRank } from "@/lib/progression";

const REFLECTION_SPARK_BONUS = 8;
const REFLECTION_WISDOM_BONUS = 1;

function activityDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questSessionId, profileId, reflectionText } = body as {
      questSessionId: number;
      profileId: number;
      reflectionText?: string;
    };

    if (!questSessionId || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const questSession = await prisma.questSession.findUnique({
      where: { id: questSessionId },
      include: {
        attempts: true,
      },
    });

    if (!questSession || questSession.profileId !== profileId) {
      return NextResponse.json({ error: "Quest session not found" }, { status: 404 });
    }

    const hasReflection = Boolean(reflectionText?.trim());
    const reflectionBonus = hasReflection ? REFLECTION_SPARK_BONUS : 0;
    const wisdomEarned = hasReflection ? REFLECTION_WISDOM_BONUS : 0;
    const totalSparks =
      questSession.attempts.reduce((sum, attempt) => sum + attempt.sparksEarned, 0) + reflectionBonus;
    const correctCount = questSession.attempts.filter((attempt) => attempt.isCorrect).length;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { totalXP: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.questSession.update({
        where: { id: questSessionId },
        data: {
          status: "completed",
          completedAt: new Date(),
          totalSparks,
          correctCount,
          questionCount: questSession.attempts.length,
          reflectionText: reflectionText?.trim() || null,
        },
      }),
      prisma.dailyActivity.upsert({
        where: {
          profileId_activityDate: {
            profileId,
            activityDate: activityDateKey(),
          },
        },
        update: {
          questCount: { increment: 1 },
          sparksEarned: { increment: totalSparks },
        },
        create: {
          profileId,
          activityDate: activityDateKey(),
          questCount: 1,
          sparksEarned: totalSparks,
        },
      }),
      ...(reflectionBonus > 0
        ? [
            prisma.profile.update({
              where: { id: profileId },
              data: {
                totalXP: { increment: reflectionBonus },
                rank: getRank(profile.totalXP + reflectionBonus),
                attrWisdom: { increment: wisdomEarned },
              },
            }),
          ]
        : []),
    ]);

    const review = await buildQuestReviewPayload(questSessionId);
    if (!review) {
      return NextResponse.json({ error: "Failed to build review payload" }, { status: 500 });
    }

    return NextResponse.json({
      summary: {
        totalSparks,
        correctCount,
        questionCount: questSession.attempts.length,
        reflectionBonus,
        wisdomEarned,
      },
      weakKnowledgePoints: review.weakKnowledgePoints,
      recommendedNextFocus: review.recommendedNextFocus,
      review,
    });
  } catch (error) {
    console.error("POST /api/quest/complete error:", error);
    return NextResponse.json({ error: "Failed to complete quest session" }, { status: 500 });
  }
}
