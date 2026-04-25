import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUnlockedArtifacts } from "@/lib/artifacts";
import { buildWritingProgressPayload } from "@/lib/writingProgress";

/** GET /api/profile/[id] — get a single profile with stats */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = parseInt(id);
  if (isNaN(profileId)) {
    return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
  }

  try {
    await syncUnlockedArtifacts(profileId);

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        badges: true,
        subjectStats: true,
        knowledgeMastery: true,
        questSessions: {
          where: { status: "completed" },
          orderBy: { completedAt: "desc" },
          take: 5,
          select: {
            id: true,
            region: true,
            totalSparks: true,
            correctCount: true,
            questionCount: true,
            completedAt: true,
          },
        },
        artifacts: { include: { artifact: true } },
        dailyActivity: { orderBy: { activityDate: "desc" }, take: 30 },
        fieldJournal: { orderBy: { discoveredAt: "desc" } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const writingPayload = await buildWritingProgressPayload(profileId);

    // Normalise relation names for client consistency
    const { knowledgeMastery, fieldJournal, ...rest } = profile;
    return NextResponse.json({
      profile: {
        ...rest,
        knowledgeMasteries: knowledgeMastery,
        fieldJournalEntries: fieldJournal,
        ...writingPayload,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/[id] error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

/** PATCH /api/profile/[id] — update profile (energy restore, goal, etc.) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = parseInt(id);
  if (isNaN(profileId)) {
    return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const allowedFields = ["weeklyGoal", "avatarColour", "mageName"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: updateData,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PATCH /api/profile/[id] error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
