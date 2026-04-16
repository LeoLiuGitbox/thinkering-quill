"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GameNav from "@/components/layout/GameNav";
import AscensionAvatarSigil from "@/components/ascension/AscensionAvatarSigil";
import { ASCENSION_RANKS } from "@/lib/ascension";
import { buildMageHallState } from "@/lib/mageHall";

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
  knowledgeMasteries?: Array<{
    knowledgePointCode: string;
    masteryLevel: number;
    masteryScore: number;
  }>;
  questSessions?: Array<{
    id: number;
    region: string;
    totalSparks: number;
    correctCount: number;
    questionCount: number;
    completedAt: string | null;
  }>;
}

interface VaultSummary {
  unlockedCount: number;
  equippedCount: number;
  totalCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  nascent: "Nascent",
  forming: "Forming",
  anchored: "Anchored",
  exalted: "Exalted",
};

export default function MageHallPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vaultSummary, setVaultSummary] = useState<VaultSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [profileRes, vaultRes] = await Promise.all([
          fetch(`/api/profile/${profileId}`),
          fetch(`/api/vault/${profileId}`),
        ]);

        const profileData = await profileRes.json();
        const vaultData = await vaultRes.json();

        if (!profileRes.ok) throw new Error(profileData.error || "Failed to load profile");
        if (!vaultRes.ok) throw new Error(vaultData.error || "Failed to load vault");

        setProfile(profileData.profile ?? null);
        setVaultSummary(vaultData.summary ?? null);
      } catch (error) {
        console.error("Failed to load Mage Hall:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const hallState = useMemo(() => {
    if (!profile) return null;
    return buildMageHallState(profile, vaultSummary);
  }, [profile, vaultSummary]);

  function startHallRecommendation() {
    if (!profile || !hallState?.recommendation || hallState.recommendation.focusCodes.length === 0) return;

    sessionStorage.setItem("questParams", JSON.stringify({
      profileId: profile.id,
      region: hallState.recommendation.region,
      sessionLength: 10,
      difficulty: "Journeyman",
      focusKnowledgePointCodes: hallState.recommendation.focusCodes,
      launchSource: "mage_hall",
    }));
    router.push(`/quest/${encodeURIComponent(hallState.recommendation.region)}/play`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07152E" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏛️</div>
          <p style={{ color: "#E7C777" }}>Opening the Mage Hall...</p>
        </div>
      </div>
    );
  }

  if (!profile || !hallState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07152E" }}>
        <div className="max-w-md rounded-3xl p-8 text-center" style={{ background: "#102347", border: "1px solid #B68A3A44" }}>
          <div className="text-5xl mb-4">🏛️</div>
          <p className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
            The Hall is quiet
          </p>
          <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.75 }}>
            Your ascension records could not be opened just now.
          </p>
          <Link
            href="/home"
            className="inline-block px-5 py-2 rounded-xl font-semibold"
            style={{ background: "#B68A3A", color: "#07152E" }}
          >
            Return to Archive Hall
          </Link>
        </div>
      </div>
    );
  }

  const readinessPercent = Math.round(hallState.readiness * 100);
  const currentRankIndex = ASCENSION_RANKS.findIndex((item) => item.rank === hallState.currentRank.rank);

  return (
    <div className="min-h-screen pb-16" style={{ background: "radial-gradient(circle at top, #183567 0%, #07152E 56%, #040C1A 100%)" }}>
      <GameNav profile={profile} />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: "#B68A3A" }}>
              Mage Hall
            </p>
            <h1 className="text-4xl font-bold mb-2" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
              {hallState.hallTierName}
            </h1>
            <p className="max-w-2xl text-sm" style={{ color: "#EADFC8", opacity: 0.8 }}>
              {hallState.hallTierLore}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/vault"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#102347", color: "#EADFC8", border: "1px solid #6BA3D655" }}
            >
              Open Vault
            </Link>
            <Link
              href="/tome"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#102347", color: "#EADFC8", border: "1px solid #B68A3A55" }}
            >
              Open Tome
            </Link>
          </div>
        </div>

        <section
          className="rounded-[28px] p-8 mb-8"
          style={{ background: "linear-gradient(145deg, rgba(18,35,71,0.92), rgba(7,21,46,0.94))", border: "1px solid #B68A3A55", boxShadow: "0 20px 70px rgba(0, 0, 0, 0.3)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] mb-3" style={{ color: "#6BA3D6" }}>
                Current seat in the Hall
              </p>
              <h2 className="text-3xl font-bold mb-2" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
                {profile.mageName}, {hallState.currentRank.hallTitle}
              </h2>
              <p className="text-sm mb-5" style={{ color: "#EADFC8", opacity: 0.78 }}>
                {hallState.currentRank.lore}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Hall readiness", value: `${readinessPercent}%`, helper: `${hallState.readyCount}/${Math.max(1, hallState.requirementSummaries.length)} signs met` },
                  { label: "Completed quests", value: String(hallState.completedQuestCount), helper: "Recorded rites" },
                  { label: "Strong skills", value: String(hallState.strongSkillCount), helper: "Mastery level 4+" },
                  { label: "Unsealed relics", value: String(vaultSummary?.unlockedCount ?? 0), helper: "Vault holdings" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl p-4"
                    style={{ background: "#0F1C3F", border: "1px solid #B68A3A22" }}
                  >
                    <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: "#B68A3A" }}>
                      {item.label}
                    </p>
                    <p className="text-2xl font-bold mb-1" style={{ color: "#E7C777" }}>
                      {item.value}
                    </p>
                    <p className="text-xs" style={{ color: "#EADFC8", opacity: 0.64 }}>
                      {item.helper}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-5 mb-5" style={{ background: "#0F1C3F", border: "1px solid #6BA3D644" }}>
                <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#6BA3D6" }}>
                    Next rite
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#E7C777" }}>
                    {hallState.nextRank ? hallState.nextRank.rank : "Final chamber reached"}
                  </p>
                </div>
                <p className="text-lg font-bold mb-2" style={{ color: "#E7C777" }}>
                  {hallState.riteTitle}
                </p>
                <p className="text-sm mb-4" style={{ color: "#EADFC8", opacity: 0.8 }}>
                  {hallState.riteSummary}
                </p>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "#16213B" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${readinessPercent}%`, background: "linear-gradient(90deg, #6BA3D6, #E7C777)" }}
                  />
                </div>
              </div>

              {hallState.recommendation && (
                <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl p-5" style={{ background: "#132B52", border: "1px solid #6BA3D655" }}>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#6BA3D6" }}>
                      {hallState.recommendation.title}
                    </p>
                    <p className="text-sm mb-2" style={{ color: "#EADFC8", opacity: 0.82 }}>
                      {hallState.recommendation.summary}
                    </p>
                    <p className="text-sm" style={{ color: "#E7C777" }}>
                      {hallState.recommendation.region} · {hallState.recommendation.focusCodes.join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={startHallRecommendation}
                    className="px-5 py-3 rounded-xl font-semibold"
                    style={{ background: "linear-gradient(135deg, #B68A3A, #E7C777)", color: "#07152E" }}
                  >
                    Begin Hall-sanctioned Quest
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center text-center">
              <AscensionAvatarSigil meta={hallState.currentRank} size={208} />
              <p className="text-sm mt-5 mb-1" style={{ color: "#B68A3A" }}>
                Sanctum Power
              </p>
              <p className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>
                {hallState.currentRank.powerName}
              </p>
              <p className="max-w-sm text-sm" style={{ color: "#EADFC8", opacity: 0.8 }}>
                {hallState.currentRank.powerDescription}
              </p>
            </div>
          </div>
        </section>

        {hallState.requirementSummaries.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
                  Ascension Conditions
                </h2>
                <p className="text-sm" style={{ color: "#EADFC8", opacity: 0.72 }}>
                  These are Hall readiness signals for the next chamber. They shape the story and progression loop even if XP already grants rank.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {hallState.requirementSummaries.map((item) => {
                const percent = Math.min(100, item.target > 0 ? (item.current / item.target) * 100 : 100);
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl p-5"
                    style={{ background: "#102347", border: `1px solid ${item.met ? "#6BC47A55" : "#B68A3A33"}` }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold" style={{ color: "#E7C777" }}>
                        {item.label}
                      </p>
                      <span style={{ color: item.met ? "#6BC47A" : "#B68A3A" }}>
                        {item.met ? "Met" : "Pending"}
                      </span>
                    </div>
                    <p className="text-2xl font-bold mb-3" style={{ color: "#EADFC8" }}>
                      {item.current}/{item.target}
                      {item.suffix ? <span className="text-sm ml-1">{item.suffix}</span> : null}
                    </p>
                    <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#16213B" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, background: item.met ? "linear-gradient(90deg, #6BC47A, #B7F0C2)" : "linear-gradient(90deg, #6BA3D6, #E7C777)" }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "#EADFC8", opacity: 0.62 }}>
                      {item.met ? "This sign is already recognised by the Hall." : "The Hall is still waiting for this sign."}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
            The Five Schools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {hallState.schoolSummaries.map((school) => (
              <div
                key={school.code}
                className="rounded-3xl p-6"
                style={{ background: "linear-gradient(180deg, rgba(16,35,71,0.95), rgba(8,19,39,0.98))", border: `1px solid ${school.colour}55`, boxShadow: `0 12px 36px ${school.colour}18` }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-3xl mb-2">{school.icon}</p>
                    <h3 className="text-xl font-bold" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
                      {school.label}
                    </h3>
                    <p className="text-sm" style={{ color: school.colour }}>
                      {school.region}
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${school.colour}22`, color: school.colour, border: `1px solid ${school.colour}55` }}
                  >
                    {STATUS_LABELS[school.hallStatus]}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Attribute", value: String(school.attributeValue) },
                    { label: "Strong", value: String(school.strongCount) },
                    { label: "Mastered", value: String(school.masteredCount) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: "#0F1C3F" }}>
                      <p className="text-xs mb-1" style={{ color: "#B68A3A" }}>
                        {item.label}
                      </p>
                      <p className="text-lg font-bold" style={{ color: "#E7C777" }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "#16213B" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (school.avgMastery / 5) * 100)}%`, background: `linear-gradient(90deg, ${school.colour}, #E7C777)` }}
                  />
                </div>
                <p className="text-sm mb-3" style={{ color: "#EADFC8", opacity: 0.8 }}>
                  Average mastery: {school.avgMastery.toFixed(1)} / 5
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#EADFC8", opacity: 0.74 }}>
                  {school.story}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
            Hall Lineage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {ASCENSION_RANKS.map((item, index) => {
              const unlocked = index <= currentRankIndex;
              const active = item.rank === hallState.currentRank.rank;
              return (
                <div
                  key={item.rank}
                  className="rounded-3xl p-5 text-center"
                  style={{
                    background: active ? "#132B52" : "#102347",
                    border: `1px solid ${active ? "#E7C777" : unlocked ? "#6BA3D655" : "#B68A3A22"}`,
                    opacity: unlocked ? 1 : 0.74,
                  }}
                >
                  <AscensionAvatarSigil meta={item} locked={!unlocked} size={110} />
                  <p className="text-xs mt-4 mb-2" style={{ color: "#6BA3D6" }}>
                    {item.xpRequired} XP
                  </p>
                  <p className="font-bold mb-2" style={{ color: "#E7C777" }}>
                    {item.shortTitle}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#EADFC8", opacity: 0.68 }}>
                    {item.unlockVisual}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
