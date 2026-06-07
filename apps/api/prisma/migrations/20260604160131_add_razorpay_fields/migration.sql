-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "razorpayPlanId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "razorpayCustomerId" TEXT,
ADD COLUMN     "razorpaySubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;
