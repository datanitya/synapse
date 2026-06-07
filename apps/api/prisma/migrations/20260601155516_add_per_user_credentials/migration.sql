-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" "AiProvider",
ADD COLUMN     "anthropicApiKey" TEXT,
ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "linkedinClientId" TEXT,
ADD COLUMN     "linkedinClientSecret" TEXT,
ADD COLUMN     "linkedinCompanyId" TEXT,
ADD COLUMN     "openaiApiKey" TEXT;
