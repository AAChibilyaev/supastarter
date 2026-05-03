# Feature Flags & Gradual Rollout — Design Doc

> AAC-176 EPIC | Internal feature flag system for safe progressive delivery
> No external service dependency — fully in-house (avoids GDPR complexity)

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌─────────────────────┐     ┌───────────────────┐
│  Admin UI       │────▶│  FeatureFlag API     │────▶│  Prisma DB        │
│  /admin/fflags  │     │  (oRPC procedures)   │     │  FeatureFlag      │
└─────────────────┘     │                      │     │  FeatureFlagOvrd  │
                         │                      │     └───────────────────┘
┌─────────────────┐     │                      │
│  AuditLogger    │◀────│  toggle + override    │
└─────────────────┘     └───────┬───────────────┘
                                │
                   ┌────────────▼──────────────┐
                   │  FlagEvaluationService     │
                   │  (60s Redis cache)         │
                   │  isFeatureEnabled(org, f)  │
                   └────────────┬───────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
       Server RSC          API Middleware    SSE Endpoint
       (conditional        (gates on         (push changes
        render,            procedure)         to client)
        data fetch)

```

## 2. Data Model

### FeatureFlag (Prisma model — NEW)

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  name        String   @unique           // kebab-case: "ai-answer", "new-dashboard"
  description String?
  enabled     Boolean  @default(false)   // global master toggle
  killSwitch  Boolean  @default(false)   // force-off, overrides everything
  rolloutPct  Int      @default(0)       // 0-100
  targeting   Json?                      // { "plans": ["pro","enterprise"], "geo": ["EU"], "orgSlugs": ["acme-corp"] }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  overrides   FeatureFlagOverride[]
}
```

### FeatureFlagOverride (Prisma model — NEW)

```prisma
model FeatureFlagOverride {
  id            String      @id @default(cuid())
  flagId        String
  flag          FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)
  organizationId String
  enabled       Boolean?     // null = inherit from flag, true = force-on, false = force-off
  reason        String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  @@unique([flagId, organizationId])
}
```

## 3. Flag Evaluation Pipeline

```
isFeatureEnabled(orgId, flagName) → boolean

1. Check kill switch → if true, return FALSE immediately
2. Check flag exists + globally enabled → if disabled, return FALSE
3. Check per-org override → if set, return override.enabled
4. Check manual list → if org.slug in flag.targeting.orgSlugs → return TRUE
5. Check targeting rules (AND logic):
   - plan tier → if org.plan in flag.targeting.plans
   - geo → if org.country in flag.targeting.geo
   - org age → if days since org.createdAt >= minAgeDays
6. Check percentage rollout → if hash(orgId + flagName) % 100 < rolloutPct
7. Return FALSE (default)
```

## 4. Cache Strategy

| Layer              | Key                        | TTL       | Invalidation                         |
| ------------------ | -------------------------- | --------- | ------------------------------------ |
| Redis              | `fflag:{orgId}:{flagName}` | 60s       | Manual flush on flag/override change |
| In-memory (server) | LRU, 1000 entries          | 60s       | TTL expiry                           |
| Client (SSE)       | React state                | Real-time | SSE push                             |

## 5. API Procedures

```typescript
// Admin only — manage flags
listFeatureFlags(): { flags: FeatureFlag[] }
getFeatureFlag(name: string): FeatureFlag
createFeatureFlag(input: CreateFlagInput): FeatureFlag
updateFeatureFlag(name: string, input: UpdateFlagInput): FeatureFlag
toggleKillSwitch(name: string, active: boolean): FeatureFlag
setOrgOverride(flagName: string, orgId: string, value: boolean | null): FeatureFlagOverride
getFlagChangeHistory(name: string): AuditEntry[]

// Internal SDK (server-side, not exposed via oRPC)
isFeatureEnabled(orgId: string, flagName: string): Promise<boolean>
getEnabledFlags(orgId: string): Promise<string[]>

// SSE for real-time client updates (via Hono)
GET /api/internal/feature-flags/subscribe?orgId=X
```

## 6. Targeting Rules Schema

```typescript
interface FlagTargeting {
	/** List of plan tier slugs (e.g. ["pro", "enterprise"]) */
	plans?: string[];
	/** ISO country codes (e.g. ["US", "DE", "FR"]) */
	geo?: string[];
	/** Exact org slug matches */
	orgSlugs?: string[];
	/** Minimum org age in days */
	minOrgAgeDays?: number;
}
```

## 7. Environment Configuration

```env
# Emergency kill switch — bypasses DB, disables ALL flags
FEATURE_FLAGS_KILL_SWITCH=false

# Override to force-enable in dev
NEXT_PUBLIC_FEATURE_FLAGS_DEV_OVERRIDE=false

# Cache TTL in seconds (default: 60)
FEATURE_FLAGS_CACHE_TTL=60
```

## 8. Admin UI Wireframe

```
/admin/feature-flags
├── Table: [Flag Name] [Global Toggle] [Rollout %] [Kill Switch] [Actions]
│   └── Expand → per-org overrides list + add override modal
├── Create Flag button → modal (name, desc, targeting JSON)
└── Change History tab → timeline of all flag toggles
```

## 9. Child Issues

| ID      | Title                                     | Priority | Status  |
| ------- | ----------------------------------------- | -------- | ------- |
| AAC-876 | Feature Flag Prisma schema + seed         | medium   | backlog |
| AAC-877 | Flag evaluation engine (isFeatureEnabled) | medium   | backlog |
| AAC-878 | Admin UI: /admin/feature-flags            | medium   | backlog |
| AAC-879 | Kill switch mechanism                     | medium   | backlog |
| AAC-880 | Audit logging for flag changes            | medium   | backlog |
| AAC-881 | Client-side useFeatureFlag hook (SSE)     | medium   | backlog |

## 10. Migration Path

When GrowthBook or LaunchDarkly is needed in the future:

1. Export flag configs as JSON (FeatureFlag → GrowthBook feature definitions)
2. Replace `FlagEvaluationService` with GrowthBook SDK client
3. Keep FeatureFlagOverride model as local cache
4. Wire GrowthBook webhook → SSE endpoint for real-time updates
