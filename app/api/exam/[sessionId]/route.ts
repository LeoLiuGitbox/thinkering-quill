import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const id = parseInt(sessionId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const session = await prisma.examSession.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { questionIndex: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Parse sectionIndex from difficulty field ("section:0", "section:1", etc.)
    // Group questions into sections
    const sectionMap = new Map<
      number,
      {
        sectionIndex: number;
        subject: string;
        timeMinutes: number;
        questions: typeof session.questions;
      }
    >();

    for (const q of session.questions) {
      // difficulty format: "section:0"
      const match = q.difficulty?.match(/^section:(\d+)/);
      const sectionIndex = match ? parseInt(match[1]) : 0;

      // Extract subject from topic: "section_0_QR_..." → subject code
      // topic format: "section_0_Quantitative Reasoning_1" or "section_0_QR_1"
      const topicParts = q.topic?.split("_") || [];
      // Derive a display name from the topic
      let subject = "Unknown";
      if (topicParts.length >= 3) {
        // "section", "0", "Quantitative", "Reasoning", ...
        // The subject might be in index 2 onwards
        subject = topicParts.slice(2).join("_").replace(/_\d+$/, "");
      }

      if (!sectionMap.has(sectionIndex)) {
        sectionMap.set(sectionIndex, {
          sectionIndex,
          subject,
          timeMinutes: 0,
          questions: [],
        });
      }
      sectionMap.get(sectionIndex)!.questions.push(q);
    }

    // We need timeMinutes per section. Reconstruct from durationMinutes proportionally,
    // or store it. Since we don't store it separately, re-derive from section count.
    // As a pragmatic solution, assign timeMinutes based on section subject name.
    const SUBJECT_TIME: Record<string, number> = {
      "Quantitative Reasoning": 35,
      "Abstract Reasoning": 20,
      "Reading Comprehension": 35,
      "Creative Writing": 25,
    };

    const sections = Array.from(sectionMap.values())
      .sort((a, b) => a.sectionIndex - b.sectionIndex)
      .map((section) => {
        // Best-effort: check topic for known subject patterns
        const topicStr = section.questions[0]?.topic || "";
        let resolvedSubject = section.subject;

        if (topicStr.includes("QR") || topicStr.toLowerCase().includes("quantitative")) {
          resolvedSubject = "Quantitative Reasoning";
        } else if (topicStr.includes("AR") || topicStr.toLowerCase().includes("abstract")) {
          resolvedSubject = "Abstract Reasoning";
        } else if (topicStr.includes("RC") || topicStr.toLowerCase().includes("reading") || topicStr.toLowerCase().includes("comprehension")) {
          resolvedSubject = "Reading Comprehension";
        } else if (topicStr.includes("CW") || topicStr.toLowerCase().includes("writing")) {
          resolvedSubject = "Creative Writing";
        }

        const timeMinutes = SUBJECT_TIME[resolvedSubject] ?? 30;
        const completedAt = session.completedAt;

        return {
          subject: resolvedSubject,
          timeMinutes,
          completed: !!completedAt && section.questions.every((q) => q.userAnswer !== null),
          questions: section.questions.map((q) => ({
            questionText: q.questionText,
            optionsJson: q.optionsJson,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
          })),
        };
      });

    return NextResponse.json({
      id: session.id,
      status: session.status,
      profileId: session.profileId,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      percentage: session.percentage,
      totalSparks: session.totalSparks,
      sections,
    });
  } catch (error) {
    console.error("GET /api/exam/[sessionId] error:", error);
    return NextResponse.json({ error: "Failed to load exam session" }, { status: 500 });
  }
}
