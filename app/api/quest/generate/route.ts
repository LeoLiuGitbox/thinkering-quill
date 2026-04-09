import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chat, parseJSON } from "@/lib/claude";
import { buildSessionAllocation } from "@/lib/session";
import {
  buildQRSystemPrompt,
  buildQRBatchPrompt,
  buildARSystemPrompt,
  buildARBatchPrompt,
  buildRCSystemPrompt,
  buildRCBatchPrompt,
} from "@/lib/prompts/mcq";
import {
  KnowledgePointCode,
  SessionLength,
  SessionDifficulty,
  REGION_TO_SUBJECT,
  RC_KNOWLEDGE_POINTS,
} from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, region, sessionLength, difficulty } = body as {
      profileId: number;
      region: string;
      sessionLength: SessionLength;
      difficulty: SessionDifficulty;
    };

    if (!profileId || !region || !sessionLength || !difficulty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subject = REGION_TO_SUBJECT[region];
    if (!subject) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    // Fetch mastery map for this profile
    const masteryRecords = await prisma.knowledgeMastery.findMany({
      where: { profileId },
    });
    const masteryMap = new Map<KnowledgePointCode, number>();
    for (const record of masteryRecords) {
      masteryMap.set(record.knowledgePointCode as KnowledgePointCode, record.masteryLevel);
    }

    // Build 80/20 allocation
    const { familiar, challenge } = buildSessionAllocation({
      subject: subject as "QR" | "AR" | "RC",
      masteryMap,
      sessionLength,
    });

    // Generate questions via Claude
    let systemPrompt: string;
    let userPrompt: string;
    let questions: unknown[];

    if (subject === "QR") {
      systemPrompt = buildQRSystemPrompt();
      userPrompt = buildQRBatchPrompt({
        familiarTopics: familiar,
        challengeTopics: challenge,
        difficulty,
        totalCount: sessionLength,
      });
    } else if (subject === "AR") {
      systemPrompt = buildARSystemPrompt();
      userPrompt = buildARBatchPrompt({
        familiarTopics: familiar,
        challengeTopics: challenge,
        totalCount: sessionLength,
        difficulty,
      });
    } else {
      // RC
      const allKPs = RC_KNOWLEDGE_POINTS;
      systemPrompt = buildRCSystemPrompt();
      userPrompt = buildRCBatchPrompt({
        passageCount: Math.max(1, Math.ceil(sessionLength / 4)),
        questionsPerPassage: Math.min(4, sessionLength),
        difficulty,
        knowledgePointMix: allKPs,
      });
    }

    const raw = await chat(systemPrompt, userPrompt, 8192);
    questions = parseJSON<unknown[]>(raw);

    // For AR, move `options` (cell objects) → `options_ar` so the client
    // can distinguish between visual AR options and text MCQ options
    if (subject === "AR") {
      questions = questions.map((q) => {
        const question = q as Record<string, unknown>;
        if (Array.isArray(question.options) && question.options.length > 0) {
          // If options are objects (cell data), rename to options_ar
          if (typeof question.options[0] === "object" && question.options[0] !== null) {
            return { ...question, options_ar: question.options, options: undefined };
          }
        }
        return question;
      });
    }

    // For RC, flatten passages → questions
    if (subject === "RC") {
      const passages = questions as Array<{
        passageTitle: string;
        passageText: string;
        passageType: string;
        questions: unknown[];
      }>;
      const flat: unknown[] = [];
      for (const p of passages) {
        for (const q of p.questions) {
          flat.push({
            ...(q as object),
            context: p.passageText,
            passageTitle: p.passageTitle,
          });
        }
      }
      questions = flat.slice(0, sessionLength);
    }

    return NextResponse.json({
      questions,
      allocation: { familiar, challenge },
      region,
      subject,
      sessionLength,
      difficulty,
      systemPrompt,
      userPrompt,
    });
  } catch (error) {
    console.error("POST /api/quest/generate error:", error);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
