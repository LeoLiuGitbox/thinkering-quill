ALTER TABLE "FieldJournalEntry" ADD COLUMN "spellName" TEXT;
ALTER TABLE "FieldJournalEntry" ADD COLUMN "answerKeyJson" TEXT;
ALTER TABLE "FieldJournalEntry" ADD COLUMN "discoveryStatus" TEXT NOT NULL DEFAULT 'undiscovered';
ALTER TABLE "FieldJournalEntry" ADD COLUMN "discoveryFeedback" TEXT;
ALTER TABLE "FieldJournalEntry" ADD COLUMN "firstDiscoveredAt" DATETIME;
ALTER TABLE "FieldJournalEntry" ADD COLUMN "discoveryAttemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FieldJournalEntry" ADD COLUMN "rewardClaimed" BOOLEAN NOT NULL DEFAULT false;
