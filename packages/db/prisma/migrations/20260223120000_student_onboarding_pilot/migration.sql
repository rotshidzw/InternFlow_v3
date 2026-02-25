-- CreateEnum
CREATE TYPE "InviteTokenRole" AS ENUM ('LEARNER');

-- CreateEnum
CREATE TYPE "OpportunityVisibility" AS ENUM ('PUBLIC', 'TENANT_ONLY', 'PROGRAMME_ONLY');

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programmeId" TEXT,
    "role" "InviteTokenRole" NOT NULL DEFAULT 'LEARNER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" JSONB,
    "experience" JSONB,
    "isDiscoverable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "visibility" "OpportunityVisibility" NOT NULL DEFAULT 'TENANT_ONLY',
    "programmeId" TEXT,
    "closesAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX "InviteToken_tenantId_expiresAt_idx" ON "InviteToken"("tenantId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE INDEX "StudentProfile_isDiscoverable_idx" ON "StudentProfile"("isDiscoverable");

-- CreateIndex
CREATE INDEX "OpportunityPost_visibility_closesAt_idx" ON "OpportunityPost"("visibility", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_postId_userId_key" ON "Interest"("postId", "userId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_action_idx" ON "AuditEvent"("tenantId", "action");
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityPost" ADD CONSTRAINT "OpportunityPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityPost" ADD CONSTRAINT "OpportunityPost_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpportunityPost" ADD CONSTRAINT "OpportunityPost_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Interest" ADD CONSTRAINT "Interest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OpportunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
