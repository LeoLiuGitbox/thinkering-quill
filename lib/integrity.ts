import {
  AuraAlignment,
  AURA_THRESHOLDS,
  IntegrityEventType,
  INTEGRITY_WEIGHTS,
} from "@/types/game";

/** Compute aura alignment from shadow score */
export function getAuraAlignment(shadowScore: number): AuraAlignment {
  for (const { min, state } of AURA_THRESHOLDS) {
    if (shadowScore >= min) return state;
  }
  return "bright";
}

/** Get the narrative message for an aura transition */
export function getAuraMessage(aura: AuraAlignment): string {
  const found = AURA_THRESHOLDS.find((t) => t.state === aura);
  return found?.description ?? "";
}

/** Check if XP rewards should be halved (shadow drift state) */
export function isXPHalved(shadowScore: number): boolean {
  return shadowScore >= 80;
}

/** Natural decay — 20 points per clean session (3+ sessions needed to clear) */
export const SHADOW_DECAY_PER_CLEAN_SESSION = 20;

/** Minimum read time in ms based on question text length (characters) */
export function getMinimumReadTimeMs(questionText: string, optionsText: string): number {
  const totalChars = (questionText + optionsText).length;
  // Average reading speed for a 10yo: ~200 words/min → ~1000 chars/min → 60ms/char
  // We enforce 60% of that = minimum 36ms/char, but cap at 3s min and 12s max
  const estimated = totalChars * 36;
  return Math.min(Math.max(estimated, 3_000), 12_000);
}

/** Analyse an attempt and return any integrity event that should be logged */
export function detectIntegritySignal(params: {
  timeSpentMs: number;
  minimumReadTimeMs: number;
  hintsUsed: number;
  firstChoiceCorrect: boolean;
  finalAnswerCorrect: boolean;
  retryCount?: number;
  consecutiveHintAbuseCount?: number;
}): { eventType: IntegrityEventType; severity: number; description: string } | null {
  const {
    timeSpentMs,
    minimumReadTimeMs,
    hintsUsed,
    firstChoiceCorrect,
    finalAnswerCorrect,
    retryCount = 0,
    consecutiveHintAbuseCount = 0,
  } = params;

  // Fast answer (answered before minimum read time)
  if (timeSpentMs < minimumReadTimeMs) {
    return {
      eventType: "fast_answer",
      severity: INTEGRITY_WEIGHTS.fast_answer,
      description: `Answer submitted in ${timeSpentMs}ms, minimum read time was ${minimumReadTimeMs}ms`,
    };
  }

  // Rapid retries
  if (retryCount >= 3) {
    return {
      eventType: "rapid_retry",
      severity: INTEGRITY_WEIGHTS.rapid_retry,
      description: `${retryCount} rapid retries on same question`,
    };
  }

  // Hint used then same wrong answer repeated
  if (hintsUsed > 0 && !firstChoiceCorrect && !finalAnswerCorrect) {
    return {
      eventType: "repeated_wrong_after_hint",
      severity: INTEGRITY_WEIGHTS.repeated_wrong_after_hint,
      description: "Used hint but still gave wrong answer (hint not engaged with)",
    };
  }

  // Hint abuse on consecutive questions (2+ hints per question, 3+ questions in a row)
  if (consecutiveHintAbuseCount >= 3) {
    return {
      eventType: "hint_abuse",
      severity: INTEGRITY_WEIGHTS.hint_abuse,
      description: `${consecutiveHintAbuseCount} consecutive questions with 2+ hints each`,
    };
  }

  return null;
}
