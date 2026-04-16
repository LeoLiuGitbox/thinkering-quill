import { NextResponse } from "next/server";
import { readChallengeLog } from "@/lib/challengeLogBrowser";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params;
    const content = readChallengeLog(fileName);

    if (!content) {
      return NextResponse.json({ error: "Challenge log not found" }, { status: 404 });
    }

    return NextResponse.json({ fileName, content });
  } catch (error) {
    console.error("GET /api/challenge-logs/[fileName] error:", error);
    return NextResponse.json({ error: "Failed to load challenge log" }, { status: 500 });
  }
}
