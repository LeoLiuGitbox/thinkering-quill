import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chat, parseJSON } from "@/lib/gemini";
import { buildSpellsInTheWildSystemPrompt, buildSpellsInTheWildPrompt } from "@/lib/prompts/spells";
import { ALL_KNOWLEDGE_POINTS, KnowledgePointCode } from "@/types/game";
import { buildSpellAnswerKey, evaluateSpellDiscovery, parseSpellAnswerKey } from "@/lib/spellDiscovery";

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
          expectedAnswer: string;
          acceptedKeywords?: string[];
          acceptedPhrases?: string[];
          successFeedback?: string;
          retryFeedback?: string;
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
    const { entryId, profileId, knowledgePointCode, spellName, title, storyText, spotQuestion, answerKey, studentAnswer } = body;

    // Update existing entry's studentAnswer (from Field Journal page)
    if (entryId) {
      const existing = await prisma.fieldJournalEntry.findUnique({ where: { id: entryId } });
      if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

      const answer = String(studentAnswer ?? "").trim();
      const discoveryResult = evaluateSpellDiscovery({
        studentAnswer: answer,
        answerKey: parseSpellAnswerKey(existing.answerKeyJson),
      });
      const firstDiscovery = discoveryResult.discovered && existing.discoveryStatus !== "discovered";

      const updated = await prisma.fieldJournalEntry.update({
        where: { id: entryId },
        data: {
          studentAnswer: answer || null,
          discoveryStatus: discoveryResult.discovered ? "discovered" : existing.discoveryStatus,
          discoveryFeedback: discoveryResult.feedback,
          discoveryAttemptCount: { increment: answer ? 1 : 0 },
          firstDiscoveredAt: firstDiscovery ? new Date() : existing.firstDiscoveredAt,
          rewardClaimed: firstDiscovery ? true : existing.rewardClaimed,
        },
      });

      // Award only on the first successful discovery.
      if (firstDiscovery) {
        await prisma.profile.update({
          where: { id: existing.profileId },
          data: { totalXP: { increment: 5 }, attrWisdom: { increment: 1 } },
        });
      }

      return NextResponse.json({
        entry: updated,
        result: {
          discovered: discoveryResult.discovered,
          feedback: discoveryResult.feedback,
          rewardEarned: firstDiscovery ? 5 : 0,
        },
      });
    }

    // Create new journal entry
    if (!profileId || !knowledgePointCode || !title || !storyText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.fieldJournalEntry.create({
      data: {
        profileId,
        knowledgePointCode,
        spellName: spellName || null,
        title,
        storyText,
        spotQuestion,
        answerKeyJson: answerKey ? JSON.stringify(buildSpellAnswerKey(answerKey)) : null,
        studentAnswer: studentAnswer || null,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("PUT /api/spells error:", error);
    return NextResponse.json({ error: "Failed to save journal entry" }, { status: 500 });
  }
}
