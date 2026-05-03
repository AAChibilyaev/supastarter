# SCIM 2.0 Dashboard UI — Product Spec

**EPIC:** AAC-446
**Goal:** Enterprise admin dashboard for SCIM provisioning configuration and management
**Status:** Draft — todo

---

## 1. Overview

Enterprise customers need SCIM (System for Cross-domain Identity Management) to automate user provisioning from their Identity Provider. The backend SCIM 2.0 endpoints exist at `/api/scim/v2/*`. This spec covers the **admin dashboard UI** that org admins use to:

- Connect an IdP (wizard flow)
- View/manage SCIM provisioning status
- Monitor sync logs and audit history
- Generate SCIM bearer token

---

## 2. User Stories

| ID   | Story                                                                                                                                           | Priority |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-1 | As an org admin, I want to connect my IdP (Okta, Azure AD, Google Workspace) via a guided wizard so that my users are automatically provisioned | P0       |
| US-2 | As an org admin, I want to view current SCIM provisioning status (active/inactive, last sync)                                                   | P0       |
| US-3 | As an org admin, I want to generate/copy a SCIM bearer token for my IdP configuration                                                           | P1       |
| US-4 | As an org admin, I want to see SCIM sync audit logs (who was provisioned/deprovisioned, when)                                                   | P1       |
| US-5 | As an org admin, I want to revoke a SCIM token if compromised                                                                                   | P1       |
| US-6 | As an org admin, I want to test the SCIM connection before going live                                                                           | P2       |

---

## 3. Pages & Routes

### 3.1 SCIM Overview Page

**Route:** `/org/[slug]/settings/scim`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Settings > SCIM Provisioning                        │
│                                                      │
│  ┌─ Status Card ─────────────────────────────────┐  │
│  │  ● Active / ○ Inactive                        │  │
│  │  Connected to: Okta (work.acme.com)           │  │
│  │  Last sync: 2 minutes ago                     │  │
│  │  Users provisioned: 143                       │  │
│  │  [Disconnect]  [View Logs]                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ SCIM Endpoint ───────────────────────────────┐  │
│  │  SCIM Base URL:                                │  │
│  │  https://api.aacsearch.com/scim/v2           │  │
│  │  [Copy]                                        │  │
│  │                                                 │  │
│  │  Bearer Token: ••••••••••••••••••              │  │
│  │  [Copy]  [Regenerate]  [Revoke]                │  │
│  │  Created: May 3, 2026 — never used             │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Recent Activity ─────────────────────────────┐  │
│  │  Today 09:15  John Doe (john@acme.com)        │  │
│  │               → Created via Okta SCIM         │  │
│  │  Today 08:32  Jane Smith (jane@acme.com)      │  │
│  │               → Deactivated via Okta SCIM     │  │
│  │  [View all logs →]                            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**States:**

- **Empty state (no connection):** Show "Connect Identity Provider" CTA button with large illustration
- **Active state:** Full dashboard as shown above
- **Error state:** Alert banner if token is invalid or IdP unreachable

### 3.2 IdP Connection Wizard

**Route:** `/org/[slug]/settings/scim/connect`

**Step 1 — Select IdP:**

