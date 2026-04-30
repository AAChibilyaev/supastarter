# AACsearch — Autonomous Coding Agent

> Full autonomous coding guide for AACsearch (search-as-a-service on supastarter Next.js monorepo).
> Location: `/Users/aac/Projects/ts/supastarter/`
> Symlink: `claude.md` → `agents.md`

---

## MODE: AUTONOMOUS

This AGENTS.md is designed for **fully autonomous operation**. The agent should:

1. Never stop to ask questions it can answer from project context
2. Follow every rule deterministically — if a choice exists, the rules below pick one
3. Execute tasks end-to-end: understand → analyze → implement → verify → commit
4. Only escalate to the user when truly blocked (ambiguous requirement, no existing pattern, schema change needed with frozen DB)

**Autonomous workflow: READ → PLAN → EXECUTE → VERIFY → COMMIT**

---

## 1. PROJECT DNA

```
Name:        AACsearch
Product:     Hosted search-as-a-service (Typesense-backed)
Base:        supastarter Next.js monorepo
Stack:       TypeScript
Style:       strict, interfaces > types, named exports, no enums, RSC-first
Structure:   4 apps (saas/marketing/docs/mail-preview), 16 packages, tooling/
Deploy:      [NOT SET — Coolify ready]
Active:      v0.5 (marketing focus)
Last:        Rebranded from supastarter to AACsearch
```

### Tech Stack (exact versions)

| Technology       | Version  | Notes                                                |
| ---------------- | -------- | ---------------------------------------------------- |
| Next.js          | ^16.2.0  | App Router, RSC, Server Actions                      |
| React            | 19.2.4   | Server Components default                            |
| TypeScript       | 6.0.2    | strict, target ES6 (override to ES2020 for BigInt)   |
| pnpm             | 10.28.2  | workspace catalog: versions                          |
| Turborepo        | ^2.9.4   | dotenv -c wrapper                                    |
| Tailwind CSS     | 4.2.2    | v4, no tailwind.config.ts, only @theme in theme.css  |
| Shadcn UI        | —        | 27 primitives in packages/ui/components/             |
| Radix UI         | ^1.4.3   | accessible primitives                                |
| oRPC             | 1.13.13  | type-safe RPC + TanStack Query                       |
| Hono             | ^4.12.11 | HTTP handler (mounts oRPC, webhooks, CORS)           |
| Better Auth      | 1.5.6    | auth, orgs, passkeys, 2FA, magic links, admin, OAuth |
| Prisma           | 7.6.0    | ACTIVE ORM — 25 models                               |
| Drizzle (legacy) | ^0.45.2  | reference only — do NOT add new files                |
| Zod              | ^4.3.6   | validation                                           |
| TanStack Query   | ^5.96.2  | client data fetching                                 |
| react-hook-form  | ^7.72.1  | forms                                                |
| Oxlint           | ^1.58.0  | LINT ONLY (NOT ESLint)                               |
| Oxfmt            | ^0.43.0  | FORMAT ONLY (NOT Prettier)                           |
| next-intl        | 4.9.0    | i18n — 4 locales x 4 scopes                          |
| Typesense        | ^3.0.0   | search engine                                        |
| OpenAI SDK       | ^6.33.0  | AI features                                          |
| Vercel AI SDK    | ^6.0.146 | AI streaming                                         |

---

## 2. AUTONOMOUS TASK EXECUTION PROTOCOL

### Phase 1: UNDERSTAND (always first, 2 min max)

```markdown
1. Read task description twice
2. Classify scope by PRD: v0.x (search) ✅ | v0.5 (marketing) ✅ | v0.6/v0.7/v1.0 → DEFER ask | wallet/ai/dslmrank → DEFER ask
3. Check memory_search() for related facts/gotchas
4. If touching existing code → code_search() for relevant symbols
5. State your plan in <task_plan> block before writing any code
```

### Phase 2: ANALYZE (mandatory greps)

```bash
# Before creating ANY new file, run the matching grep:
rg -l "<ComponentName|functionName|concept>" apps/saas/modules apps/marketing/modules packages/api/modules packages/database/prisma/queries
# If result exists → USE IT. State in reply WHY you still need new.
```

### Phase 3: EXECUTE (surgical changes only)

- Touch only what the task requires
- Match existing style exactly (indentation, naming, file structure)
- Clean only your own orphans (imports, variables) — not pre-existing dead code
- Run `pnpm lint:fix` and `pnpm format` after every file change

### Phase 4: VERIFY (mandatory gates — ALL must pass)

```bash
# 1. Type check
pnpm type-check
# If fails with BigInt error → check .transform(v => v.toString()) on outputs + target ES2020 in tsconfig

# 2. Lint
pnpm lint
# If fails → pnpm lint:fix, re-check

# 3. Format
pnpm format:check
# If fails → pnpm format

# 4. User-visible strings → ALL 4 locales
rg '"your\.new\.key"' packages/i18n/translations/
# MUST return 4 hits (en, de, es, fr)

# 5. File structure validation
# If new module → router.ts mounted in packages/api/orpc/router.ts?
# If new component → follows 3-layer UI ranking?
# If new query → in prisma/queries/, not drizzle/queries/?
```

