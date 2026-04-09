import { NextRequest, NextResponse } from "next/server";
import { chat, parseJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import {
  buildWritingFullTaskCoachPrompt,
  buildWritingFullTaskUserPrompt,
} from "@/lib/prompts/writing";
import { calculateWritingFullTaskSparks } from "@/lib/rewards";
import { getRank } from "@/lib/progression";
import { makeWritingLogPath, appendWritingSubmission } from "@/lib/challengeLog";

type FullTaskFeedback = {
  strength: string;
  priorityIssue: string;
  revisionInstruction: string;
  modelExample?: string;
  rubricSummary?: {
    promptRelevance?: string;
    ideas?: string;
    organisation?: string;
    language?: string;
  };
  nextStep?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileId = Number(body.profileId);
    const sessionId = Number(body.sessionId);
    const writingText =
      typeof body.writingText === "string" ? body.writingText.trim() : "";
    const imageDescription =
      typeof body.imageDescription === "string" ? body.imageDescription.trim() : "";
    const imagePath =
      typeof body.imagePath === "string" ? body.imagePath : null;
    const promptCue =
      typeof body.promptCue === "string" ? body.promptCue.trim() : "";
    const writingType =
      typeof body.writingType === "string" ? body.writingType : "narrative";

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }

    if (!writingText) {
      return NextResponse.json({ error: "writingText is required" }, { status: 400 });
    }

    const existingSession = await prisma.writingSession.findUnique({
      where: { id: sessionId },
      select: { id: true, profileId: true, createdAt: true },
    });

    if (!existingSession || existingSession.profileId !== profileId) {
      return NextResponse.json({ error: "Writing session not found" }, { status: 404 });
    }

    const rawFeedback = await chat(
      buildWritingFullTaskCoachPrompt(),
      buildWritingFullTaskUserPrompt({
        imageDescription,
        promptCue,
        writingText,
        writingType,
      }),
      1400
    );

    const feedback = parseJSON<FullTaskFeedback>(rawFeedback);
    const wordCount = writingText.split(/\s+/).filter(Boolean).length;
    const sparksEarned = calculateWritingFullTaskSparks(wordCount);

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
        sessionMode: "full_task",
        promptText: promptCue,
        promptCue,
        imageDescription: imageDescription || null,
        imagePath,
        writingType,
        userResponse: writingText,
        draftV1: writingText,
        revisionInstruction: feedback.revisionInstruction,
        feedbackJson: JSON.stringify(feedback),
        feedbackSummaryJson: JSON.stringify(feedback),
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

    // Append writing + feedback to challenge log (fire-and-forget)
    try {
      const logPath = makeWritingLogPath(sessionId, existingSession.createdAt);
      appendWritingSubmission(logPath, {
        writingText,
        wordCount,
        feedback,
        sparksEarned,
        submittedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      });
    } catch (logErr) {
      console.error("[challengeLog] Failed to append writing submission:", logErr);
    }

    return NextResponse.json({
      feedback,
      sparksEarned,
    });
  } catch (error) {
    console.error("POST /api/writing/submit error:", error);
    return NextResponse.json(
      { error: "Failed to process full writing task" },
      { status: 500 }
    );
  }
}
