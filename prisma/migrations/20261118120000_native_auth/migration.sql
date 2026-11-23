-- CreateTable
CREATE TABLE "NativeAuthRequest" (
    "id" TEXT NOT NULL,
    "verifierHash" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NativeAuthRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NativeAuthRequest_expiresAt_idx" ON "NativeAuthRequest"("expiresAt");

