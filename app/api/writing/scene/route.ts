import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/claude";
import { generateSceneImage } from "@/lib/openai";
import {
  buildWritingScenePrompt,
  buildWritingSceneUserPrompt,
} from "@/lib/prompts/writing";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousTopics } = body as { previousTopics?: string[] };

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

    return NextResponse.json({
      sessionId,
      description: description.trim(),
      imagePath,
      promptCue: promptCue.trim(),
    });
  } catch (error) {
    console.error("POST /api/writing/scene error:", error);
    return NextResponse.json({ error: "Failed to generate writing scene" }, { status: 500 });
  }
}
