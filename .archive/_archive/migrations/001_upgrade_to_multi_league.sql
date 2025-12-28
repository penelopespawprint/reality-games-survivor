-- ============================================
-- RGFL Migration: Single League -> Multi League
-- ============================================
-- This migration upgrades rgfl-single to rgfl-multi
-- SAFE: All changes are additive, no data deletion
-- ROLLBACK: Script included at bottom
-- ============================================

-- Step 1: Create new ENUM types
-- ============================================
DO $$ BEGIN
    CREATE TYPE "LeagueType" AS ENUM ('OFFICIAL', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueStatus" AS ENUM ('OPEN', 'FULL', 'ACTIVE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to League table
-- ============================================
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "type" "LeagueType" DEFAULT 'CUSTOM';
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "isPasswordProtected" BOOLEAN DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "maxPlayers" INTEGER DEFAULT 18;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "currentPlayers" INTEGER DEFAULT 0;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "status" "LeagueStatus" DEFAULT 'OPEN';
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Mark existing leagues as OFFICIAL type (they're the original leagues)
UPDATE "League" SET "type" = 'OFFICIAL' WHERE "type" IS NULL OR "type" = 'CUSTOM';
UPDATE "League" SET "status" = 'COMPLETED' WHERE "draftStatus" = 'COMPLETED';

-- Step 3: Add leagueId to Pick table (nullable for backwards compat)
-- ============================================
ALTER TABLE "Pick" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "Pick_leagueId_idx" ON "Pick"("leagueId");
CREATE INDEX IF NOT EXISTS "Pick_leagueId_weekNumber_idx" ON "Pick"("leagueId", "weekNumber");
CREATE INDEX IF NOT EXISTS "Pick_castawayId_idx" ON "Pick"("castawayId");

-- Add foreign key (if not exists)
DO $$ BEGIN
    ALTER TABLE "Pick" ADD CONSTRAINT "Pick_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Add leagueId to Score table (nullable for backwards compat)
-- ============================================
ALTER TABLE "Score" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Score_leagueId_idx" ON "Score"("leagueId");
CREATE INDEX IF NOT EXISTS "Score_leagueId_weekId_idx" ON "Score"("leagueId", "weekId");

-- Add foreign key
DO $$ BEGIN
    ALTER TABLE "Score" ADD CONSTRAINT "Score_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 5: Modify Ranking table for multi-league
-- ============================================
ALTER TABLE "Ranking" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

-- Drop old unique constraint and create new one
ALTER TABLE "Ranking" DROP CONSTRAINT IF EXISTS "Ranking_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Ranking_userId_leagueId_key" ON "Ranking"("userId", "leagueId");
CREATE INDEX IF NOT EXISTS "Ranking_leagueId_idx" ON "Ranking"("leagueId");

-- Add foreign key
DO $$ BEGIN
    ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 6: Create LeagueMembership table
-- ============================================
CREATE TABLE IF NOT EXISTS "LeagueMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueMembership_userId_leagueId_key" ON "LeagueMembership"("userId", "leagueId");
CREATE INDEX IF NOT EXISTS "LeagueMembership_userId_idx" ON "LeagueMembership"("userId");
CREATE INDEX IF NOT EXISTS "LeagueMembership_leagueId_idx" ON "LeagueMembership"("leagueId");

-- Add foreign keys
DO $$ BEGIN
    ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 7: Migrate existing users to LeagueMembership
-- ============================================
-- Users with leagueId get a membership in that league
INSERT INTO "LeagueMembership" ("id", "userId", "leagueId", "role", "joinedAt", "isActive")
SELECT
    gen_random_uuid()::text,
    u."id",
    u."leagueId",
    CASE WHEN u."isAdmin" THEN 'ADMIN'::"MemberRole" ELSE 'MEMBER'::"MemberRole" END,
    u."createdAt",
    true
FROM "User" u
WHERE u."leagueId" IS NOT NULL
ON CONFLICT ("userId", "leagueId") DO NOTHING;

-- Update currentPlayers count on leagues
UPDATE "League" l SET "currentPlayers" = (
    SELECT COUNT(*) FROM "LeagueMembership" m WHERE m."leagueId" = l."id" AND m."isActive" = true
);

-- Step 8: Create ScoringRule table (new scoring system)
-- ============================================
CREATE TABLE IF NOT EXISTS "ScoringRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScoringRule_category_name_key" ON "ScoringRule"("category", "name");
CREATE INDEX IF NOT EXISTS "ScoringRule_category_idx" ON "ScoringRule"("category");
CREATE INDEX IF NOT EXISTS "ScoringRule_isActive_idx" ON "ScoringRule"("isActive");

-- Step 9: Create ScoringSession table
-- ============================================
CREATE TABLE IF NOT EXISTS "ScoringSession" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScoringSession_weekNumber_key" ON "ScoringSession"("weekNumber");
CREATE INDEX IF NOT EXISTS "ScoringSession_status_idx" ON "ScoringSession"("status");
CREATE INDEX IF NOT EXISTS "ScoringSession_weekNumber_idx" ON "ScoringSession"("weekNumber");

-- Step 10: Create ScoreEntry table
-- ============================================
CREATE TABLE IF NOT EXISTS "ScoreEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "castawayId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastModifiedBy" TEXT,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScoreEntry_sessionId_castawayId_ruleId_key" ON "ScoreEntry"("sessionId", "castawayId", "ruleId");
CREATE INDEX IF NOT EXISTS "ScoreEntry_sessionId_idx" ON "ScoreEntry"("sessionId");
CREATE INDEX IF NOT EXISTS "ScoreEntry_castawayId_idx" ON "ScoreEntry"("castawayId");
CREATE INDEX IF NOT EXISTS "ScoreEntry_ruleId_idx" ON "ScoreEntry"("ruleId");

-- Add foreign keys for ScoreEntry
DO $$ BEGIN
    ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ScoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "ScoringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 11: Update foreign key constraints to use CASCADE
-- ============================================
-- Drop and recreate with CASCADE for cleaner data management

-- Pick table
ALTER TABLE "Pick" DROP CONSTRAINT IF EXISTS "Pick_userId_fkey";
ALTER TABLE "Pick" DROP CONSTRAINT IF EXISTS "Pick_castawayId_fkey";
ALTER TABLE "Pick" DROP CONSTRAINT IF EXISTS "Pick_weekId_fkey";

ALTER TABLE "Pick" ADD CONSTRAINT "Pick_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_castawayId_fkey"
    FOREIGN KEY ("castawayId") REFERENCES "Castaway"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_weekId_fkey"
    FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Score table
ALTER TABLE "Score" DROP CONSTRAINT IF EXISTS "Score_userId_fkey";
ALTER TABLE "Score" DROP CONSTRAINT IF EXISTS "Score_weekId_fkey";

ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Score" ADD CONSTRAINT "Score_weekId_fkey"
    FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WeeklyResult table
ALTER TABLE "WeeklyResult" DROP CONSTRAINT IF EXISTS "WeeklyResult_castawayId_fkey";
ALTER TABLE "WeeklyResult" ADD CONSTRAINT "WeeklyResult_castawayId_fkey"
    FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DraftPick table
ALTER TABLE "DraftPick" DROP CONSTRAINT IF EXISTS "DraftPick_userId_fkey";
ALTER TABLE "DraftPick" DROP CONSTRAINT IF EXISTS "DraftPick_castawayId_fkey";
ALTER TABLE "DraftPick" DROP CONSTRAINT IF EXISTS "DraftPick_leagueId_fkey";

ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_castawayId_fkey"
    FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for DraftPick performance
CREATE INDEX IF NOT EXISTS "DraftPick_leagueId_round_idx" ON "DraftPick"("leagueId", "round");

-- Ranking table
ALTER TABLE "Ranking" DROP CONSTRAINT IF EXISTS "Ranking_userId_fkey";
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RankingEntry table
ALTER TABLE "RankingEntry" DROP CONSTRAINT IF EXISTS "RankingEntry_rankingId_fkey";
ALTER TABLE "RankingEntry" DROP CONSTRAINT IF EXISTS "RankingEntry_castawayId_fkey";

ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_rankingId_fkey"
    FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_castawayId_fkey"
    FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Feedback table
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_userId_fkey";
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SMSLog table
ALTER TABLE "SMSLog" DROP CONSTRAINT IF EXISTS "SMSLog_userId_fkey";
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration
SELECT 'Migration complete. New tables:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('LeagueMembership', 'ScoringRule', 'ScoringSession', 'ScoreEntry');

SELECT 'League memberships created:' as status, COUNT(*) as count FROM "LeagueMembership";

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
/*
-- To rollback this migration, run:

DROP TABLE IF EXISTS "ScoreEntry";
DROP TABLE IF EXISTS "ScoringSession";
DROP TABLE IF EXISTS "ScoringRule";
DROP TABLE IF EXISTS "LeagueMembership";

ALTER TABLE "Pick" DROP COLUMN IF EXISTS "leagueId";
ALTER TABLE "Score" DROP COLUMN IF EXISTS "leagueId";
ALTER TABLE "Ranking" DROP COLUMN IF EXISTS "leagueId";

ALTER TABLE "League" DROP COLUMN IF EXISTS "type";
ALTER TABLE "League" DROP COLUMN IF EXISTS "description";
ALTER TABLE "League" DROP COLUMN IF EXISTS "isPasswordProtected";
ALTER TABLE "League" DROP COLUMN IF EXISTS "password";
ALTER TABLE "League" DROP COLUMN IF EXISTS "maxPlayers";
ALTER TABLE "League" DROP COLUMN IF EXISTS "currentPlayers";
ALTER TABLE "League" DROP COLUMN IF EXISTS "status";
ALTER TABLE "League" DROP COLUMN IF EXISTS "createdBy";

DROP TYPE IF EXISTS "SessionStatus";
DROP TYPE IF EXISTS "MemberRole";
DROP TYPE IF EXISTS "LeagueStatus";
DROP TYPE IF EXISTS "LeagueType";

-- Restore unique constraint on Ranking
DROP INDEX IF EXISTS "Ranking_userId_leagueId_key";
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_key" UNIQUE ("userId");
*/
