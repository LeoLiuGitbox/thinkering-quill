import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatFlash as chat, parseJSON } from "@/lib/gemini";
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
  ALL_KNOWLEDGE_POINTS,
  KnowledgePointCode,
  SessionLength,
  SessionDifficulty,
  REGION_TO_SUBJECT,
  RC_KNOWLEDGE_POINTS,
} from "@/types/game";
import { PAPER_FOLDING_QUESTIONS } from "@/lib/staticQuestions/paperFolding";
import { TopicAllocation } from "@/lib/session";
import { getDefaultMicroSkillCode } from "@/lib/knowledge/microSkills";

function buildTargetedAllocation(params: {
  focusKnowledgePointCodes: KnowledgePointCode[];
  sessionLength: SessionLength;
  familiar: TopicAllocation[];
  challenge: TopicAllocation[];
}): { familiar: TopicAllocation[]; challenge: TopicAllocation[] } {
  const { focusKnowledgePointCodes, sessionLength, familiar, challenge } = params;
  const allowedCodes = new Set(
    [...familiar, ...challenge].map((item) => item.point.code)
  );
  const focusPoints = focusKnowledgePointCodes
    .filter((code) => allowedCodes.has(code))
    .map((code) => ALL_KNOWLEDGE_POINTS.find((point) => point.code === code))
    .filter((point): point is NonNullable<typeof point> => point != null);

  if (focusPoints.length === 0) {
    return { familiar, challenge };
  }

  const targetChallengeCount = Math.min(
    sessionLength,
    Math.max(Math.ceil(sessionLength * 0.6), focusPoints.length)
  );

  const challengeCounts = new Map<KnowledgePointCode, number>();
  for (let i = 0; i < targetChallengeCount; i++) {
    const point = focusPoints[i % focusPoints.length];
    challengeCounts.set(point.code, (challengeCounts.get(point.code) ?? 0) + 1);
  }

  const targetedChallenge: TopicAllocation[] = focusPoints.map((point) => ({
    point,
    count: challengeCounts.get(point.code) ?? 0,
    isFamiliar: false,
  }));

  const familiarCount = Math.max(0, sessionLength - targetChallengeCount);
  let remainingFamiliar = familiarCount;
  const targetedFamiliar: TopicAllocation[] = [];
  for (const item of familiar) {
    if (remainingFamiliar <= 0) break;
    const count = Math.min(item.count, remainingFamiliar);
    if (count > 0) {
      targetedFamiliar.push({ ...item, count });
      remainingFamiliar -= count;
    }
  }

  return {
    familiar: targetedFamiliar,
    challenge: targetedChallenge,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, region, sessionLength, difficulty, focusKnowledgePointCodes = [] } = body as {
      profileId: number;
      region: string;
      sessionLength: SessionLength;
      difficulty: SessionDifficulty;
      focusKnowledgePointCodes?: KnowledgePointCode[];
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
    let { familiar, challenge } = buildSessionAllocation({
      subject: subject as "QR" | "AR" | "RC",
      masteryMap,
      sessionLength,
    });

    ({ familiar, challenge } = buildTargetedAllocation({
      focusKnowledgePointCodes,
      sessionLength,
      familiar,
      challenge,
    }));

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
      const targetedMix = [...challenge, ...familiar].map((item) => item.point);
      const knowledgePointMix = targetedMix.length > 0 ? targetedMix : RC_KNOWLEDGE_POINTS;
      systemPrompt = buildRCSystemPrompt();
      userPrompt = buildRCBatchPrompt({
        passageCount: Math.max(1, Math.ceil(sessionLength / 4)),
        questionsPerPassage: Math.min(4, sessionLength),
        difficulty,
        knowledgePointMix,
      });
    }

    const raw = await chat(systemPrompt, userPrompt, 8192);
    questions = parseJSON<unknown[]>(raw);

    questions = questions.map((q, idx) => {
      const question = q as Record<string, unknown>;
      const knowledgePointCode = typeof question.knowledgePointCode === "string"
        ? question.knowledgePointCode
        : undefined;
      return {
        ...question,
        microSkillCode:
          typeof question.microSkillCode === "string"
            ? question.microSkillCode
            : getDefaultMicroSkillCode(knowledgePointCode, idx),
      };
    });

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

      // Inject 1 static paper folding question at Archmage difficulty
      // (replaces a generated question to keep total count correct)
      if (difficulty === "Archmage" && questions.length > 1) {
        const staticQ = PAPER_FOLDING_QUESTIONS[
          Math.floor(Math.random() * PAPER_FOLDING_QUESTIONS.length)
        ];
        // Replace the last question with the static one
        questions = [...questions.slice(0, -1), staticQ];
      }
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

    const questSession = await prisma.questSession.create({
      data: {
        profileId,
        region,
        sessionLength,
        difficulty,
        questionCount: Array.isArray(questions) ? questions.length : sessionLength,
      },
      select: { id: true },
    });

    return NextResponse.json({
      questSessionId: questSession.id,
      questions,
      allocation: {
        familiar,
        challenge,
        focus: challenge.map((item) => item.point.code),
        support: familiar.slice(0, Math.max(1, Math.ceil(familiar.length / 2))).map((item) => item.point.code),
        retention: familiar.slice(Math.max(1, Math.ceil(familiar.length / 2))).map((item) => item.point.code),
      },
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
