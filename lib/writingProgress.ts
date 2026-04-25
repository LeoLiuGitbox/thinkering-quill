import { getRank } from "@/lib/progression";
import { prisma } from "@/lib/prisma";
import type {
  RecentWritingSession,
  WritingCoachSignal,
  WritingMode,
  WritingProgressDelta,
  WritingProgressSnapshot,
  WritingProgressSummary,
  WritingReport,
  WritingSkillCode,
} from "@/types/writing";
import {
  WRITING_COACH_SIGNALS,
  getWritingLevelLabel,
  getWritingSkillLabel,
} from "@/types/writing";

type FeedbackLike = {
  strength?: string;
  priorityIssue?: string;
  revisionInstruction?: string;
  quotedOriginalSnippet?: string;
  revisedSnippet?: string;
  nextStep?: string;
  rubricSummary?: Record<string, string | undefined>;
};

type ProgressTarget = {
  skillCode: string;
  reason: string;
  countTowardsGuided: boolean;
  countTowardsFullTask: boolean;
  canImproveLevel: boolean;
};

type WritingCompletionParams = {
  profileId: number;
  sessionId: number;
  mode: WritingMode;
  targetSkill?: string | null;
  status?: "completed" | "abandoned";
  promptText?: string | null;
  promptCue?: string | null;
  writingType?: string | null;
  draftV1?: string | null;
  draftV2?: string | null;
  userResponse?: string | null;
  revisionInstruction?: string | null;
  feedback?: FeedbackLike | null;
  feedbackSummary?: FeedbackLike | null;
  sparksEarned: number;
  wisdomEarned?: number;
  revisionCompleted: boolean;
  coachSignals?: WritingCoachSignal[];
};

const LEVEL_THRESHOLDS = [
  { minScore: 0, level: 1 },
  { minScore: 3, level: 2 },
  { minScore: 7, level: 3 },
  { minScore: 12, level: 4 },
  { minScore: 18, level: 5 },
] as const;

const SKILL_SIGNAL_MAP: Partial<Record<WritingSkillCode, WritingCoachSignal>> = {
  show_not_tell: "show_not_tell",
  sensory_detail: "detail",
  opening_hook: "prompt_control",
  prompt_interpretation: "prompt_control",
  prompt_analysis: "prompt_control",
  narrative_structure: "structure",
  persuasive_structure: "structure",
  teel_framework: "structure",
  sentence_variety: "language_control",
  word_choice: "language_control",
  voice_and_tone: "language_control",
  idea_generation: "idea_selection",
  argument_dimensions: "idea_selection",
};

const SIGNAL_SKILL_MAP: Record<WritingCoachSignal, WritingSkillCode> = {
  prompt_control: "prompt_interpretation",
  detail: "sensory_detail",
  structure: "narrative_structure",
  show_not_tell: "show_not_tell",
  revision_followthrough: "sentence_variety",
  language_control: "word_choice",
  idea_selection: "idea_generation",
};

const WRITING_SELECT = {
  id: true,
  sessionMode: true,
  status: true,
  targetSkill: true,
  promptText: true,
  promptCue: true,
  writingType: true,
  revisionCompleted: true,
  draft1WordCount: true,
  draft2WordCount: true,
  coachSignalsJson: true,
  progressDeltaJson: true,
  feedbackSummaryJson: true,
  createdAt: true,
  completedAt: true,
} as const;

function activityDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function countWords(text: string | null | undefined) {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function clampLevel(level: number) {
  return Math.max(1, Math.min(5, Math.round(level)));
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function inferSignalsFromFeedback(
  feedback: FeedbackLike | null | undefined,
  targetSkill: string | null | undefined,
  revisionCompleted: boolean
) {
  const text = [
    feedback?.priorityIssue,
    feedback?.revisionInstruction,
    feedback?.strength,
    ...Object.values(feedback?.rubricSummary ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const inferred = new Set<WritingCoachSignal>();

  if (targetSkill && SKILL_SIGNAL_MAP[targetSkill as WritingSkillCode]) {
    inferred.add(SKILL_SIGNAL_MAP[targetSkill as WritingSkillCode] as WritingCoachSignal);
  }
  if (revisionCompleted) {
    inferred.add("revision_followthrough");
  }
  if (/\bprompt|topic|angle|task\b/.test(text)) inferred.add("prompt_control");
  if (/\bdetail|sensory|specific|image|scene\b/.test(text)) inferred.add("detail");
  if (/\bstructure|middle|ending|organis|paragraph|teel|opening\b/.test(text)) inferred.add("structure");
  if (/\bshow\b|\btell\b|\baction\b|\bbody language\b/.test(text)) inferred.add("show_not_tell");
  if (/\blanguage|sentence|word|voice|tone|dialogue\b/.test(text)) inferred.add("language_control");
  if (/\bidea|angle|original|argument\b/.test(text)) inferred.add("idea_selection");

  return Array.from(inferred).slice(0, 3);
}

function buildProgressTargets(params: {
  mode: WritingMode;
  targetSkill?: string | null;
  coachSignals: WritingCoachSignal[];
  revisionCompleted: boolean;
}) {
  const targets: ProgressTarget[] = [];
  const seen = new Set<string>();

  function pushTarget(target: ProgressTarget) {
    if (seen.has(target.skillCode)) return;
    seen.add(target.skillCode);
    targets.push(target);
  }

  if (params.targetSkill) {
    pushTarget({
      skillCode: params.targetSkill,
      reason: params.revisionCompleted
        ? "Targeted practice plus revision"
        : "Completed a focused writing task",
      countTowardsGuided: params.mode === "guided_writing",
      countTowardsFullTask: params.mode === "full_task",
      canImproveLevel: true,
    });
  }

  if (params.mode === "guided_writing" && params.coachSignals.length > 0) {
    const secondary = SIGNAL_SKILL_MAP[params.coachSignals[0]];
    if (secondary && secondary !== params.targetSkill) {
      pushTarget({
        skillCode: secondary,
        reason: "Guided writing surfaced a secondary coaching pattern",
        countTowardsGuided: false,
        countTowardsFullTask: false,
        canImproveLevel: false,
      });
    }
  }

  if (params.mode === "full_task") {
    for (const signal of params.coachSignals.slice(0, 3)) {
      const mappedSkill = SIGNAL_SKILL_MAP[signal];
      if (!mappedSkill) continue;
      pushTarget({
        skillCode: mappedSkill,
        reason: `Full task evidence: ${signal.replace(/_/g, " ")}`,
        countTowardsGuided: false,
        countTowardsFullTask: true,
        canImproveLevel: true,
      });
    }
  }

  return targets;
}

function calculateWritingLevel(params: {
  totalSessions: number;
  revisionCompletions: number;
  guidedSessions: number;
  fullTaskCompletions: number;
}) {
  const score =
    params.totalSessions +
    params.revisionCompletions * 2 +
    params.guidedSessions +
    params.fullTaskCompletions * 2;

  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (score >= threshold.minScore) {
      level = threshold.level;
    }
  }
  return clampLevel(level);
}

function buildProgressSnapshots(records: Array<any>): WritingProgressSnapshot[] {
  return records.map((record) => ({
    skillCode: record.skillCode,
    skillLabel: getWritingSkillLabel(record.skillCode) ?? record.skillCode,
    currentLevel: record.currentLevel,
    levelLabel: getWritingLevelLabel(record.currentLevel),
    totalSessions: record.totalSessions,
    revisionCompletions: record.revisionCompletions,
    guidedSessions: record.guidedSessions,
    fullTaskCompletions: record.fullTaskCompletions,
    lastPracticedAt: record.lastPracticedAt?.toISOString?.() ?? null,
    lastImprovedAt: record.lastImprovedAt?.toISOString?.() ?? null,
    recentStrengthNote: record.recentStrengthNote ?? null,
    recentFocusNote: record.recentFocusNote ?? null,
  }));
}

function buildRecentWritingSessions(records: Array<any>): RecentWritingSession[] {
  return records.map((session) => ({
    id: session.id,
    sessionMode: session.sessionMode,
    status: session.status,
    targetSkill: session.targetSkill ?? null,
    targetSkillLabel: getWritingSkillLabel(session.targetSkill),
    promptText: session.promptText ?? null,
    promptCue: session.promptCue ?? null,
    writingType: session.writingType,
    revisionCompleted: session.revisionCompleted,
    draft1WordCount: session.draft1WordCount ?? null,
    draft2WordCount: session.draft2WordCount ?? null,
    coachSignals: parseJson<string[]>(session.coachSignalsJson, [])
      .map((signal) =>
        WRITING_COACH_SIGNALS.includes(signal as WritingCoachSignal)
          ? (signal as WritingCoachSignal)
          : null
      )
      .filter((signal): signal is WritingCoachSignal => Boolean(signal)),
    progressDeltas: parseJson<WritingProgressDelta[]>(session.progressDeltaJson, []),
    feedbackSummary: parseJson(session.feedbackSummaryJson, null),
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt?.toISOString?.() ?? null,
  }));
}

function calculateRevisionStreak(sessions: RecentWritingSession[]) {
  let streak = 0;
  for (const session of sessions) {
    if (!session.revisionCompleted) break;
    streak += 1;
  }
  return streak;
}

function buildRecentImprovement(sessions: RecentWritingSession[]) {
  const revised = sessions.find(
    (session) =>
      session.revisionCompleted &&
      session.feedbackSummary?.quotedOriginalSnippet &&
      session.feedbackSummary?.revisedSnippet
  );
  if (!revised) return null;

  return {
    skillLabel: revised.targetSkillLabel ?? "Writing improvement",
    originalSnippet: revised.feedbackSummary?.quotedOriginalSnippet ?? "",
    revisedSnippet: revised.feedbackSummary?.revisedSnippet ?? "",
    completedAt: revised.completedAt,
  };
}

function buildWritingSummary(params: {
  progress: WritingProgressSnapshot[];
  recentSessions: RecentWritingSession[];
}): WritingProgressSummary {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekSessions = params.recentSessions.filter(
    (session) => new Date(session.createdAt).getTime() >= sevenDaysAgo
  );
  const recentFive = params.recentSessions.slice(0, 5);
  const revisedOfRecent = recentFive.filter((session) => session.revisionCompleted).length;
  const sortedByGrowth = [...params.progress].sort((a, b) => {
    if (a.currentLevel !== b.currentLevel) return b.currentLevel - a.currentLevel;
    if (a.revisionCompletions !== b.revisionCompletions) {
      return b.revisionCompletions - a.revisionCompletions;
    }
    return b.totalSessions - a.totalSessions;
  });
  const sortedForSupport = [...params.progress].sort((a, b) => {
    if (a.currentLevel !== b.currentLevel) return a.currentLevel - b.currentLevel;
    if (a.revisionCompletions !== b.revisionCompletions) {
      return a.revisionCompletions - b.revisionCompletions;
    }
    return b.totalSessions - a.totalSessions;
  });
  const currentFocusSkill = sortedForSupport[0] ?? null;

  return {
    thisWeekSessions: thisWeekSessions.length,
    thisWeekRevisionCompletions: thisWeekSessions.filter((session) => session.revisionCompleted).length,
    revisionRate: recentFive.length > 0 ? Math.round((revisedOfRecent / recentFive.length) * 100) : 0,
    revisionStreak: calculateRevisionStreak(params.recentSessions),
    revisedOfRecent: {
      revised: revisedOfRecent,
      total: recentFive.length,
    },
    topGrowingSkills: sortedByGrowth.slice(0, 3),
    currentFocusSkill,
    recentImprovement: buildRecentImprovement(params.recentSessions),
    nextRecommendation: currentFocusSkill
      ? {
          mode: currentFocusSkill.currentLevel >= 3 ? "guided_writing" : "micro_skill_drill",
          skillCode: currentFocusSkill.skillCode,
          skillLabel: currentFocusSkill.skillLabel,
          reason:
            currentFocusSkill.currentLevel >= 3
              ? "This skill is ready for a longer guided paragraph."
              : "One more short drill will strengthen the current focus.",
        }
      : {
          mode: "micro_skill_drill",
          skillCode: null,
          skillLabel: null,
          reason: "Start with a quick skill drill to build your writing trail.",
        },
  };
}

function buildWritingReport(params: {
  progress: WritingProgressSnapshot[];
  recentSessions: RecentWritingSession[];
}): WritingReport {
  const now = Date.now();
  const cutoff14d = now - 14 * 24 * 60 * 60 * 1000;
  const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;
  const modeCounts14d = { micro_skill_drill: 0, guided_writing: 0, full_task: 0 };
  const modeCounts30d = { micro_skill_drill: 0, guided_writing: 0, full_task: 0 };

  for (const session of params.recentSessions) {
    const created = new Date(session.createdAt).getTime();
    if (created >= cutoff14d) modeCounts14d[session.sessionMode] += 1;
    if (created >= cutoff30d) modeCounts30d[session.sessionMode] += 1;
  }

  const strongestSkills = [...params.progress]
    .sort((a, b) => {
      if (a.currentLevel !== b.currentLevel) return b.currentLevel - a.currentLevel;
      return b.revisionCompletions - a.revisionCompletions;
    })
    .slice(0, 3);
  const supportSkills = [...params.progress]
    .sort((a, b) => {
      if (a.currentLevel !== b.currentLevel) return a.currentLevel - b.currentLevel;
      return a.revisionCompletions - b.revisionCompletions;
    })
    .slice(0, 3);
  const recentFullTasks = params.recentSessions
    .filter((session) => session.sessionMode === "full_task")
    .slice(0, 3)
    .map((session) => ({
      id: session.id,
      promptCue: session.promptCue,
      writingType: session.writingType,
      completedAt: session.completedAt,
    }));
  const latestCoaching = params.recentSessions.find((session) => session.feedbackSummary);
  const revisionRate = params.recentSessions.length > 0
    ? Math.round((params.recentSessions.filter((session) => session.revisionCompleted).length / params.recentSessions.length) * 100)
    : 0;

  let summaryText = "Writing practice has not started yet.";
  if (params.recentSessions.length > 0) {
    const latestStrength = latestCoaching?.feedbackSummary?.strength?.toLowerCase() ?? null;
    const latestFocus = latestCoaching?.feedbackSummary?.priorityIssue?.toLowerCase() ?? null;
    summaryText =
      revisionRate >= 60
        ? "The learner often revises after feedback and is building writing stamina through follow-through."
        : "The learner is building writing habits; revision follow-through is the clearest next growth area.";

    if (latestStrength?.includes("opening")) {
      summaryText = "The learner is building stronger openings and returning to revise them with purpose.";
    } else if (latestFocus?.includes("middle") || latestFocus?.includes("structure")) {
      summaryText = "The learner is producing ideas and now needs support sustaining the middle and overall structure.";
    }
  }

  return {
    summaryText,
    sessionsByMode14d: modeCounts14d,
    sessionsByMode30d: modeCounts30d,
    revisionRate,
    strongestSkills,
    supportSkills,
    recentFullTasks,
    latestCoachingPattern: {
      strength: latestCoaching?.feedbackSummary?.strength ?? null,
      focus: latestCoaching?.feedbackSummary?.priorityIssue ?? null,
    },
  };
}

export async function buildWritingProgressPayload(profileId: number) {
  const [progressRecords, recentSessionsRaw] = await Promise.all([
    prisma.writingSkillProgress.findMany({
      where: { profileId },
      orderBy: [{ currentLevel: "desc" }, { lastPracticedAt: "desc" }],
    }),
    prisma.writingSession.findMany({
      where: { profileId, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: WRITING_SELECT,
    }),
  ]);

  const progress = buildProgressSnapshots(progressRecords);
  const recentSessions = buildRecentWritingSessions(recentSessionsRaw);

  return {
    writingSkillProgress: progress,
    recentWritingSessions: recentSessions,
    writingSummary: buildWritingSummary({ progress, recentSessions }),
  };
}

export async function buildParentWritingReport(profileId: number) {
  const payload = await buildWritingProgressPayload(profileId);
  const writingReport = buildWritingReport({
    progress: payload.writingSkillProgress,
    recentSessions: payload.recentWritingSessions,
  });

  return {
    ...payload,
    writingReport,
    writingTrend: writingReport.sessionsByMode30d,
    revisionRate: writingReport.revisionRate,
  };
}

export async function completeWritingSession(params: WritingCompletionParams) {
  const now = new Date();
  const feedbackSummary = params.feedbackSummary ?? params.feedback ?? null;
  const coachSignals = Array.from(
    new Set(
      (params.coachSignals ?? []).concat(
        inferSignalsFromFeedback(feedbackSummary, params.targetSkill, params.revisionCompleted)
      )
    )
  ).slice(0, 3);
  const targets = buildProgressTargets({
    mode: params.mode,
    targetSkill: params.targetSkill,
    coachSignals,
    revisionCompleted: params.revisionCompleted,
  });

  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { id: params.profileId },
      select: { totalXP: true },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const existingProgress = targets.length > 0
      ? await tx.writingSkillProgress.findMany({
          where: {
            profileId: params.profileId,
            skillCode: { in: targets.map((target) => target.skillCode) },
          },
        })
      : [];
    const progressBySkill = new Map(existingProgress.map((record) => [record.skillCode, record]));
    const progressDeltas: WritingProgressDelta[] = [];

    for (const target of targets) {
      const previous = progressBySkill.get(target.skillCode);
      const nextTotals = {
        totalSessions: (previous?.totalSessions ?? 0) + 1,
        revisionCompletions: (previous?.revisionCompletions ?? 0) + (params.revisionCompleted ? 1 : 0),
        guidedSessions: (previous?.guidedSessions ?? 0) + (target.countTowardsGuided ? 1 : 0),
        fullTaskCompletions: (previous?.fullTaskCompletions ?? 0) + (target.countTowardsFullTask ? 1 : 0),
      };
      const previousLevel = previous?.currentLevel ?? 1;
      const computedLevel = calculateWritingLevel(nextTotals);
      const nextLevel = target.canImproveLevel ? Math.max(previousLevel, computedLevel) : previousLevel;
      const lastImprovedAt =
        nextLevel > previousLevel || (params.revisionCompleted && target.canImproveLevel)
          ? now
          : previous?.lastImprovedAt ?? null;

      const updated = previous
        ? await tx.writingSkillProgress.update({
            where: {
              profileId_skillCode: {
                profileId: params.profileId,
                skillCode: target.skillCode,
              },
            },
            data: {
              currentLevel: nextLevel,
              totalSessions: nextTotals.totalSessions,
              revisionCompletions: nextTotals.revisionCompletions,
              guidedSessions: nextTotals.guidedSessions,
              fullTaskCompletions: nextTotals.fullTaskCompletions,
              lastPracticedAt: now,
              lastImprovedAt,
              recentStrengthNote: feedbackSummary?.strength ?? previous.recentStrengthNote,
              recentFocusNote: feedbackSummary?.priorityIssue ?? previous.recentFocusNote,
            },
          })
        : await tx.writingSkillProgress.create({
            data: {
              profileId: params.profileId,
              skillCode: target.skillCode,
              currentLevel: nextLevel,
              totalSessions: nextTotals.totalSessions,
              revisionCompletions: nextTotals.revisionCompletions,
              guidedSessions: nextTotals.guidedSessions,
              fullTaskCompletions: nextTotals.fullTaskCompletions,
              lastPracticedAt: now,
              lastImprovedAt,
              recentStrengthNote: feedbackSummary?.strength ?? null,
              recentFocusNote: feedbackSummary?.priorityIssue ?? null,
            },
          });

      progressBySkill.set(target.skillCode, updated);
      progressDeltas.push({
        skillCode: target.skillCode,
        previousLevel,
        newLevel: nextLevel,
        reason: target.reason,
      });
    }

    await tx.writingSession.update({
      where: { id: params.sessionId },
      data: {
        sessionMode: params.mode,
        status: params.status ?? "completed",
        targetSkill: params.targetSkill ?? null,
        promptText: params.promptText ?? undefined,
        promptCue: params.promptCue ?? undefined,
        writingType: params.writingType ?? undefined,
        draftV1: params.draftV1 ?? undefined,
        draftV2: params.draftV2 ?? undefined,
        userResponse: params.userResponse ?? undefined,
        revisionInstruction: params.revisionInstruction ?? undefined,
        feedbackSummaryJson: feedbackSummary ? JSON.stringify(feedbackSummary) : undefined,
        feedbackJson: params.feedback ? JSON.stringify(params.feedback) : undefined,
        revisionCompleted: params.revisionCompleted,
        draft1WordCount: countWords(params.draftV1 ?? params.userResponse),
        draft2WordCount: params.draftV2 ? countWords(params.draftV2) : null,
        completedAt: params.status === "abandoned" ? null : now,
        coachSignalsJson: JSON.stringify(coachSignals),
        progressDeltaJson: JSON.stringify(progressDeltas),
        sparksEarned: params.sparksEarned,
      },
    });

    await tx.profile.update({
      where: { id: params.profileId },
      data: {
        totalXP: { increment: params.sparksEarned },
        rank: getRank(profile.totalXP + params.sparksEarned),
        attrCraft: { increment: 1 },
        ...(params.wisdomEarned
          ? { attrWisdom: { increment: params.wisdomEarned } }
          : {}),
      },
    });

    await tx.dailyActivity.upsert({
      where: {
        profileId_activityDate: {
          profileId: params.profileId,
          activityDate: activityDateKey(),
        },
      },
      update: {
        writingCount: { increment: 1 },
        sparksEarned: { increment: params.sparksEarned },
      },
      create: {
        profileId: params.profileId,
        activityDate: activityDateKey(),
        writingCount: 1,
        sparksEarned: params.sparksEarned,
      },
    });

    const updatedProgress = buildProgressSnapshots(Array.from(progressBySkill.values()));
    const sortedForSupport = [...updatedProgress].sort((a, b) => {
      if (a.currentLevel !== b.currentLevel) return a.currentLevel - b.currentLevel;
      return a.revisionCompletions - b.revisionCompletions;
    });
    const focusSkill = sortedForSupport[0] ?? null;

    return {
      coachSignals,
      progressDeltas,
      updatedSkills: updatedProgress,
      nextRecommendation: focusSkill
        ? {
            mode: focusSkill.currentLevel >= 3 ? "guided_writing" : "micro_skill_drill",
            skillCode: focusSkill.skillCode,
            skillLabel: focusSkill.skillLabel,
            reason:
              focusSkill.currentLevel >= 3
                ? "Stretch this skill in a longer guided section next."
                : "Repeat this skill in a short drill to lock it in.",
          }
        : {
            mode: "micro_skill_drill" as WritingMode,
            skillCode: null,
            skillLabel: null,
            reason: "Keep the writing streak alive with another short drill.",
          },
    };
  });
}
