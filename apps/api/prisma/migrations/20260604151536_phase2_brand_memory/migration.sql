-- CreateTable
CREATE TABLE "BrandDna" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hookStyle" TEXT,
    "tone" TEXT,
    "paragraphLength" TEXT,
    "emojiUsage" TEXT,
    "preferredTopics" TEXT[],
    "avgPostLength" INTEGER,
    "samplesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "rawDna" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandDna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEdit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "edited" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandDna_userId_key" ON "BrandDna"("userId");

-- CreateIndex
CREATE INDEX "ContentEdit_userId_editedAt_idx" ON "ContentEdit"("userId", "editedAt");

-- AddForeignKey
ALTER TABLE "BrandDna" ADD CONSTRAINT "BrandDna_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEdit" ADD CONSTRAINT "ContentEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
