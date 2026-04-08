"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface ArtifactDef {
  id: number;
  key: string;
  name: string;
  category: string;
  rarity: string;
  loreText: string;
  unlockRule: string;
}

interface ProfileArtifact {
  profileId: number;
  artifactId: number;
  unlockedAt: string;
  equipped: boolean;
  artifact: ArtifactDef;
}

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  artifacts: ProfileArtifact[];
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
      const res = await fetch(`/api/profile/${id}`);
      const data = await res.json();
      setProfile(data.profile ?? data);
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

  const artifacts = profile.artifacts ?? [];

  const filtered =
    activeCategory === "all"
      ? artifacts
      : artifacts.filter((a) => a.artifact.category === activeCategory);

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
            {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""} collected ·{" "}
            {artifacts.filter((a) => a.equipped).length} equipped
          </p>
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
                  ({artifacts.filter((a) => a.artifact.category === cat).length})
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
                ? "Your vault awaits its first treasure."
                : `No ${activeCategory} artifacts yet.`}
            </h3>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "#EADFC8", opacity: 0.6 }}>
              {activeCategory === "all"
                ? "Complete quests and tournaments to unlock artifacts."
                : `Complete relevant quests to discover ${activeCategory} artifacts.`}
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
            {filtered.map((pa) => {
              const art = pa.artifact;
              const rarityColour = RARITY_COLOUR[art.rarity] ?? "#9CA3AF";

              return (
                <div
                  key={pa.artifactId}
                  className="rounded-2xl p-6 relative transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    background: "#1E2E5A",
                    border: `1px solid ${rarityColour}55`,
                    boxShadow: rarityGlow(art.rarity),
                  }}
                >
                  {/* Equipped badge */}
                  {pa.equipped && (
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

                  {/* Category icon + Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-4xl">
                      {CATEGORY_ICONS[art.category] ?? "🪄"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-bold leading-tight"
                        style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
                      >
                        {art.name}
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
                          {art.rarity}
                        </span>
                        {/* Category label */}
                        <span className="text-xs capitalize" style={{ color: "#EADFC8", opacity: 0.55 }}>
                          {art.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lore text */}
                  <p
                    className="text-sm leading-relaxed mb-4 italic"
                    style={{ color: "#EADFC8", opacity: 0.8 }}
                  >
                    "{art.loreText}"
                  </p>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between text-xs pt-3"
                    style={{ borderTop: "1px solid #B68A3A22" }}
                  >
                    <span style={{ color: "#B68A3A" }}>
                      Unlocked {formatDate(pa.unlockedAt)}
                    </span>
                    {art.unlockRule && (
                      <span style={{ color: "#EADFC8", opacity: 0.45 }}>
                        {art.unlockRule}
                      </span>
                    )}
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
            🔍 More artifacts await discovery. Complete quests, tournaments, and challenges to unlock them.
          </p>
        </div>
      </main>
    </div>
  );
}
