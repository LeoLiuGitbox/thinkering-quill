import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/parent/[profileId] — update weeklyGoal for a profile */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const id = parseInt(profileId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { weeklyGoal } = body;

    if (typeof weeklyGoal !== "number" || weeklyGoal < 1 || weeklyGoal > 100) {
      return NextResponse.json(
        { error: "weeklyGoal must be a number between 1 and 100" },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: { weeklyGoal },
      select: { id: true, weeklyGoal: true },
    });

    return NextResponse.json({ ok: true, weeklyGoal: profile.weeklyGoal });
  } catch (error) {
    console.error("PATCH /api/parent/[profileId] error:", error);
    return NextResponse.json(
      { error: "Failed to update weekly goal" },
      { status: 500 }
    );
  }
}
