import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chat, parseJSON } from "@/lib/claude";

const SECTION_CONFIG: Record<
  string,
  { fullCount: number; practiceCount: number; fullMinutes: number; practiceMinutes: number }
> = {
  "Quantitative Reasoning": {
    fullCount: 35,
    practiceCount: 18,
    fullMinutes: 35,
    practiceMinutes: 18,
  },
  "Abstract Reasoning": {
    fullCount: 35,
    practiceCount: 18,
    fullMinutes: 20,
    practiceMinutes: 10,
  },
  "Reading Comprehension": {
    fullCount: 35,
    practiceCount: 18,
    fullMinutes: 35,
    practiceMinutes: 18,
  },
  "Creative Writing": {
    fullCount: 1,
    practiceCount: 1,
    fullMinutes: 25,
    practiceMinutes: 15,
  },
};

interface MCQQuestion {
  questionText: string;
  options: string[];
  correct: string;
  explanation: string;
  topic: string;
  difficulty: string;
  estimatedReadTimeMs: number;
}

interface WritingPrompt {
  promptText: string;
  imageDescription: string;
  timeMinutes: number;
}

async function generateMCQQuestions(
  subject: string,
  count: number
): Promise<MCQQuestion[]> {
  const system =
    "You are a WA GATE (ASET) exam question generator for Year 5-6 students. Generate high-quality exam questions matching the real ASET difficulty. Return ONLY a valid JSON array.";
  const user = `Generate ${count} ${subject} MCQ questions for ASET practice. Each question: {questionText, options: [A,B,C,D as strings], correct: 'A'|'B'|'C'|'D', explanation, topic, difficulty: 'standard', estimatedReadTimeMs: number}. Return JSON array.`;

  const raw = await chat(system, user, 8192);
  return parseJSON<MCQQuestion[]>(raw);
}

async function generateWritingPrompt(): Promise<WritingPrompt> {
  const system =
    "You are a WA GATE (ASET) exam question generator for Year 5-6 students. Generate high-quality exam questions matching the real ASET difficulty. Return ONLY a valid JSON array.";
  const user = `Generate 1 creative writing prompt for ASET. Return JSON: {promptText: string, imageDescription: string (for DALL-E), timeMinutes: 25}`;

  const raw = await chat(system, user, 1024);
  // The prompt says return JSON (object), not array, handle both
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  // If it's wrapped in an array, unwrap
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, sections, mode } = body as {
      profileId: number;
      sections: string[];
      mode: "full" | "practice";
    };

    if (!profileId || !sections || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build section data with generated questions
    type SectionData = {
      subject: string;
      timeMinutes: number;
      questions: Array<{
        questionText: string;
        optionsJson: string;
        correctAnswer: string;
        explanation: string;
        topic: string;
        difficulty: string;
        sectionIndex: number;
        questionIndex: number;
      }>;
    };

    const sectionDataList: SectionData[] = [];
    let globalQuestionIndex = 0;

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const subject = sections[sectionIndex];
      const config = SECTION_CONFIG[subject];
      if (!config) continue;

      const count = mode === "full" ? config.fullCount : config.practiceCount;
      const timeMinutes = mode === "full" ? config.fullMinutes : config.practiceMinutes;

      const sectionQuestions: SectionData["questions"] = [];

      if (subject === "Creative Writing") {
        const prompt = await generateWritingPrompt();
        sectionQuestions.push({
          questionText: prompt.promptText,
          optionsJson: JSON.stringify([]),
          correctAnswer: "",
          explanation: prompt.imageDescription || "",
          topic: `section_${sectionIndex}_CW_Writing`,
          difficulty: `section:${sectionIndex}`,
          sectionIndex,
          questionIndex: globalQuestionIndex++,
        });
      } else {
        const questions = await generateMCQQuestions(subject, count);
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          sectionQuestions.push({
            questionText: q.questionText,
            optionsJson: JSON.stringify(q.options),
            correctAnswer: q.correct,
            explanation: q.explanation,
            topic: `section_${sectionIndex}_${q.topic || subject.slice(0, 2).toUpperCase()}_${qi + 1}`,
            difficulty: `section:${sectionIndex}`,
            sectionIndex,
            questionIndex: globalQuestionIndex++,
          });
        }
      }

      sectionDataList.push({ subject, timeMinutes, questions: sectionQuestions });
    }

    // Total question counts
    const totalQuestions = sectionDataList.reduce((sum, s) => sum + s.questions.length, 0);
    const totalMinutes = sectionDataList.reduce((sum, s) => sum + s.timeMinutes, 0);

    // Create ExamSession
    const session = await prisma.examSession.create({
      data: {
        profileId,
        region: "Tower of Ascension",
        durationMinutes: totalMinutes,
        numQuestions: totalQuestions,
        status: "in_progress",
      },
    });

    // Create all ExamQuestion records
    const allQuestions = sectionDataList.flatMap((s) => s.questions);
    for (const q of allQuestions) {
      await prisma.examQuestion.create({
        data: {
          sessionId: session.id,
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          optionsJson: q.optionsJson,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: q.difficulty,
        },
      });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("POST /api/exam/create error:", error);
    return NextResponse.json({ error: "Failed to create exam session" }, { status: 500 });
  }
}