```
┌─────────────────────────────────────────────────────┐
│  Select your identity provider                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │   Okta   │  │ Azure AD │  │ Google Workspace│   │
│  └──────────┘  └──────────┘  └────────────────┘   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ OneLogin │  │ Keycloak │  │ Other (SCIM v2) │   │
│  └──────────┘  └──────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Step 2 — Configure:**

```
┌─────────────────────────────────────────────────────┐
│  Configure Okta Connection                          │
│                                                     │
│  1. In your Okta admin console, go to               │
│     Applications > Add Application                  │
│                                                     │
│  2. Select "SCIM Provisioning" template             │
│                                                     │
│  3. Use these settings:                             │
│     SCIM Base URL:  [pre-filled]  [Copy]            │
│     Bearer Token:   [auto-generated]  [Copy]        │
│     ┌──────────────────────────────────────┐        │
│     │ Supported features:                  │        │
│     │ ✅ Push New Users                    │        │
│     │ ✅ Push Profile Update               │        │
│     │ ✅ Push Groups                       │        │
│     │ ✅ Import New Users and Profile      │        │
│     │ 🔲 Password Sync                     │        │
│     └──────────────────────────────────────┘        │
│                                                     │
│  [← Back]  [Test Connection →]  [Skip Test & Save]  │
└─────────────────────────────────────────────────────┘
```

**Step 3 — Test Connection:**

```
┌─────────────────────────────────────────────────────┐
│  Test SCIM Connection                               │
│                                                     │
│  🔄 Testing connection to Okta...                   │
│  ServiceProviderConfig:    ✅ 200 OK                 │
│  Listing Users:            ✅ 15 users found         │
│  Creating test user:       ✅ User created           │
│  Cleaning up test user:    ✅ User deleted           │
│                                                     │
│  ✅ Connection successful!                          │
│                                                     │
│  [← Back]  [Complete Setup]                         │
└─────────────────────────────────────────────────────┘
```

### 3.3 SCIM Audit Logs

**Route:** `/org/[slug]/settings/scim/logs`

**Table view:**

- Columns: Timestamp, Action (Created/Updated/Deactivated), User, Email, Source (Okta/Azure AD/manual)
- Filters: Date range, Action type, Source
- Pagination (20 per page)
- Export to CSV option

### 3.4 Empty State / Disconnected

**Route:** `/org/[slug]/settings/scim` (when no IdP connected)

```
┌─────────────────────────────────────────────────────┐
│  SCIM Provisioning                                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  🔄                                            │   │
│  │  Automate user provisioning with SCIM          │   │
│  │                                                │   │
│  │  Connect your identity provider to             │   │
│  │  automatically create, update, and deactivate  │   │
│  │  users in your AACsearch organization.         │   │
│  │                                                │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │  Connect Identity Provider              │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  │                                                │   │
│  │  Enterprise feature — available on Scale plan+ │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Plan upgrade gate:** If org is on a plan below Scale, show upgrade prompt instead.

---

## 4. Data Model (Prisma)

```prisma
model ScimConfiguration {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  // IdP connection
  provider        String   // "okta" | "azure_ad" | "google_workspace" | "onelogin" | "keycloak" | "generic"
  displayName     String?  // Friendly name like "Acme Corp Okta"
  isActive        Boolean  @default(false)

  // Authentication
  bearerToken     String   // Hashed (like SearchApiKey — show once)
  tokenPrefix     String   // First 8 chars for identification
  tokenCreatedAt  DateTime @default(now())
  tokenLastUsedAt DateTime?

  // Sync status
  lastSyncAt      DateTime?
  lastSyncStatus  String?  // "success" | "error" | "in_progress"
  lastSyncError   String?
  usersProvisioned Int     @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  auditLogs       ScimAuditLog[]

  @@unique([organizationId, provider])
}

model ScimAuditLog {
  id              String   @id @default(cuid())
  scimConfigId    String
  scimConfig      ScimConfiguration @relation(fields: [scimConfigId], references: [id])
  organizationId  String

  action          String   // "user_created" | "user_updated" | "user_deactivated" | "group_created" | "group_synced"
  scimResourceType String  // "User" | "Group"
  scimResourceId  String   // The id in our system
  targetEmail     String?  // For users
  targetName      String?
  detail          String?  // Additional context
  success         Boolean  @default(true)
  errorMessage    String?

  createdAt       DateTime @default(now())

  @@index([scimConfigId, createdAt])
  @@index([organizationId, createdAt])
}
```

---

## 5. API Endpoints (New)

| Method   | Path                                       | Purpose                                       |
| -------- | ------------------------------------------ | --------------------------------------------- |
| `GET`    | `/api/scim/config/:orgId`                  | Get current SCIM configuration                |
| `POST`   | `/api/scim/config/:orgId`                  | Save SCIM configuration (provider, token)     |
| `DELETE` | `/api/scim/config/:orgId`                  | Disconnect SCIM (delete config, revoke token) |
| `POST`   | `/api/scim/config/:orgId/regenerate-token` | Generate new bearer token                     |
| `POST`   | `/api/scim/config/:orgId/test`             | Test SCIM connection against the IdP          |
| `GET`    | `/api/scim/config/:orgId/logs`             | Paginated audit logs                          |
| `GET`    | `/api/scim/config/:orgId/logs/export`      | CSV export of audit logs                      |

---

## 6. File Implementation Plan

