import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chat, parseJSON } from "@/lib/claude";
import { buildSpellsInTheWildSystemPrompt, buildSpellsInTheWildPrompt } from "@/lib/prompts/spells";
import { ALL_KNOWLEDGE_POINTS, KnowledgePointCode } from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, knowledgePointCodes } = body as {
      profileId: number;
      knowledgePointCodes: KnowledgePointCode[];
    };

    if (!profileId || !knowledgePointCodes?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const stories = await Promise.all(
      knowledgePointCodes.slice(0, 2).map(async (code) => {
        const kp = ALL_KNOWLEDGE_POINTS.find((p) => p.code === code);
        if (!kp) return null;

        const system = buildSpellsInTheWildSystemPrompt();
        const userPrompt = buildSpellsInTheWildPrompt(kp);

        const raw = await chat(system, userPrompt, 1024);
        const data = parseJSON<{
          title: string;
          storyText: string;
          spotQuestion: string;
        }>(raw);

        return {
          knowledgePointCode: code,
          knowledgePointName: kp.name,
          spellName: kp.spellName,
          ...data,
        };
      })
    );

    const validStories = stories.filter(Boolean);

    return NextResponse.json({ stories: validStories });
  } catch (error) {
    console.error("POST /api/spells error:", error);
    return NextResponse.json({ error: "Failed to generate spells stories" }, { status: 500 });
  }
}

/** PUT /api/spells — save a story to the Field Journal, or update an existing entry's answer */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, profileId, knowledgePointCode, title, storyText, spotQuestion, studentAnswer } = body;

    // Update existing entry's studentAnswer (from Field Journal page)
    if (entryId) {
      const existing = await prisma.fieldJournalEntry.findUnique({ where: { id: entryId } });
      if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

      const updated = await prisma.fieldJournalEntry.update({
        where: { id: entryId },
        data: { studentAnswer: studentAnswer ?? null },
      });

      // Award +5 sparks first time an answer is saved (when there was none before)
      if (!existing.studentAnswer && studentAnswer?.trim()) {
        await prisma.profile.update({
          where: { id: existing.profileId },
          data: { totalXP: { increment: 5 }, attrWisdom: { increment: 1 } },
        });
      }

      return NextResponse.json({ entry: updated });
    }

    // Create new journal entry
    if (!profileId || !knowledgePointCode || !title || !storyText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.fieldJournalEntry.create({
      data: {
        profileId,
        knowledgePointCode,
        title,
        storyText,
        spotQuestion,
        studentAnswer: studentAnswer || null,
      },
    });

    // Award +5 sparks if student answered the spot question on first save
    if (studentAnswer && studentAnswer.trim().length > 0) {
      await prisma.profile.update({
        where: { id: profileId },
        data: {
          totalXP: { increment: 5 },
          attrWisdom: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("PUT /api/spells error:", error);
    return NextResponse.json({ error: "Failed to save journal entry" }, { status: 500 });
  }
}
