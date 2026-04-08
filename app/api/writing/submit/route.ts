import { NextRequest } from "next/server";
import { stream } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import {
  buildWritingFeedbackSystemPrompt,
  buildWritingFeedbackUserPrompt,
} from "@/lib/prompts/writing";
import { calculateWritingSparks } from "@/lib/rewards";
import { getRank } from "@/lib/progression";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profileId,
      sessionId,
      imageDescription,
      imagePath,
      promptCue,
      writingText,
      writingType,
    } = body;

    if (!profileId || !imageDescription || !writingText) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const system = buildWritingFeedbackSystemPrompt();
    const userPrompt = buildWritingFeedbackUserPrompt({
      imageDescription,
      promptCue,
      writingText,
    });

    const messages = [{ role: "user" as const, content: userPrompt }];

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream(system, messages, 2048)) {
            fullResponse += chunk;
            const data = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Parse and save the writing session
          try {
            const cleaned = fullResponse
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            const feedback = JSON.parse(cleaned);

            const scores = Object.values(feedback.scores) as number[];
            const sparksEarned = calculateWritingSparks(scores);

            // Save to DB
            const profile = await prisma.profile.findUnique({ where: { id: profileId } });
            if (profile) {
              await prisma.writingSession.create({
                data: {
                  profileId,
                  imageDescription,
                  imagePath: imagePath || null,
                  writingType: writingType || "narrative",
                  promptCue: promptCue || "",
                  userResponse: writingText,
                  feedbackJson: JSON.stringify(feedback),
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
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, sparksEarned })}\n\n`)
            );
          } catch (parseErr) {
            console.error("Failed to parse feedback JSON:", parseErr);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/writing/submit error:", error);
    return new Response(JSON.stringify({ error: "Failed to process writing submission" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
