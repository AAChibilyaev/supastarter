---
name: supastarter-nextjs-skill
description: "Guides development with supastarter for Next.js only (not Vue/Nuxt): split-app monorepo (saas/marketing/docs), tech stack, setup with Docker, configuration, database (Prisma + Drizzle), API (Hono/oRPC with public/protected/admin procedures), auth (Better Auth), organizations, payments (Stripe/Lemonsqueezy/Polar/Creem/DodoPayments), AI, customization (Tailwind v4), storage (S3/MinIO), notifications, mailing, i18n (4 locales × 4 scopes), SEO, deployment, background tasks, analytics, monitoring, E2E. Use when building or modifying supastarter Next.js apps, adding features, or when the user mentions supastarter Next.js, Prisma, Drizzle, oRPC, Better Auth, or related Next.js stack topics."
license: See LICENSE
metadata:
  author: supastarter (community-maintained skill, updated for split-app monorepo)
  version: "2.0"
  compatibility: "Designed for Cursor/Claude Code agents. Run scripts from supastarter monorepo root."
---

# supastarter for Next.js – Skill

Expert guidance for building production-ready SaaS applications with the supastarter Next.js starter kit. **Next.js only**; no Vue/Nuxt content.

This skill is calibrated for the **modern split-app monorepo** (apps/saas + apps/marketing + apps/docs + apps/mail-preview). The older single `apps/web` layout is **legacy** and is not covered — never reference `apps/web/*` paths.

## Working principles (read first)

These four principles override everything else in this skill. They prevent the most common failure mode: producing a lot of plausible-looking code that nobody asked for and nothing verifies.

1. **Think before coding.** State assumptions before writing. If multiple interpretations exist, name them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask. Prefer one clarifying question over five speculative files.
2. **Simplicity first.** Minimum code that solves the asked problem. No abstractions for single-use code (no `FooFactory` if there is one `Foo`). No "flexibility" or "configurability" that wasn't requested. No error handling for impossible scenarios. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Touch only what the task requires. Don't refactor adjacent code. Match existing style even if you'd do it differently. If your change orphans an import or variable — clean only your own orphans, not pre-existing dead code.
4. **Goal-driven execution.** Convert the task into a verifiable goal. "Add validation" → "tests for invalid input pass." "Fix the bug" → "test that reproduces it now passes." `tsc --noEmit` succeeding is **not** "done" by itself — see Definition of Done in [quick-reference.md](references/quick-reference.md).

## MANDATORY pre-write protocol — anti-duplication

**Before creating ANY new file (component / hook / procedure / query / type), you MUST run the relevant greps below and inspect the results.** If a result exists, USE it. If you still want to create new — **state in your reply why the existing one isn't enough**. This is not optional; the #1 cause of bloat in this codebase is agents creating duplicates of things that already exist.

```bash
# ── New UI component / dialog / form / card / list / button-style ───────
rg -l "<Foo|FooDialog|FooCard|FooList|FooForm" apps/saas/modules apps/marketing/modules packages/ui/components
# also: ls packages/ui/components/  (~27 shadcn primitives — see ui-component-catalog.md)
# also: ls apps/saas/modules/shared/components/  (cross-cutting blocks: NavBar, PageHeader, SettingsList, UserAvatar, NotificationCenter, ConfirmationAlertProvider, ...)

# ── New oRPC procedure / module ─────────────────────────────────────────
rg -l "method:.*POST|GET.*path: \"/foo" packages/api/modules
ls packages/api/modules/                     # existing modules: admin, ai, notifications, organizations, payments, search, users (+ project-specific)

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
5. **i18n** – Add translation keys to `packages/i18n/translations/{en,de,es,fr}/{saas|marketing|mail|shared}.json`. Pick the right scope file (saas-only feature → `saas.json`).

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

packages/
  api/                    # Hono + oRPC. modules/, orpc/{router,procedures,handler,middleware}
  auth/                   # Better Auth (auth.ts, client.ts, lib/, plugins/)
  database/               # BOTH Prisma (prisma/) AND Drizzle (drizzle/) coexist
  ai/                     # AI integrations (Vercel AI SDK + provider configs)
  i18n/                   # translations/{en,de,es,fr}/{mail,marketing,saas,shared}.json
  logs/                   # logger
  mail/                   # React Email templates (emails/), provider/, components/, lib/
  notifications/          # createNotification, list, mark-read, preferences, catalog
  payments/               # Stripe, Lemonsqueezy, Polar, Creem, DodoPayments — provider/
  storage/                # S3-compatible (provider/, types.ts)
  ui/                     # Shadcn UI components (@repo/ui/components/*)
  utils/                  # Shared helpers

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

## References (Progressive Disclosure)

Load only the reference files you need.

**Before writing code**, read [references/coding-conventions.md](references/coding-conventions.md). **Before building any UI**, read [references/ui-component-catalog.md](references/ui-component-catalog.md) — supastarter ships ~80 reusable components across 3 layers; reinventing them is the #1 mistake. For copy-paste patterns and commands, use [references/code-patterns.md](references/code-patterns.md) and [references/quick-reference.md](references/quick-reference.md).

| Topic | File |
|-------|------|
| **Coding conventions** (read first) | [references/coding-conventions.md](references/coding-conventions.md) |
| **Code patterns** (examples) | [references/code-patterns.md](references/code-patterns.md) |
| **Quick reference** (commands, paths) | [references/quick-reference.md](references/quick-reference.md) |
| **UI component catalog** (reuse before building) | [references/ui-component-catalog.md](references/ui-component-catalog.md) |
| Tech stack | [references/tech-stack.md](references/tech-stack.md) |
| Setup, install, deps, Docker | [references/setup.md](references/setup.md) |
| Env, config, feature flags | [references/configuration.md](references/configuration.md) |
| Debugging, common issues | [references/troubleshooting.md](references/troubleshooting.md) |
| Prisma + Drizzle schema, migrations, queries | [references/database-patterns.md](references/database-patterns.md) |
| Hono/oRPC, public/protected/admin procedures, router | [references/api-patterns.md](references/api-patterns.md) |
| Better Auth, session, protected endpoints | [references/auth-patterns.md](references/auth-patterns.md) |
| Orgs, roles, multi-tenancy | [references/organization-patterns.md](references/organization-patterns.md) |
| Stripe / Lemonsqueezy / Polar / Creem / DodoPayments | [references/payments-patterns.md](references/payments-patterns.md) |
| Notifications (in-app + email) | [references/notifications-patterns.md](references/notifications-patterns.md) |
| AI features, models | [references/ai-patterns.md](references/ai-patterns.md) |
| UI, Tailwind v4, theming, extensions | [references/customization.md](references/customization.md) |
| S3-compatible (MinIO local), uploads | [references/storage-patterns.md](references/storage-patterns.md) |
| Emails, templates, providers | [references/mailing-patterns.md](references/mailing-patterns.md) |
| i18n, locales, translations (4 × 4 matrix) | [references/internationalization.md](references/internationalization.md) |
| Meta, sitemap, structured data | [references/seo.md](references/seo.md) |
| Deploy, production | [references/deployment.md](references/deployment.md) |
| Cron, queues, jobs (trigger.dev / QStash / Vercel Cron) | [references/background-tasks.md](references/background-tasks.md) |
| Analytics integration | [references/analytics.md](references/analytics.md) |
| Monitoring, errors | [references/monitoring.md](references/monitoring.md) |
| E2E tests | [references/e2e-testing.md](references/e2e-testing.md) |

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
