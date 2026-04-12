import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sectionIndex } = body as {
      sessionId: number;
      sectionIndex: number;
    };

    if (sessionId === undefined || sectionIndex === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch all questions for this session
    const allQuestions = await prisma.examQuestion.findMany({
      where: { sessionId },
      orderBy: { questionIndex: "asc" },
    });

    // Filter questions belonging to this section (difficulty field: "section:N")
    const sectionQuestions = allQuestions.filter((q) => {
      const match = q.difficulty?.match(/^section:(\d+)/);
      return match ? parseInt(match[1]) === sectionIndex : false;
    });

    if (sectionQuestions.length === 0) {
      return NextResponse.json({ error: "No questions found for this section" }, { status: 404 });
    }

    // Calculate score
    const total = sectionQuestions.length;
    const correct = sectionQuestions.filter((q) => q.isCorrect === true).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Determine if all sections are now done
    // Group all questions by section to check completion
    const sectionIndices = new Set<number>();
    for (const q of allQuestions) {
      const match = q.difficulty?.match(/^section:(\d+)/);
      if (match) sectionIndices.add(parseInt(match[1]));
    }

    // A section is "done" if all its questions have a userAnswer
    const sectionsComplete = Array.from(sectionIndices).every((idx) => {
      const qs = allQuestions.filter((q) => {
        const m = q.difficulty?.match(/^section:(\d+)/);
        return m ? parseInt(m[1]) === idx : false;
      });
      // The current section being submitted counts as complete even if answers
      // aren't all filled (some may be skipped). The section we just submitted
      // is considered complete by definition.
      if (idx === sectionIndex) return true;
      return qs.every((q) => q.userAnswer !== null);
    });

    let completed = false;
    if (sectionsComplete) {
      // Mark session as completed
      const totalAllQuestions = allQuestions.length;
      const totalAllCorrect = allQuestions.filter((q) => q.isCorrect === true).length;
      const percentage = totalAllQuestions > 0
        ? (totalAllCorrect / totalAllQuestions) * 100
        : 0;

      const examSession = await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: "completed",
          completedAt: new Date(),
          percentage,
          totalSparks: totalAllCorrect * 10,
          maxSparks: totalAllQuestions * 10,
        },
        select: { profileId: true },
      });
      completed = true;

      // Award badges — fire-and-forget (don't block response)
      checkAndAwardBadges(examSession.profileId, "exam").catch((err) =>
        console.error("Badge check failed:", err)
      );
    }

    return NextResponse.json({
      score,
      total,
      correct,
      sectionIndex,
      completed,
    });
  } catch (error) {
    console.error("POST /api/exam/submit error:", error);
    return NextResponse.json({ error: "Failed to submit section" }, { status: 500 });
  }
}
