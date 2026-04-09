import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";
import { generateSceneImage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  buildWritingScenePrompt,
  buildWritingSceneUserPrompt,
} from "@/lib/prompts/writing";
import { writeWritingLog } from "@/lib/challengeLog";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousTopics, profileId, mode } = body as {
      previousTopics?: string[];
      profileId?: number;
      mode?: string;
    };

    if (!profileId || !Number.isInteger(Number(profileId))) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    if (mode && mode !== "full_task") {
      return NextResponse.json(
        { error: "Scene generation is only available for full_task sessions" },
        { status: 400 }
      );
    }

    // Generate scene description via Claude
    const description = await chat(
      buildWritingScenePrompt(),
      buildWritingSceneUserPrompt(previousTopics),
      512
    );

    // Generate image via DALL-E 3
    const sessionId = randomUUID();
    const imagePath = await generateSceneImage(description.trim(), sessionId);

    // Generate a one-line written prompt cue
    const promptCue = await chat(
      "You are a creative writing prompt designer for 10-year-olds. Given an image description, write a single evocative line (10-15 words max) that could appear alongside the image as a writing prompt. Do not tell them what to write — just hint at the scene. Output only the prompt line, no quotes.",
      `Image: ${description.trim()}`
    );

    const session = await prisma.writingSession.create({
      data: {
        profileId: Number(profileId),
        sessionMode: "full_task",
        promptText: promptCue.trim(),
        promptCue: promptCue.trim(),
        imageDescription: description.trim(),
        imagePath,
        writingType: "narrative",
      },
    });

    // Get profile name for log
    const profileRecord = await prisma.profile.findUnique({
      where: { id: Number(profileId) },
      select: { mageName: true },
    });

    // Write Phase 1 writing log (fire-and-forget)
    const sceneSystemPrompt = buildWritingScenePrompt();
    const sceneUserPrompt = buildWritingSceneUserPrompt(previousTopics);
    const logPath = writeWritingLog({
      sessionId: session.id,
      createdAt: session.createdAt,
      profileId: Number(profileId),
      profileName: profileRecord?.mageName || `Profile ${profileId}`,
      imageDescription: description.trim(),
      imagePath,
      promptCue: promptCue.trim(),
      sceneSystemPrompt,
      sceneUserPrompt,
    });

    return NextResponse.json({
      sessionId: session.id,
      description: description.trim(),
      imagePath,
      promptCue: promptCue.trim(),
      writingType: "narrative",
      logPath,
    });
  } catch (error) {
    console.error("POST /api/writing/scene error:", error);
    return NextResponse.json({ error: "Failed to generate writing scene" }, { status: 500 });
  }
}
