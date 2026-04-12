import { NextRequest, NextResponse } from "next/server";
import { chat, parseJSON } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import {
  buildWritingRevisionCoachPrompt,
  buildWritingRevisionUserPrompt,
} from "@/lib/prompts/writing";
import {
  calculateWritingDrillSparks,
  calculateWritingRevisionSparks,
} from "@/lib/rewards";
import { getRank } from "@/lib/progression";
import { checkAndAwardBadges } from "@/lib/badges";

type WritingMode = "micro_skill_drill" | "guided_writing";
type DraftStage = "draft_v1" | "draft_v2";

type WritingCoachingFeedback = {
  strength: string;
  priorityIssue: string;
  revisionInstruction: string;
  modelExample?: string;
  nextStep?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileId = Number(body.profileId);
    const sessionId = Number(body.sessionId);
    const draftText =
      typeof body.draftText === "string" ? body.draftText.trim() : "";
    const promptText =
      typeof body.promptText === "string" ? body.promptText : "";
    const skillCode =
      typeof body.skillCode === "string" && body.skillCode.trim()
        ? body.skillCode.trim()
        : "show_not_tell";
    const mode: WritingMode =
      body.mode === "guided_writing" ? "guided_writing" : "micro_skill_drill";
    const stage: DraftStage =
      body.stage === "draft_v2" ? "draft_v2" : "draft_v1";

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }

    if (!draftText) {
      return NextResponse.json({ error: "draftText is required" }, { status: 400 });
    }

    const existingSession = await prisma.writingSession.findUnique({
      where: { id: sessionId },
      select: { id: true, profileId: true, sparksEarned: true },
    });

    if (!existingSession || existingSession.profileId !== profileId) {
      return NextResponse.json({ error: "Writing session not found" }, { status: 404 });
    }

    if (stage === "draft_v1") {
      const rawFeedback = await chat(
        buildWritingRevisionCoachPrompt(),
        buildWritingRevisionUserPrompt({
          skillCode,
          mode,
          promptText,
          draftText,
        }),
        1000
      );

      const feedback = parseJSON<WritingCoachingFeedback>(rawFeedback);

      await prisma.writingSession.update({
        where: { id: sessionId },
        data: {
          sessionMode: mode,
          targetSkill: skillCode,
          promptText,
          draftV1: draftText,
          revisionInstruction: feedback.revisionInstruction,
          feedbackSummaryJson: JSON.stringify(feedback),
        },
      });

      return NextResponse.json({ feedback, completed: false });
    }

    const sparksEarned =
      calculateWritingDrillSparks() +
      calculateWritingRevisionSparks() +
      (mode === "guided_writing" ? 6 : 0);

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { totalXP: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        sessionMode: mode,
        targetSkill: skillCode,
        promptText,
        draftV2: draftText,
        sparksEarned,
      },
    });

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        totalXP: { increment: sparksEarned },
        rank: getRank(profile.totalXP + sparksEarned),
        attrCraft: { increment: 1 },
      },
    });

    // Award badges — fire-and-forget
    checkAndAwardBadges(profileId, "writing").catch((err) =>
      console.error("Badge check failed:", err)
    );

    return NextResponse.json({
      completed: true,
      sparksEarned,
      completionMessage:
        mode === "guided_writing"
          ? "Your revision strengthened the piece. Keep this clarity when you build longer compositions."
          : "You revised with purpose. That is exactly how writing skill grows.",
    });
  } catch (error) {
    console.error("POST /api/writing/exercise error:", error);
    return NextResponse.json({ error: "Failed to process writing exercise" }, { status: 500 });
  }
}
