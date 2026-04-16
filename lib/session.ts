import {
  KnowledgePoint,
  KnowledgePointCode,
  QR_KNOWLEDGE_POINTS,
  AR_KNOWLEDGE_POINTS,
  RC_KNOWLEDGE_POINTS,
  ALL_KNOWLEDGE_POINTS,
  SessionLength,
  SessionDifficulty,
} from "@/types/game";

export type TopicAllocation = {
  point: KnowledgePoint;
  count: number;
  isFamiliar: boolean;
};

/**
 * 80/20 session composition algorithm.
 * Returns a list of knowledge point allocations that sum to sessionLength.
 *
 * Familiar = masteryLevel >= 3 (Developing/Strong/Mastered)
 * Challenge = masteryLevel <= 2 (Seedling/Growing) OR never attempted
 */
export function buildSessionAllocation(params: {
  subject: "QR" | "AR" | "RC";
  masteryMap: Map<KnowledgePointCode, number>; // code → masteryLevel (1-5)
  sessionLength: SessionLength;
}): { familiar: TopicAllocation[]; challenge: TopicAllocation[] } {
  const { subject, masteryMap, sessionLength } = params;

  const allPoints =
    subject === "QR"
      ? QR_KNOWLEDGE_POINTS
      : subject === "AR"
      ? AR_KNOWLEDGE_POINTS
      : RC_KNOWLEDGE_POINTS;

  const familiarPool = allPoints.filter((p) => (masteryMap.get(p.code) ?? 0) >= 3);
  const challengePool = allPoints.filter((p) => (masteryMap.get(p.code) ?? 0) < 3);

  const familiarCount = Math.round(sessionLength * 0.8);
  const challengeCount = sessionLength - familiarCount;

  // If challengePool is empty (all mastered), use multi-step combinations
  const effectiveChallengePool =
    challengePool.length === 0 ? familiarPool : challengePool;

  return {
    familiar: distributeQuestionsAcrossTopics(familiarPool, familiarCount, true),
    challenge: distributeQuestionsAcrossTopics(effectiveChallengePool, challengeCount, false),
  };
}

/** Distribute N questions across a pool of topics as evenly as possible */
function distributeQuestionsAcrossTopics(
  pool: KnowledgePoint[],
  count: number,
  isFamiliar: boolean
): TopicAllocation[] {
  if (pool.length === 0 || count === 0) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const counts = new Map<KnowledgePointCode, number>();

  for (let i = 0; i < count; i++) {
    const point = shuffled[i % shuffled.length];
    counts.set(point.code, (counts.get(point.code) ?? 0) + 1);
  }

  return shuffled
    .filter((point) => counts.has(point.code))
    .map((point) => ({
      point,
      count: counts.get(point.code) ?? 0,
      isFamiliar,
    }));
}

/** Create a deterministic question hash from text */
export function hashQuestion(questionText: string, options: string[]): string {
  const raw = [questionText, ...options].join("|");
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash = hash & 0x7fffffff; // keep positive 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}
