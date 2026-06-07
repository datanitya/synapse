/*
  Warnings:

  - The `subscriptionStatus` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `niche` on the `UserPreferences` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "linkedinPostId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "subscriptionStatus",
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus";

-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "niche";

-- CreateIndex
CREATE INDEX "Trend_source_professionalRelevance_idx" ON "Trend"("source", "professionalRelevance");

-- CreateIndex
CREATE INDEX "Trend_categories_idx" ON "Trend" USING GIN ("categories");
