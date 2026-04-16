import { NextResponse } from "next/server";
import { getParentProfile } from "@/lib/parentDashboard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const parsedId = Number(profileId);

    if (!Number.isFinite(parsedId)) {
      return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
    }

    const profile = await getParentProfile(parsedId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/parent/report/[profileId] error:", error);
    return NextResponse.json(
      { error: "Failed to load parent report" },
      { status: 500 }
    );
  }
}
