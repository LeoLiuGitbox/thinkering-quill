import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMCQSparks } from "@/lib/rewards";
import { checkAndAwardBadges } from "@/lib/badges";
import {
  calculateMasteryScore,
  getMasteryLevel,
  getAttributeUpdate,
  EXPECTED_TIME_MS,
  getRank,
} from "@/lib/progression";
import { detectIntegritySignal, getMinimumReadTimeMs } from "@/lib/integrity";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      questSessionId,
      profileId,
      questQuestionId,
      questionIndex,
      questionHash,
      userAnswer,
      firstChoice,
      hintsUsed,
      timeSpentMs,
      retryCount,
      consecutiveHintAbuseCount,
    } = body as {
      questSessionId?: number;
      profileId?: number;
      questQuestionId?: number;
      questionIndex?: number;
      questionHash?: string;
      userAnswer?: string | null;
      firstChoice?: string | null;
      hintsUsed?: number;
      timeSpentMs?: number;
      retryCount?: number;
      consecutiveHintAbuseCount?: number;
    };

    if (!questSessionId || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [profile, questSession, questQuestion] = await Promise.all([
      prisma.profile.findUnique({ where: { id: profileId } }),
      prisma.questSession.findUnique({ where: { id: questSessionId } }),
      prisma.questQuestion.findFirst({
        where: {
          questSessionId,
          ...(questQuestionId
            ? { id: questQuestionId }
            : typeof questionIndex === "number"
              ? { questionIndex }
              : questionHash
                ? { questionHash }
                : { id: -1 }),
        },
      }),
    ]);

    if (!profile || !questSession || questSession.profileId !== profileId) {
      return NextResponse.json({ error: "Profile or quest session not found" }, { status: 404 });
    }
    if (!questQuestion) {
      return NextResponse.json({ error: "Quest question not found" }, { status: 404 });
    }

    const answer = typeof userAnswer === "string" && userAnswer.trim() ? userAnswer : null;
    const first = typeof firstChoice === "string" && firstChoice.trim() ? firstChoice : null;
    const isCorrect = answer === questQuestion.correctAnswer;
    const firstChoiceCorrect = first === questQuestion.correctAnswer;
    const changedAnswer = Boolean(first && answer && first !== answer);
    const shadowDrift = profile.shadowScore >= 80;
    const normalizedHintsUsed = Math.max(0, hintsUsed || 0);
    const normalizedTimeSpentMs = timeSpentMs || null;

    const sparksEarned = calculateMCQSparks({
      isCorrect,
      hintsUsed: normalizedHintsUsed,
      timeSpentMs: normalizedTimeSpentMs || 99999,
      isRetry: (retryCount || 0) > 0,
      shadowDrift,
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        profileId,
        questSessionId,
        region: questSession.region,
        knowledgePointCode: questQuestion.knowledgePointCode,
        microSkillCode: questQuestion.microSkillCode || null,
        questionHash: questQuestion.questionHash,
        questionText: questQuestion.questionText,
        passageTitle: questQuestion.passageTitle || null,
        contextText: questQuestion.contextText || null,
        optionsJson: questQuestion.optionsJson || "[]",
        correctAnswer: questQuestion.correctAnswer,
        explanationText: questQuestion.explanationText || null,
        userAnswer: answer,
        isCorrect,
        firstChoiceCorrect,
        changedAnswer,
        hintsUsed: normalizedHintsUsed,
        sparksEarned,
        timeSpentMs: normalizedTimeSpentMs,
        minimumReadTimeMs: questQuestion.minimumReadTimeMs || null,
      },
    });

    const subject = questSession.region.includes("Logic")
      ? "QR"
      : questSession.region.includes("Patterns")
        ? "AR"
        : "RC";
    const expectedTimeMs = EXPECTED_TIME_MS[subject] || 60_000;
    const attrUpdate = isCorrect ? getAttributeUpdate(questSession.region) : {};

    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        totalXP: { increment: sparksEarned },
        rank: getRank(profile.totalXP + sparksEarned),
        ...attrUpdate,
      },
    });

    await prisma.subjectStat.upsert({
      where: { profileId_region: { profileId, region: questSession.region } },
      update: {
        totalAttempts: { increment: 1 },
        correctAttempts: { increment: isCorrect ? 1 : 0 },
        totalSparks: { increment: sparksEarned },
        lastPracticed: new Date(),
      },
      create: {
        profileId,
        region: questSession.region,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
        totalSparks: sparksEarned,
        lastPracticed: new Date(),
      },
    });

    let masteryUpdate = null;
    if (questQuestion.knowledgePointCode) {
      const knowledgePointCode = questQuestion.knowledgePointCode;
      const existing = await prisma.knowledgeMastery.findUnique({
        where: { profileId_knowledgePointCode: { profileId, knowledgePointCode } },
      });

      const totalAttempts = (existing?.totalAttempts || 0) + 1;
      const firstChoiceCorrectCount = (existing?.firstChoiceCorrect || 0) + (firstChoiceCorrect ? 1 : 0);
      const totalCorrect = (existing?.totalCorrect || 0) + (isCorrect ? 1 : 0);
      const avgHintsUsed =
        ((existing?.avgHintsUsed || 0) * (totalAttempts - 1) + normalizedHintsUsed) / totalAttempts;
      const avgTimeMs =
        ((existing?.avgTimeMs || 0) * (totalAttempts - 1) + (normalizedTimeSpentMs || expectedTimeMs)) /
        totalAttempts;

      const masteryScore = calculateMasteryScore({
        firstChoiceCorrectCount,
        totalCorrectCount: totalCorrect,
        totalAttempts,
        avgTimeMs,
        expectedTimeMs,
        avgHintsUsed,
      });
      const masteryLevel = getMasteryLevel(masteryScore);

      masteryUpdate = await prisma.knowledgeMastery.upsert({
        where: { profileId_knowledgePointCode: { profileId, knowledgePointCode } },
        update: {
          masteryScore,
          masteryLevel,
          totalAttempts,
          firstChoiceCorrect: firstChoiceCorrectCount,
          totalCorrect,
          avgTimeMs,
          avgHintsUsed,
          lastAttemptedAt: new Date(),
          region: questSession.region,
        },
        create: {
          profileId,
          region: questSession.region,
          knowledgePointCode,
          masteryScore,
          masteryLevel,
          totalAttempts: 1,
          firstChoiceCorrect: firstChoiceCorrect ? 1 : 0,
          totalCorrect: isCorrect ? 1 : 0,
          avgTimeMs: normalizedTimeSpentMs || expectedTimeMs,
          avgHintsUsed: normalizedHintsUsed,
          lastAttemptedAt: new Date(),
        },
      });
    }

    checkAndAwardBadges(profileId, "quest").catch((err) =>
      console.error("Badge check failed:", err)
    );

    const computedMinReadTime =
      questQuestion.minimumReadTimeMs || getMinimumReadTimeMs(questQuestion.questionText, "");
    const integritySignal = detectIntegritySignal({
      timeSpentMs: normalizedTimeSpentMs || 99999,
      minimumReadTimeMs: computedMinReadTime,
      hintsUsed: normalizedHintsUsed,
      firstChoiceCorrect,
      finalAnswerCorrect: isCorrect,
      retryCount: retryCount || 0,
      consecutiveHintAbuseCount: consecutiveHintAbuseCount || 0,
    });

    return NextResponse.json({
      attempt,
      sparksEarned,
      isCorrect,
      firstChoiceCorrect,
      correctAnswer: questQuestion.correctAnswer,
      explanation: questQuestion.explanationText || "",
      newTotalXP: updatedProfile.totalXP,
      newRank: updatedProfile.rank,
      masteryUpdate,
      integritySignal,
    });
  } catch (error) {
    console.error("POST /api/quest/attempt error:", error);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
