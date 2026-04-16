import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArtifactCatalogForProfile, syncUnlockedArtifacts } from "@/lib/artifacts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const id = parseInt(profileId, 10);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
  }

  try {
    await syncUnlockedArtifacts(id);

    const profile = await prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        mageName: true,
        avatarColour: true,
        totalXP: true,
        rank: true,
        auraAlignment: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const artifacts = await getArtifactCatalogForProfile(id);

    return NextResponse.json({
      profile,
      artifacts,
      summary: {
        unlockedCount: artifacts.filter((item) => item.isUnlocked).length,
        equippedCount: artifacts.filter((item) => item.equipped).length,
        totalCount: artifacts.length,
      },
    });
  } catch (error) {
    console.error("GET /api/vault/[profileId] error:", error);
    return NextResponse.json({ error: "Failed to load vault" }, { status: 500 });
  }
}