### Phase 5: COMMIT

```bash
# Format: [type] what and why
# Types: feat, fix, refactor, docs, chore, i18n, style
git add -A
git commit -m "feat: add search usage dashboard panel"
# ALWAYS run pnpm lint && pnpm type-check before commit
# Update CHANGELOG.md if consumer-facing change
```

---

## 3. HARD INVARIANTS (NEVER violate)

These are NOT optional. If a task would break one, refuse and explain.

### Invariant 1: Split-app only

**No `apps/web/*`.** Only: `apps/saas`, `apps/marketing`, `apps/docs`, `apps/mail-preview`.

### Invariant 2: DB-first ingest

Public write requests enqueue into `SearchIngestBuffer` (via `enqueueManySearchIngest`). Only the worker calls `bulkUpsert`. NEVER call `bulkUpsert` from a request handler. Reindex is the only other allowed caller.

### Invariant 3: API keys hash-only

`SearchApiKey.hashedKey` is the only stored form. Plaintext shown **once** at creation, never logged, never returned on read.

### Invariant 4: Scoped tokens narrow, never widen

`verifyScopedSearchToken()` returns a `scopedFilter` that is AND-combined with caller filters via `combineFilters()`. Never bypass `combineFilters` or apply scoped filter as OR.

### Invariant 5: Tenant isolation

Every search call passes `tenantId: verified.organizationId`. No cross-org reads, ever.

### Invariant 6: No raw Typesense errors to client

Map upstream failures to typed JSON errors (`{ error: "search_failed" }` → 502, etc.). Never echo `error.message` from Typesense.

### Invariant 7: BigInt over oRPC

Every BigInt field in procedure output schemas MUST `.transform(v => v.toString())`. oRPC JSON serializer cannot serialize BigInt.

```typescript
const bigintAsString = z.bigint().transform((v) => v.toString());
// Apply to: kopecks, counters, etc.
```

### Invariant 8: Money in kopecks (BigInt minor units)

Wallet ledger and pricing use BigInt minor units. Conversion to display strings only at UI/email surface.

### Invariant 9: DB is FROZEN

**No Prisma migrations / schema deltas without explicit user approval.** Any feature requiring new persistence must call out the DB change upfront. Until approved, build on 25 existing models.

### Invariant 10: i18n ALL 4 locales

Every user-visible string lands in ALL 4 locales (en, de, es, fr) in the SAME change. Skipping one = production bug (next-intl falls back silently). Verify: `rg '"key"' packages/i18n/translations/` must return 4 hits.

### Invariant 11: REUSE FIRST — GREP BEFORE WRITE

Before creating ANY new file: run the grep. 3-layer UI ranking: feature blocks → shared blocks → primitives. API: extend existing module. DB: extend existing query file. Zod: use generated `<Model>Schema` from `@repo/database` — NEVER hand-write.

### Invariant 12: Prisma is active ORM

`packages/database/index.ts` re-exports only `./prisma`. Drizzle/ is legacy reference only — NOT wired. New queries go in `packages/database/prisma/queries/<area>.ts`.

### Invariant 13: agents.md = claude.md (symlink)

Edit only `agents.md`. `claude.md` is a symlink — it updates automatically. Do not create a divergent `claude.md`.

### Invariant 14: Lint/Format = Oxlint + Oxfmt ONLY

**NOT Biome, NOT ESLint, NOT Prettier.** Never install or import these tools.

### Invariant 15: Removed code STAYS removed

Do not recreate: `wallet-sync.ts`, `sync-subscriptions` cron, DSLMRank rules.

### Invariant 16: Money is never numeric/decimal

Always `BigInt` minor units. Always over oRPC: `.transform(v => v.toString())`. Always in `packages/db/prisma/`: `BigInt @default(0)` with patch script.

### Invariant 17: No console.log in production

Only use `logger` from `@repo/logs` (pino-based). `console.log` in committed code = lint error.

---

## 4. AUTONOMOUS DECISION GATES

Use these to handle common situations without human input.

### Gate A: Schema change needed?

→ If the task needs a new DB column/model: **STOP**. State what you need and why. Do not proceed without user approval (Invariant 9).

### Gate B: New env variable needed?

→ Add it to `.env.local.example` AND `.env.local`. Pick `NEXT_PUBLIC_` prefix only if browser needs it. Add a default/fallback in code so the app doesn't crash without it.

### Gate C: New UI component?

→ 1) Search `packages/ui/components/` (27 primitives) → 2) Search `apps/saas/modules/shared/components/` → 3) Search `apps/saas/modules/<feature>/components/`. If nothing matches: place in Layer 3 (`apps/saas/modules/<feature>/components/`), NOT in `packages/ui` or `@shared`. Add a prop to existing before creating new.

### Gate D: New API procedure?

→ Extend an existing module in `packages/api/modules/<existing>/procedures/`. Only create a new module directory if the feature genuinely has no existing module. Mount in `packages/api/orpc/router.ts`.

### Gate E: New DB query?

