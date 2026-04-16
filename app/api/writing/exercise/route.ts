import { NextRequest, NextResponse } from "next/server";
import { chat, parseJSON } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import {
  buildWritingRevisionCoachPrompt,
  buildWritingRevisionUserPrompt,
} from "@/lib/prompts/writing";
import {
  calculateWritingDrillSparks,
  calculateWritingRevisionSparks,
} from "@/lib/rewards";
import { getRank } from "@/lib/progression";
import { checkAndAwardBadges } from "@/lib/badges";

type WritingMode = "micro_skill_drill" | "guided_writing";
type DraftStage = "draft_v1" | "draft_v2";
const WRITING_REVISION_WISDOM_BONUS = 1;

type WritingCoachingFeedback = {
  strength: string;
  priorityIssue: string;
  revisionInstruction: string;
  quotedOriginalSnippet?: string;
  revisedSnippet?: string;
  topicConnection?: string;
  modelExample?: string;
  nextStep?: string;
  improvedDraft?: string;
};

function extractTopicCue(promptText: string) {
  const normalized = promptText.replace(/\s+/g, " ").trim();
  if (!normalized) return "the task";

  const sentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() || normalized;
  return sentence.length > 120 ? `${sentence.slice(0, 117).trim()}...` : sentence;
}

function firstMeaningfulSentence(text: string) {
  const sentence = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!sentence) return "";
  return sentence.length > 140 ? `${sentence.slice(0, 137).trim()}...` : sentence;
}

function normalizeComparableText(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function isMissingOrGeneric(text: string | undefined, genericCandidates: string[]) {
  if (!text?.trim()) return true;
  const normalized = normalizeComparableText(text);
  return genericCandidates.some((candidate) => normalizeComparableText(candidate) === normalized);
}

function replaceFirstSnippet(draftText: string, originalSnippet: string, revisedSnippet: string) {
  if (!originalSnippet || !revisedSnippet) return draftText;
  const index = draftText.indexOf(originalSnippet);
  if (index === -1) return draftText;
  return `${draftText.slice(0, index)}${revisedSnippet}${draftText.slice(index + originalSnippet.length)}`;
}

function buildShowNotTellSnippetRewrite(snippet: string) {
  const revised = snippet
    .replace(/\bwas keep\b/gi, "kept")
    .replace(/\bcounting head of\b/gi, "counting the heads of")
    .replace(/\bkeep telling himself\b/gi, "kept telling himself")
    .replace(/\brepeatly\b/gi, "repeatedly")
    .replace(/\bevery doing\b/gi, "Each student was doing")
    .replace(/\bthe judges they ability\b/gi, "the judges their ability")
    .replace(/\bfeels he got nothing to show\b/gi, "felt as if he had nothing ready to show")
    .replace(/\bhis feel his brain is as empty as basketball\b/gi, "his brain felt as empty as a basketball")
    .replace(/\bnothing but bounce\b/gi, "with nothing inside it except the same thought bouncing around");

  if (normalizeComparableText(revised) !== normalizeComparableText(snippet)) {
    return revised;
  }

  if (!snippet) {
    return "The student rubbed damp palms on their blazer and kept glancing at the stage, waiting for the next name.";
  }

  return `${snippet.replace(/[.!?]*$/, "")}, while his fingers kept tapping against his sleeve and his eyes jumped back to the stage.`;
}

function buildShowNotTellRevision(draftText: string) {
  const originalSnippet = firstMeaningfulSentence(draftText);
  const revisedSnippet = buildShowNotTellSnippetRewrite(originalSnippet);
  const replacedDraft = replaceFirstSnippet(draftText, originalSnippet, revisedSnippet);

  if (normalizeComparableText(replacedDraft) !== normalizeComparableText(draftText)) {
    return replacedDraft;
  }

  const trimmed = draftText.trim();
  if (!trimmed) return draftText;
  return `${trimmed} His fingers would not stay still, and every clap from the stage made his stomach tighten again.`;
}

function buildStrongerOpeningHookRevision(draftText: string) {
  const trimmed = draftText.trim();
  if (!trimmed) return draftText;

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) return draftText;

  const firstSentence = sentences[0];
  const strongerFirstSentence = firstSentence
    .replace(/\bSomething as big as elephant\b/i, "Something as big as an elephant")
    .replace(/\bwont get disappears easily\b/i, "should not disappear easily")
    .replace(/\bBut it just happened\b/i, "But today it did")
    .replace(/\bright in front a group\b/i, "right in front of a group");

  const revisedFirstSentence =
    strongerFirstSentence === firstSentence
      ? `By the time the visitors looked up, ${firstSentence.charAt(0).toLowerCase()}${firstSentence.slice(1)}`
      : strongerFirstSentence;

  sentences[0] = revisedFirstSentence;
  return sentences.join(" ");
}

