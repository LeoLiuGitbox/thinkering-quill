import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, profileId, sectionIndex, questionIndex, answer } = body as {
      sessionId: number;
      profileId?: number;
      sectionIndex: number;
      questionIndex: number;
      answer: string;
    };

    if (sessionId === undefined || questionIndex === undefined || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the ExamQuestion by sessionId and questionIndex
    const question = await prisma.examQuestion.findFirst({
      where: {
        sessionId,
        questionIndex,
      },
      include: {
        session: {
          select: { profileId: true, status: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    if (profileId && question.session.profileId !== profileId) {
      return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
    }
    if (question.session.status === "completed") {
      return NextResponse.json({ error: "Exam session is already completed" }, { status: 409 });
    }

    const isCorrect = answer === question.correctAnswer;

    await prisma.examQuestion.update({
      where: { id: question.id },
      data: {
        userAnswer: answer,
        isCorrect,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/exam/answer error:", error);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}
