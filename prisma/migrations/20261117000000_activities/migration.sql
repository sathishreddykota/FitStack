-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RUN', 'WALK', 'HIKE', 'RIDE', 'TREADMILL');

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('GPS', 'MANUAL', 'IMPORT');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "source" "ActivitySource" NOT NULL DEFAULT 'GPS',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "feel" INTEGER,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "elapsedSec" INTEGER NOT NULL,
    "movingSec" INTEGER NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "elevationGainM" DOUBLE PRECISION,
    "avgPaceSecPerKm" INTEGER,
    "maxSpeedMps" DOUBLE PRECISION,
    "calories" INTEGER,
    "polyline" TEXT,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySplit" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "movingSec" INTEGER NOT NULL,
    "elevDeltaM" DOUBLE PRECISION,

    CONSTRAINT "ActivitySplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestEffort" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "timeSec" INTEGER NOT NULL,
    "isPR" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BestEffort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_userId_date_idx" ON "Activity"("userId", "date");

-- CreateIndex
CREATE INDEX "Activity_userId_startedAt_idx" ON "Activity"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_clientId_key" ON "Activity"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySplit_activityId_index_key" ON "ActivitySplit"("activityId", "index");

-- CreateIndex
CREATE INDEX "BestEffort_userId_type_distanceM_timeSec_idx" ON "BestEffort"("userId", "type", "distanceM", "timeSec");

-- CreateIndex
CREATE UNIQUE INDEX "BestEffort_activityId_distanceM_key" ON "BestEffort"("activityId", "distanceM");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySplit" ADD CONSTRAINT "ActivitySplit_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestEffort" ADD CONSTRAINT "BestEffort_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestEffort" ADD CONSTRAINT "BestEffort_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

