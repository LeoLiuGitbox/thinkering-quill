import { NextRequest, NextResponse } from "next/server";
import { appendQuestAnswers, QuestLogAnswer } from "@/lib/challengeLog";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logPath, answers, totalSparks, correctCount, reflection } = body as {
      logPath: string;
      answers: QuestLogAnswer[];
      totalSparks: number;
      correctCount: number;
      reflection?: string;
    };

    if (!logPath || !answers) {
      return NextResponse.json({ error: "Missing logPath or answers" }, { status: 400 });
    }

    appendQuestAnswers(logPath, {
      answers,
      totalSparks,
      correctCount,
      reflection,
      submittedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/quest/log/finalize error:", error);
    return NextResponse.json({ error: "Failed to finalize quest log" }, { status: 500 });
  }
}
