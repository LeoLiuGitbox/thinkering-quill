CREATE TABLE IF NOT EXISTS "QuestSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "sessionLength" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "totalSparks" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "reflectionText" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "QuestSession_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "QuizAttempt" ADD COLUMN "questSessionId" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN "microSkillCode" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN "explanationText" TEXT;

CREATE INDEX IF NOT EXISTS "QuestSession_profileId_region_startedAt_idx"
  ON "QuestSession"("profileId", "region", "startedAt");

CREATE INDEX IF NOT EXISTS "QuizAttempt_questSessionId_attemptedAt_idx"
  ON "QuizAttempt"("questSessionId", "attemptedAt");

CREATE INDEX IF NOT EXISTS "QuizAttempt_profileId_region_attemptedAt_idx"
  ON "QuizAttempt"("profileId", "region", "attemptedAt");

CREATE INDEX IF NOT EXISTS "QuizAttempt_profileId_knowledgePointCode_attemptedAt_idx"
  ON "QuizAttempt"("profileId", "knowledgePointCode", "attemptedAt");