→ Extend existing file in `packages/database/prisma/queries/<area>.ts`. Create new file only if the area is genuinely new and has ≥2 query functions.

### Gate F: New notification type?

→ 1) Add to `NotificationType` enum in schema.prisma → **STOP — schema change (Gate A)**. Push only after approval. 2) Update `packages/notifications/types.ts` + `catalog.ts`. 3) Add i18n labels in all 4 locales.

### Gate G: BigInt in output?

→ ALWAYS `.transform(v => v.toString())` in the oRPC output schema. If the package doesn't support BigInt literals (`0n`), override tsconfig target to ES2020.

### Gate H: Marketing page (v0.5)?

→ PROCEED. Add translation keys in ALL 4 locales. Use existing blocks from `apps/marketing/modules/shared/components/` first. Place new sections in `apps/marketing/modules/<area>/components/`.

### Gate I: Wallet/ai-core/half-orphaned?

→ **CONFIRM with user first.** These domains are not wired to search billing yet. Do not extend without explicit task.

### Gate J: Docs or self-host?

→ **DEFER** (v0.7 / v1.0). Ask user before implementing.

### Gate K: Stripe billing for search-units?

→ **DEFER** (v0.6). Ask user before implementing.

### Gate L: New workspace package?

→ **CONFIRM with user.** 16 already exist. New package needs ≥2 internal consumers OR customer-facing SDK use case.

### Gate M: Dependency added?

→ Use `pnpm add <pkg> --filter <workspace-package>`. Prefer existing `catalog:` versions in `pnpm-workspace.yaml`. Avoid adding deps that can be done with existing tech.

### Gate N: Test needed?

→ If touching business logic: add/update Vitest test. If touching a page/flow: add/update Playwright E2E test. If bug fix: reproduce with a failing test FIRST, then fix.

---

## 5. TASK TYPE → AUTONOMOUS WORKFLOW

Each task type has a predefined workflow. Follow it step by step.

### Task Type 1: Add new SaaS feature (DB → API → UI → i18n)

```bash
STEP 1: DB queries
  # Extend packages/database/prisma/queries/<feature>.ts
  # NO schema changes (Invariant 9) — query existing 25 models
  Export from packages/database/index.ts if new file
  Verify: pnpm --filter @repo/database type-check

STEP 2: API procedures
  # Create or extend packages/api/modules/<feature>/
  # Structure: types.ts (zod), procedures/<action>.ts, router.ts
  # Choose procedure type: publicProcedure / protectedProcedure / adminProcedure
  # BigInt outputs → .transform(v => v.toString())
  # Mount in packages/api/orpc/router.ts
  Verify: pnpm --filter @repo/api type-check

STEP 3: UI components
  # apps/saas/modules/<feature>/components/<Component>.tsx
  # RSC default, "use client" only for interactivity
  # Use existing 3-layer components (Gate C)
  # react-hook-form + zod for forms
  # TanStack Query via orpc from @shared/lib/orpc-query-utils
  # Session via @auth/hooks/use-session (client) or @auth/lib/server (server)
  # no console.log — use logger from @repo/logs

STEP 4: i18n
  # packages/i18n/translations/{en,de,es,fr}/saas.json
  # ALL 4 locales in same change
  # Scope: saas-only → saas.json, cross-app → shared.json

STEP 5: Verify
  # pnpm type-check && pnpm lint && pnpm format:check
  # rg '"your.key"' packages/i18n/translations/ → 4 hits
```

### Task Type 2: Add marketing page (v0.5 current focus)

```bash
STEP 1: i18n keys
  # packages/i18n/translations/{en,de,es,fr}/marketing.json — ALL 4
  # Scope: marketing page → marketing.json

STEP 2: Route
  # apps/marketing/app/[locale]/<route>/page.tsx
  # Server Component by default
  # setRequestLocale(locale) in server component
  # Compose from existing blocks: HeroSection, FeaturesGrid, HowItWorks, CtaFooter, PricingPlans, ContactForm

STEP 3: New sections (only if existing blocks don't fit)
  # apps/marketing/modules/<area>/components/<Section>.tsx

STEP 4: Sitemap
  # apps/marketing/app/sitemap.ts if page is public

STEP 5: Verify
  # pnpm --filter marketing type-check
  # pnpm dev --filter=marketing → visual check :3001
  # All 4 locales render correctly
```

### Task Type 3: Search feature (public-handler / ingest / keys / tokens)

```bash
!! CRITICAL: Re-read Invariants 2-6 before any change !!

STEP 1: Understand current flow
  # packages/search/lib/{client,collections,buffer,reindex}.ts
  # packages/api/modules/search/{public-handler,lib/public-auth,lib/scoped-token}.ts
  # @repo/search-client (browser SDK)

STEP 2: Implement
  # Respect: DB-first ingest, tenant isolation, no raw errors, hash-only keys, scoped tokens narrow
  # Partial-fail handling: markIngestRowsSuccess / markIngestRowsFailure with exponential backoff
  # Reindex: alias-swap atomic (keep previous version until traffic confirms green)

STEP 3: Verify
  # pnpm --filter @repo/search type-check
  # pnpm --filter @repo/api type-check
  # pnpm --filter @repo/search-client type-check
  # Check: no bulkUpsert from request path, tenantId everywhere, no error.message leak
```

