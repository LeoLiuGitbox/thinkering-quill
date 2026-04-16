import { NextResponse } from "next/server";
import { listChallengeLogs } from "@/lib/challengeLogBrowser";

export async function GET() {
  try {
    const logs = listChallengeLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/challenge-logs error:", error);
    return NextResponse.json({ error: "Failed to load challenge logs" }, { status: 500 });
  }
}
