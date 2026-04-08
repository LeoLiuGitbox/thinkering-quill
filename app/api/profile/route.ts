import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRank } from "@/lib/progression";

/** GET /api/profile — list all profiles */
export async function GET() {
  try {
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
        quillEnergy: true,
        attrLogic: true,
        attrInsight: true,
        attrFocus: true,
        attrCraft: true,
        attrWisdom: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}

/** POST /api/profile — create a new profile */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mageName, avatarColour } = body;

    if (!mageName || typeof mageName !== "string" || mageName.trim().length === 0) {
      return NextResponse.json({ error: "mageName is required" }, { status: 400 });
    }

    const profile = await prisma.profile.create({
      data: {
        mageName: mageName.trim(),
        avatarColour: avatarColour || "#B68A3A",
        rank: "Novice Scribe",
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
