-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planId" TEXT,
ADD COLUMN     "planSince" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "displayName" TEXT NOT NULL,
    "monthlyTokenLimit" INTEGER NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
