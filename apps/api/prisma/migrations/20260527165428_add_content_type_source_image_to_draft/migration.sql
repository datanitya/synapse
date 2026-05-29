-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'BLOG', 'CAPTION', 'IMAGE');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('AI', 'MANUAL');

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'POST',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'AI',
ADD COLUMN     "title" TEXT;