### Task Type 4: Bug fix

```bash
!! MANDATORY: Reproduce FIRST !!

STEP 1: Reproduce
  # Create a failing test or documented manual repro
  # Never fix something you didn't reproduce

STEP 2: Root cause
  # Use systematic-debugging skill: understand → hypothesize → isolate → fix
  # Check memory_search() for related past bugs

STEP 3: Fix + verify
  # Same repro now passes
  # Adjacent tests still pass (pnpm --filter <package> test)
  # Root cause noted in commit message if non-obvious
  # pnpm type-check && pnpm lint
```

### Task Type 5: Rebrand / rename

```bash
STEP 1: Search all references
  # rg -r '<old_name>' apps packages tooling --include '*.ts' --include '*.tsx' --include '*.json' --include '*.md'
  # Update in order: package names → import paths → env vars → files/dirs → docs/marketing copy

STEP 2: File renames
  # git mv old-name.ts new-name.ts

STEP 3: Verify
  # pnpm type-check — must be clean
  # rg '<old_name>' apps packages — must return 0 hits (excluding pnpm-lock.yaml, .git)
  # Update CHANGELOG.md
```

---

## 6. SEARCH ARCHITECTURE (deep reference)

### Key files

| Area             | File                                              | Responsibility                                 |
| ---------------- | ------------------------------------------------- | ---------------------------------------------- |
| Typesense client | `packages/search/lib/client.ts`                   | Connection, collection creation, document ops  |
| Collections      | `packages/search/lib/collections.ts`              | Schema definitions, version naming, alias swap |
| Reindex          | `packages/search/lib/reindex.ts`                  | Versioned zero-downtime reindex                |
| Ingest buffer    | `packages/search/lib/buffer.ts`                   | DB queue → worker → Typesense                  |
| Search           | `packages/search/lib/search.ts`                   | searchDocuments / multiSearchDocuments         |
| Public handler   | `packages/api/modules/search/public-handler.ts`   | Auth gate + search endpoint                    |
| Public auth      | `packages/api/modules/search/lib/public-auth.ts`  | API key verification, rate limit, quota        |
| Scoped tokens    | `packages/api/modules/search/lib/scoped-token.ts` | HMAC token generation + verification           |
| Admin oRPC       | `packages/api/modules/search/procedures/*`        | CRUD over indexes, keys, tokens, usage         |
| Browser SDK      | `packages/search-client/src/index.ts`             | Customer-facing search client                  |

### Data flow: Write path

```
Request → public-handler.ts (auth check) → enqueueManySearchIngest (DB insert)
  → worker picks up unprocessed rows → bulkUpsert to Typesense
  → markIngestRowsSuccess / markIngestRowsFailure (with exponential backoff)
```

### Data flow: Read path

```
Request → public-handler.ts (auth + rate limit + quota) → searchDocuments / multiSearchDocuments
  → Typesense response → sanitized JSON (no raw errors)
  → recordSearchUsage (async)
```

### Collection management

- Each index is versioned: `{orgShortId}_{slug}_v{version}`
- Alias maps to current version: `{orgShortId}_{slug}`
- Reindex creates `_v{newVersion}` → verifies → atomically swaps alias
- Old version kept until next reindex confirms green

### Token system

- **API keys**: `ss_search_*` prefix, hashed in DB, shown once. Scopes: read, write, admin.
- **Scoped tokens**: `ss_scoped_*` prefix, HMAC over BETTER_AUTH_SECRET, narrows permissions (e.g., filter to specific document types).

---

## 7. AUTH SYSTEM (deep reference)

### Better Auth setup

`packages/auth/auth.ts` configures:

- Database: Prisma adapter (PostgreSQL)
- Session: 30-day expiry, impersonation support
- Features: email/password, magic links, passkeys, 2FA (TOTP), OAuth (Google + GitHub), username, admin, organizations, invitation-only
- Hooks: cancel subscriptions on user/org delete, update seat count on invitation accept/member removal
- Email: verification, forgot password, magic link, organization invitation

### Auth config (`packages/auth/config.ts`)

```typescript
export const config = {
	enableSignup: true,
	enableMagicLink: true,
	enableSocialLogin: true,
	enablePasskeys: true,
	enablePasswordLogin: true,
	enableTwoFactor: true,
	sessionCookieMaxAge: 60 * 60 * 24 * 30,
	users: { enableOnboarding: true },
	organizations: {
		enable: true,
		hideOrganization: false,
		enableUsersToCreateOrganizations: true,
		requireOrganization: false,
		forbiddenOrganizationSlugs: [
			"new-organization",
			"admin",
			"settings",
			"ai-demo",
			"organization-invitation",
			"chatbot",
		],
	},
};
```

### Session access

