"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  quillEnergy: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
}

interface Region {
  key: string;
  emoji: string;
  name: string;
  subtitle: string;
  description: string;
  colour: string;
  accent: string;
  href: string;
  unlockXP: number;
  shadowOnly?: boolean;
}

const REGIONS: Region[] = [
  {
    key: "archive",
    emoji: "🏛️",
    name: "Archive Hall",
    subtitle: "Home",
    description: "The heart of the Archive — your base of operations and quest board.",
    colour: "#B68A3A",
    accent: "#E7C777",
    href: "/home",
    unlockXP: 0,
  },
  {
    key: "clocktower",
    emoji: "⚙️",
    name: "Clocktower of Logic",
    subtitle: "Quantitative Reasoning",
    description: "Mathematical reasoning, patterns, and relationships forged in brass and gears.",
    colour: "#2E5A8E",
    accent: "#6BA3D6",
    href: "/quest/Clocktower%20of%20Logic",
    unlockXP: 0,
  },
  {
    key: "forest",
    emoji: "🌿",
    name: "Forest of Patterns",
    subtitle: "Abstract Reasoning",
    description: "Visual patterns, sequences, and transformations hidden among ancient trees.",
    colour: "#2E6B3A",
    accent: "#6BC47A",
    href: "/quest/Forest%20of%20Patterns",
    unlockXP: 0,
  },
  {
    key: "lake",
    emoji: "💧",
    name: "Lake of Reflection",
    subtitle: "Reading Comprehension",
    description: "Passages, inference, and language understanding mirrored in still waters.",
    colour: "#2E5A6B",
    accent: "#6BB4C4",
    href: "/quest/Lake%20of%20Reflection",
    unlockXP: 0,
  },
  {
    key: "workshop",
    emoji: "✍️",
    name: "Workshop of Runes",
    subtitle: "Creative Writing",
    description: "Forge stories and ideas into runes of lasting power.",
    colour: "#6B3A3A",
    accent: "#C47A6B",
    href: "/writing",
    unlockXP: 0,
  },
  {
    key: "shadow",
    emoji: "🌑",
    name: "Shadow Vault",
    subtitle: "Recovery",
    description: "A place of restoration for those whose aura has drifted from the light.",
    colour: "#3A2A5A",
    accent: "#9B7DD4",
    href: "/shadow",
    unlockXP: 0,
    shadowOnly: true,
  },
  {
    key: "tower",
    emoji: "🏰",
    name: "Tower of Ascension",
    subtitle: "Grand Tournament",
    description: "The ultimate challenge — a full ASET mock examination across all four tests.",
    colour: "#4A3A1A",
    accent: "#C4A44A",
    href: "/tournament",
    unlockXP: 100,
  },
];

export default function MapPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
          <div className="text-6xl mb-4 animate-pulse">🗺️</div>
          <p style={{ color: "#B68A3A" }}>Unrolling the World Map…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const visibleRegions = REGIONS.filter((r) => {
    if (r.shadowOnly) return profile.auraAlignment !== "bright";
    return true;
  });

  return (
    <div className="min-h-screen pb-16" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-5xl mx-auto px-6 py-10">
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
          <div className="text-6xl mb-4">🗺️</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              color: "#E7C777",
              fontFamily: "Georgia, serif",
              textShadow: "0 0 24px rgba(231, 199, 119, 0.35)",
            }}
          >
            World Map
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            {profile.totalXP.toLocaleString()} ✦ · Choose your destination
          </p>
        </div>

        {/* Region grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleRegions.map((region) => {
            const unlocked = profile.totalXP >= region.unlockXP;
            const isHome = region.key === "archive";
            const isShadow = region.shadowOnly;

            return unlocked ? (
              <Link
                key={region.key}
                href={region.href}
                className="block rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${region.colour}33, #1E2E5A)`,
                  border: `1px solid ${region.colour}77`,
                  boxShadow: isHome
                    ? `0 4px 24px ${region.colour}44`
                    : isShadow
                    ? `0 4px 20px ${region.colour}33`
                    : `0 4px 16px ${region.colour}22`,
                }}
              >
                <RegionCardContent
                  region={region}
                  unlocked
                  isHome={isHome}
                  isShadow={isShadow}
                />
              </Link>
            ) : (
              <div
                key={region.key}
                className="block rounded-2xl p-6 opacity-55 cursor-not-allowed select-none"
                style={{
                  background: `linear-gradient(135deg, ${region.colour}18, #1E2E5A)`,
                  border: `1px solid ${region.colour}33`,
                }}
              >
                <RegionCardContent
                  region={region}
                  unlocked={false}
                  isHome={false}
                  isShadow={false}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          className="mt-10 p-5 rounded-xl flex flex-wrap gap-6 text-xs"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A22" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: "#E7C777", boxShadow: "0 0 6px #E7C77799" }}
            />
            <span style={{ color: "#EADFC8", opacity: 0.7 }}>Accessible region</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: "#4A4A5A" }}
            />
            <span style={{ color: "#EADFC8", opacity: 0.7 }}>Locked — earn more ✦ to unlock</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#9B7DD4" }}>🌑</span>
            <span style={{ color: "#EADFC8", opacity: 0.7 }}>Visible when aura is unstable</span>
          </div>
        </div>
      </main>
    </div>
  );
}

interface CardProps {
  region: Region;
  unlocked: boolean;
  isHome: boolean;
  isShadow: boolean | undefined;
}

function RegionCardContent({ region, unlocked, isHome, isShadow }: CardProps) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <span className="text-5xl">{region.emoji}</span>
        <div className="text-right">
          {isHome && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
              }}
            >
              HOME
            </span>
          )}
          {!unlocked && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#1E2E5A", color: "#9CA3AF", border: "1px solid #4A4A5A" }}
            >
              🔒 Requires {region.unlockXP} ✦
            </span>
          )}
          {unlocked && !isHome && !isShadow && (
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{
                background: region.accent,
                boxShadow: `0 0 8px ${region.accent}99`,
              }}
            />
          )}
        </div>
      </div>

      <h3
        className="text-xl font-bold mb-1"
        style={{
          color: unlocked ? "#E7C777" : "#EADFC8",
          fontFamily: "Georgia, serif",
          opacity: unlocked ? 1 : 0.6,
        }}
      >
        {region.name}
      </h3>
      <p
        className="text-sm font-medium mb-2"
        style={{ color: region.accent, opacity: unlocked ? 1 : 0.5 }}
      >
        {region.subtitle}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "#EADFC8", opacity: unlocked ? 0.75 : 0.4 }}
      >
        {region.description}
      </p>

      {unlocked && !isHome && (
        <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: region.accent }}>
          <span>Enter</span>
          <span>→</span>
        </div>
      )}
    </>
  );
}
