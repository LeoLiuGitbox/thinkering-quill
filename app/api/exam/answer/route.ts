import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sectionIndex, questionIndex, answer } = body as {
      sessionId: number;
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
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = answer === question.correctAnswer;

    await prisma.examQuestion.update({
      where: { id: question.id },
      data: {
        userAnswer: answer,
        isCorrect,
      },
    });

    return NextResponse.json({ ok: true, isCorrect });
  } catch (error) {
    console.error("POST /api/exam/answer error:", error);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}
