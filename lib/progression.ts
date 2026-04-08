import { Rank, RANK_THRESHOLDS, MasteryLevel, MASTERY_THRESHOLDS } from "@/types/game";

/** Calculate the rank for a given total XP */
export function getRank(totalXP: number): Rank {
  let rank: Rank = "Novice Scribe";
  for (const { rank: r, xpRequired } of RANK_THRESHOLDS) {
    if (totalXP >= xpRequired) rank = r;
  }
  return rank;
}

/** Get XP needed for next rank, returns null if at max rank */
export function getNextRankInfo(totalXP: number): {
  nextRank: Rank | null;
  xpNeeded: number;
  progress: number; // 0–1
} {
  const thresholds = RANK_THRESHOLDS;
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (totalXP < thresholds[i + 1].xpRequired) {
      const currentMin = thresholds[i].xpRequired;
      const nextMin = thresholds[i + 1].xpRequired;
      return {
        nextRank: thresholds[i + 1].rank,
        xpNeeded: nextMin - totalXP,
        progress: (totalXP - currentMin) / (nextMin - currentMin),
      };
    }
  }
  return { nextRank: null, xpNeeded: 0, progress: 1 };
}

/** Calculate mastery level from mastery score */
export function getMasteryLevel(score: number): MasteryLevel {
  for (const [threshold, level] of MASTERY_THRESHOLDS) {
    if (score >= threshold) return level;
  }
  return 1;
}

/**
 * Calculate mastery score from attempt analytics.
 * Formula: (firstChoiceAccuracy×0.5 + finalAccuracy×0.25 + speedScore×0.25) × hintPenaltyFactor
 */
export function calculateMasteryScore(params: {
  firstChoiceCorrectCount: number;
  totalCorrectCount: number;
  totalAttempts: number;
  avgTimeMs: number;
  expectedTimeMs: number;
  avgHintsUsed: number;
}): number {
  if (params.totalAttempts === 0) return 0;

  const firstChoiceAccuracy = params.firstChoiceCorrectCount / params.totalAttempts;
  const finalAccuracy = params.totalCorrectCount / params.totalAttempts;
  const speedScore = Math.min(1, Math.max(0, params.expectedTimeMs / Math.max(params.avgTimeMs, 1)));
  const hintPenaltyFactor = Math.max(0.4, 1.0 - params.avgHintsUsed * 0.15);

  const raw =
    firstChoiceAccuracy * 0.5 +
    finalAccuracy * 0.25 +
    speedScore * 0.25;

  return Math.min(1, raw * hintPenaltyFactor);
}

/** Expected time in ms per question for each subject */
export const EXPECTED_TIME_MS: Record<string, number> = {
  QR: 60_000,    // ~60s per QR question
  AR: 34_000,    // ~34s per AR question (fast pace)
  RC: 60_000,    // ~60s per RC question
  CIIW: 0,       // writing — no per-question time
};

/** Get attribute updates for a correct answer in a region */
export function getAttributeUpdate(region: string): Partial<{
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
}> {
  switch (region) {
    case "Clocktower of Logic": return { attrLogic: 1 };
    case "Forest of Patterns": return { attrInsight: 1 };
    case "Lake of Reflection": return { attrFocus: 1 };
    case "Workshop of Runes": return { attrCraft: 1 };
    default: return {};
  }
}
