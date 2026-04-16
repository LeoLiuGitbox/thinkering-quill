type SpellStoryPayload = {
  title: string;
  storyText: string;
  spotQuestion: string;
  expectedAnswer: string;
  acceptedKeywords?: string[];
  acceptedPhrases?: string[];
  successFeedback?: string;
  retryFeedback?: string;
};

export type SpellAnswerKey = {
  expectedAnswer: string;
  acceptedKeywords: string[];
  acceptedPhrases: string[];
  successFeedback: string;
  retryFeedback: string;
};

export type SpellDiscoveryResult = {
  discovered: boolean;
  feedback: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

export function buildSpellAnswerKey(story: SpellStoryPayload): SpellAnswerKey {
  const acceptedKeywords = uniqueNormalized(story.acceptedKeywords ?? []);
  const acceptedPhrases = uniqueNormalized(story.acceptedPhrases ?? []);

  return {
    expectedAnswer: story.expectedAnswer?.trim() || "The story shows the hidden thinking step in action.",
    acceptedKeywords,
    acceptedPhrases,
    successFeedback:
      story.successFeedback?.trim() || "You spotted the hidden spell correctly. The Journal records it as discovered.",
    retryFeedback:
      story.retryFeedback?.trim() || "Not quite yet. Look again for the exact moment where the thinking skill appears in the action.",
  };
}

export function parseSpellAnswerKey(raw: string | null | undefined): SpellAnswerKey | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SpellAnswerKey>;
    return {
      expectedAnswer: parsed.expectedAnswer?.trim() || "",
      acceptedKeywords: uniqueNormalized(parsed.acceptedKeywords ?? []),
      acceptedPhrases: uniqueNormalized(parsed.acceptedPhrases ?? []),
      successFeedback:
        parsed.successFeedback?.trim() || "You spotted the hidden spell correctly. The Journal records it as discovered.",
      retryFeedback:
        parsed.retryFeedback?.trim() || "Not quite yet. Look again for the exact moment where the thinking skill appears in the action.",
    };
  } catch {
    return null;
  }
}

export function evaluateSpellDiscovery(args: {
  studentAnswer: string;
  answerKey: SpellAnswerKey | null;
}): SpellDiscoveryResult {
  const answer = normalizeText(args.studentAnswer);
  if (!answer) {
    return {
      discovered: false,
      feedback: "Write what you noticed in the story before asking the Journal to judge the spell.",
    };
  }

  if (!args.answerKey) {
    return {
      discovered: true,
      feedback: "This is an older journal entry, so the Journal will accept the discovery and record your answer.",
    };
  }

  const phraseMatch = args.answerKey.acceptedPhrases.some((phrase) => answer.includes(phrase));
  const keywordHits = args.answerKey.acceptedKeywords.filter((keyword) => answer.includes(keyword)).length;
  const enoughKeywords =
    args.answerKey.acceptedKeywords.length === 0
      ? answer.length >= 12
      : keywordHits >= Math.min(2, args.answerKey.acceptedKeywords.length);

  if (phraseMatch || enoughKeywords) {
    return {
      discovered: true,
      feedback: args.answerKey.successFeedback,
    };
  }

  return {
    discovered: false,
    feedback: args.answerKey.retryFeedback,
  };
}
