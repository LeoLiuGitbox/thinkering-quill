"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";
import { getRelicLore } from "@/lib/relicLore";

interface ArtifactCatalogItem {
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
}

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
}

interface VaultSummary {
  unlockedCount: number;
  equippedCount: number;
  totalCount: number;
}

type Category = "all" | "wand" | "spellbook" | "lens" | "rune" | "compass" | "cloak" | "familiar";

const CATEGORY_ICONS: Record<string, string> = {
  wand: "🪄",
  spellbook: "📚",
  lens: "🔍",
  rune: "🪨",
  compass: "🧭",
  cloak: "🧣",
  familiar: "🦉",
};

const RARITY_COLOUR: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#6BA3D6",
  legendary: "#E7C777",
};

function rarityGlow(rarity: string): string {
  if (rarity === "legendary") return "0 0 16px rgba(231, 199, 119, 0.45)";
  if (rarity === "rare") return "0 0 10px rgba(107, 163, 214, 0.3)";
  return "none";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VaultPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactCatalogItem[]>([]);
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }
    fetchProfile(profileId);
  }, [router]);

  async function fetchProfile(id: string) {
    try {
      const res = await fetch(`/api/vault/${id}`);
      const data = await res.json();
      setProfile(data.profile ?? null);
      setArtifacts(data.artifacts ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F1C3F" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏺</div>
          <p style={{ color: "#B68A3A" }}>Opening the Vault…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const filtered =
    activeCategory === "all"
      ? artifacts
      : artifacts.filter((artifact) => artifact.category === activeCategory);

  const categories: Category[] = [
    "all",
    "wand",
    "spellbook",
    "lens",
    "rune",
    "compass",
    "cloak",
    "familiar",
  ];

  return (
    <div className="min-h-screen pb-16" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-80"
          style={{ color: "#B68A3A" }}
        >
          ← Archive Hall
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🏺</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 24px rgba(231, 199, 119, 0.35)",
            }}
          >
            Artifact Vault
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            {summary?.unlockedCount ?? 0} relic{(summary?.unlockedCount ?? 0) !== 1 ? "s" : ""} unsealed ·{" "}
            {summary?.equippedCount ?? 0} equipped · {summary?.totalCount ?? artifacts.length} known to the Hall
          </p>
        </div>

        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A22" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                How relics are earned
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Relics are not random gifts. Most unlock through sanctum rank ascension or badge milestones, then
                appear here as soon as the seal breaks.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                Sealed relics
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Locked cards stay visible so the learner can see what the Hall still holds and exactly what must be
                achieved to claim it.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                Best next step
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.8 }}>
                Grow rank in quests, earn badge tiers in the Tome, and revisit weak skills to unseal more of the
                vault.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: activeCategory === cat
                  ? "linear-gradient(135deg, #B68A3A, #E7C777)"
                  : "#1E2E5A",
                color: activeCategory === cat ? "#0F1C3F" : "#EADFC8",
                border: `1px solid ${activeCategory === cat ? "#E7C777" : "#B68A3A33"}`,
              }}
            >
              {cat === "all" ? "✨ All" : `${CATEGORY_ICONS[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              {cat !== "all" && (
                <span className="ml-1 opacity-60 text-xs">
                  ({artifacts.filter((artifact) => artifact.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Artifact Grid */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-14 text-center"
            style={{ background: "#1E2E5A", border: "1px solid #B68A3A33" }}
          >
            <div className="text-6xl mb-5">🔒</div>
            <h3
              className="text-xl font-bold mb-3"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              {activeCategory === "all"
                ? "The Hall has not revealed any relics yet."
                : `No ${activeCategory} relics recorded here yet.`}
            </h3>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "#EADFC8", opacity: 0.6 }}>
              {activeCategory === "all"
                ? "Progress through quests, badges, and sanctum ranks to begin unsealing the Vault."
                : `Progress through the matching sanctum path to reveal ${activeCategory} relics.`}
            </p>
            <Link
              href="/home"
              className="inline-block mt-6 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#B68A3A", color: "#0F1C3F" }}
            >
              Begin a Quest →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((artifact) => {
              const rarityColour = RARITY_COLOUR[artifact.rarity] ?? "#9CA3AF";
              const relicLore = getRelicLore(artifact.key);

              return (
                <div
                  key={artifact.id}
                  className="rounded-2xl p-6 relative transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    background: artifact.isUnlocked
                      ? "#1E2E5A"
                      : "linear-gradient(180deg, rgba(18, 29, 56, 0.98), rgba(9, 14, 29, 0.98))",
                    border: `1px solid ${artifact.isUnlocked ? `${rarityColour}55` : "#B68A3A33"}`,
                    boxShadow: artifact.isUnlocked ? rarityGlow(artifact.rarity) : "none",
                    opacity: artifact.isUnlocked ? 1 : 0.95,
                  }}
                >
                  {/* Equipped badge */}
                  {artifact.equipped && (
                    <span
                      className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                        color: "#0F1C3F",
                      }}
                    >
                      Equipped
                    </span>
                  )}
                  {!artifact.isUnlocked && (
                    <span
                      className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "#16213B",
                        color: "#E7C777",
                        border: "1px solid #B68A3A44",
                      }}
                    >
                      Sealed
                    </span>
                  )}

                  {/* Category icon + Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <span
                      className="text-4xl"
                      style={{ filter: artifact.isUnlocked ? "none" : "grayscale(1) brightness(0.8)" }}
                    >
                      {artifact.isUnlocked ? (CATEGORY_ICONS[artifact.category] ?? "🪄") : "🔒"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-bold leading-tight"
                        style={{
                          color: artifact.isUnlocked ? "#E7C777" : "#EADFC8",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        {artifact.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Rarity badge */}
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: `${rarityColour}22`,
                            color: rarityColour,
                            border: `1px solid ${rarityColour}55`,
                          }}
                        >
                          {artifact.rarity}
                        </span>
                        {/* Category label */}
                        <span className="text-xs capitalize" style={{ color: "#EADFC8", opacity: 0.55 }}>
                          {artifact.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lore text */}
                  <p
                    className="text-sm leading-relaxed mb-4 italic"
                    style={{ color: "#EADFC8", opacity: artifact.isUnlocked ? 0.8 : 0.62 }}
                  >
                    "{artifact.loreText}"
                  </p>

                  {relicLore && (
                    <div
                      className="rounded-xl p-4 mb-4"
                      style={{ background: "#16213B", border: "1px solid #B68A3A22" }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B68A3A" }}>
                        {relicLore.chapter}
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold mb-1" style={{ color: "#E7C777" }}>
                            Story
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.82 }}>
                            {relicLore.storyBeat}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold mb-1" style={{ color: "#E7C777" }}>
                            Special Magic · {relicLore.powerTitle}
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.82 }}>
                            {relicLore.powerEffect}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold mb-1" style={{ color: "#E7C777" }}>
                            How to obtain
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.82 }}>
                            {relicLore.obtainMethod}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    className="flex items-end justify-between gap-4 text-xs pt-3"
                    style={{ borderTop: "1px solid #B68A3A22" }}
                  >
                    <div className="space-y-1">
                      <p style={{ color: "#B68A3A" }}>
                        {artifact.isUnlocked
                          ? `Unlocked ${formatDate(artifact.unlockedAt ?? new Date().toISOString())}`
                          : "Seal still intact"}
                      </p>
                      <p style={{ color: "#EADFC8", opacity: 0.58 }}>
                        {artifact.unlockLabel}
                      </p>
                    </div>
                    <span
                      style={{
                        color: artifact.isUnlocked ? "#E7C777" : "#EADFC8",
                        opacity: artifact.isUnlocked ? 0.8 : 0.45,
                      }}
                    >
                      {artifact.unlockRule}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Discovery note */}
        <div
          className="mt-10 p-5 rounded-xl text-sm text-center"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A22" }}
        >
          <p style={{ color: "#EADFC8", opacity: 0.55 }}>
            🔍 The Vault records both what you have earned and what still waits behind a seal. Use the Tome and your
            next quest recommendations to decide which relic to chase next.
          </p>
        </div>
      </main>
    </div>
  );
}