| File                                                                   | Purpose                      |
| ---------------------------------------------------------------------- | ---------------------------- |
| `packages/database/prisma/migrations/xxx_scim_config.ts`               | Prisma schema migration      |
| `packages/api/modules/scim-config/router.ts`                           | SCIM config management API   |
| `packages/api/modules/scim-config/procedures/*.ts`                     | oRPC procedures for CRUD     |
| `apps/saas/modules/settings/components/scim/ScimOverview.tsx`          | Main SCIM settings page      |
| `apps/saas/modules/settings/components/scim/ScimWizard.tsx`            | IdP connection wizard        |
| `apps/saas/modules/settings/components/scim/ScimWizardStepIdp.tsx`     | Step 1: IdP selector         |
| `apps/saas/modules/settings/components/scim/ScimWizardStepConfig.tsx`  | Step 2: Configuration        |
| `apps/saas/modules/settings/components/scim/ScimWizardStepTest.tsx`    | Step 3: Test connection      |
| `apps/saas/modules/settings/components/scim/ScimStatusCard.tsx`        | Status card                  |
| `apps/saas/modules/settings/components/scim/ScimEndpointCard.tsx`      | SCIM URL + token card        |
| `apps/saas/modules/settings/components/scim/ScimAuditTable.tsx`        | Audit log table              |
| `apps/saas/modules/settings/components/scim/ScimEmptyState.tsx`        | Empty/disconnected state     |
| `apps/saas/app/\[locale\]/org/\[slug\]/settings/scim/page.tsx`         | Page route                   |
| `apps/saas/app/\[locale\]/org/\[slug\]/settings/scim/connect/page.tsx` | Wizard route                 |
| `apps/saas/app/\[locale\]/org/\[slug\]/settings/scim/logs/page.tsx`    | Logs route                   |
| `packages/i18n/translations/*/saas.json`                               | i18n: `settings.scim.*` keys |

---

## 7. i18n Strings (all 5 locales)

```
settings.scim.title = "SCIM Provisioning"
settings.scim.description = "Automate user provisioning with SCIM 2.0"
settings.scim.emptyState.title = "Automate user provisioning with SCIM"
settings.scim.emptyState.description = "Connect your identity provider..."
settings.scim.emptyState.cta = "Connect Identity Provider"
settings.scim.emptyState.planUpgrade = "Enterprise feature — available on Scale plan+"
settings.scim.status.active = "Active"
settings.scim.status.inactive = "Inactive"
settings.scim.status.lastSync = "Last sync"
settings.scim.status.usersProvisioned = "Users provisioned"
settings.scim.endpoint.baseUrl = "SCIM Base URL"
settings.scim.endpoint.bearerToken = "Bearer Token"
settings.scim.endpoint.copy = "Copy"
settings.scim.endpoint.regenerate = "Regenerate"
settings.scim.endpoint.revoke = "Revoke"
settings.scim.wizard.title = "Connect Identity Provider"
settings.scim.wizard.selectProvider = "Select your identity provider"
settings.scim.wizard.configure = "Configure {provider} Connection"
settings.scim.wizard.testConnection = "Test SCIM Connection"
settings.scim.wizard.skipAndSave = "Skip Test & Save"
settings.scim.wizard.complete = "Complete Setup"
settings.scim.test.success = "Connection successful!"
settings.scim.test.failure = "Connection failed"
settings.scim.logs.title = "SCIM Audit Logs"
settings.scim.logs.exportCsv = "Export CSV"
settings.scim.logs.action = "Action"
settings.scim.logs.user = "User"
settings.scim.logs.email = "Email"
settings.scim.logs.source = "Source"
settings.scim.logs.timestamp = "Timestamp"
```

---

## 8. Enterprise Gating

- SCIM is **Scale plan+ only**
- Check org plan before showing SCIM settings
- If below Scale plan: show upgrade CTA with plan comparison mini-card
- Include in the `hasFeature('scim_provisioning')` check (if feature flag system exists)

---

## 9. Dependencies

- Backend SCIM endpoints ✅ existing (`packages/api/modules/search/scim-public.ts`)
- Prisma schema migration (new ScimConfiguration + ScimAuditLog models)
- Bearer token: hash-once pattern (like SearchApiKey)
- Plan gating integration
- i18n in all 5 locales
