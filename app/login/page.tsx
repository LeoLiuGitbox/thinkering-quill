"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  quillEnergy: number;
}

const ROBE_COLOURS = [
  "#B68A3A", // Antique Gold
  "#2E5A8E", // Sapphire Blue
  "#6B3A8E", // Arcane Violet
  "#2E8E5A", // Emerald Green
  "#8E3A3A", // Crimson Red
  "#3A6B8E", // Teal Azure
];

const AURA_COLOURS: Record<string, string> = {
  bright: "rgba(231, 199, 119, 0.6)",
  unstable: "rgba(200, 75, 49, 0.5)",
  shadow_creeping: "rgba(100, 40, 80, 0.6)",
  shadow_drift: "rgba(50, 20, 40, 0.8)",
};

export default function LoginPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newMageName, setNewMageName] = useState("");
  const [selectedColour, setSelectedColour] = useState(ROBE_COLOURS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  }

  function selectProfile(profile: Profile) {
    localStorage.setItem("activeProfileId", profile.id.toString());
    localStorage.setItem("activeProfileName", profile.mageName);
    router.push("/home");
  }

  async function createProfile() {
    if (!newMageName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mageName: newMageName.trim(), avatarColour: selectedColour }),
      });
      const data = await res.json();
      if (data.profile) {
        localStorage.setItem("activeProfileId", data.profile.id.toString());
        localStorage.setItem("activeProfileName", data.profile.mageName);
        router.push("/onboarding");
      }
    } catch (err) {
      console.error("Failed to create profile:", err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">✨</div>
          <p style={{ color: "#B68A3A" }} className="text-lg">The Archive Hall awakens…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "linear-gradient(135deg, #0F1C3F 0%, #1E2E5A 50%, #0F1C3F 100%)" }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">🪶</div>
        <h1
          className="text-5xl font-bold mb-2"
          style={{
            color: "#E7C777",
            textShadow: "0 0 30px rgba(231, 199, 119, 0.5)",
            fontFamily: "Georgia, serif",
          }}
        >
          Thinkering Quill
        </h1>
        <p style={{ color: "#EADFC8", opacity: 0.7 }} className="text-lg">
          The Archive Hall awaits your magic
        </p>
      </div>

      {/* Profile Cards */}
      {profiles.length > 0 && (
        <div className="mb-8">
          <p
            style={{ color: "#B68A3A" }}
            className="text-center text-sm uppercase tracking-widest mb-6"
          >
            Choose your mage
          </p>
          <div className="flex flex-wrap justify-center gap-6 max-w-3xl">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                className="group relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  background: "#1E2E5A",
                  border: "1px solid #B68A3A",
                  width: "160px",
                  boxShadow: `0 0 20px ${AURA_COLOURS[profile.auraAlignment] || AURA_COLOURS.bright}`,
                }}
              >
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-3 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: profile.avatarColour,
                    boxShadow: `0 0 15px ${profile.avatarColour}88`,
                  }}
                >
                  🧙
                </div>

                {/* Name */}
                <p
                  className="font-bold text-center mb-1"
                  style={{ color: "#EADFC8", fontFamily: "Georgia, serif" }}
                >
                  {profile.mageName}
                </p>

                {/* Rank */}
                <p className="text-xs text-center mb-2" style={{ color: "#B68A3A" }}>
                  {profile.rank}
                </p>

                {/* XP */}
                <p className="text-xs" style={{ color: "#EADFC8", opacity: 0.6 }}>
                  {profile.totalXP} ✦
                </p>

                {/* Aura indicator */}
                {profile.auraAlignment !== "bright" && (
                  <div className="absolute -top-1 -right-1 text-lg">
                    {profile.auraAlignment === "unstable" && "⚡"}
                    {profile.auraAlignment === "shadow_creeping" && "🌑"}
                    {profile.auraAlignment === "shadow_drift" && "🌑"}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create New Profile */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            background: "transparent",
            border: "1px solid #B68A3A",
            color: "#E7C777",
            fontFamily: "Georgia, serif",
          }}
        >
          <span className="text-xl">✨</span>
          Summon a new mage
        </button>
      ) : (
        <div
          className="p-8 rounded-2xl max-w-sm w-full"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A" }}
        >
          <h2
            className="text-xl font-bold mb-6 text-center"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
          >
            Name your mage
          </h2>

          <input
            type="text"
            value={newMageName}
            onChange={(e) => setNewMageName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProfile()}
            placeholder="Enter mage name…"
            maxLength={30}
            className="w-full px-4 py-3 rounded-xl mb-6 outline-none transition-all"
            style={{
              background: "#0F1C3F",
              border: "1px solid #B68A3A",
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
            }}
          />

          <p className="text-sm mb-3 text-center" style={{ color: "#B68A3A" }}>
            Choose your robe colour
          </p>
          <div className="flex justify-center gap-3 mb-6">
            {ROBE_COLOURS.map((colour) => (
              <button
                key={colour}
                onClick={() => setSelectedColour(colour)}
                className="w-10 h-10 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: colour,
                  border: selectedColour === colour ? "3px solid #E7C777" : "2px solid transparent",
                  boxShadow: selectedColour === colour ? `0 0 12px ${colour}` : "none",
                }}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2 rounded-xl transition-all"
              style={{
                background: "transparent",
                border: "1px solid #B68A3A44",
                color: "#B68A3A",
              }}
            >
              Cancel
            </button>
            <button
              onClick={createProfile}
              disabled={creating || !newMageName.trim()}
              className="flex-1 py-2 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #B68A3A, #E7C777)",
                color: "#0F1C3F",
                fontFamily: "Georgia, serif",
              }}
            >
              {creating ? "Summoning…" : "Begin journey"}
            </button>
          </div>
        </div>
      )}

      {/* Parent link */}
      <Link
        href="/parent"
        className="mt-8 text-sm transition-opacity hover:opacity-80"
        style={{ color: "#B68A3A", opacity: 0.6 }}
      >
        Parent Dashboard →
      </Link>
    </div>
  );
}
