# 09 — Feature Flags & Gradual Rollout

> **EPIC: AAC-176** — Internal feature flag system to safely ship new features to subsets of tenants without code deploys.
> **Owner:** Infrastructure Agent
> **Status:** Planning

## 1. Goal

Build an in-house feature flag system that allows the AACsearch team to gradually roll out features to subsets of tenants based on targeting rules — without deploying new code or restarting servers.

## 2. Non-goals (explicitly deferred)

- Public API for customer-facing flags (tenant can configure their own flags) — deferred to v2
- A/B testing framework (statistical significance, experiment tracking) — no
- Migration to LaunchDarkly/GrowthBook — the architecture makes this trivial when needed, but we build in-house first
- Client-side flags delivered to browser via JS bundle — SSE push to SaaS dashboard only

## 3. Data Model

### FeatureFlag (Prisma model)

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique           // e.g. "analytics-v2", "knowledge-rag"
  title       String                     // Human-readable name
  description String?                    // What this flag controls

  type        String   @default("boolean") // "boolean" | "variant"

  // Boolean mode: enabled/disabled for all matching targets
  enabled     Boolean  @default(false)   // Global default

  // Variant mode: returns one of variantValues
  variantValues String[]                 // e.g. ["control", "treatment-a", "treatment-b"]
  variantDefault String?                 // Fallback variant

  // % rollout
  rolloutPercentage Int?                 // 0-100: % of matched tenants that get enabled=true

  // Targeting rules (JSON — flexible, parsed at runtime)
  // Rules are AND-combined. Each rule: { field: "planTier" | "orgAge" | "geo" | "orgSlug" | "manualList", operator: "in" | "notIn" | "gte" | "lt", value: string | string[] }
  targetingRules  Json?                  // Prisma.Json, cast as Record<string, unknown>

  // Kill switch — when true, force-disables for ALL orgs regardless of overrides
  killSwitch      Boolean  @default(false)

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?                      // Agent ID or user ID

  overrides  FeatureFlagOverride[]
}
```

### FeatureFlagOverride (Prisma model)

```prisma
model FeatureFlagOverride {
  id            String @id @default(cuid())
  flagId        String
  flag          FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)
  organizationId String
  enabled       Boolean                   // For boolean flags

  // For variant flags
  variantValue  String?

  // Override reason
  reason        String?

  @@unique([flagId, organizationId])
  @@index([organizationId])
}
```

### AuditLogFeatureFlag (opt-in to existing audit model)

```prisma
model AuditLogFeatureFlag {
  id            String   @id @default(cuid())
  flagId        String
  flagKey       String
  action        String   // "created" | "toggled" | "override_set" | "override_removed" | "kill_switch" | "config_changed"
  actorId       String
  actorType     String   // "agent" | "user_api" | "user_admin"
  before        Json?    // Snapshot of config before change
  after         Json?    // Snapshot of config after change
  createdAt     DateTime @default(now())

  @@index([flagId])
  @@index([createdAt])
}
```

## 4. Architecture

### Server-side SDK (`packages/feature-flags/`)

New workspace package `@repo/feature-flags`. Lightweight, cached, no external deps.

```
packages/feature-flags/
  index.ts              # Exports: createFlagClient, FeatureFlagClient
  types.ts              # FlagType, TargetingRule, FlagEvalContext
  client.ts             # FeatureFlagClient class — isEnabled(), getVariant()
  targeting.ts          # Rule evaluator — matches context against rules
  cache.ts              # In-memory cache with 60s TTL (TTlcache)
```

### Core API

```typescript
interface FlagEvalContext {
  organizationId: string;
  planTier: string;       // "free" | "starter" | "pro" | "business" | "enterprise"
  orgAgeDays: number;
  geo?: string;           // ISO country code
  orgSlug: string;
}

class FeatureFlagClient {
  constructor(private cache: FlagCache)

