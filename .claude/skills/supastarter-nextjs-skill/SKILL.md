---
name: supastarter-nextjs-skill
description: "Guides development with supastarter for Next.js only (not Vue/Nuxt): split-app monorepo (saas/marketing/docs), tech stack, setup with Docker, configuration, database (Prisma + Drizzle), API (Hono/oRPC with public/protected/admin procedures), auth (Better Auth), organizations, payments (Stripe/Lemonsqueezy/Polar/Creem/DodoPayments), AI, customization (Tailwind v4), storage (S3/MinIO), notifications, mailing, i18n (5 locales × 4 scopes), SEO, deployment, background tasks, analytics, monitoring, E2E. Use when building or modifying supastarter Next.js apps, adding features, or when the user mentions supastarter Next.js, Prisma, Drizzle, oRPC, Better Auth, or related Next.js stack topics."
license: See LICENSE
metadata:
    author: supastarter (community-maintained skill, updated for split-app monorepo)
    version: "2.0"
    compatibility: "Designed for Cursor/Claude Code agents. Run scripts from supastarter monorepo root."
---

# supastarter for Next.js – Skill

Expert guidance for building production-ready SaaS applications with the supastarter Next.js starter kit. **Next.js only**; no Vue/Nuxt content.

This skill is calibrated for the **modern split-app monorepo** (apps/saas + apps/marketing + apps/docs + apps/mail-preview). Older single `apps/web` layouts are not covered.

## Working principles (read first)

These four principles override everything else in this skill. They prevent the most common failure mode: producing a lot of plausible-looking code that nobody asked for and nothing verifies.

1. **Think before coding.** State assumptions before writing. If multiple interpretations exist, name them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask. Prefer one clarifying question over five speculative files.
2. **Simplicity first.** Minimum code that solves the asked problem. No abstractions for single-use code (no `FooFactory` if there is one `Foo`). No "flexibility" or "configurability" that wasn't requested. No error handling for impossible scenarios. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Touch only what the task requires. Don't refactor adjacent code. Match existing style even if you'd do it differently. If your change orphans an import or variable — clean only your own orphans, not pre-existing dead code.
4. **Goal-driven execution.** Convert the task into a verifiable goal. "Add validation" → "tests for invalid input pass." "Fix the bug" → "test that reproduces it now passes." `tsc --noEmit` succeeding is **not** "done" by itself — see Definition of Done in [quick-reference.md](references/quick-reference.md).

## Pre-flight checklist (before any task)

Run these in order. Skipping a step is the #1 source of "I missed something".

