-- CreateTable
CREATE TABLE "scim_provisioning_rule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'member',
    "deprovisionAction" TEXT NOT NULL DEFAULT 'suspend',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scim_provisioning_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scim_provisioning_rule_organizationId_groupName_key" ON "scim_provisioning_rule"("organizationId", "groupName");

-- CreateIndex
CREATE INDEX "scim_provisioning_rule_organizationId_idx" ON "scim_provisioning_rule"("organizationId");

-- AddForeignKey
ALTER TABLE "scim_provisioning_rule" ADD CONSTRAINT "scim_provisioning_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