  async isEnabled(orgId: string, flagKey: string, context?: Partial<FlagEvalContext>): Promise<boolean>
  async getVariant(orgId: string, flagKey: string, context?: Partial<FlagEvalContext>): Promise<string | null>
  async getRawFlag(flagKey: string): Promise<FeatureFlag | null>
  invalidateCache(flagKey?: string): void
}
```

### Evaluation order

For `isEnabled()`:

1. **Kill switch ON** → return `false` (force-off)
2. **Per-org override exists** → return `override.enabled` (or check variant)
3. **Targeting rules exist** → evaluate rules against context:
    - No context provided for rule field → skip that rule (pass)
    - Rule field mismatch → rule fails
4. **% rollout active** → hash `orgId + flagKey` to deterministic bucket, compare to `rolloutPercentage`
5. **Global default** → return `flag.enabled`

### Admin API (`packages/api/modules/feature-flags/`)

oRPC procedures (admin-only, behind existing admin role check):

| Procedure            | Method | Description                            |
| -------------------- | ------ | -------------------------------------- |
| `listFeatureFlags`   | query  | List all flags with override count     |
| `getFeatureFlag`     | query  | Get single flag with all overrides     |
| `createFeatureFlag`  | mutate | Create new flag                        |
| `updateFeatureFlag`  | mutate | Update config (toggle, rollout, rules) |
| `deleteFeatureFlag`  | mutate | Delete flag + cascading overrides      |
| `setFlagOverride`    | mutate | Set per-org override                   |
| `removeFlagOverride` | mutate | Remove per-org override                |
| `toggleKillSwitch`   | mutate | Force-disable a flag                   |
| `evalFeatureFlag`    | query  | Dry-run evaluation for a given org     |
| `listFlagAuditLog`   | query  | Paginated audit log for a flag         |

### Admin UI (`apps/saas/modules/admin/feature-flags/`)

- **Flags list**: table with key, title, status (on/off/rollout%), kill switch indicator
- **Flag detail page**: toggle, configure rollout %, targeting rules builder, override management
- **Override list**: per-org overrides table with search
- **Audit log**: paginated timeline of changes
- Access restricted to admin role (existing supastarter admin gate)

### Client hook (`apps/saas/modules/shared/hooks/useFeatureFlag.ts`)

```typescript
function useFeatureFlag(
	flagKey: string,
	context?: Partial<FlagEvalContext>,
): {
	enabled: boolean;
	loading: boolean;
	error: Error | null;
};
```

- Subscribes to SSE endpoint `/api/feature-flags/events` for real-time flag change pushes
- Falls back to polling every 60s if SSE unavailable
- Caches result in React context

## 5. Cache Strategy

| Layer     | Mechanism                     | TTL | Invalidation                   |
| --------- | ----------------------------- | --- | ------------------------------ |
| In-memory | `Map<string, {flag, expiry}>` | 60s | Explicit on write API call     |
| Per-org   | Keyed by `orgId:flagKey`      | 60s | Same as above                  |
| SSE push  | Server-Sent Events            | —   | Immediate push on admin toggle |

## 6. Implementation Sequence

### Phase 1: Data Layer (requires schema change — Gate A)

1. Add `FeatureFlag` and `FeatureFlagOverride` models to Prisma schema
2. Create `AuditLogFeatureFlag` model
3. Run `pnpm --filter @repo/database push` (dev) + generate migration

### Phase 2: Core SDK

4. Create `packages/feature-flags/` with `types.ts`, `cache.ts`, `targeting.ts`, `client.ts`
5. Wire cache invalidation hooks

### Phase 3: Admin API

6. Create `packages/api/modules/feature-flags/` with 10 oRPC procedures
7. Mount in `packages/api/orpc/router.ts`
8. Add admin route guard

### Phase 4: Admin UI

9. Create admin feature-flags page at `/admin/feature-flags`
10. Create flag detail page with config editor
11. Override management UI with org search

### Phase 5: Client Integration

12. `useFeatureFlag` hook + SSE subscription
13. Wire SSE endpoint in Hono

### Phase 6: Migration & Tooling

14. Migration helper: `script/migrate-flag-to-launchdarkly.ts`
15. Integration tests
16. Documentation in `apps/docs`

## 7. Schema Change Notice

**This EPIC requires new Prisma models.** Per agents.md Gate A, schema changes need explicit user approval before proceeding. The following models are needed:

- `FeatureFlag` — flag definitions
- `FeatureFlagOverride` — per-organization overrides
- `AuditLogFeatureFlag` — change audit trail

All models belong to existing Prisma schema. No new database or external service required.

## 8. Open Questions

- Should `FeatureFlag` support a `deprecatedAt` field for flag lifecycle management? → defer to v2
- SSE or WebSocket for real-time push? → SSE is simpler, sufficient for dashboard
- Should per-org eval context include `PlanLimits` (search quota, etc.)? → yes, useful for charging-related flags
- Cache warming on server start? → lazy load on first access is fine
