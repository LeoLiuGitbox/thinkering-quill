import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/claude";
import {
  buildHintSystemPrompt,
  buildHint1Prompt,
  buildHint2Prompt,
  buildARHint1Prompt,
  buildARHint2Prompt,
} from "@/lib/prompts/hint";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hintLevel,            // 1 or 2
      questionText,
      options,              // string[]
      knowledgePointName,   // NOTE: client sends the KP code in this field (e.g. "QR-12")
      knowledgePointCode,   // explicit code field if client sends it separately
      isAbstractReasoning,
      wrongOption,          // for hint 2
    } = body;

    if (!hintLevel || !questionText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Normalise: prefer explicit knowledgePointCode, fall back to knowledgePointName
    // (the play page currently sends the code as knowledgePointName)
    const kpCode: string | undefined = knowledgePointCode || knowledgePointName || undefined;

    const system = buildHintSystemPrompt();
    let userPrompt: string;

    if (isAbstractReasoning) {
      userPrompt =
        hintLevel === 1
          ? buildARHint1Prompt(questionText, kpCode)
          : buildARHint2Prompt(
              questionText,
              kpCode,
              wrongOption || options?.[3] || "the last option"
            );
    } else {
      userPrompt =
        hintLevel === 1
          ? buildHint1Prompt(questionText, options || [], kpCode)
          : buildHint2Prompt(
              questionText,
              options || [],
              wrongOption || options?.[3] || "the last option",
              kpCode
            );
    }

    const hint = await chat(system, userPrompt, 512);

    return NextResponse.json({ hint: hint.trim() });
  } catch (error) {
    console.error("POST /api/hint error:", error);
    return NextResponse.json({ error: "Failed to generate hint" }, { status: 500 });
  }
}
