import { NextRequest, NextResponse } from "next/server";
import { buildQuestReviewPayload } from "@/lib/questReview";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questSessionId = parseInt(id, 10);

    if (Number.isNaN(questSessionId)) {
      return NextResponse.json({ error: "Invalid quest session ID" }, { status: 400 });
    }

    const review = await buildQuestReviewPayload(questSessionId);
    if (!review) {
      return NextResponse.json({ error: "Quest session not found" }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("GET /api/quest/session/[id] error:", error);
    return NextResponse.json({ error: "Failed to load quest review" }, { status: 500 });
  }
}
