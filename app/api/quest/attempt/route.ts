import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMCQSparks } from "@/lib/rewards";
import { calculateMasteryScore, getMasteryLevel, getAttributeUpdate, EXPECTED_TIME_MS } from "@/lib/progression";
import { detectIntegritySignal, getMinimumReadTimeMs, getAuraAlignment } from "@/lib/integrity";
import { getRank } from "@/lib/progression";
import { KnowledgePointCode } from "@/types/game";
import { hashQuestion } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profileId,
      region,
      questionText,
      optionsJson,
      correctAnswer,
      userAnswer,
      firstChoice,
      knowledgePointCode,
      hintsUsed,
      timeSpentMs,
      minimumReadTimeMs,
      reflectionText,
      retryCount,
      consecutiveHintAbuseCount,
    } = body;

    if (!profileId || !region || !questionText || !correctAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isCorrect = userAnswer === correctAnswer;
    const firstChoiceCorrect = firstChoice === correctAnswer;
    const changedAnswer = firstChoice !== userAnswer;
    const shadowDrift = profile.shadowScore >= 80;

    const questionHash = hashQuestion(questionText, JSON.parse(optionsJson || "[]"));

    const sparksEarned = calculateMCQSparks({
      isCorrect,
      hintsUsed: hintsUsed || 0,
      timeSpentMs: timeSpentMs || 99999,
      isRetry: (retryCount || 0) > 0,
      shadowDrift,
    });

    // Save attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        profileId,
        region,
        knowledgePointCode,
        questionHash,
        questionText,
        optionsJson: optionsJson || "[]",
        correctAnswer,
        userAnswer: userAnswer || null,
        isCorrect,
        firstChoiceCorrect,
        changedAnswer,
        hintsUsed: hintsUsed || 0,
        sparksEarned,
        timeSpentMs: timeSpentMs || null,
        minimumReadTimeMs: minimumReadTimeMs || null,
        reflectionText: reflectionText || null,
      },
    });

    // Update profile XP and attributes
    const subject = region.includes("Logic") ? "QR" : region.includes("Patterns") ? "AR" : "RC";
    const expectedTimeMs = EXPECTED_TIME_MS[subject] || 60_000;
    const attrUpdate = isCorrect ? getAttributeUpdate(region) : {};

    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        totalXP: { increment: sparksEarned },
        rank: getRank(profile.totalXP + sparksEarned),
        ...attrUpdate,
      },
    });

    // Update subject stats
    await prisma.subjectStat.upsert({
      where: { profileId_region: { profileId, region } },
      update: {
        totalAttempts: { increment: 1 },
        correctAttempts: { increment: isCorrect ? 1 : 0 },
        totalSparks: { increment: sparksEarned },
        lastPracticed: new Date(),
      },
      create: {
        profileId,
        region,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
        totalSparks: sparksEarned,
        lastPracticed: new Date(),
      },
    });

    // Update mastery if knowledge point provided
    let masteryUpdate = null;
    if (knowledgePointCode) {
      const existing = await prisma.knowledgeMastery.findUnique({
        where: { profileId_knowledgePointCode: { profileId, knowledgePointCode } },
      });

      const totalAttempts = (existing?.totalAttempts || 0) + 1;
      const firstChoiceCorrectCount = (existing?.firstChoiceCorrect || 0) + (firstChoiceCorrect ? 1 : 0);
      const totalCorrect = (existing?.totalCorrect || 0) + (isCorrect ? 1 : 0);
      const avgHintsUsed = ((existing?.avgHintsUsed || 0) * (totalAttempts - 1) + (hintsUsed || 0)) / totalAttempts;
      const avgTimeMs = ((existing?.avgTimeMs || 0) * (totalAttempts - 1) + (timeSpentMs || expectedTimeMs)) / totalAttempts;

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
          region,
        },
        create: {
          profileId,
          region,
          knowledgePointCode,
          masteryScore,
          masteryLevel,
          totalAttempts: 1,
          firstChoiceCorrect: firstChoiceCorrect ? 1 : 0,
          totalCorrect: isCorrect ? 1 : 0,
          avgTimeMs: timeSpentMs || expectedTimeMs,
          avgHintsUsed: hintsUsed || 0,
          lastAttemptedAt: new Date(),
        },
      });
    }

    // Check for integrity signals
    const computedMinReadTime = minimumReadTimeMs || getMinimumReadTimeMs(questionText, "");
    const integritySignal = detectIntegritySignal({
      timeSpentMs: timeSpentMs || 99999,
      minimumReadTimeMs: computedMinReadTime,
      hintsUsed: hintsUsed || 0,
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
