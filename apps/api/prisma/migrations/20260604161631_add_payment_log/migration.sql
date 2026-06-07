-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "method" TEXT,
    "planDisplayName" TEXT,
    "event" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLog_razorpayPaymentId_key" ON "PaymentLog"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "PaymentLog_userId_idx" ON "PaymentLog"("userId");

-- CreateIndex
CREATE INDEX "PaymentLog_createdAt_idx" ON "PaymentLog"("createdAt");
