import { NextRequest, NextResponse } from "next/server";
import { chat, parseJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import {
  buildWritingSkillLessonPrompt,
  buildWritingSkillLessonUserPrompt,
} from "@/lib/prompts/writing";

type WritingMode = "micro_skill_drill" | "guided_writing";

type LessonPayload = {
  title: string;
  focus: string;
  teachingPoint: string;
  strongExample: string;
  weakExample: string;
  taskPrompt: string;
  revisionGoal: string;
  suggestedTimeMinutes: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileId = Number(body.profileId);
    const skillCode =
      typeof body.skillCode === "string" && body.skillCode.trim()
        ? body.skillCode.trim()
        : "show_not_tell";
    const mode: WritingMode =
      body.mode === "guided_writing" ? "guided_writing" : "micro_skill_drill";

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    const rawLesson = await chat(
      buildWritingSkillLessonPrompt(),
      buildWritingSkillLessonUserPrompt({ skillCode, mode }),
      1200
    );

    const lesson = parseJSON<LessonPayload>(rawLesson);

    const session = await prisma.writingSession.create({
      data: {
        profileId,
        sessionMode: mode,
        targetSkill: skillCode,
        promptText: lesson.taskPrompt,
        writingType: "coaching",
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      mode,
      skillCode,
      lesson,
    });
  } catch (error) {
    console.error("POST /api/writing/lesson error:", error);
    return NextResponse.json({ error: "Failed to create writing lesson" }, { status: 500 });
  }
}
