-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('COLLECTING', 'DRAFT_WEEK', 'ACTIVE', 'GRACE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeagueType" AS ENUM ('OFFICIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('OPEN', 'FULL', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('PRESEASON_RANKING', 'WEEKLY_PICKS', 'LEADERBOARD', 'PROFILE', 'BETA_FEEDBACK');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'COLLECTING',
    "episode1Date" TIMESTAMP(3),
    "draftDeadline" TIMESTAMP(3),
    "episode2Date" TIMESTAMP(3),
    "finaleDate" TIMESTAMP(3),
    "archiveDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rankingsOpen" BOOLEAN NOT NULL DEFAULT false,
    "draftExecuted" BOOLEAN NOT NULL DEFAULT false,
    "seasonLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsReminders" BOOLEAN NOT NULL DEFAULT true,
    "lastSmsAt" TIMESTAMP(3),
    "displayName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "favoriteCastaway" TEXT,
    "about" TEXT,
    "profilePicture" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "leagueId" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LeagueType" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 18,
    "currentPlayers" INTEGER NOT NULL DEFAULT 0,
    "status" "LeagueStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "draftStatus" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "draftRunAt" TIMESTAMP(3),
    "picksPerUser" INTEGER NOT NULL DEFAULT 2,
    "rankingLockAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Castaway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "tribe" TEXT,
    "occupation" TEXT,
    "age" INTEGER,
    "hometown" TEXT,
    "imageUrl" TEXT,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedWeek" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "Castaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyResult" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "castawayId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "WeeklyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "castawayId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "leagueId" TEXT,
    "weekId" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "isAutoSelected" BOOLEAN NOT NULL DEFAULT false,
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "Pick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lockAt" TIMESTAMP(3),
    "picksOpenAt" TIMESTAMP(3),
    "picksCloseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "castawayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "castawayId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seasonId" TEXT,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "leagueId" TEXT,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surveyType" "SurveyType" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "rating" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "command" TEXT,
    "inboundText" TEXT,
    "outboundText" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "messageId" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "eventKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "weeksPlayed" INTEGER NOT NULL DEFAULT 0,
    "weeksInFirst" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_number_key" ON "Season"("number");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "Season_isActive_idx" ON "Season"("isActive");

-- CreateIndex
CREATE INDEX "Season_number_idx" ON "Season"("number");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");

-- CreateIndex
CREATE INDEX "League_seasonId_idx" ON "League"("seasonId");

-- CreateIndex
CREATE INDEX "LeagueMembership_userId_idx" ON "LeagueMembership"("userId");

-- CreateIndex
CREATE INDEX "LeagueMembership_leagueId_idx" ON "LeagueMembership"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_userId_leagueId_key" ON "LeagueMembership"("userId", "leagueId");

-- CreateIndex
CREATE INDEX "Castaway_seasonId_idx" ON "Castaway"("seasonId");

-- CreateIndex
CREATE INDEX "Castaway_eliminated_idx" ON "Castaway"("eliminated");

-- CreateIndex
CREATE INDEX "Castaway_tribe_idx" ON "Castaway"("tribe");

-- CreateIndex
CREATE UNIQUE INDEX "Castaway_seasonId_number_key" ON "Castaway"("seasonId", "number");

-- CreateIndex
CREATE INDEX "WeeklyResult_seasonId_idx" ON "WeeklyResult"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyResult_seasonId_weekNumber_castawayId_key" ON "WeeklyResult"("seasonId", "weekNumber", "castawayId");

-- CreateIndex
CREATE INDEX "Pick_userId_weekNumber_idx" ON "Pick"("userId", "weekNumber");

-- CreateIndex
CREATE INDEX "Pick_weekNumber_idx" ON "Pick"("weekNumber");

-- CreateIndex
CREATE INDEX "Pick_userId_idx" ON "Pick"("userId");

-- CreateIndex
CREATE INDEX "Pick_leagueId_idx" ON "Pick"("leagueId");

-- CreateIndex
CREATE INDEX "Pick_leagueId_weekNumber_idx" ON "Pick"("leagueId", "weekNumber");

-- CreateIndex
CREATE INDEX "Pick_seasonId_idx" ON "Pick"("seasonId");

-- CreateIndex
CREATE INDEX "Week_isActive_idx" ON "Week"("isActive");

-- CreateIndex
CREATE INDEX "Week_picksCloseAt_idx" ON "Week"("picksCloseAt");

-- CreateIndex
CREATE INDEX "Week_weekNumber_idx" ON "Week"("weekNumber");

-- CreateIndex
CREATE INDEX "Week_seasonId_idx" ON "Week"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Week_seasonId_weekNumber_key" ON "Week"("seasonId", "weekNumber");

-- CreateIndex
CREATE INDEX "Ranking_userId_idx" ON "Ranking"("userId");

-- CreateIndex
CREATE INDEX "Ranking_leagueId_idx" ON "Ranking"("leagueId");

-- CreateIndex
CREATE INDEX "Ranking_seasonId_idx" ON "Ranking"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_userId_leagueId_seasonId_key" ON "Ranking"("userId", "leagueId", "seasonId");

-- CreateIndex
CREATE INDEX "RankingEntry_castawayId_idx" ON "RankingEntry"("castawayId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEntry_rankingId_position_key" ON "RankingEntry"("rankingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEntry_rankingId_castawayId_key" ON "RankingEntry"("rankingId", "castawayId");

-- CreateIndex
CREATE INDEX "DraftPick_seasonId_idx" ON "DraftPick"("seasonId");

-- CreateIndex
CREATE INDEX "DraftPick_castawayId_idx" ON "DraftPick"("castawayId");

-- CreateIndex
CREATE INDEX "DraftPick_userId_idx" ON "DraftPick"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_userId_round_key" ON "DraftPick"("leagueId", "userId", "round");

-- CreateIndex
CREATE INDEX "Score_userId_idx" ON "Score"("userId");

-- CreateIndex
CREATE INDEX "Score_weekId_idx" ON "Score"("weekId");

-- CreateIndex
CREATE INDEX "Score_leagueId_idx" ON "Score"("leagueId");

-- CreateIndex
CREATE INDEX "Score_leagueId_weekId_idx" ON "Score"("leagueId", "weekId");

-- CreateIndex
CREATE INDEX "Score_seasonId_idx" ON "Score"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_userId_weekId_key" ON "Score"("userId", "weekId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_surveyType_idx" ON "Feedback"("surveyType");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SMSLog_eventKey_key" ON "SMSLog"("eventKey");

-- CreateIndex
CREATE INDEX "SMSLog_userId_idx" ON "SMSLog"("userId");

-- CreateIndex
CREATE INDEX "SMSLog_phone_idx" ON "SMSLog"("phone");

-- CreateIndex
CREATE INDEX "SMSLog_createdAt_idx" ON "SMSLog"("createdAt");

-- CreateIndex
CREATE INDEX "SMSLog_command_idx" ON "SMSLog"("command");

-- CreateIndex
CREATE INDEX "SMSLog_eventKey_idx" ON "SMSLog"("eventKey");

-- CreateIndex
CREATE INDEX "LeaderboardCache_leagueId_totalScore_idx" ON "LeaderboardCache"("leagueId", "totalScore" DESC);

-- CreateIndex
CREATE INDEX "LeaderboardCache_seasonId_totalScore_idx" ON "LeaderboardCache"("seasonId", "totalScore" DESC);

-- CreateIndex
CREATE INDEX "LeaderboardCache_userId_idx" ON "LeaderboardCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardCache_userId_leagueId_seasonId_key" ON "LeaderboardCache"("userId", "leagueId", "seasonId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Castaway" ADD CONSTRAINT "Castaway_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyResult" ADD CONSTRAINT "WeeklyResult_castawayId_fkey" FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyResult" ADD CONSTRAINT "WeeklyResult_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_castawayId_fkey" FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_castawayId_fkey" FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_castawayId_fkey" FOREIGN KEY ("castawayId") REFERENCES "Castaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

