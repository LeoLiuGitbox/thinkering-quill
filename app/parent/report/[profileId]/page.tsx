"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BadgeSummary {
  badgeKey: string;
  tier: string;
  earnedAt: string;
}

interface SubjectStat {
  region: string;
  totalAttempts: number;
  correctAttempts: number;
  totalSparks: number;
  bestStreak: number;
  lastPracticed: string | null;
}

interface KnowledgeMastery {
  knowledgePointCode: string;
  masteryLevel: number;
  totalAttempts: number;
  firstChoiceCorrect: number;
}

interface DailyActivity {
  activityDate: string;
  questCount: number;
  examCount: number;
  writingCount: number;
  sparksEarned: number;
}

interface IntegrityReport {
  hasPatterns: boolean;
  summary: string;
  details: string[];
}

interface ProfileReport {
  id: number;
  mageName: string;
  avatarColour: string;
  totalXP: number;
  rank: string;
  auraAlignment: string;
  shadowScore: number;
  weeklyGoal: number;
  attrLogic: number;
  attrInsight: number;
  attrFocus: number;
  attrCraft: number;
  attrWisdom: number;
  badges: BadgeSummary[];
  subjectStats: SubjectStat[];
  knowledgeMasteries: KnowledgeMastery[];
  recentActivity: DailyActivity[];
  integrityReport: IntegrityReport;
}

const REGION_LABELS: Record<string, string> = {
  "Clocktower of Logic": "Quantitative Reasoning",
  "Forest of Patterns": "Abstract Reasoning",
  "Lake of Reflection": "Reading Comprehension",
  "Workshop of Runes": "Creative Writing",
  "Tower of Ascension": "Grand Tournament",
};

const MASTERY_LABELS: Record<number, string> = {
  1: "Seedling",
  2: "Growing",
  3: "Developing",
  4: "Strong",
  5: "Mastered",
};

const KP_NAMES: Record<string, string> = {
  "QR-01": "Number Patterns", "QR-02": "Probability", "QR-03": "Combinatorics",
  "QR-04": "Ratio & Proportion", "QR-05": "Fractions & Percentages", "QR-06": "Time & Rate",
  "QR-07": "Logical Deduction", "QR-08": "Data Tables", "QR-09": "Charts & Graphs",
  "QR-10": "Measurement", "QR-11": "Money & Economics", "QR-12": "Venn Diagrams",
  "QR-13": "Logic Puzzles", "QR-14": "Symmetry & Transformation", "QR-15": "Multi-step Problems",
  "QR-16": "Science Reasoning",
  "AR-01": "Rotation", "AR-02": "Reflection", "AR-03": "Fill Changes",
  "AR-04": "Size Changes", "AR-05": "Element Count", "AR-06": "Position Changes",
  "AR-07": "Combination Rules", "AR-08": "Odd-one-out", "AR-09": "Multi-attribute Change",
  "AR-10": "Analogy",
  "RC-01": "Main Idea", "RC-02": "Explicit Info", "RC-03": "Inference",
  "RC-04": "Vocabulary in Context", "RC-05": "Text Structure", "RC-06": "Charts & Diagrams",
};

const SUBJECT_REGION: Record<string, string> = {
  QR: "Clocktower of Logic",
  AR: "Forest of Patterns",
  RC: "Lake of Reflection",
};

function getWeeklyXP(activity: DailyActivity[]) {
  return activity.reduce((sum, item) => sum + item.sparksEarned, 0);
}

