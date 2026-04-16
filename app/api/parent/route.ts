import { NextResponse } from "next/server";
import { getParentProfiles } from "@/lib/parentDashboard";

/** GET /api/parent — return all profiles with full stats for parent dashboard */
export async function GET() {
  try {
    const profiles = await getParentProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET /api/parent error:", error);
    return NextResponse.json(
      { error: "Failed to load parent dashboard" },
      { status: 500 }
    );
  }
}
