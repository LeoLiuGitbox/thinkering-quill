import { NextRequest, NextResponse } from "next/server";
import { writeQuestLog, QuestLogQuestion } from "@/lib/challengeLog";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, profileName, subject, difficulty, systemPrompt, userPrompt, questions } = body as {
      profileId: number;
      profileName: string;
      subject: string;
      difficulty: string;
      systemPrompt: string;
      userPrompt: string;
      questions: QuestLogQuestion[];
    };

    if (!profileId || !subject || !questions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const logPath = writeQuestLog({
      profileId,
      profileName: profileName || `Profile ${profileId}`,
      subject,
      difficulty,
      systemPrompt: systemPrompt || "",
      userPrompt: userPrompt || "",
      questions,
    });

    return NextResponse.json({ logPath });
  } catch (error) {
    console.error("POST /api/quest/log error:", error);
    return NextResponse.json({ error: "Failed to write quest log" }, { status: 500 });
  }
}