function getWeeklySessions(activity: DailyActivity[]) {
  return activity.reduce((sum, item) => sum + item.questCount + item.examCount + item.writingCount, 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not yet practised";
  return new Date(value).toLocaleDateString("en-AU");
}

export default function ParentReportPage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/parent/report/${params.profileId}`);
        if (!res.ok) throw new Error("Failed to load report");
        const data = await res.json();
        setProfile(data.profile ?? null);
      } catch (err) {
        console.error(err);
        setError("Could not load the parent report.");
      } finally {
        setLoading(false);
      }
    }

    if (params.profileId) {
      loadReport();
    }
  }, [params.profileId]);

  function handlePrint() {
    window.print();
  }

  function handleStartRecommendedQuest() {
    if (!profile || !recommendedQuestRegion || recommendedFocusTopics.length === 0) return;

    localStorage.setItem("activeProfileId", String(profile.id));
    sessionStorage.setItem("questParams", JSON.stringify({
      profileId: profile.id,
      region: recommendedQuestRegion,
      sessionLength: 10,
      difficulty: "Journeyman",
      focusKnowledgePointCodes: recommendedFocusTopics.map((topic) => topic.knowledgePointCode),
      launchSource: "parent_report",
      launchedForMageName: profile.mageName,
    }));
    router.push(`/quest/${encodeURIComponent(recommendedQuestRegion)}/play`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f2e8" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🧾</div>
          <p style={{ color: "#5b4631" }}>Preparing parent report…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f2e8" }}>
        <div className="max-w-md rounded-2xl p-8 text-center" style={{ background: "#ffffff", border: "1px solid #d4b16a" }}>
          <p className="text-xl font-bold mb-2" style={{ color: "#5b4631" }}>Report unavailable</p>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            {error ?? "The learner report could not be loaded."}
          </p>
          <button
            onClick={() => router.push("/parent")}
            className="px-5 py-2 rounded-xl font-semibold"
            style={{ background: "#d4b16a", color: "#1f2937" }}
          >
            Back to Parent Dashboard
          </button>
        </div>
      </div>
    );
  }

  const weeklyXP = getWeeklyXP(profile.recentActivity);
  const weeklySessions = getWeeklySessions(profile.recentActivity);
  const strongestTopics = [...profile.knowledgeMasteries]
    .sort((a, b) => {
      if (a.masteryLevel !== b.masteryLevel) return b.masteryLevel - a.masteryLevel;
      return b.firstChoiceCorrect - a.firstChoiceCorrect;
    })
    .slice(0, 3);
  const supportTopics = [...profile.knowledgeMasteries]
    .sort((a, b) => {
      if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
      return a.firstChoiceCorrect - b.firstChoiceCorrect;
    })
    .slice(0, 3);
  const avgAccuracy = profile.subjectStats.length > 0
    ? Math.round(
        profile.subjectStats.reduce((sum, item) => {
          const pct = item.totalAttempts > 0 ? item.correctAttempts / item.totalAttempts : 0;
          return sum + pct;
        }, 0) / profile.subjectStats.length * 100
      )
    : 0;
  const masteredCount = profile.knowledgeMasteries.filter((item) => item.masteryLevel >= 4).length;
  const recommendedQuestRegion = supportTopics.length > 0
    ? SUBJECT_REGION[supportTopics[0].knowledgePointCode.slice(0, 2)] ?? "Clocktower of Logic"
    : null;
  const recommendedQuestLabel = recommendedQuestRegion ? REGION_LABELS[recommendedQuestRegion] ?? recommendedQuestRegion : null;
  const recommendedFocusTopics = recommendedQuestRegion
    ? supportTopics.filter(
        (topic) => SUBJECT_REGION[topic.knowledgePointCode.slice(0, 2)] === recommendedQuestRegion
      )
    : [];
  const topWeakSkill = supportTopics[0] ?? null;

  return (
    <div className="min-h-screen parent-report-page" style={{ background: "#f7f2e8" }}>
      <main className="max-w-5xl mx-auto px-6 py-10 parent-report-content">
        <div className="flex items-center justify-between gap-4 mb-8 parent-report-actions print:hidden">
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/home"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#ffffff", color: "#5b4631", border: "1px solid #d4b16a" }}
            >
              ← Archive Hall
            </Link>
            <Link
              href="/parent"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#ffffff", color: "#5b4631", border: "1px solid #d4b16a" }}
            >
              ← Back to Parent Dashboard
            </Link>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#d4b16a", color: "#1f2937" }}
            >
              Print Report
            </button>
          </div>
          {recommendedQuestLabel && recommendedFocusTopics.length > 0 && (
            <button
              onClick={handleStartRecommendedQuest}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#5b4631", color: "#f7f2e8" }}
            >
              Start Recommended Quest
            </button>
          )}
        </div>

        <section className="rounded-3xl p-8 mb-6 parent-report-hero"
          style={{ background: "#ffffff", border: "1px solid #d4b16a", boxShadow: "0 12px 30px rgba(91, 70, 49, 0.08)" }}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: "#9a7b53" }}>
                Thinkering Quill Parent Report
              </p>
              <h1 className="text-4xl font-bold mb-2" style={{ color: "#5b4631", fontFamily: "Georgia, serif" }}>
                {profile.mageName}
              </h1>
              <p className="text-base" style={{ color: "#6b7280" }}>
                {profile.rank} · Generated on {new Date().toLocaleDateString("en-AU")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <div className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9a7b53" }}>Weekly Sparks</p>
                <p className="text-2xl font-bold" style={{ color: "#5b4631" }}>{weeklyXP}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9a7b53" }}>Sessions This Week</p>
                <p className="text-2xl font-bold" style={{ color: "#5b4631" }}>{weeklySessions}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9a7b53" }}>Average Accuracy</p>
                <p className="text-2xl font-bold" style={{ color: "#5b4631" }}>{avgAccuracy}%</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9a7b53" }}>Strong Topics</p>
                <p className="text-2xl font-bold" style={{ color: "#5b4631" }}>{masteredCount}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl p-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>Learning Summary</h2>
            <div className="space-y-3 text-sm" style={{ color: "#4b5563" }}>
              <p>
                <strong style={{ color: "#5b4631" }}>{profile.mageName}</strong> has earned <strong style={{ color: "#5b4631" }}>{profile.totalXP} sparks</strong> and is currently ranked as <strong style={{ color: "#5b4631" }}>{profile.rank}</strong>.
              </p>
              <p>
                Over the last 7 days, the learner completed <strong style={{ color: "#5b4631" }}>{weeklySessions} learning sessions</strong> and gained <strong style={{ color: "#5b4631" }}>{weeklyXP} sparks</strong>.
              </p>
              <p>
                The strongest current pattern is <strong style={{ color: "#5b4631" }}>{profile.integrityReport.hasPatterns ? "steady participation with some fast-answer signals to watch" : "healthy, steady learning behaviour"}</strong>.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-sm uppercase tracking-[0.2em] mb-3" style={{ color: "#9a7b53" }}>
                Subject Snapshot
              </h3>
              <div className="space-y-4">
                {profile.subjectStats.length === 0 ? (
                  <p className="text-sm" style={{ color: "#6b7280" }}>No subject data available yet.</p>
                ) : profile.subjectStats.map((subject) => {
                  const accuracy = subject.totalAttempts > 0
                    ? Math.round((subject.correctAttempts / subject.totalAttempts) * 100)
                    : 0;
                  return (
                    <div key={subject.region}>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div>
                          <p className="font-semibold" style={{ color: "#5b4631" }}>
                            {REGION_LABELS[subject.region] ?? subject.region}
                          </p>
                          <p className="text-xs" style={{ color: "#6b7280" }}>
                            Last practised {formatDate(subject.lastPracticed)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "#5b4631" }}>{accuracy}%</p>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#efe5d3" }}>
                        <div className="h-full rounded-full" style={{ width: `${accuracy}%`, background: "#b28746" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl p-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>Teacher Notes</h2>
            <div className="rounded-2xl p-4 mb-4" style={{ background: "#f7f2e8" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#5b4631" }}>Learning behaviour</p>
              <p className="text-sm" style={{ color: "#4b5563" }}>{profile.integrityReport.summary}</p>
            </div>
            <div className="rounded-2xl p-4 mb-4" style={{ background: "#f7f2e8" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#5b4631" }}>Recommended next quest</p>
              {recommendedQuestLabel ? (
                <>
                  <p className="text-sm mb-2" style={{ color: "#4b5563" }}>
                    Start a targeted quest in <strong style={{ color: "#5b4631" }}>{recommendedQuestLabel}</strong>.
                  </p>
                  <p className="text-sm" style={{ color: "#4b5563" }}>
                    Best focus: {recommendedFocusTopics.map((topic) => KP_NAMES[topic.knowledgePointCode] ?? topic.knowledgePointCode).join(", ")}.
                  </p>
                  <button
                    onClick={handleStartRecommendedQuest}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold print:hidden"
                    style={{ background: "#5b4631", color: "#f7f2e8" }}
                  >
                    Launch this quest
                  </button>
                </>
              ) : (
                <p className="text-sm" style={{ color: "#4b5563" }}>More quest data is needed before recommending the next session.</p>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#5b4631" }}>Recommended support this week</p>
              {supportTopics.length === 0 ? (
                <p className="text-sm" style={{ color: "#4b5563" }}>No weak-topic data yet.</p>
              ) : (
                <ul className="space-y-2 text-sm" style={{ color: "#4b5563" }}>
                  {supportTopics.map((topic) => (
                    <li key={topic.knowledgePointCode}>
                      {topic.knowledgePointCode} · {KP_NAMES[topic.knowledgePointCode] ?? topic.knowledgePointCode}
                      {" — "}
                      {MASTERY_LABELS[topic.masteryLevel] ?? "Developing"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <section className="rounded-3xl p-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>Areas of Strength</h2>
            {strongestTopics.length === 0 ? (
              <p className="text-sm" style={{ color: "#6b7280" }}>No mastery data available yet.</p>
            ) : (
              <div className="space-y-3">
                {strongestTopics.map((topic) => (
                  <div key={topic.knowledgePointCode} className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                    <p className="font-semibold" style={{ color: "#5b4631" }}>
                      {topic.knowledgePointCode} · {KP_NAMES[topic.knowledgePointCode] ?? topic.knowledgePointCode}
                    </p>
                    <p className="text-sm" style={{ color: "#4b5563" }}>
                      {MASTERY_LABELS[topic.masteryLevel] ?? "Developing"} · {topic.totalAttempts} attempts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl p-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>Areas to Strengthen</h2>
            {supportTopics.length === 0 ? (
              <p className="text-sm" style={{ color: "#6b7280" }}>No mastery data available yet.</p>
            ) : (
              <div className="space-y-3">
                {supportTopics.map((topic) => (
                  <div key={topic.knowledgePointCode} className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                    <p className="font-semibold" style={{ color: "#5b4631" }}>
                      {topic.knowledgePointCode} · {KP_NAMES[topic.knowledgePointCode] ?? topic.knowledgePointCode}
                    </p>
                    <p className="text-sm" style={{ color: "#4b5563" }}>
                      {MASTERY_LABELS[topic.masteryLevel] ?? "Developing"} · first-try accuracy {topic.totalAttempts > 0 ? Math.round((topic.firstChoiceCorrect / topic.totalAttempts) * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl p-6 mt-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>This Week&apos;s Weak Skills</h2>
          {supportTopics.length === 0 ? (
            <p className="text-sm" style={{ color: "#6b7280" }}>No weak-skill data available yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {supportTopics.map((topic) => (
                <div key={topic.knowledgePointCode} className="rounded-2xl p-4" style={{ background: "#f7f2e8" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#5b4631" }}>
                    {topic.knowledgePointCode}
                  </p>
                  <p className="text-sm mb-2" style={{ color: "#4b5563" }}>
                    {KP_NAMES[topic.knowledgePointCode] ?? topic.knowledgePointCode}
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    {MASTERY_LABELS[topic.masteryLevel] ?? "Developing"} · {topic.totalAttempts} attempts
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl p-6 mt-6" style={{ background: "#ffffff", border: "1px solid #e5d7bf" }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#5b4631" }}>Suggested Parent Conversation Starters</h2>
          <ul className="space-y-3 text-sm" style={{ color: "#4b5563" }}>
            <li>Ask which topic felt easiest this week and what strategy helped.</li>
            <li>
              {topWeakSkill
                ? `Ask how they would solve ${KP_NAMES[topWeakSkill.knowledgePointCode] ?? topWeakSkill.knowledgePointCode} next time, and what step usually feels hardest.`
                : "Pick one topic from “Areas to Strengthen” and ask the learner to explain how they would approach it next time."}
            </li>
            <li>Set one small goal for the next 7 days, such as one targeted quest or one writing session.</li>
          </ul>
        </section>
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .parent-report-page,
          .parent-report-content {
            background: #ffffff !important;
          }

          .parent-report-actions {
            display: none !important;
          }

          .parent-report-hero,
          .parent-report-content section,
          .parent-report-content div[style*="background: #ffffff"] {
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
