import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuraAlignment } from "@/lib/integrity";
import { IntegrityEventType } from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, action, eventType, severity, sourceSignal } = body as {
      profileId: number;
      action?: string;
      eventType?: IntegrityEventType;
      severity?: number;
      sourceSignal?: string;
    };

    if (!profileId) {
      return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
    }

    // Recovery action — reduce shadow score by 20 per recovery session
    if (action === "recovery_complete") {
      const profile = await prisma.profile.findUnique({ where: { id: profileId } });
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

      const newScore = Math.max(0, profile.shadowScore - 20);
      const newAura = getAuraAlignment(newScore);

      await prisma.profile.update({
        where: { id: profileId },
        data: {
          shadowScore: newScore,
          auraAlignment: newAura,
          totalXP: { increment: 15 }, // +15 ✦ for completing recovery
          attrWisdom: { increment: 2 },
        },
      });

      // Mark any pending integrity events as resolving
      await prisma.integrityEvent.updateMany({
        where: { profileId, recoveryStatus: "pending" },
        data: { recoveryStatus: "recovering" },
      });

      return NextResponse.json({ newShadowScore: newScore, newAura, sparksEarned: 15 });
    }

    // Standard integrity event logging
    if (!eventType || severity === undefined || severity === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Log the integrity event
    await prisma.integrityEvent.create({
      data: {
        profileId,
        eventType,
        severity,
        sourceSignal: sourceSignal ?? eventType,
      },
    });

    // Update shadow score on profile
    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        shadowScore: {
          increment: severity,
        },
      },
    });

    // Cap shadow score at 100
    const cappedScore = Math.min(profile.shadowScore, 100);
    const newAura = getAuraAlignment(cappedScore);

    if (cappedScore !== profile.shadowScore || newAura !== profile.auraAlignment) {
      await prisma.profile.update({
        where: { id: profileId },
        data: {
          shadowScore: cappedScore,
          auraAlignment: newAura,
        },
      });
    }

    return NextResponse.json({
      newShadowScore: cappedScore,
      newAura,
      auraChanged: newAura !== profile.auraAlignment,
    });
  } catch (error) {
    console.error("POST /api/integrity error:", error);
    return NextResponse.json({ error: "Failed to log integrity event" }, { status: 500 });
  }
}
