import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/parent — return all profiles with full stats for parent dashboard */
export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: "asc" },
      select: {
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
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: {
            eventType: true,
            severity: true,
            sourceSignal: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        dailyActivity: {
          orderBy: { activityDate: "desc" },
          take: 7,
          select: {
            activityDate: true,
            questCount: true,
            examCount: true,
            writingCount: true,
            sparksEarned: true,
          },
        },
      },
    });

    const result = profiles.map((profile) => {
      // Integrity report: flag events in last 7 days with severity >= 10
      const recentCutoff = sevenDaysAgo.toISOString();
      const recentIntegrityEvents = profile.integrityEvents.filter(
        (e) => e.createdAt.toISOString() >= recentCutoff && e.severity >= 10
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
        new Set(recentIntegrityEvents.map((e) => e.eventType))
      ).map((type) => eventTypeLabels[type] ?? type);

      let summary = "";
      if (hasPatterns) {
        summary =
          "Some patterns that may indicate quick guessing were detected. This is common and normal. Encourage your child to read each question fully before answering.";
      } else {
        summary =
          "Learning patterns look healthy — no shortcut behaviour detected.";
      }

      // Rename knowledgeMastery to knowledgeMasteries for the client contract
      const { knowledgeMastery, integrityEvents, ...rest } = profile;

      return {
        ...rest,
        knowledgeMasteries: knowledgeMastery,
        recentActivity: profile.dailyActivity,
        integrityReport: {
          hasPatterns,
          summary,
          details,
        },
      };
    });

    return NextResponse.json({ profiles: result });
  } catch (error) {
    console.error("GET /api/parent error:", error);
    return NextResponse.json(
      { error: "Failed to load parent dashboard" },
      { status: 500 }
    );
  }
}
