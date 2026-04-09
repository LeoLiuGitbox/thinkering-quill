import { NextRequest } from "next/server";
import { stream } from "@/lib/gemini";
import { buildOracleSystemPrompt, buildOracleUserMessage } from "@/lib/prompts/oracle";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body as { question: string };

    if (!question || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const system = buildOracleSystemPrompt();
    const messages = [{ role: "user" as const, content: buildOracleUserMessage(question.trim()) }];

    // Stream via SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream(system, messages, 1024)) {
            const data = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
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
    console.error("POST /api/oracle error:", error);
    return new Response(JSON.stringify({ error: "Failed to start Oracle stream" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
