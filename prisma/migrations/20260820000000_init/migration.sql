-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('trial', 'starter', 'growth', 'pro');

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('pre_construction', 'foundation_structure', 'mep', 'interior_finishing', 'sign_ready', 'signage_filed');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('new', 'contacted', 'quoted', 'won', 'lost');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "plan" "PlanTier" NOT NULL DEFAULT 'trial',
    "zipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "zipAllowance" INTEGER NOT NULL DEFAULT 3,
    "notificationPrefs" JSONB NOT NULL DEFAULT '{"email":true,"hotOpportunities":true,"phaseChanges":true}',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'nyc',
    "bin" TEXT,
    "jobNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "borough" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "jobType" TEXT,
    "buildingType" TEXT,
    "occupancy" TEXT,
    "description" TEXT,
    "estimatedJobCost" DOUBLE PRECISION,
    "phase" "ProjectPhase" NOT NULL,
    "phaseConfidence" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreConfidence" TEXT NOT NULL DEFAULT 'medium',
    "scoreReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tradeScores" JSONB NOT NULL DEFAULT '{"signage":0,"lighting":0,"glass":0,"security":0,"flooring":0}',
    "estValueLow" INTEGER NOT NULL DEFAULT 0,
    "estValueHigh" INTEGER NOT NULL DEFAULT 0,
    "buyingWindowEstimate" TEXT NOT NULL DEFAULT 'Unknown',
    "gcName" TEXT,
    "architectName" TEXT,
    "architectFirm" TEXT,
    "architectPhone" TEXT,
    "architectEmail" TEXT,
    "architectWebsite" TEXT,
    "architectLicense" TEXT,
    "engineerName" TEXT,
    "engineerFirm" TEXT,
    "engineerPhone" TEXT,
    "engineerEmail" TEXT,
    "engineerWebsite" TEXT,
    "engineerLicense" TEXT,
    "ownerName" TEXT,
    "filerName" TEXT,
    "filerFirm" TEXT,
    "hasSignPermit" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "filingDate" TIMESTAMP(3),
    "sourceDataset" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceDataset" TEXT NOT NULL,
    "workType" TEXT,
    "permitType" TEXT,
    "status" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" "PipelineStage" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "dealValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL,
    "status" TEXT NOT NULL,
    "zipAllowance" INTEGER NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMeta" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastSyncAt" TIMESTAMP(3),
    "projectCount" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,

    CONSTRAINT "SyncMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Project_city_idx" ON "Project"("city");

-- CreateIndex
CREATE INDEX "Project_zip_idx" ON "Project"("zip");

-- CreateIndex
CREATE INDEX "Project_score_idx" ON "Project"("score");

-- CreateIndex
CREATE INDEX "Project_bin_jobNumber_idx" ON "Project"("bin", "jobNumber");

-- CreateIndex
CREATE INDEX "Permit_projectId_idx" ON "Permit"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEvent_createdAt_idx" ON "ProjectEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_idx" ON "ProjectEvent"("projectId");

-- CreateIndex
CREATE INDEX "PipelineItem_userId_idx" ON "PipelineItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineItem_userId_projectId_key" ON "PipelineItem"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvent" ADD CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

