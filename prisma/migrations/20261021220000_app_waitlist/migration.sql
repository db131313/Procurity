-- CreateTable
CREATE TABLE "AppWaitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'home',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppWaitlist_email_key" ON "AppWaitlist"("email");

-- CreateIndex
CREATE INDEX "AppWaitlist_createdAt_idx" ON "AppWaitlist"("createdAt");

-- CreateIndex
CREATE INDEX "AppWaitlist_source_idx" ON "AppWaitlist"("source");
