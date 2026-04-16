import { prisma } from "@/lib/prisma";
import { RANK_THRESHOLDS, Rank } from "@/types/game";

export type ArtifactCatalogItem = {
  id: number;
  key: string;
  name: string;
  category: string;
  rarity: string;
  loreText: string;
  unlockRule: string;
  unlockLabel: string;
  isUnlocked: boolean;
  equipped: boolean;
  unlockedAt: string | null;
};

const RANK_ALIASES: Record<string, Rank> = {
  "Novice Scribe": "Novice Scribe",
  "Rune Apprentice": "Rune Reader",
  "Rune Reader": "Rune Reader",
  "Arcane Solver": "Arcane Solver",
  "Puzzle Adept": "Pattern Weaver",
  "Pattern Weaver": "Pattern Weaver",
  "Quill Adept": "Quill Adept",
  "Logic Mage": "Archive Guardian",
  "Archive Guardian": "Archive Guardian",
  "Spell Scholar": "Spell Scholar",
  "Master of the Quill": "Grand Magus of the Quill",
  "Astral Archivist": "Astral Archivist",
  "Grand Magus of the Quill": "Grand Magus of the Quill",
  "Eternal Luminary": "Eternal Luminary",
};

function getRankIndex(rankName: string) {
  const normalized = RANK_ALIASES[rankName] ?? "Novice Scribe";
  return RANK_THRESHOLDS.findIndex((item) => item.rank === normalized);
}

function unlockRuleLabel(unlockRule: string) {
  if (unlockRule.startsWith("rank:")) {
    return `Reach ${unlockRule.replace("rank:", "")}`;
  }
  if (unlockRule.startsWith("badge:")) {
    const [, badgeKey, tier] = unlockRule.split(":");
    return `Earn ${humanizeBadgeKey(badgeKey)} (${tier})`;
  }
  return unlockRule;
}

function humanizeBadgeKey(badgeKey: string) {
  return badgeKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isArtifactUnlockedForProfile(args: {
  unlockRule: string;
  badgeSet: Set<string>;
  profileRankIndex: number;
}) {
  const { unlockRule, badgeSet, profileRankIndex } = args;

  if (unlockRule.startsWith("rank:")) {
    const requiredRank = unlockRule.replace("rank:", "");
    return profileRankIndex >= getRankIndex(requiredRank);
  }

  if (unlockRule.startsWith("badge:")) {
    const [, badgeKey, tier] = unlockRule.split(":");
    return badgeSet.has(`${badgeKey}:${tier}`);
  }

  return false;
}

export async function syncUnlockedArtifacts(profileId: number) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      badges: true,
      artifacts: true,
    },
  });

  if (!profile) return [];

  const allArtifacts = await prisma.artifact.findMany();
  const ownedArtifactIds = new Set(profile.artifacts.map((item) => item.artifactId));
  const badgeSet = new Set(profile.badges.map((badge) => `${badge.badgeKey}:${badge.tier}`));
  const profileRankIndex = getRankIndex(profile.rank);

  const unlocked = [];

  for (const artifact of allArtifacts) {
    if (ownedArtifactIds.has(artifact.id)) continue;

    const shouldUnlock = isArtifactUnlockedForProfile({
      unlockRule: artifact.unlockRule,
      badgeSet,
      profileRankIndex,
    });

    if (!shouldUnlock) continue;

    await prisma.profileArtifact.create({
      data: {
        profileId,
        artifactId: artifact.id,
        equipped: profile.artifacts.length === 0 && unlocked.length === 0,
      },
    });

    unlocked.push({
      key: artifact.key,
      name: artifact.name,
      unlockRuleLabel: unlockRuleLabel(artifact.unlockRule),
    });
  }

  return unlocked;
}

export async function getArtifactCatalogForProfile(profileId: number): Promise<ArtifactCatalogItem[]> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      badges: true,
      artifacts: {
        include: {
          artifact: true,
        },
      },
    },
  });

  if (!profile) return [];

  const badgeSet = new Set(profile.badges.map((badge) => `${badge.badgeKey}:${badge.tier}`));
  const profileRankIndex = getRankIndex(profile.rank);
  const ownedArtifacts = new Map(
    profile.artifacts.map((item) => [
      item.artifactId,
      { equipped: item.equipped, unlockedAt: item.unlockedAt.toISOString() },
    ])
  );

  const allArtifacts = await prisma.artifact.findMany({
    orderBy: [{ rarity: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return allArtifacts.map((artifact) => {
    const owned = ownedArtifacts.get(artifact.id);
    const unlockedByRule = isArtifactUnlockedForProfile({
      unlockRule: artifact.unlockRule,
      badgeSet,
      profileRankIndex,
    });

    return {
      id: artifact.id,
      key: artifact.key,
      name: artifact.name,
      category: artifact.category,
      rarity: artifact.rarity,
      loreText: artifact.loreText,
      unlockRule: artifact.unlockRule,
      unlockLabel: unlockedByRule
        ? "Unlocked and ready in your Vault."
        : unlockRuleLabel(artifact.unlockRule),
      isUnlocked: Boolean(owned),
      equipped: owned?.equipped ?? false,
      unlockedAt: owned?.unlockedAt ?? null,
    };
  });
}