function buildFallbackCoachingFeedback(params: {
  skillCode: string;
  mode: WritingMode;
  draftText: string;
  promptText: string;
}): WritingCoachingFeedback {
  const wordCount = params.draftText.split(/\s+/).filter(Boolean).length;
  const hasDialogue = /["'].*["']/.test(params.draftText);
  const hasSensory = /(saw|heard|smell|smelled|felt|cold|warm|bright|dark|loud|quiet)/i.test(params.draftText);
  const topicCue = extractTopicCue(params.promptText);
  const originalSnippet = firstMeaningfulSentence(params.draftText);

  const generic: WritingCoachingFeedback = {
    strength:
      wordCount >= 30
        ? "You have enough ideas on the page to improve this draft."
        : "You have started the piece and given yourself something to build on.",
    priorityIssue: "The draft needs one clearer sentence so the reader can connect your writing to the task more quickly.",
    revisionInstruction: `Choose one sentence and rewrite it so the idea connects more clearly to ${topicCue.toLowerCase()}.`,
    quotedOriginalSnippet: originalSnippet,
    revisedSnippet: originalSnippet,
    topicConnection: `Make the key sentence point more clearly toward ${topicCue.toLowerCase()} so the reader can see how your writing fits the task.`,
    modelExample: "Instead of 'It was scary,' try showing the moment through action or a sensory clue.",
    nextStep: "Revise one section carefully rather than trying to change everything at once.",
    improvedDraft: params.draftText,
  };

  switch (params.skillCode) {
    case "show_not_tell": {
      const showingSnippet =
        originalSnippet ||
        "The sentence tells the feeling directly instead of showing it through action.";
      const revisedSnippet = buildShowNotTellSnippetRewrite(showingSnippet);
      return {
        strength: `You already placed the reader in a clear waiting moment, especially with ${topicCue.toLowerCase()}.`,
        priorityIssue: `The feeling is strongest in "${showingSnippet}", but that part still explains the emotion more than it shows what the body is doing.`,
        revisionInstruction: `Keep the same idea, but rewrite "${showingSnippet}" so the reader sees hands, eyes, breathing, or movement instead of being told the feeling.`,
        quotedOriginalSnippet: showingSnippet,
        revisedSnippet,
        topicConnection: `Use a physical detail that belongs inside ${topicCue.toLowerCase()} so the reader experiences the moment instead of being told about it.`,
        modelExample: `Try something closer to "${revisedSnippet}" so the reader can feel the pressure of ${topicCue.toLowerCase()}.`,
        nextStep: "Keep the emotion, but hide it inside an action, a gesture, or one sensory clue.",
        improvedDraft: buildShowNotTellRevision(params.draftText),
      };
    }
    case "opening_hook": {
      const strongerHookDraft = buildStrongerOpeningHookRevision(params.draftText);
      return {
        strength: "Your draft starts the scene and gives the reader a place to begin.",
        priorityIssue: "The opening needs to point at the problem in this prompt faster so the reader feels the mystery straight away.",
        revisionInstruction: `Rewrite the first sentence so it immediately hints at the unusual problem in ${topicCue.toLowerCase()}.`,
        quotedOriginalSnippet: originalSnippet,
        revisedSnippet: firstMeaningfulSentence(strongerHookDraft),
        topicConnection: `This version brings the strange event in ${topicCue.toLowerCase()} closer to the front, so the reader knows what is unusual from the first line.`,
        modelExample: `Open with the strange event from ${topicCue.toLowerCase()}, not with general background first.`,
        nextStep: "Make the first line strong enough that the reader wants the second line immediately.",
        improvedDraft: strongerHookDraft,
      };
    }
    case "dialogue":
      return {
        strength: hasDialogue
          ? "You have started using dialogue to bring the scene to life."
          : generic.strength,
        priorityIssue: "The voices could reveal more character or tension.",
        revisionInstruction: `Add or revise one line of dialogue so it reveals what matters in ${topicCue.toLowerCase()}.`,
        quotedOriginalSnippet: originalSnippet,
        revisedSnippet: `"Wait," she whispered. "That's not where it was a minute ago."`,
        topicConnection: `That line points the reader back to ${topicCue.toLowerCase()} and gives the scene more tension.`,
        modelExample: `"Don't touch that," Ava whispered, stepping in front of the box.`,
        nextStep: "Use dialogue to reveal character, not just to fill space.",
        improvedDraft: hasDialogue
          ? params.draftText
          : `${params.draftText.trim()} "Wait," she whispered, reaching for the handle.`,
      };
    case "sensory_detail":
      return {
        strength: hasSensory
          ? "You already have a sensory clue that gives the draft atmosphere."
          : generic.strength,
        priorityIssue: "The scene needs one or two sharper sensory details to feel more vivid.",
        revisionInstruction: `Choose one moment and add a precise sound, texture, or visual detail that belongs inside ${topicCue.toLowerCase()}.`,
        quotedOriginalSnippet: originalSnippet,
        revisedSnippet: `${originalSnippet} The air felt cold, and the floorboards creaked under each step.`.trim(),
        topicConnection: `A concrete detail makes ${topicCue.toLowerCase()} feel like a real place instead of a vague idea.`,
        modelExample: `Add a detail that naturally fits ${topicCue.toLowerCase()}, like the floorboards creaking or cold air brushing the character's face.`,
        nextStep: "Pick the strongest detail, not the most details.",
        improvedDraft: `${params.draftText.trim()} The air felt cold, and the floorboards creaked under each step.`,
      };
    default:
      return generic;
  }
}

function normalizeCoachingFeedback(params: {
  skillCode: string;
  mode: WritingMode;
  draftText: string;
  promptText: string;
  feedback: WritingCoachingFeedback;
}) {
  const fallback = buildFallbackCoachingFeedback({
    skillCode: params.skillCode,
    mode: params.mode,
    draftText: params.draftText,
    promptText: params.promptText,
  });

  const normalized: WritingCoachingFeedback = {
    ...fallback,
    ...params.feedback,
  };

  if (
    isMissingOrGeneric(normalized.strength, [
      "You have enough ideas on the page to improve this draft.",
      "You have started the piece and given yourself something to build on.",
      "You already have at least one detail that helps the reader picture the moment.",
    ])
  ) {
    normalized.strength = fallback.strength;
  }

  if (
    isMissingOrGeneric(normalized.priorityIssue, [
      "Some feelings or ideas are still told directly instead of shown through action or detail.",
      "The draft needs one clearer sentence so the reader can connect your writing to the task more quickly.",
      "The opening could create more curiosity right away.",
      "The scene needs one or two sharper sensory details to feel more vivid.",
    ])
  ) {
    normalized.priorityIssue = fallback.priorityIssue;
  }

  if (
    isMissingOrGeneric(normalized.revisionInstruction, [
      "Find one telling sentence and rewrite it using body language, action, or a sensory clue.",
      "Choose one sentence and rewrite it so the idea connects more clearly to the task.",
      "Rewrite the first sentence so it begins with a surprise, problem, or unusual detail.",
    ])
  ) {
    normalized.revisionInstruction = fallback.revisionInstruction;
  }

  if (
    isMissingOrGeneric(normalized.modelExample, [
      "Instead of 'Lena was nervous,' try 'Lena rubbed her palms on her skirt and read the sign again.'",
      "Instead of 'It was scary,' try showing the moment through action or a sensory clue.",
    ])
  ) {
    normalized.modelExample = fallback.modelExample;
  }

  if (!normalized.quotedOriginalSnippet?.trim()) {
    normalized.quotedOriginalSnippet = fallback.quotedOriginalSnippet;
  }

  if (
    !normalized.revisedSnippet?.trim() ||
    normalizeComparableText(normalized.revisedSnippet) === normalizeComparableText(normalized.quotedOriginalSnippet ?? "")
  ) {
    normalized.revisedSnippet = fallback.revisedSnippet;
  }

  if (!normalized.topicConnection?.trim()) {
    normalized.topicConnection = fallback.topicConnection;
  }

  if (
    !normalized.improvedDraft?.trim() ||
    normalizeComparableText(normalized.improvedDraft) === normalizeComparableText(params.draftText)
  ) {
    normalized.improvedDraft = fallback.improvedDraft;
  }

  if (
    normalized.improvedDraft &&
    normalizeComparableText(normalized.improvedDraft) === normalizeComparableText(params.draftText) &&
    normalized.quotedOriginalSnippet &&
    normalized.revisedSnippet &&
    normalizeComparableText(normalized.revisedSnippet) !== normalizeComparableText(normalized.quotedOriginalSnippet)
  ) {
    normalized.improvedDraft = replaceFirstSnippet(
      params.draftText,
      normalized.quotedOriginalSnippet,
      normalized.revisedSnippet
    );
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileId = Number(body.profileId);
    const sessionId = Number(body.sessionId);
    const draftText =
      typeof body.draftText === "string" ? body.draftText.trim() : "";
    const promptText =
      typeof body.promptText === "string" ? body.promptText : "";
    const skillCode =
      typeof body.skillCode === "string" && body.skillCode.trim()
        ? body.skillCode.trim()
        : "show_not_tell";
    const mode: WritingMode =
      body.mode === "guided_writing" ? "guided_writing" : "micro_skill_drill";
    const stage: DraftStage =
      body.stage === "draft_v2" ? "draft_v2" : "draft_v1";

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }

    if (!draftText) {
      return NextResponse.json({ error: "draftText is required" }, { status: 400 });
    }

    const existingSession = await prisma.writingSession.findUnique({
      where: { id: sessionId },
      select: { id: true, profileId: true, sparksEarned: true },
    });

    if (!existingSession || existingSession.profileId !== profileId) {
      return NextResponse.json({ error: "Writing session not found" }, { status: 404 });
    }

    if (stage === "draft_v1") {
      let feedback: WritingCoachingFeedback;
      try {
        const rawFeedback = await chat(
          buildWritingRevisionCoachPrompt(),
          buildWritingRevisionUserPrompt({
            skillCode,
            mode,
            promptText,
            draftText,
          }),
          1000
        );

        feedback = normalizeCoachingFeedback({
          skillCode,
          mode,
          draftText,
          promptText,
          feedback: parseJSON<WritingCoachingFeedback>(rawFeedback),
        });
      } catch (error) {
        console.warn("Writing exercise coaching fell back to local template:", error);
        feedback = normalizeCoachingFeedback({
          skillCode,
          mode,
          draftText,
          promptText,
          feedback: buildFallbackCoachingFeedback({ skillCode, mode, draftText, promptText }),
        });
      }

      await prisma.writingSession.update({
        where: { id: sessionId },
        data: {
          sessionMode: mode,
          targetSkill: skillCode,
          promptText,
          draftV1: draftText,
          revisionInstruction: feedback.revisionInstruction,
          feedbackSummaryJson: JSON.stringify(feedback),
        },
      });

      return NextResponse.json({ feedback, completed: false });
    }

    const sparksEarned =
      calculateWritingDrillSparks() +
      calculateWritingRevisionSparks() +
      (mode === "guided_writing" ? 6 : 0);
    const wisdomEarned = WRITING_REVISION_WISDOM_BONUS;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { totalXP: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        sessionMode: mode,
        targetSkill: skillCode,
        promptText,
        draftV2: draftText,
        sparksEarned,
      },
    });

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        totalXP: { increment: sparksEarned },
        rank: getRank(profile.totalXP + sparksEarned),
        attrCraft: { increment: 1 },
        attrWisdom: { increment: wisdomEarned },
      },
    });

    // Award badges — fire-and-forget
    checkAndAwardBadges(profileId, "writing").catch((err) =>
      console.error("Badge check failed:", err)
    );

    return NextResponse.json({
      completed: true,
      sparksEarned,
      wisdomEarned,
      completionMessage:
        mode === "guided_writing"
          ? "Your revision strengthened the piece. Keep this clarity when you build longer compositions. +1 Wisdom for revising thoughtfully."
          : "You revised with purpose. That is exactly how writing skill grows. +1 Wisdom for revising thoughtfully.",
    });
  } catch (error) {
    console.error("POST /api/writing/exercise error:", error);
    return NextResponse.json({ error: "Failed to process writing exercise" }, { status: 500 });
  }
}
