-- CreateEnum
CREATE TYPE "ToneStyle" AS ENUM ('PROFESSIONAL', 'CONVERSATIONAL', 'THOUGHT_LEADER', 'STORYTELLER', 'EDUCATIONAL', 'INSPIRATIONAL');

-- CreateEnum
CREATE TYPE "PostingGoal" AS ENUM ('GROW_NETWORK', 'ESTABLISH_EXPERTISE', 'ATTRACT_CLIENTS', 'FIND_JOB', 'BUILD_COMMUNITY', 'SHARE_LEARNINGS');

-- CreateEnum
CREATE TYPE "PostingFrequency" AS ENUM ('DAILY', 'THREE_TIMES_WEEK', 'TWICE_WEEK', 'WEEKLY');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TrendSource" AS ENUM ('HACKERNEWS');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'REFINED', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POSTING_REMINDER', 'NEW_TRENDS_AVAILABLE', 'DRAFT_READY', 'WEEKLY_SUMMARY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "linkedinId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "profilePictureUrl" TEXT,
    "linkedinProfileUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "niches" TEXT[],
    "goals" "PostingGoal"[],
    "targetAudience" TEXT,
    "toneStyle" "ToneStyle" NOT NULL,
    "writingExamples" TEXT[],
    "avoidTopics" TEXT[],
    "postingFrequency" "PostingFrequency" NOT NULL,
    "preferredDays" "DayOfWeek"[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderLeadHours" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "source" "TrendSource" NOT NULL DEFAULT 'HACKERNEWS',
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "summary" TEXT,
    "score" INTEGER NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "categories" TEXT[],
    "relevanceMap" JSONB,
    "professionalRelevance" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTrend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trendId" TEXT,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "generationParams" JSONB,
    "finalContent" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "userNotes" TEXT,
    "suggestedPostAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftVariation" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DraftVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedinId_key" ON "User"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "Trend_fetchedAt_idx" ON "Trend"("fetchedAt");

-- CreateIndex
CREATE INDEX "Trend_score_idx" ON "Trend"("score");

-- CreateIndex
CREATE INDEX "Trend_expiresAt_idx" ON "Trend"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trend_source_externalId_key" ON "Trend"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTrend_userId_trendId_key" ON "SavedTrend"("userId", "trendId");

-- CreateIndex
CREATE INDEX "Draft_userId_status_idx" ON "Draft"("userId", "status");

-- CreateIndex
CREATE INDEX "Draft_userId_createdAt_idx" ON "Draft"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrend" ADD CONSTRAINT "SavedTrend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrend" ADD CONSTRAINT "SavedTrend_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftVariation" ADD CONSTRAINT "DraftVariation_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
