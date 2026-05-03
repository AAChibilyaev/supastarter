-- CreateTable
CREATE TABLE "scim_configuration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'other',
    "bearerTokenHash" TEXT NOT NULL,
    "bearerTokenPrefix" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "endpointUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scim_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scim_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT,
    "performedBy" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scim_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scim_configuration_organizationId_key" ON "scim_configuration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "scim_configuration_bearerTokenHash_key" ON "scim_configuration"("bearerTokenHash");

-- CreateIndex
CREATE INDEX "scim_configuration_organizationId_idx" ON "scim_configuration"("organizationId");

-- CreateIndex
CREATE INDEX "scim_audit_log_organizationId_idx" ON "scim_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "scim_audit_log_organizationId_createdAt_idx" ON "scim_audit_log"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "scim_audit_log_createdAt_idx" ON "scim_audit_log"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "scim_configuration" ADD CONSTRAINT "scim_configuration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scim_audit_log" ADD CONSTRAINT "scim_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