1. **Read the request twice.** If multiple interpretations exist, name them and ask. Don't pick silently. (Working Principle #1)
2. **Classify scope** (see Project context below): `v0.x search/keys/tokens/quota/usage` ✅ implement | `v0.5 marketing` ✅ implement | `v0.6/v0.7/v1.0` → deferred, ask first | `wallet/ai/dslmrank` → out of scope, ask first. **State the bucket in your first reply.**
3. **Read the source-of-truth files** for this task type before writing anything:
    - Schema/DB → `packages/database/prisma/schema.prisma`, `packages/database/prisma/queries/<area>.ts`
    - oRPC → `packages/api/modules/<feature>/{router,types}.ts`, `packages/api/orpc/{router,procedures}.ts`
    - Search runtime → `packages/search/lib/{client,collections,buffer,reindex}.ts`, `packages/api/modules/search/{public-handler.ts,lib/public-auth.ts,lib/scoped-token.ts}`
    - UI (saas) → `apps/saas/modules/<feature>/components/*` → `apps/saas/modules/shared/components/*` → `packages/ui/components/*`
    - UI (marketing) → `apps/marketing/modules/<area>/components/*` → `apps/marketing/modules/shared/components/*` → `packages/ui/components/*`
    - i18n → `packages/i18n/translations/{en,de,es,fr,ru}/<scope>.json` (5 locales — `ru` is mandatory, see Hard Invariant #11)
    - Conventions → `agents.md` (= `claude.md`, symlinked) + this SKILL.md
4. **Run the MANDATORY pre-write greps** below. Reuse-first per Hard Invariant #12.
5. **State assumptions, the verifiable goal, and the file list you intend to touch — before writing.** (Working Principle #4)
6. **Implement.** Surgical changes only (Working Principle #3).
7. **Verify against the Definition of Done** at the bottom of this file.
8. **Sync** SKILL/skill trees if touched (Autonomous sync rule). Update `CHANGELOG.md` for consumer-facing changes. Use conventional-commit format (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`).

## MANDATORY pre-write protocol — anti-duplication

**Before creating ANY new file (component / hook / procedure / query / type), you MUST run the relevant greps below and inspect the results.** If a result exists, USE it. If you still want to create new — **state in your reply why the existing one isn't enough**. This is not optional; the #1 cause of bloat in this codebase is agents creating duplicates of things that already exist.

```bash
# ── New UI component / dialog / form / card / list / button-style ───────
rg -l "<Foo|FooDialog|FooCard|FooList|FooForm" apps/saas/modules apps/marketing/modules packages/ui/components
# also: ls packages/ui/components/  (~27 shadcn primitives — see ui-component-catalog.md)
# also: ls apps/saas/modules/shared/components/  (cross-cutting blocks: NavBar, PageHeader, SettingsList, UserAvatar, NotificationCenter, ConfirmationAlertProvider, ...)

# ── New oRPC procedure / module ─────────────────────────────────────────
rg -l "method:.*POST|GET.*path: \"/foo" packages/api/modules
ls packages/api/modules/   # current: admin, ai, billing-wallet, entitlements, notifications, organizations, payments, search, users
# also `ls packages/api/modules/<name>/procedures/` before adding a procedure to that module

# ── New database query helper ───────────────────────────────────────────
rg -l "function getFoo|listFoo|createFoo|updateFoo|deleteFoo" packages/database/prisma/queries packages/database/drizzle/queries

# ── New zod schema for a model ──────────────────────────────────────────
# DO NOT hand-write — `prisma-zod-generator` already produced it:
ls packages/database/prisma/zod/index.ts     # search for `<Model>Schema` and import from `@repo/database`

# ── New helper / lib function ───────────────────────────────────────────
rg -l "export (function|const) <name>" packages/utils packages/api/lib apps/saas/modules/shared/lib
```

If you skip this and create a duplicate, the change is wrong even if it compiles. Ask: "did I grep before writing?" — if no, stop and grep.

The full per-layer reuse rules live in [references/coding-conventions.md](references/coding-conventions.md) (Mandatory pre-write rules) and [references/ui-component-catalog.md](references/ui-component-catalog.md) (catalog + STOP block).

## Project context (THIS repo)

This skill is calibrated for the **AACsearch** product running on a supastarter monorepo at `/Users/aac/Projects/ts/supastarter/`. AACsearch is a hosted **search-as-a-service** (Typesense-backed), self-hostable, with a managed cloud option.

- **Sources of truth (read in this order)**: `docs/plans/aacsearch-prd.md` (Status PRD — shipped vs. planned vs. out-of-scope, ~80 lines), then [`docs/plans/aacsearch/index.md`](docs/plans/aacsearch/index.md) which fans out to the 5-file vision pack (`01-vision-scope.md`, `02-architecture.md`, `03-domain-api.md`, `04-connectors-widget.md`, `05-roadmap-sprints.md`); `agents.md` (coding conventions); this SKILL.md (workflow contract). **Don't load all five vision files at once** — pick the one matching the current task domain.
- **Archived — must not influence current work**: `archive/cursor-rules/dslmrank.mdc`, `docs/plans/archive/*`. DSLMRank is an unrelated legacy project. Do not read, reference, or apply its rules.
- **Current focus**: R2 — PrestaShop + Bitrix module wiring (skeletons live in `modules/prestashop/aacsearch/` + `modules/bitrix/aac.search/`, both untracked) + v0.6 metering integration (active WIP in `packages/billing-wallet`, `packages/payments/wallet-webhook.ts`, Tochka driver). Marketing site (was v0.5) is **shipped** in 5 locales.
- **Already shipped (v0.x → R1)**: single-doc upsert, multi-search, browser SDK (`@repo/search-client`), scoped tokens, per-key origin allow-list + rate-limit, per-org plan quota (via `@repo/payments/lib/entitlements` + `quotaCheck` middleware), zero-downtime alias-swap reindex, DB-first ingest pipeline, hosted widget (`packages/widget` — Vanilla JS + Shadow DOM, 14KB IIFE+ESM, served at `/api/widget/widget.js`), Connector API (`packages/api/modules/search/connector-public.ts` — handshake/heartbeat/sync.full/sync.delta/delete/diagnostics, `ss_connector_*` tokens stored as `SearchApiKey` rows with `connector_write` scope, ephemeral in-memory sync-job tracking), entitlements oRPC module (`packages/api/modules/entitlements/`), AACsearch rebrand across saas + marketing.
- **Active WIP (this session, uncommitted)**: AI Wallet → search-units metering wiring (Tochka top-up driver, `wallet-webhook.ts` reconciler, `wallet-reconcile.ts`, `AiWalletCard` UI, `TopUpDialog`, `format-kopecks`); `WALLET_CRON_SECRET` + `TOCHKA_*` env additions. Treat wallet edits as **legitimate v0.6 work**, not "half-orphan" — confirm only if scope appears to expand beyond what's already in `git status`.
- **Deferred — confirm before coding**: public docs site `apps/docs` (**v0.7**), self-host quickstart + Helm chart (**v1.0**), Stripe-as-provider for search-units (current Tochka path is the active one for RU market).
- **Out of scope — refuse without explicit greenlight**: Visual builder (drag-and-drop canvas, codegen for multiple frameworks, plugin system, real-time collab) — see [`docs/plans/aacsearch/01-vision-scope.md §1.7 OUT`](docs/plans/aacsearch/01-vision-scope.md). Vector / semantic / NL search, image / audio search, A/B testing, full personalization. DSLMRank rules in `archive/`.
- **DB-frozen pattern (current)**: when a feature needs persistence, prefer **(a)** additive `scopes`/columns on existing rows (e.g. connector tokens reused `SearchApiKey` with `connector_write` scope), **(b)** in-memory ephemeral state (e.g. sync-job tracking), **(c)** config-only via `@repo/payments/lib/entitlements` (e.g. plan quota). New Prisma models require explicit user approval.
- **Removed in `84481e3` — do NOT recreate**: `apps/saas/app/api/cron/sync-subscriptions/route.ts`, `packages/api/lib/wallet-sync.ts`.

When a request comes in, **first** classify it: `v0.x search/keys/tokens/quota/usage` ✅ implement | marketing/saas UI extending shipped surfaces ✅ implement | R2 connectors (PrestaShop/Bitrix modules, `modules/*`) ✅ implement | v0.6 wallet/Tochka/metering (active WIP) ✅ implement | `v0.7/v1.0` → confirm | builder / vector / semantic → **refuse, see OUT list**. State the classification in your first reply.

## Hard invariants — MUST never violate

Non-negotiable in THIS repo. If a request would break one, refuse and explain.

1. **No `apps/web/*`.** Only split-app paths exist: `apps/saas`, `apps/marketing`, `apps/docs`, `apps/mail-preview`.
2. **DB-first ingest.** Public write requests enqueue rows into `SearchIngestBuffer` (via `enqueueManySearchIngest`); only the worker calls `bulkUpsert` against Typesense. Never call `bulkUpsert` from a request handler. Reindex is the only other allowed caller (and it runs out-of-band).
3. **API keys are hash-only.** `SearchApiKey.hashedKey` is the only stored form; the plaintext key is shown **once** at creation, never logged, never returned on read.
4. **Scoped search tokens narrow, never widen.** `verifyScopedSearchToken()` returns a `scopedFilter` that is AND-combined with caller filters via `combineFilters()` in `public-handler.ts`. Never bypass `combineFilters` or apply scoped filter as OR.
5. **Tenant isolation in every search call.** `searchDocuments` / `multiSearchDocuments` always pass `tenantId: verified.organizationId`. No cross-org reads, ever.
6. **No raw Typesense errors / secrets to the client.** Public handler maps upstream failures to typed JSON errors (`{ error: "search_failed" }` → 502, etc., see `@repo/search-client` README). Never echo `error.message` from Typesense.
7. **BigInt over oRPC.** Prisma `BigInt` columns (kopecks, counters) **must** go through `.transform(v => v.toString())` on procedure output schemas — the oRPC JSON serializer cannot serialize BigInt. Same for any helper that returns `BigInt` to a route handler.
8. **Money in kopecks (BigInt minor units).** Wallet ledger and pricing in `@repo/billing-wallet` use BigInt minor units; conversion to display strings happens only at UI/email surface.
9. **Removed code stays removed.** Do not recreate `wallet-sync.ts` or the `sync-subscriptions` cron. Do not import or reapply DSLMRank rules.
10. **Lint/format = Oxlint + Oxfmt.** Not Biome, not ESLint, not Prettier. After saving, the file may be auto-rewritten by Oxfmt — re-Read before another Edit to avoid the "file modified since read" race.
11. **i18n: every user-visible string lands in ALL 5 locales (`en`, `de`, `es`, `fr`, `ru`) in the same change.** Adding a key only to `en` is a **production bug** — `next-intl` falls back silently and the other 4 locales render the key path or empty. Russian (`ru`) was added in commit `e0c8d04`; do not skip it. Files: `packages/i18n/translations/{en,de,es,fr,ru}/{saas,marketing,mail,shared}.json`. Pick the right scope file (saas-only feature → `saas.json`, marketing page → `marketing.json`, etc.). Verify with `rg '"<your.key>"' packages/i18n/translations/` — must show **5 hits**.
12. **REUSE FIRST — never reinvent.** Before creating ANY new component / hook / procedure / query / helper / type / lib function: run the relevant grep from the MANDATORY pre-write protocol above and inspect results. Hard ranking of where to look:
    - **UI**: `packages/ui/components/*` (27 shadcn primitives) → `apps/saas/modules/shared/components/*` (cross-cutting blocks: NavBar, PageHeader, SettingsList, UserAvatar, NotificationCenter, ConfirmationAlertProvider, …) → `apps/saas/modules/<feature>/components/*` (feature blocks). Only after all three layers come back empty may you create new.
    - **API procedures**: `packages/api/modules/<feature>/procedures/*` — extend an existing module first; create a new module only if the feature is genuinely new.
    - **DB queries**: `packages/database/prisma/queries/*` — extend the matching file (`search.ts`, `users.ts`, `ai-wallets.ts`, …) first.
    - **Zod schemas for Prisma models**: `packages/database/prisma/zod/index.ts` — generated by `prisma-zod-generator`. **Never hand-write** a model schema; import the generated `<Model>Schema` from `@repo/database`.
    - **Helpers / lib**: `packages/utils`, `packages/api/lib`, `apps/saas/modules/shared/lib`. Grep before adding.
    - **Workspace package**: **17** already exist (incl. `widget`). Adding an 18th requires user confirmation + ≥2 internal consumers OR a customer-facing SDK use case.
      If after grepping you still need to create new — state in your reply **why the existing thing isn't enough** before writing. Skipping this check produced bloat and duplicates in past sessions; it is the #1 source of skill-violating changes.
13. **Prisma is the active ORM in `@repo/database`.** `packages/database/index.ts` re-exports only `./prisma`. The `drizzle/` directory exists for legacy reference but is **not** wired into the public surface. New queries go in `packages/database/prisma/queries/<area>.ts`. Do not add new files to `packages/database/drizzle/queries/` unless the user explicitly asks for an ORM migration.
14. **New workspace package → `pnpm install` immediately after creation.** Without it, consumers fail with `Cannot find module '@repo/<name>'`. Verify: `ls -l node_modules/@repo/ | grep <name>` shows a symlink. Same rule when you add a new package to `pnpm-workspace.yaml`.
15. **`agents.md` and `claude.md` are the same file** (`claude.md` is a symlink to `agents.md`). Edit `agents.md`. Do not create a divergent `claude.md`. Conventions live there; this SKILL.md is the workflow contract — they complement each other.

## Decision gates — when X, do Y

Use these to choose paths deterministically.

| If the change touches…                                                                                                                                                     | Mandatory follow-ups                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/modules/search/procedures/*` (admin oRPC)                                                                                                                    | mount in `router.ts`; if response shape is customer-visible, extend `@repo/search-client` types; check `apps/saas/modules/search` consumers                                                                                                                                                                                                                                                                                                                                         |
| `packages/api/modules/search/public-handler.ts` or `lib/public-auth.ts`, `lib/scoped-token.ts`                                                                             | re-check Hard Invariants 2 / 3 / 4 / 6; never silently widen scope                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/search/lib/*` (client / collections / reindex / buffer)                                                                                                          | preserve alias-swap zero-downtime contract; preserve `markIngestRowsSuccess` / `markIngestRowsFailure` partial-fail handling with exponential backoff                                                                                                                                                                                                                                                                                                                               |
| `packages/database/prisma/schema.prisma`                                                                                                                                   | `pnpm --filter @repo/database push` (dev) or `migrate` (prod); regenerate zod via `prisma generate`; if you touched any `BigInt @default(0)` column, run `packages/database/scripts/patch-zod-bigint-defaults.mjs`                                                                                                                                                                                                                                                                  |
| Anything that returns a Prisma `BigInt` to oRPC                                                                                                                            | add `.transform(v => v.toString())` on the procedure output schema                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/billing-wallet`, `packages/ai-core`, `packages/payments/wallet-webhook.ts`, `packages/api/lib/wallet-reconcile.ts`, `packages/payments/provider/tochka-wallet/*` | **active v0.6 WIP** — proceed if `git status` already shows wallet-related edits or if the task explicitly references billing/Tochka/topup. Otherwise confirm scope first. Money in BigInt kopecks (Hard Invariant #8); BigInt over oRPC needs `.transform(v => v.toString())` (Hard Invariant #7)                                                                                                                                                                                  |
| `packages/api/modules/entitlements/*` or `@repo/payments/lib/entitlements` (`checkQuota` / `checkHardLimit` / `resolveOrgPlan` / `invalidatePlanCache`)                    | check `quotaCheck` callers (`public-handler.ts` for search/multi; future v1 routes); preserve plan-cache invalidation; emit 429 with proper `error` slug (`search_quota_exceeded` / `ingest_quota_exceeded`); never bypass quota for paid endpoints                                                                                                                                                                                                                                 |
| `modules/prestashop/aacsearch/*` (PHP) or `modules/bitrix/aac.search/*` (PHP)                                                                                              | these are **PHP modules**, not TS workspace — no `pnpm` involvement. Talk to AACsearch ONLY via Connector API (`POST /api/connectors/handshake` → `POST /api/projects/:id/sync/full` etc.) using `ss_connector_*` token. **Never embed Typesense admin key**. PrestaShop hooks: `displayHeader` (widget), `actionProductUpdate`, `actionObjectProductDeleteAfter`, `actionUpdateQuantity`. Bitrix: `Bitrix\Main\Web\HttpClient` + `Option::get` + module agents for background sync |
| `packages/api/modules/search/connector-public.ts` (Connector API)                                                                                                          | preserve `ss_connector_*` Bearer auth via `SearchApiKey` rows with `connector_write` scope (Hard Invariant #3 — hash-only); preserve DB-first ingest (Hard Invariant #2 — uses `enqueueManySearchIngest`); sync-job tracking is **ephemeral in-memory** until DB unfreezes — don't add a Prisma model without explicit approval                                                                                                                                                     |
| `packages/widget/*` (Vanilla JS storefront widget)                                                                                                                         | shipped product. Bundle: `tsup` → IIFE+ESM. Distribution: served by SaaS at `/api/widget/widget.js`. Auth: search-only `ss_search_*` token. Shadow DOM isolation. **Don't pull in InstantSearch.js** — current implementation is hand-rolled; switching is a separate decision                                                                                                                                                                                                      |
| Anything in `apps/marketing`                                                                                                                                               | marketing site is **shipped** (rebrand commits `ce0574d`/`3566063`/`e0c8d04`/`c1463d3` landed in 5 locales). Treat as routine UI work; full 5-locale i18n still required                                                                                                                                                                                                                                                                                                            |
| Adding / changing a user-visible string anywhere                                                                                                                           | **all 5 locale files** (`en`, `de`, `es`, `fr`, `ru`) in the matching scope (`saas`/`marketing`/`mail`/`shared`) updated in the same change; verify `rg '"<your.key>"' packages/i18n/translations/` returns **5 hits**                                                                                                                                                                                                                                                              |
| About to create a new component / procedure / query / helper / package                                                                                                     | **stop**. Run the MANDATORY pre-write greps; check Hard Invariant 12 layered ranking. Only proceed if all matching layers return empty AND you state in your reply why existing options don't fit                                                                                                                                                                                                                                                                                   |
| Anything in `apps/docs`                                                                                                                                                    | **deferred to v0.7** — confirm before building                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `agents.md`, `docs/plans/aacsearch-prd.md`, `docs/plans/aacsearch/*.md`, or any `**/skills/**/SKILL.md`                                                                    | mirror SKILL.md trees via the Autonomous sync rule below; verify with `diff -qr`                                                                                                                                                                                                                                                                                                                                                                                                    |
| Adding a new workspace package (`packages/<new>/`)                                                                                                                         | confirm with user — current count is **17** (incl. `widget`); new packages need a real reuse case (≥2 internal consumers, OR customer-facing SDK with a stated external consumer). After creation: `pnpm install` (Hard Invariant #14)                                                                                                                                                                                                                                              |
| Visual builder / drag-and-drop / multi-framework codegen / plugin system / real-time collab                                                                                | **out of scope** — see [`docs/plans/aacsearch/01-vision-scope.md §1.7`](docs/plans/aacsearch/01-vision-scope.md). Refuse and explain unless user explicitly greenlights a v2 pivot                                                                                                                                                                                                                                                                                                  |

## Autonomous task recipes (project-specific)

Each recipe = Files / Preconditions / Steps / Verify / Rollback. Pick by domain.

### R1. Add an admin oRPC procedure to the search module

- **Files**: `packages/api/modules/search/procedures/<action>.ts`, `packages/api/modules/search/types.ts`, `packages/api/modules/search/router.ts`
- **Preconditions**: action is in v0.x scope (CRUD over indexes / keys / tokens / usage); pick `protectedProcedure` (org-scoped) or `adminProcedure` (platform admin) from `packages/api/orpc/procedures.ts`
- **Steps**: 1) define zod input/output in `types.ts` (BigInt outputs → `.transform(v => v.toString())`); 2) write procedure file; 3) mount in `router.ts`; 4) if response is customer-visible — extend `@repo/search-client` types; 5) consume in `apps/saas/modules/search/...` if there is UI
- **Verify**: `pnpm --filter @repo/api type-check && pnpm --filter @repo/search-client type-check`; manual call from the dashboard
- **Rollback**: revert the procedure file + the import line in `router.ts`

### R2. Add a marketing page

- **Files**: `apps/marketing/app/[locale]/<route>/page.tsx`, `apps/marketing/modules/<area>/components/<section>.tsx`, `packages/i18n/translations/{en,de,es,fr,ru}/marketing.json`, optionally `apps/marketing/sitemap.ts`
- **Preconditions**: copy approved by user; route belongs in marketing app, **not** saas
- **Steps**: 1) add translation keys in **all 5 locales** (skipping any → silent fallback bug); 2) build a Server Component composing existing blocks from `apps/marketing/modules/shared/components` first — only create new sections if no existing block fits; 3) wire the route via App Router; 4) update sitemap if public
- **Verify**: `pnpm --filter marketing dev` → visual check at `:3001`; `pnpm --filter marketing type-check`
- **Rollback**: delete the route folder + revert i18n + sitemap hunks

### R3. Add a usage / quota dashboard panel in apps/saas

- **Files**: `packages/database/prisma/queries/search.ts` (extend), `packages/api/modules/search/procedures/<metric>.ts`, `apps/saas/modules/search/components/<panel>.tsx`
- **Preconditions**: aggregator must be org-scoped via `organizationId`; respect `indexId` boundary; reuse `recordSearchUsage` / `aggregateSearchUsage` patterns
- **Steps**: 1) extend the query helper (Prisma); 2) `protectedProcedure` for org members; 3) render panel using existing primitives from `@repo/ui/components` (Card, Stat, Badge, …) and shared blocks — do **not** introduce new chart libs without a pre-approved task
- **Verify**: type-check both packages; verify panel against a seeded org via `pnpm --filter saas dev`
- **Rollback**: revert procedure + UI; queries are read-only and idempotent

### R4. Add or change an API-key scope / scoped-token claim

- **Files**: `packages/database/prisma/schema.prisma` (`SearchApiKey` enum/columns), `packages/api/modules/search/lib/public-auth.ts`, `packages/api/modules/search/lib/scoped-token.ts`, `apps/saas/modules/search/components/<keys form>.tsx`
- **Preconditions**: schema change is **additive only** (new enum value, new optional column); never widen an existing scope's permissions silently. Re-read Hard Invariants 3 and 4. Existing keys must continue to work.
- **Steps**: 1) extend schema additively + `pnpm --filter @repo/database push`; 2) extend `gatePublicSearchRequest` to honor the new scope; 3) extend `issueScopedSearchToken` / `verifyScopedSearchToken` if the token payload changes (HMAC over `BETTER_AUTH_SECRET`); 4) update creation form so plaintext is shown **once** and stored hashed
- **Verify**: `pnpm --filter @repo/api type-check`; manual: hit `/search/public/<slug>` with the new scope, expect intended pass/deny; check `@repo/search-client` README error table still matches
- **Rollback**: revert auth-gate hunks; the additive enum value can stay (no destructive migration)

### R5. Add a Prisma field that needs Typesense reindex

- **Files**: `packages/database/prisma/schema.prisma`, `packages/database/prisma/queries/<area>.ts`, optionally `packages/search/lib/collections.ts` (field def) and a one-shot reindex via `reindexCollection`
- **Preconditions**: confirm whether the field needs to be searchable / facetable / sortable in Typesense. If purely Prisma — skip Typesense steps
- **Steps**: 1) edit schema + `pnpm --filter @repo/database push`; 2) regenerate zod; 3) run `packages/database/scripts/patch-zod-bigint-defaults.mjs` if the field is `BigInt @default(0)`; 4) update queries; 5) if Typesense — add field to collection schema, then call `reindexCollection({ organizationId, slug, currentVersion, fields })` for each affected index — alias swap is atomic
- **Verify**: `pnpm --filter @repo/database type-check && pnpm --filter @repo/search type-check`; sample search returns the new field; `aliasName(orgId, slug)` resolves to the new version
- **Rollback**: alias swap is reversible — `swapAliasToVersion(orgId, slug, prevVersion)` points back; keep `prevVersion` collection until traffic confirms green

## Autonomous sync rule

Canonical source: `~/.claude/skills/supastarter-nextjs-skill/`. After **every** SKILL.md or references change, mirror to both project-local trees and verify:

```bash
SRC=~/.claude/skills/supastarter-nextjs-skill/
\cp -rf "$SRC". /Users/aac/Projects/ts/supastarter/.claude/skills/supastarter-nextjs-skill/
\cp -rf "$SRC". /Users/aac/Projects/ts/supastarter/.agents/skills/supastarter-nextjs-skill/
diff -qr "$SRC" /Users/aac/Projects/ts/supastarter/.claude/skills/supastarter-nextjs-skill/   # must be empty
diff -qr "$SRC" /Users/aac/Projects/ts/supastarter/.agents/skills/supastarter-nextjs-skill/   # must be empty
```

Drift between the three trees is treated as a bug. Fix it before continuing the task.

## When to Use This Skill

Use this skill when:

- Building or modifying a supastarter Next.js app
- Adding features (new entities, API endpoints, UI, i18n)
- Working with Prisma/Drizzle, oRPC, Better Auth, Stripe, or the monorepo structure
- Debugging setup, configuration, deployment, or troubleshooting
- The user mentions supastarter Next.js, Prisma, Drizzle, oRPC, Better Auth, or related stack topics

## High-Level Workflow: New Feature

Follow this order when adding a feature (using SaaS app as the consumer):

1. **Schema** – Add Prisma models in `packages/database/prisma/schema.prisma`; if Drizzle is the active ORM in your project, also update `packages/database/drizzle/schema/`. Run `pnpm --filter @repo/database push` (dev) or `migrate` (prod).
2. **Queries** – Add query functions in `packages/database/prisma/queries/<feature>.ts` (or `packages/database/drizzle/queries/`); export from the package via `@repo/database`.
3. **API** – Add oRPC module in `packages/api/modules/<name>/` (`types.ts`, `procedures/<action>.ts`, `router.ts`); choose `publicProcedure` / `protectedProcedure` / `adminProcedure` from `packages/api/orpc/procedures.ts`; mount in `packages/api/orpc/router.ts`.
4. **UI** – Add components in `apps/saas/modules/<feature>/components/`; use shadcn UI from `@repo/ui/components/*`, TanStack Query via `orpc` from `@shared/lib/orpc-query-utils`, session via `@auth/hooks/use-session` (client) or `@auth/lib/server` (server).
5. **i18n** – Add translation keys to `packages/i18n/translations/{en,de,es,fr,ru}/{saas|marketing|mail|shared}.json`. **All 5 locales** (Hard Invariant #11). Pick the right scope file (saas-only feature → `saas.json`).

Full walkthrough: [assets/recipes/feedback-widget.md](assets/recipes/feedback-widget.md) (feedback example — adapt paths to `apps/saas/modules/feedback/` and `packages/api/modules/feedback/`).

## Project Structure (Next.js Monorepo)

```
apps/
  saas/                   # Protected SaaS app (port 3000)
    app/
      (unauthenticated)/  # login, signup, forgot-password, reset-password, verify
      (authenticated)/    # protected routes
        (main)/
          (account)/      # /settings, /chatbot, /admin
          (organizations)/[organizationSlug]/
        choose-plan/
        new-organization/
        onboarding/
        organization-invitation/[invitationId]/
        checkout-return/
      api/[[...rest]]/    # mounts @repo/api Hono app
      image-proxy/[...path]/
    modules/              # auth, organizations, settings, payments, admin, ai, onboarding, shared, i18n, lib
    tests/                # Playwright E2E
  marketing/              # Public site (port 3001) — home, blog, changelog, legal
    app/[locale]/
    modules/              # home, blog, changelog, legal, shared, analytics, i18n
    content/              # MDX (legal, blog posts, changelog)
    tests/                # Playwright E2E
  docs/                   # Documentation site (port 3002)
  mail-preview/           # Email template preview (port 3003)

packages/                 # 17 workspace packages — all imported via @repo/<name>
  api/                    # Hono + oRPC. modules/{admin,ai,billing-wallet,entitlements,notifications,organizations,payments,search,users}, orpc/{router,procedures,handler,middleware}. Public Hono routes: search public-handler + connector-public + widget bundle + wallet webhook
  auth/                   # Better Auth (auth.ts, client.ts, lib/, plugins/)
  database/               # BOTH Prisma (prisma/) AND Drizzle (drizzle/) coexist; 25 Prisma models; query helpers in prisma/queries/. Prisma is the active ORM (Hard Invariant #13)
  ai/                     # Vercel AI SDK + provider configs (chat-style models)
  ai-core/                # Lower-level AI orchestration primitives consumed by `ai` and `billing-wallet`
  billing-wallet/         # AI Wallet: BigInt-kopecks ledger, reserve→commit/release, Tochka top-up driver, scoped tokens. Active v0.6 metering wiring
  search/                 # Typesense client, versioned collections + alias swap, ingest buffer worker (DB-first ingest, partial-fail handling)
  search-client/          # Browser-safe SDK for the public search API (only ss_search_*/ss_scoped_* tokens)
  widget/                 # Vanilla JS storefront search widget (Shadow DOM, 14KB IIFE+ESM, served at /api/widget/widget.js, hand-rolled — not InstantSearch.js)
  i18n/                   # translations/{en,de,es,fr,ru}/{mail,marketing,saas,shared}.json — 5 locales × 4 scopes (Hard Invariant #11)
  logs/                   # logger
  mail/                   # React Email templates (emails/), provider/, components/, lib/
  notifications/          # createNotification, list, mark-read, preferences, catalog
  payments/               # Stripe, Lemonsqueezy, Polar, Creem, DodoPayments, Tochka (RU) — provider/; per-plan limits in config.ts (incl. searchLimits); lib/entitlements.ts (checkQuota / checkHardLimit / resolveOrgPlan / invalidatePlanCache); wallet-webhook.ts
  storage/                # S3-compatible (provider/, types.ts)
  ui/                     # Shadcn UI components (@repo/ui/components/*) — 27 primitives
  utils/                  # Shared helpers (incl. getBaseUrl)

modules/                  # ❗ NOT a Node workspace — PHP CMS modules (untracked WIP)
  prestashop/aacsearch/   # PrestaShop 8.x module — talks to Connector API via ss_connector_* token
  bitrix/aac.search/      # 1C-Bitrix self-hosted module — same Connector API contract

tooling/
  scripts/                # build/utility scripts
  tailwind/               # Tailwind v4 — theme.css with design tokens
  typescript/             # shared tsconfig
```

Use package exports (`@repo/api`, `@repo/auth`, `@repo/database`, `@repo/ui/components/<name>`, `@repo/notifications`) instead of deep relative imports.

### Path aliases (per app)

**apps/saas:** `@config`, `@auth/*`, `@organizations/*`, `@settings/*`, `@payments/*`, `@admin/*`, `@ai/*`, `@onboarding/*`, `@shared/*`, `@i18n/*` → `apps/saas/modules/<area>/*`

**apps/marketing:** `@config`, `@analytics`, `@home/*`, `@blog/*`, `@changelog/*`, `@legal/*`, `@shared/*`, `@i18n/*`, `content-collections` → `apps/marketing/modules/<area>/*` (and content-collections generated dir)

**Monorepo-wide:** `@repo/*` → `packages/*`, `@repo/ui/*` → `packages/ui/*`

## Definition of Done

`tsc --noEmit` succeeding alone is **not** done. Run the matching block before claiming completion.

### Any code change (always)

- [ ] Pre-flight checklist completed (8 steps)
- [ ] Hard Invariants 1–15 not violated
- [ ] All **5** locale files updated if any user-visible string was added or changed (Invariant #11; verify `rg '"<key>"' packages/i18n/translations/` returns **5** hits)
- [ ] `pnpm --filter <touched-package> type-check` clean — and downstream consumers (`@repo/api`, the affected app, `@repo/search-client` if customer-facing) also clean
- [ ] Lint clean (`pnpm lint` or `--filter` for the affected packages) — Oxlint + Oxfmt only
- [ ] No `console.log`, no commented-out blocks, no orphaned imports introduced by your change
- [ ] Conventional-commit message ready (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`)
- [ ] `CHANGELOG.md` updated **if** the change is consumer-facing (public API, SDK, marketing copy)

### UI change (saas or marketing)

Above, plus:

- [ ] `pnpm --filter <app> dev` opened in browser; the changed surface visited and visually verified — golden path **and** at least one edge case
- [ ] Mobile responsive checked (Tailwind mobile-first ordering)
- [ ] Components composed from `@repo/ui/components` + shared blocks; no hand-rolled shadcn-style markup (Invariant #12 layered ranking)
- [ ] If the change spans both `apps/saas` and `apps/marketing`, both dev servers were exercised

### API / oRPC change

Above, plus:

- [ ] Procedure mounted in the module's `router.ts` and that router is mounted in `packages/api/orpc/router.ts`
- [ ] BigInt outputs `.transform(v => v.toString())` (Invariant #7)
- [ ] Customer-visible response shape mirrored in `@repo/search-client` types if applicable
- [ ] Procedure type chosen correctly: `publicProcedure` / `protectedProcedure` / `adminProcedure`
- [ ] Manual call exercised — happy path **and** at least one auth/error path
- [ ] If on the public search path: invariants 2 (DB-first), 3 (hash-only keys), 4 (scoped tokens narrow), 5 (tenant), 6 (no raw errors) re-checked

### Schema change (Prisma)

Above, plus:

- [ ] `pnpm --filter @repo/database push` (dev) or migration (prod) ran clean
- [ ] `prisma generate` regenerated zod (`packages/database/prisma/zod/`)
- [ ] BigInt-default patch script run if any `BigInt @default(0)` field touched: `node packages/database/scripts/patch-zod-bigint-defaults.mjs`
- [ ] Downstream `@repo/api` + affected app type-checks pass
- [ ] If field is searchable in Typesense: collection field def updated **and** `reindexCollection` run for affected indexes (alias swap atomic)

### Search runtime change

Above, plus:

- [ ] DB-first ingest preserved (Invariant #2): `bulkUpsert` not called from request path
- [ ] Tenant isolation preserved (Invariant #5): `tenantId: organizationId` on every search call
- [ ] No raw Typesense errors leak (Invariant #6)
- [ ] If reindex/buffer logic touched: alias-swap zero-downtime contract preserved; partial-fail handling via `markIngestRowsSuccess` / `markIngestRowsFailure` with exponential backoff

### Bug fix

- [ ] Bug **reproduced first** (failing test or documented manual repro) — never fix something you didn't reproduce
- [ ] Fix applied
- [ ] Same repro now passes
- [ ] Adjacent tests still pass (`pnpm --filter <package> test` for the touched package)
- [ ] Root cause noted in commit message or comment if non-obvious

### Skill / docs / SKILL.md change

- [ ] After every save, mirror via Autonomous sync rule: `diff -qr` between the three skill trees must be empty
- [ ] If conventions changed, mirror to `agents.md` (= `claude.md` symlink)

## References (Progressive Disclosure)

Load only the reference files you need.

**Before writing code**, read [references/coding-conventions.md](references/coding-conventions.md). **Before building any UI**, read [references/ui-component-catalog.md](references/ui-component-catalog.md) — supastarter ships ~80 reusable components across 3 layers; reinventing them is the #1 mistake. For copy-paste patterns and commands, use [references/code-patterns.md](references/code-patterns.md) and [references/quick-reference.md](references/quick-reference.md).

| Topic                                                              | File                                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **AACsearch project plan** (vision pack — load by file, not all 5) | [`docs/plans/aacsearch/index.md`](docs/plans/aacsearch/index.md) (status: [`docs/plans/aacsearch-prd.md`](docs/plans/aacsearch-prd.md)) |
| **Coding conventions** (read first)                                | [references/coding-conventions.md](references/coding-conventions.md)                                                                    |
| **Code patterns** (examples)                                       | [references/code-patterns.md](references/code-patterns.md)                                                                              |
| **Quick reference** (commands, paths)                              | [references/quick-reference.md](references/quick-reference.md)                                                                          |
| **UI component catalog** (reuse before building)                   | [references/ui-component-catalog.md](references/ui-component-catalog.md)                                                                |
| Tech stack                                                         | [references/tech-stack.md](references/tech-stack.md)                                                                                    |
| Setup, install, deps, Docker                                       | [references/setup.md](references/setup.md)                                                                                              |
| Env, config, feature flags                                         | [references/configuration.md](references/configuration.md)                                                                              |
| Debugging, common issues                                           | [references/troubleshooting.md](references/troubleshooting.md)                                                                          |
| Prisma + Drizzle schema, migrations, queries                       | [references/database-patterns.md](references/database-patterns.md)                                                                      |
| Hono/oRPC, public/protected/admin procedures, router               | [references/api-patterns.md](references/api-patterns.md)                                                                                |
| Better Auth, session, protected endpoints                          | [references/auth-patterns.md](references/auth-patterns.md)                                                                              |
| Orgs, roles, multi-tenancy                                         | [references/organization-patterns.md](references/organization-patterns.md)                                                              |
| Stripe / Lemonsqueezy / Polar / Creem / DodoPayments               | [references/payments-patterns.md](references/payments-patterns.md)                                                                      |
| Notifications (in-app + email)                                     | [references/notifications-patterns.md](references/notifications-patterns.md)                                                            |
| AI features, models                                                | [references/ai-patterns.md](references/ai-patterns.md)                                                                                  |
| UI, Tailwind v4, theming, extensions                               | [references/customization.md](references/customization.md)                                                                              |
| S3-compatible (MinIO local), uploads                               | [references/storage-patterns.md](references/storage-patterns.md)                                                                        |
| Emails, templates, providers                                       | [references/mailing-patterns.md](references/mailing-patterns.md)                                                                        |
| i18n, locales, translations (4 × 4 matrix)                         | [references/internationalization.md](references/internationalization.md)                                                                |
| Meta, sitemap, structured data                                     | [references/seo.md](references/seo.md)                                                                                                  |
| Deploy, production                                                 | [references/deployment.md](references/deployment.md)                                                                                    |
| Cron, queues, jobs (trigger.dev / QStash / Vercel Cron)            | [references/background-tasks.md](references/background-tasks.md)                                                                        |
| Analytics integration                                              | [references/analytics.md](references/analytics.md)                                                                                      |
| Monitoring, errors                                                 | [references/monitoring.md](references/monitoring.md)                                                                                    |
| E2E tests                                                          | [references/e2e-testing.md](references/e2e-testing.md)                                                                                  |

## Assets

- **Env template**: [assets/env.example](assets/env.example) – environment variable keys mirroring `.env.local.example` from supastarter (no secrets).
- **Full recipe**: [assets/recipes/feedback-widget.md](assets/recipes/feedback-widget.md) – build a feature from DB → API → UI → i18n.

## Scripts

- **generate_module.py** – Scaffolds a new oRPC API module (types, procedure, router) with chosen procedure type. See [scripts/README.md](scripts/README.md).

**How to run** (from supastarter monorepo root):

```bash
python3 scripts/generate_module.py <module-name> [--type public|protected|admin]
```

Examples:

- `python3 scripts/generate_module.py feedback` → public procedure (default)
- `python3 scripts/generate_module.py feedback --type protected` → requires session
- `python3 scripts/generate_module.py audit-log --type admin` → admin only

Creates `packages/api/modules/<name>/` with `types.ts`, `procedures/create.ts`, and `router.ts`. Mount the router in `packages/api/orpc/router.ts` manually (script prints the import line).

## Conventions (Summary)

- TypeScript everywhere; interfaces for object shapes; no enums (use `as const` records or union literals).
- Named function exports for React components; prefer Server Components; use `"use client"` only when needed.
- Forms: react-hook-form + zod; API: oRPC procedures in `packages/api/modules/`.
- Use `@repo/*` and per-app aliases (`@auth/*`, `@shared/*`, etc.); do not instantiate Prisma/Drizzle in app code — call `@repo/database` queries.
- pnpm + Turbo. **Lint/format: Oxlint + Oxfmt** (NOT Biome, NOT ESLint).
- Node.js ≥ 20, ESM imports.

**Before writing code**, read [references/coding-conventions.md](references/coding-conventions.md). For examples and commands: [references/code-patterns.md](references/code-patterns.md), [references/quick-reference.md](references/quick-reference.md), [references/customization.md](references/customization.md), [references/api-patterns.md](references/api-patterns.md).

## Official Docs

- Next.js docs (only): <https://supastarter.dev/docs/nextjs>
- Download docs as .md: <https://supastarter.dev/nextjs-docs.zip>