| Context              | Import                                                                                 | Usage                                                                         |
| -------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Server Component     | `import { getSession } from "@auth/lib/server"`                                        | `const session = await getSession()`                                          |
| Client Component     | `import { useSession } from "@auth/hooks/use-session"`                                 | `const { user, loaded } = useSession()`                                       |
| oRPC procedure       | `protectedProcedure` or `adminProcedure`                                               | `context.user`, `context.session`                                             |
| Org context (client) | `import { useActiveOrganization } from "@organizations/hooks/use-active-organization"` | `const { activeOrganization, isOrganizationAdmin } = useActiveOrganization()` |

---

## 8. UI COMPONENT CATALOG (quick reference)

### Layer 1 — `@repo/ui/components/*` (27 primitives)

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `chart`, `dialog`, `dropdown-menu`, `form`, `input`, `input-otp`, `label`, `logo`, `popover`, `progress`, `select`, `sheet`, `skeleton`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`

Button variants: `primary` (default), `secondary`, `outline`, `ghost`, `destructive`, `link`. Has `loading` prop. No `default` variant — use `primary`.

Badge uses `status` prop (not `variant`): `success` / `info` / `warning` / `error`.

### Layer 2 — SaaS Shared (`@shared/components/*`)

`AppWrapper`, `AuthWrapper`, `ClientProviders`, `ApiClientProvider`, `ConsentProvider` + `ConsentBanner`, `ConfirmationAlertProvider`, `NavBar`, `Footer`, `UserMenu`, `UserAvatar`, `NotificationCenter`, `ColorModeToggle`, `LocaleSwitch`, `Pagination`, `PageHeader`, `TabGroup`, `SettingsList` + `SettingsItem`, `StatsTile`, `StatsTileChart`, `PasswordInput`

Hooks: `@shared/hooks/locale-currency`, `@shared/lib/sidebar-context`.

### NEVER create from scratch (hard NO list):

- ❌ `Pagination` — use `@shared/components/Pagination`
- ❌ `UserAvatar` / `OrganizationLogo` — handle initials + sizes
- ❌ Confirmation dialog — use `ConfirmationAlertProvider`'s `useConfirmationAlert()`
- ❌ Toast — `sonner`'s `toast.success/error/info` is wired
- ❌ Settings rows — use `SettingsList` + `SettingsItem`
- ❌ `cn()` — import from `@repo/ui`
- ❌ Session hook — use `@auth/hooks/use-session`
- ❌ Active org hook — use `@organizations/hooks/use-active-organization`
- ❌ `Loading` / `Spinner` / `LoadingButton` — Button has `loading` prop; use `Skeleton` / `Spinner`
- ❌ Form wrappers — use shadcn `Form*` directly with react-hook-form

---

## 9. i18n SYSTEM

### File structure

```
packages/i18n/translations/
  en/{mail.json, marketing.json, saas.json, shared.json}
  de/{mail.json, marketing.json, saas.json, shared.json}
  es/{mail.json, marketing.json, saas.json, shared.json}
  fr/{mail.json, marketing.json, saas.json, shared.json}
```

### Scope selection

| Scope            | Used by              |
| ---------------- | -------------------- |
| `saas.json`      | apps/saas only       |
| `marketing.json` | apps/marketing only  |
| `shared.json`    | Cross-app strings    |
| `mail.json`      | Email templates only |

### Usage

```typescript
// Server Component
import { setRequestLocale } from "next-intl/server";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}

// Client Component
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations();
return <h1>{t("home.welcome.title")}</h1>;
```

### Rules

- NEVER skip a locale — all 4 must have the key
- Marketing site uses `[locale]` segment in URL
- SaaS app detects locale via cookie (`NEXT_LOCALE`)
- i18n config at `packages/i18n/config.ts` — defines locales, defaultLocale, cookie name

---

## 10. COMMANDS CHEAT SHEET

### Development

```bash
pnpm dev                           # All apps (Turbo, concurrency 15)
pnpm dev --filter=saas             # SaaS only (:3000)
pnpm dev --filter=marketing        # Marketing only (:3001)
pnpm build                         # Build all (dotenv -c -- turbo build)
pnpm type-check                    # Turbo type-check
pnpm lint                          # Oxlint (NOT ESLint)
pnpm lint:fix                      # Oxlint auto-fix
pnpm format                        # Oxfmt
pnpm format:check                  # Oxfmt check only
pnpm test                          # Tests
pnpm clean                         # Turbo clean
```

### Database (Prisma)

```bash
pnpm --filter @repo/database generate   # prisma generate + zod
pnpm --filter @repo/database push       # prisma db push (dev)
pnpm --filter @repo/database migrate    # prisma migrate dev (prod)
pnpm --filter @repo/database studio     # Prisma Studio (:5555)
pnpm --filter @repo/database exec dotenv -c -e ../../.env -- prisma db execute --file ./prisma/sql/<file>.sql
```

### Docker

```bash
docker compose up -d              # Postgres (:5432) + MinIO (:9000/:9001)
docker compose down -v            # STOP + DROP VOLUMES (RESET)
docker compose ps                 # Status check
docker compose logs -f postgres   # Tail DB logs
```

### Single package commands

```bash
pnpm --filter @repo/api type-check
pnpm --filter @repo/search type-check
pnpm --filter saas type-check
pnpm --filter marketing type-check
pnpm --filter @repo/api lint
pnpm --filter @repo/database test
```

---

## 11. FILE LOCATIONS (complete)

### Config

| File                          | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `.env.local`                  | Dev env vars                                |
| `.env`                        | Prisma scripts env (copy of .env.local)     |
| `.env.local.example`          | Template                                    |
| `apps/saas/config.ts`         | SaaS app config                             |
| `apps/marketing/config.ts`    | Marketing config                            |
| `packages/i18n/config.ts`     | i18n config                                 |
| `packages/auth/config.ts`     | Auth config                                 |
| `packages/payments/config.ts` | Payment provider + price IDs + searchLimits |
| `packages/mail/config.ts`     | Mail provider config                        |
| `packages/storage/config.ts`  | S3/MinIO config                             |
| `packages/search/config.ts`   | Typesense config                            |
| `tooling/tailwind/theme.css`  | Tailwind v4 design tokens                   |

### Database

| File                                                      | Purpose                               |
| --------------------------------------------------------- | ------------------------------------- |
| `packages/database/prisma/schema.prisma`                  | 25 Prisma models                      |
| `packages/database/prisma/queries/`                       | Query helpers                         |
| `packages/database/prisma/generated/`                     | Generated Prisma client (do NOT edit) |
| `packages/database/prisma/zod/`                           | Auto-generated Zod schemas            |
| `packages/database/drizzle/`                              | Legacy Drizzle (do NOT add)           |
| `packages/database/scripts/patch-zod-bigint-defaults.mjs` | BigInt default patch                  |

### API (oRPC)

| File                                      | Purpose                                               |
| ----------------------------------------- | ----------------------------------------------------- |
| `packages/api/index.ts`                   | Hono app entry                                        |
| `packages/api/orpc/router.ts`             | Root router (mounts 8 module routers)                 |
| `packages/api/orpc/procedures.ts`         | publicProcedure / protectedProcedure / adminProcedure |
| `packages/api/orpc/handler.ts`            | rpcHandler + openApiHandler                           |
| `packages/api/modules/<name>/types.ts`    | Zod schemas per module                                |
| `packages/api/modules/<name>/procedures/` | Procedure files                                       |
| `packages/api/modules/<name>/router.ts`   | Module router                                         |

### SaaS Frontend

| Path                                                     | Purpose                                                |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `apps/saas/app/(unauthenticated)/`                       | Login, signup, forgot-password, reset-password, verify |
| `apps/saas/app/(authenticated)/(main)/`                  | Dashboard, settings, admin, org pages                  |
| `apps/saas/app/(authenticated)/choose-plan/`             | Plan selection                                         |
| `apps/saas/app/(authenticated)/onboarding/`              | Onboarding wizard                                      |
| `apps/saas/app/(authenticated)/new-organization/`        | Create org                                             |
| `apps/saas/app/(authenticated)/organization-invitation/` | Join org                                               |
| `apps/saas/app/api/[[...rest]]/route.ts`                 | Mounts packages/api Hono app                           |
| `apps/saas/modules/auth/`                                | Auth components/hooks/lib                              |
| `apps/saas/modules/organizations/`                       | Org components/hooks                                   |
| `apps/saas/modules/settings/`                            | Settings components                                    |
| `apps/saas/modules/payments/`                            | Billing/payments UI                                    |
| `apps/saas/modules/shared/`                              | Shared blocks, hooks, lib                              |

### Marketing Frontend

| Path                                | Purpose                      |
| ----------------------------------- | ---------------------------- |
| `apps/marketing/app/[locale]/`      | Locale-routed pages          |
| `apps/marketing/content/`           | MDX (blog, legal, changelog) |
| `apps/marketing/modules/home/`      | Home page components         |
| `apps/marketing/modules/blog/`      | Blog components              |
| `apps/marketing/modules/changelog/` | Changelog                    |
| `apps/marketing/modules/shared/`    | Shared blocks                |

### Notifications

| File                                                         | Purpose                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/notifications/`                                    | `createNotification`, list, mark-read, preferences, catalog, types |
| `packages/api/modules/notifications/`                        | oRPC procedures for notifications                                  |
| `apps/saas/modules/shared/components/NotificationCenter.tsx` | UI                                                                 |

### Search

| File                                  | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `packages/search/lib/client.ts`       | Typesense connection                           |
| `packages/search/lib/collections.ts`  | Collection schemas, version naming, alias      |
| `packages/search/lib/reindex.ts`      | Zero-downtime alias-swap reindex               |
| `packages/search/lib/buffer.ts`       | Ingest buffer worker                           |
| `packages/search/lib/search.ts`       | searchDocuments / multiSearchDocuments         |
| `packages/search/lib/keys.ts`         | API key generation + hashing                   |
| `packages/search/lib/maintenance.ts`  | Maintenance (expired keys, rate limit cleanup) |
| `packages/search-client/src/index.ts` | Browser SDK                                    |
| `packages/api/modules/search/`        | Admin oRPC + public handler                    |

---

## 12. DEFINITION OF DONE (AUTONOMOUS CHECKLIST)

Run ALL of these before claiming a task complete.

### Always

- [ ] `pnpm type-check` passes (entire workspace, not one filter)
- [ ] `pnpm lint` passes (0 errors, 0 warnings)
- [ ] `pnpm format:check` passes
- [ ] Hard Invariants 1-17 verified — none violated
- [ ] All 4 locale files updated if any user-visible string changed (verify with `rg` — 4 hits)
- [ ] No `console.log`, no commented-out blocks, no orphaned imports from your change
- [ ] CHANGELOG.md updated if consumer-facing change
- [ ] Conventional commit message ready

### UI change (adds on top of Always)

- [ ] Dev server started and changed route visually verified — golden path + edge case
- [ ] Mobile responsive checked (Tailwind mobile-first)
- [ ] Components composed from existing 3-layer catalog; no hand-rolled shadcn
- [ ] If spans both apps: both dev servers exercised

### API / oRPC change (adds on top of Always)

- [ ] Procedure mounted in module's router.ts + root router
- [ ] BigInt outputs have `.transform(v => v.toString())`
- [ ] Procedure type correct: public / protected / admin
- [ ] If on public search path: Invariants 2-6 re-checked
- [ ] Manual call exercised — happy path + auth/error path

### Schema change (MUST be approved first — Gate A)

- [ ] User approved the delta
- [ ] `pnpm --filter @repo/database push` (dev) or `migrate` (prod) ran clean
- [ ] `prisma generate` regenerated zod
- [ ] BigInt-default patch script run if BigInt @default(0) touched
- [ ] Downstream packages type-check

### Bug fix

- [ ] Bug reproduced first (failing test or documented repro)
- [ ] Fix applied, same repro passes
- [ ] Adjacent tests still pass
- [ ] Root cause noted in commit message

### Skill / docs change

- [ ] If conventions changed — mirrored to agents.md
- [ ] CHANGELOG.md updated

---

## 13. PROJECT SCOPE (PRD)

Full PRD: `docs/plans/aacsearch-prd.md`
Vision pack: `docs/plans/aacsearch/`

| Version | Status         | Contents                                                                                       |
| ------- | -------------- | ---------------------------------------------------------------------------------------------- |
| v0.x    | ✅ Shipped     | Search core, API keys, scoped tokens, rate-limit, quota, reindex, DB-first ingest, browser SDK |
| v0.5    | 🟡 IN PROGRESS | Marketing site (apps/marketing)                                                                |
| v0.6    | ⏳ Deferred    | Stripe billing wired to search-units + per-plan metering                                       |
| v0.7    | ⏳ Deferred    | Public docs site (apps/docs)                                                                   |
| v1.0    | ⏳ Deferred    | Self-host quickstart + Helm chart                                                              |
| v1.x    | ❌ Not started | CMS connectors, hosted widget, full vision                                                     |

### Half-orphaned (keep, don't extend without task)

- `@repo/billing-wallet` — kopecks ledger, reserve/commit/release
- `@repo/ai-core` — AI orchestration primitives
- Tochka top-up driver
- oRPC billing-wallet module
- AI Wallet settings UI

### Removed permanently (do NOT recreate)

- `apps/saas/app/api/cron/sync-subscriptions/route.ts`
- `packages/api/lib/wallet-sync.ts`
- `archive/cursor-rules/dslmrank.mdc` (legacy, do not influence current work)
- `docs/plans/archive/dslmrank-build-plan-v2.md` (same)

---

## 14. TROUBLESHOOTING (autonomous fixes)

### Error: "Cannot find module '@repo/...'"

```bash
pnpm install                          # from root
# Check tsconfig.json path aliases in consumer app
# Restart TS server
```

### Error: Prisma DATABASE_URL empty

```bash
cp .env.local .env                    # Prisma reads .env, not .env.local
# Check docker compose ps → postgres healthy?
```

### Error: "Prisma Client not generated"

```bash
pnpm --filter @repo/database generate
# Restart dev server
```

### Error: BigInt serialization / type error

```bash
# 1) Add .transform(v => v.toString()) on oRPC output schema
# 2) If package uses BigInt literals (0n), override tsconfig:
#    "compilerOptions": { "target": "ES2020", "lib": ["ES2020"] }
```

### Error: Oxlint errors but file looks correct

```bash
pnpm lint:fix                         # Auto-fix what it can
pnpm format                           # Format may change file
# Re-read file before editing again (Oxfmt may have rewritten it)
```

### Error: Build OOM on macOS

```bash
NODE_OPTIONS='--max-old-space-size=12288' pnpm build
# Or set in package.json scripts
```

### Error: Build fails with Next.js headers() in build

```bash
# Add to layout/page:
export const dynamic = 'force-dynamic';
```

---

## 15. COGNILAYER (auto-managed runtime)

```
FIRST RUN:
  /onboard → index project docs, build initial memory
  code_index() → build AST index

BEFORE CHANGES:
  memory_search(query) → past bugs, decisions, gotchas
  code_context(symbol) → callers, callees, dependencies
  file_search(query) → search docs
  code_search(query) → find definitions

BEFORE RISKY CHANGES (rename/delete/move/signature change):
  code_impact(symbol) → what breaks?
  memory_search(symbol) → why was it built this way?

AFTER WORK:
  memory_write(content) → save discoveries immediately
  session_bridge(action="save", content="Progress: ...; Open: ...")

BEFORE DEPLOY/PUSH:
  verify_identity(action_type="...") → mandatory safety gate

STALE MEMORY:
  If ⚠ STALE → read source file, verify, update with memory_write
```

---

## 16. GIT WORKFLOW

```bash
# Commit often, small atomic changes
git add -A
git commit -m "[type] what and why"
# Types: feat, fix, refactor, docs, chore, i18n, style

# Push only after full verification (type-check + lint + format)
# verify_identity() before push
```

---

_End of AGENTS.md — fully autonomous coding enabled._

# === COGNILAYER (auto-generated, do not delete) ===

## CogniLayer v4 Active

Persistent memory + code intelligence is ON.
ON FIRST USER MESSAGE in this session, briefly tell the user:
'CogniLayer v4 active — persistent memory is on. Type /cognihelp for available commands.'
Say it ONCE, keep it short, then continue with their request.

## Tools — HOW TO WORK

FIRST RUN ON A PROJECT:
When DNA shows "[new session]" or "[first session]":

1. Run /onboard — indexes project docs (PRD, README), builds initial memory
2. Run code_index() — builds AST index for code intelligence
   Both are one-time. After that, updates are incremental.
   If file_search or code_search return empty → these haven't been run yet.

UNDERSTAND FIRST (before making changes):

- memory_search(query) → what do we know? Past bugs, decisions, gotchas
- code_context(symbol) → how does the code work? Callers, callees, dependencies
- file_search(query) → search project docs (PRD, README) without reading full files
- code_search(query) → find where a function/class is defined
  Use BOTH memory + code tools for complete picture. They are fast — call in parallel.

BEFORE RISKY CHANGES (mandatory):

- Renaming, deleting, or moving a function/class → code_impact(symbol) FIRST
- Changing a function's signature or return value → code_impact(symbol) FIRST
- Modifying shared utilities used across multiple files → code_impact(symbol) FIRST
- ALSO: memory_search(symbol) → check for related decisions or known gotchas
  Both required. Structure tells you what breaks, memory tells you WHY it was built that way.

AFTER COMPLETING WORK:

- memory_write(content) → save important discoveries immediately
  (error_fix, gotcha, pattern, api_contract, procedure, decision)
- session_bridge(action="save", content="Progress: ...; Open: ...")
  DO NOT wait for /harvest — session may crash.

SUBAGENT MEMORY PROTOCOL:
When spawning Agent tool for research or exploration:

- Include in prompt: synthesize findings into consolidated memory_write(content, type, tags="subagent,<task-topic>") facts
  Assign a descriptive topic tag per subagent (e.g. tags="subagent,auth-review", tags="subagent,perf-analysis")
- Do NOT write each discovery separately — group related findings into cohesive facts
- Write to memory as the LAST step before return, not incrementally — saves turns and tokens
- Each fact must be self-contained with specific details (file paths, values, code snippets)
- When findings relate to specific files, include domain and source_file for better search and staleness detection
- End each fact with 'Search: keyword1, keyword2' — keywords INSIDE the fact survive context compaction
- Record significant negative findings too (e.g. 'no rate limiting exists in src/api/' — prevents repeat searches)
- Return: actionable summary (file paths, function names, specific values) + what was saved + keywords for memory_search
- If MCP tools unavailable or fail → include key findings directly in return text as fallback
- Launch subagents as foreground (default) for reliable MCP access — user can Ctrl+B to background later
  Why: without this protocol, subagent returns dump all text into parent context (40K+ tokens).
  With protocol, findings go to DB and parent gets ~500 token summary + on-demand memory_search.

BEFORE DEPLOY/PUSH:

- verify_identity(action_type="...") → mandatory safety gate
- If BLOCKED → STOP and ask the user
- If VERIFIED → READ the target server to the user and request confirmation

## VERIFY-BEFORE-ACT

When memory_search returns a fact marked ⚠ STALE:

1. Read the source file and verify the fact still holds
2. If changed → update via memory_write
3. NEVER act on STALE facts without verification

## Process Management (Windows)

- NEVER use `taskkill //F //IM node.exe` — kills ALL Node.js INCLUDING Claude Code CLI!
- Use: `npx kill-port PORT` or find PID via `netstat -ano | findstr :PORT` then `taskkill //F //PID XXXX`

## Git Rules

- Commit often, small atomic changes. Format: "[type] what and why"
- commit = Tier 1 (do it yourself). push = Tier 3 (verify_identity).

## Project DNA: supastarter-nextjs

Stack: TypeScript
Style: [unknown]
Structure: .cursor, .github, .vscode, apps, docs, packages, tooling
Deploy: [NOT SET]
Active: [new session]
Last: [first session]

## Last Session Bridge

[Emergency bridge — running bridge was not updated]
No changes or facts in this session.

# === END COGNILAYER ===
