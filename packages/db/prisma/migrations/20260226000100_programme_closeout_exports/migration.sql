-- CreateEnum
CREATE TYPE "ProgrammeExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ExportTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structureJson" JSONB NOT NULL,
    "includeRulesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeExportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "exportTemplateId" TEXT NOT NULL,
    "status" "ProgrammeExportStatus" NOT NULL DEFAULT 'QUEUED',
    "zipObsKey" TEXT,
    "reportPdfObsKey" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ProgrammeExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportTemplate_tenantId_name_idx" ON "ExportTemplate"("tenantId", "name");
CREATE INDEX "ProgrammeExportJob_tenantId_status_createdAt_idx" ON "ProgrammeExportJob"("tenantId", "status", "createdAt");
CREATE INDEX "ProgrammeExportJob_programmeId_createdAt_idx" ON "ProgrammeExportJob"("programmeId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExportTemplate" ADD CONSTRAINT "ExportTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgrammeExportJob" ADD CONSTRAINT "ProgrammeExportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammeExportJob" ADD CONSTRAINT "ProgrammeExportJob_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammeExportJob" ADD CONSTRAINT "ProgrammeExportJob_exportTemplateId_fkey" FOREIGN KEY ("exportTemplateId") REFERENCES "ExportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammeExportJob" ADD CONSTRAINT "ProgrammeExportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
