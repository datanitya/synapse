-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "ctaStyle" TEXT,
ADD COLUMN     "hookStyle" TEXT,
ADD COLUMN     "sentenceLength" TEXT,
ADD COLUMN     "valueProposition" TEXT,
ADD COLUMN     "writingStyle" TEXT;

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
