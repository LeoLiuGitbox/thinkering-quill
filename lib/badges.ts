import { prisma } from "@/lib/prisma";

type BadgeTier = "bronze" | "silver" | "gold";

export interface AwardedBadge {
  badgeKey: string;
  tier: BadgeTier;
}

/**
 * Check badge conditions relevant to the given trigger and award any newly
 * earned badges. Returns the list of badges awarded in this call (empty if
 * none are new).
 *
 * Triggers:
 *   "quest"   — called after a quiz attempt is saved
 *   "writing" — called after a writing draft_v2 is saved
 *   "exam"    — called after an exam session is completed
 */
export async function checkAndAwardBadges(
  profileId: number,
  trigger: "quest" | "writing" | "exam"
): Promise<AwardedBadge[]> {
  const awarded: AwardedBadge[] = [];

  // Load existing badges to avoid duplicates
  const existing = await prisma.badge.findMany({
    where: { profileId },
    select: { badgeKey: true, tier: true },
  });
  const earnedSet = new Set(existing.map((b) => `${b.badgeKey}:${b.tier}`));

  async function award(badgeKey: string, tier: BadgeTier) {
    const key = `${badgeKey}:${tier}`;
    if (earnedSet.has(key)) return;
    await prisma.badge.create({ data: { profileId, badgeKey, tier } });
    earnedSet.add(key);
    awarded.push({ badgeKey, tier });
  }

  // ── Exam trigger ─────────────────────────────────────────────────────────
  if (trigger === "exam") {
    const examCount = await prisma.examSession.count({
      where: { profileId, status: "completed" },
    });
    if (examCount >= 1) await award("tournament_victor", "bronze");
    if (examCount >= 5) await award("tournament_victor", "silver");

    const highScoreCount = await prisma.examSession.count({
      where: { profileId, status: "completed", percentage: { gte: 80 } },
    });
    if (highScoreCount >= 3) await award("tournament_victor", "gold");
  }

  // ── Writing trigger ───────────────────────────────────────────────────────
  if (trigger === "writing") {
    // A "completed" writing session has a saved draft_v2
    const writingCount = await prisma.writingSession.count({
      where: { profileId, draftV2: { not: null } },
    });
    if (writingCount >= 3) await award("story_weaver", "bronze");
    if (writingCount >= 10) await award("story_weaver", "silver");
    if (writingCount >= 25) await award("story_weaver", "gold");
  }

  // ── Quest trigger ─────────────────────────────────────────────────────────
  if (trigger === "quest") {
    // first_honest_spell: first correct answer without any hints
    const honestAttempt = await prisma.quizAttempt.findFirst({
      where: { profileId, isCorrect: true, hintsUsed: 0 },
      select: { id: true },
    });
    if (honestAttempt) await award("first_honest_spell", "bronze");

    // speed_caster: correct answers with 0 hints answered in < 45 s
    const fastCount = await prisma.quizAttempt.count({
      where: {
        profileId,
        isCorrect: true,
        hintsUsed: 0,
        timeSpentMs: { lte: 45_000 },
      },
    });
    if (fastCount >= 10) await award("speed_caster", "bronze");
    if (fastCount >= 50) await award("speed_caster", "silver");
    if (fastCount >= 150) await award("speed_caster", "gold");

    // pattern_prophet / logic_keeper / focus_bearer — sparks by region
    const regionBadges: [string, string][] = [
      ["Forest of Patterns", "pattern_prophet"],
      ["Clocktower of Logic", "logic_keeper"],
      ["Lake of Reflection", "focus_bearer"],
    ];
    for (const [region, badgeKey] of regionBadges) {
      const stat = await prisma.subjectStat.findUnique({
        where: { profileId_region: { profileId, region } },
        select: { totalSparks: true },
      });
      const sparks = stat?.totalSparks ?? 0;
      if (sparks >= 50) await award(badgeKey, "bronze");
      if (sparks >= 200) await award(badgeKey, "silver");
      if (sparks >= 500) await award(badgeKey, "gold");
    }
  }

  return awarded;
}
