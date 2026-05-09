CREATE TABLE "QuestQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "questSessionId" INTEGER NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionHash" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "passageTitle" TEXT,
    "contextText" TEXT,
    "optionsJson" TEXT NOT NULL,
    "visualDataJson" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanationText" TEXT,
    "knowledgePointCode" TEXT,
    "microSkillCode" TEXT,
    "minimumReadTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestQuestion_questSessionId_fkey" FOREIGN KEY ("questSessionId") REFERENCES "QuestSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "QuestQuestion_questSessionId_questionIndex_key" ON "QuestQuestion"("questSessionId", "questionIndex");
CREATE INDEX "QuestQuestion_questSessionId_questionHash_idx" ON "QuestQuestion"("questSessionId", "questionHash");
