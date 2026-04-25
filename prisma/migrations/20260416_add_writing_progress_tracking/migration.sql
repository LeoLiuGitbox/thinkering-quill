PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_WritingSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "sessionMode" TEXT NOT NULL DEFAULT 'full_task',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "targetSkill" TEXT,
    "promptText" TEXT,
    "outlineNotes" TEXT,
    "draftV1" TEXT,
    "revisionInstruction" TEXT,
    "draftV2" TEXT,
    "completedAt" DATETIME,
    "revisionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "draft1WordCount" INTEGER,
    "draft2WordCount" INTEGER,
    "feedbackSummaryJson" TEXT,
    "coachSignalsJson" TEXT,
    "progressDeltaJson" TEXT,
    "imageDescription" TEXT,
    "imagePath" TEXT,
    "writingType" TEXT NOT NULL DEFAULT 'narrative',
    "promptCue" TEXT,
    "userResponse" TEXT,
    "feedbackJson" TEXT,
    "sparksEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WritingSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_WritingSession" (
    "id",
    "profileId",
    "imageDescription",
    "imagePath",
    "writingType",
    "promptCue",
    "userResponse",
    "feedbackJson",
    "sparksEarned",
    "createdAt"
)
SELECT
    "id",
    "profileId",
    "imageDescription",
    "imagePath",
    "writingType",
    "promptCue",
    "userResponse",
    "feedbackJson",
    "sparksEarned",
    "createdAt"
FROM "WritingSession";

DROP TABLE "WritingSession";
ALTER TABLE "new_WritingSession" RENAME TO "WritingSession";

CREATE TABLE "WritingSkillProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "skillCode" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "revisionCompletions" INTEGER NOT NULL DEFAULT 0,
    "guidedSessions" INTEGER NOT NULL DEFAULT 0,
    "fullTaskCompletions" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" DATETIME,
    "lastImprovedAt" DATETIME,
    "recentStrengthNote" TEXT,
    "recentFocusNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WritingSkillProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WritingSession_profileId_sessionMode_createdAt_idx" ON "WritingSession"("profileId", "sessionMode", "createdAt");
CREATE INDEX "WritingSession_profileId_status_createdAt_idx" ON "WritingSession"("profileId", "status", "createdAt");
CREATE UNIQUE INDEX "WritingSkillProgress_profileId_skillCode_key" ON "WritingSkillProgress"("profileId", "skillCode");
CREATE INDEX "WritingSkillProgress_profileId_lastPracticedAt_idx" ON "WritingSkillProgress"("profileId", "lastPracticedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
