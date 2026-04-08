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
      hintLevel,       // 1 or 2
      questionText,
      options,         // string[]
      knowledgePointName,
      isAbstractReasoning,
      wrongOption,     // for hint 2
    } = body;

    if (!hintLevel || !questionText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const system = buildHintSystemPrompt();
    let userPrompt: string;

    if (isAbstractReasoning) {
      userPrompt =
        hintLevel === 1
          ? buildARHint1Prompt(questionText, knowledgePointName || "Abstract Reasoning")
          : buildARHint2Prompt(
              questionText,
              knowledgePointName || "Abstract Reasoning",
              wrongOption || options?.[3] || "option D"
            );
    } else {
      userPrompt =
        hintLevel === 1
          ? buildHint1Prompt(questionText, options || [])
          : buildHint2Prompt(
              questionText,
              options || [],
              wrongOption || options?.[3] || "option D"
            );
    }

    const hint = await chat(system, userPrompt, 512);

    return NextResponse.json({ hint: hint.trim() });
  } catch (error) {
    console.error("POST /api/hint error:", error);
    return NextResponse.json({ error: "Failed to generate hint" }, { status: 500 });
  }
}
