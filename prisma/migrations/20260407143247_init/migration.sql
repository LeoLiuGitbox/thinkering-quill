-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mageName" TEXT NOT NULL,
    "avatarColour" TEXT NOT NULL DEFAULT '#B68A3A',
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Novice Scribe',
    "auraAlignment" TEXT NOT NULL DEFAULT 'bright',
    "shadowScore" INTEGER NOT NULL DEFAULT 0,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 5,
    "quillEnergy" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attrLogic" INTEGER NOT NULL DEFAULT 0,
    "attrInsight" INTEGER NOT NULL DEFAULT 0,
    "attrFocus" INTEGER NOT NULL DEFAULT 0,
    "attrCraft" INTEGER NOT NULL DEFAULT 0,
    "attrWisdom" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "knowledgePointCode" TEXT,
    "topic" TEXT,
    "questionHash" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "firstChoiceCorrect" BOOLEAN NOT NULL DEFAULT false,
    "changedAnswer" BOOLEAN NOT NULL DEFAULT false,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "sparksEarned" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMs" INTEGER,
    "minimumReadTimeMs" INTEGER,
    "reflectionText" TEXT,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "numQuestions" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "totalSparks" INTEGER,
    "maxSparks" INTEGER,
    "percentage" REAL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    CONSTRAINT "ExamSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "knowledgePointCode" TEXT,
    "topic" TEXT,
    "difficulty" TEXT NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "timeSpentMs" INTEGER,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExamQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "imageDescription" TEXT NOT NULL,
    "imagePath" TEXT,
    "writingType" TEXT NOT NULL,
    "promptCue" TEXT NOT NULL,
    "userResponse" TEXT,
    "feedbackJson" TEXT,
    "sparksEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WritingSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeMastery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "knowledgePointCode" TEXT NOT NULL,
    "masteryScore" REAL NOT NULL DEFAULT 0,
    "masteryLevel" INTEGER NOT NULL DEFAULT 1,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "firstChoiceCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "avgTimeMs" REAL NOT NULL DEFAULT 0,
    "avgHintsUsed" REAL NOT NULL DEFAULT 0,
    "lastAttemptedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeMastery_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldJournalEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "knowledgePointCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storyText" TEXT NOT NULL,
    "spotQuestion" TEXT NOT NULL,
    "studentAnswer" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldJournalEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "activityDate" TEXT NOT NULL,
    "questCount" INTEGER NOT NULL DEFAULT 0,
    "examCount" INTEGER NOT NULL DEFAULT 0,
    "writingCount" INTEGER NOT NULL DEFAULT 0,
    "sparksEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyActivity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "loreText" TEXT NOT NULL,
    "unlockRule" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProfileArtifact" (
    "profileId" INTEGER NOT NULL,
    "artifactId" INTEGER NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("profileId", "artifactId"),
    CONSTRAINT "ProfileArtifact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrityEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "sourceSignal" TEXT NOT NULL,
    "recoveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrityEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubjectStat" (
    "profileId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalSparks" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" DATETIME,

    PRIMARY KEY ("profileId", "region"),
    CONSTRAINT "SubjectStat_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeMastery_profileId_knowledgePointCode_key" ON "KnowledgeMastery"("profileId", "knowledgePointCode");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_profileId_activityDate_key" ON "DailyActivity"("profileId", "activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_profileId_badgeKey_tier_key" ON "Badge"("profileId", "badgeKey", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_key_key" ON "Artifact"("key");
