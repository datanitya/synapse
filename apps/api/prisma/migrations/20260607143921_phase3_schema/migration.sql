-- AlterTable
ALTER TABLE "BrandDna" ADD COLUMN     "brandScore" INTEGER,
ADD COLUMN     "voiceReport" TEXT,
ADD COLUMN     "voiceReportUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "linkedinPostId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_draftId_key" ON "PostAnalytics"("draftId");

-- CreateIndex
CREATE INDEX "PostAnalytics_fetchedAt_idx" ON "PostAnalytics"("fetchedAt");

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
