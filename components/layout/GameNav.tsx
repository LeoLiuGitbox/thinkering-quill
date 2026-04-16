"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavProfile {
  mageName?: string;
  avatarColour?: string;
  totalXP?: number;
  rank?: string;
  auraAlignment?: string;
  quillEnergy?: number;
}

const AURA_GLOW: Record<string, string> = {
  bright: "rgba(231, 199, 119, 0.5)",
  unstable: "rgba(200, 75, 49, 0.5)",
  shadow_creeping: "rgba(100, 40, 80, 0.6)",
  shadow_drift: "rgba(50, 20, 40, 0.8)",
};

const AURA_ICON: Record<string, string> = {
  bright: "✨",
  unstable: "⚡",
  shadow_creeping: "🌑",
  shadow_drift: "🌑",
};

const NAV_ITEMS = [
  { href: "/home", label: "Archive Hall", icon: "🏛️" },
  { href: "/hall", label: "Mage Hall", icon: "🏰" },
  { href: "/map", label: "World Map", icon: "🗺️" },
  { href: "/oracle", label: "Oracle", icon: "🔮" },
  { href: "/tome", label: "Wizard's Tome", icon: "📖" },
  { href: "/journal", label: "Field Journal", icon: "📔" },
  { href: "/vault", label: "Artifact Vault", icon: "💎" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function GameNav({ profile: profileRaw }: { profile?: any }) {
  const profile = profileRaw as NavProfile | null | undefined;
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const inActiveQuest = Boolean(pathname?.startsWith("/quest/") && pathname?.endsWith("/play"));
  const inActiveTournament = Boolean(pathname?.startsWith("/tournament/") && pathname !== "/tournament");
  const inProtectedRun = inActiveQuest || inActiveTournament;
  const challengeLabel = inActiveTournament ? "tournament" : "quest";

  function closeMenus() {
    setMenuOpen(false);
  }

  function requestNavigation(href: string) {
    if (href === pathname) {
      closeMenus();
      return;
    }

    if (inProtectedRun) {
      setPendingHref(href);
      closeMenus();
      return;
    }

    closeMenus();
    router.push(href);
  }

  function abandonAndNavigate() {
    const target = pendingHref;
    setPendingHref(null);
    sessionStorage.removeItem("questParams");
    if (!target) return;
    router.push(target);
  }

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{
          background: "#0F1C3F",
          borderColor: "#B68A3A44",
          backdropFilter: "blur(10px)",
        }}
      >
      {/* Logo */}
      <button
        onClick={() => requestNavigation("/home")}
        className="flex items-center gap-2 text-lg font-bold transition-opacity hover:opacity-80"
        style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
      >
        <span className="text-2xl">🪶</span>
        <span className="hidden sm:inline">Thinkering Quill</span>
      </button>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.href}
            onClick={() => requestNavigation(item.href)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:opacity-100"
            style={{
              color: pathname === item.href ? "#E7C777" : "#EADFC8",
              background: pathname === item.href ? "#1E2E5A" : "transparent",
              opacity: pathname === item.href ? 1 : 0.7,
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Right side: XP + Profile */}
      <div className="flex items-center gap-4">
        {profile && (
          <>
            {/* Quill Energy */}
            <div className="hidden sm:flex items-center gap-1 text-sm" style={{ color: "#EADFC8" }}>
              <span>🪶</span>
              <span style={{ color: "#E7C777" }}>{profile.quillEnergy}</span>
            </div>

            {/* XP Sparks */}
            <div className="hidden sm:flex items-center gap-1 text-sm" style={{ color: "#EADFC8" }}>
              <span>✦</span>
              <span style={{ color: "#E7C777" }}>{(profile.totalXP ?? 0).toLocaleString()}</span>
            </div>

            {/* Avatar + Aura */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:opacity-90"
              style={{
                background: "#1E2E5A",
                border: `1px solid #B68A3A44`,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{
                  background: profile.avatarColour,
                  boxShadow: `0 0 8px ${AURA_GLOW[profile.auraAlignment ?? "bright"] || AURA_GLOW.bright}`,
                }}
              >
                🧙
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "#E7C777" }}>
                  {profile.mageName}
                </p>
                <p className="text-xs" style={{ color: "#B68A3A" }}>
                  {profile.rank}
                </p>
              </div>
              <span className="text-xs">{AURA_ICON[profile.auraAlignment ?? "bright"]}</span>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="absolute top-14 right-4 rounded-xl shadow-xl z-50 p-2 min-w-48"
                style={{ background: "#1E2E5A", border: "1px solid #B68A3A" }}
              >
                <button
                  onClick={() => requestNavigation("/hall")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition"
                  style={{ color: "#EADFC8" }}
                >
                  🏰 Mage Hall
                </button>
                <button
                  onClick={() => requestNavigation("/tome")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition w-full text-left"
                  style={{ color: "#EADFC8" }}
                >
                  📖 Wizard&apos;s Tome
                </button>
                <button
                  onClick={() => requestNavigation("/vault")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition w-full text-left"
                  style={{ color: "#EADFC8" }}
                >
                  💎 Artifact Vault
                </button>
                <button
                  onClick={() => requestNavigation("/parent")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition w-full text-left"
                  style={{ color: "#EADFC8" }}
                >
                  👁️ Parent Dashboard
                </button>
                <button
                  onClick={() => requestNavigation("/settings")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition w-full text-left"
                  style={{ color: "#EADFC8" }}
                >
                  ⚙️ AI Settings
                </button>
                <hr style={{ borderColor: "#B68A3A22", margin: "4px 0" }} />
                <button
                  onClick={() => {
                    closeMenus();
                    localStorage.removeItem("activeProfileId");
                    localStorage.removeItem("activeProfileName");
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition text-left"
                  style={{ color: "#B68A3A" }}
                >
                  🚪 Switch mage
                </button>
              </div>
            )}
          </>
        )}

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          style={{ color: "#B68A3A" }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-14 left-0 right-0 border-b z-50 p-4"
          style={{ background: "#0F1C3F", borderColor: "#B68A3A44" }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => requestNavigation(item.href)}
              className="flex items-center gap-2 px-3 py-3 rounded-lg text-sm transition-all"
              style={{ color: "#EADFC8", width: "100%", textAlign: "left" }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
      </nav>

      {pendingHref && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-6"
          style={{ background: "rgba(15, 28, 63, 0.84)", backdropFilter: "blur(3px)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6"
            style={{ background: "#1A2545", border: "1px solid #C84B31" }}
          >
            <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: "#F5A39A" }}>
              Leave Active {challengeLabel === "quest" ? "Quest" : "Tournament"}
            </p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
              Continue this {challengeLabel} or abandon it?
            </h2>
            <p className="mb-6" style={{ color: "#EADFC8", lineHeight: 1.75 }}>
              The current {challengeLabel} is still in progress. If you leave through the Hall navigation now, this run
              will be treated as abandoned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingHref(null)}
                className="flex-1 rounded-xl py-3 font-bold"
                style={{ border: "1px solid #B68A3A55", color: "#E7C777" }}
              >
                Return to {challengeLabel}
              </button>
              <button
                onClick={abandonAndNavigate}
                className="flex-1 rounded-xl py-3 font-bold"
                style={{ background: "#C84B31", color: "#FDF1E1" }}
              >
                Abandon and leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
