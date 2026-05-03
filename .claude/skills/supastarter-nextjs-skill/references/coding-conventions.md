# Coding Conventions (Next.js)

Use this doc whenever you generate or update code in a supastarter Next.js repo. **Next.js only**; no Vue/Nuxt.

### Purpose

- Use this doc whenever generating or updating code in this repository.
- Mirror the existing project conventions; do not invent new patterns without strong reason.

### Architecture Overview

- Frontend lives in **multiple Next.js apps**:
    - `apps/saas/` — protected SaaS app (App Router, port 3000)
    - `apps/marketing/` — public marketing site (port 3001)
    - `apps/docs/` — documentation (port 3002)
    - `apps/mail-preview/` — email template preview (port 3003)
- Shared feature modules live under `apps/<app>/modules/` (e.g., `apps/saas/modules/auth`, `apps/marketing/modules/blog`).
- Backend logic resides in `packages/*`:
    - `api` — oRPC procedures and Hono HTTP handler.
    - `auth` — Better Auth configuration plus invitation/passkey/organization helpers.
    - `database` — **Prisma AND Drizzle** clients, schema, queries (both ORMs coexist).
    - `notifications` — in-app + email notifications (`createNotification`, preferences, catalog).
    - `ai`, `logs`, `mail`, `payments`, `storage`, `utils`, `i18n` for their respective domains.
- Use the package exports (`@repo/api`, `@repo/auth`, `@repo/database`, `@repo/ui/components/*`, `@repo/notifications`) instead of deep relative imports.
- Use per-app aliases for cross-module imports inside an app. **apps/saas** exports: `@auth/*`, `@shared/*`, `@organizations/*`, `@payments/*`, `@admin/*`, `@ai/*`, `@onboarding/*`, `@settings/*`, `@i18n/*`, `@search/*`, `@knowledge/*`, `@config`. **apps/marketing** exports: `@home/*`, `@blog/*`, `@changelog/*`, `@shared/*`, `@i18n/*`, `@config`.

### Core Coding Principles

- Write TypeScript everywhere; use interfaces over type aliases when describing object shapes.
- Export React components as named functions; avoid default exports and classes.
- Prefer pure functions declared with the `function` keyword.
- **Avoid enums**; use `as const` maps/records or union literals.
- Keep components declarative and presentational; extract helpers for imperative logic.
- Use descriptive camelCase identifiers (`isLoading`, `canSubmit`); directories use kebab-case.

### React & Next.js Patterns

- Favor React Server Components; only add `"use client"` when interactivity or browser APIs demand it.
- Wrap client components in `Suspense` with a tailored fallback.
- Use Next.js data-fetching primitives (Route Handlers, Server Actions, `fetch` with caching tags).
- Colocate route-specific helpers under the route directory; share cross-route logic via `apps/<app>/modules`.
- Handle errors with `notFound()`, `redirect()`, or custom error boundaries; do not throw raw errors.
- Marketing pages use the `[locale]` segment; SaaS pages do NOT (locale handled via cookie/middleware in saas).

### Styling & UI

- Compose UI with **Shadcn UI**, **Radix primitives**, and **Tailwind CSS v4** utilities.
- Import the local `cn` helper from `@repo/ui` (`import { cn } from "@repo/ui"`) for conditional class names.
- Follow mobile-first responsive utility ordering. Design tokens come from `tooling/tailwind/theme.css` (Tailwind v4 — there is **no** `tailwind.config.ts` per app).
- Optimize assets with `next/image` (explicit `width`/`height`, WebP when possible, lazy-load non-critical visuals).

### State & Forms

- When client state is required, use colocation inside components or dedicated hooks within `apps/<app>/modules/shared/hooks`.
- Reuse existing form abstractions (zod schemas in `packages/api/modules/<feature>/types.ts`, `Form*` from `@repo/ui/components/form`) before adding new ones.
- Use **react-hook-form** for forms and **zod** as schema/validation library.
- Use `nuqs` for URL search-param state.

### Data & APIs

- Add API and data-fetching logic to `@repo/api` (single source of truth, reusable).
- Group API logic in `packages/api/modules/<feature>/` — `types.ts` (zod schemas), `procedures/<action>.ts`, `router.ts` (router object). Mount the router in `packages/api/orpc/router.ts`.
- Three procedure types from `packages/api/orpc/procedures.ts`:
    - `publicProcedure` — no auth required
    - `protectedProcedure` — adds `context.session` and `context.user` (throws `UNAUTHORIZED` otherwise)
    - `adminProcedure` — requires `context.user.role === "admin"` (throws `FORBIDDEN` otherwise)
- Use the generated database clients from `@repo/database`; never instantiate Prisma or Drizzle directly in app code.
- Honor caching/revalidation patterns already in the repo.
- Client-side fetching: `import { orpc } from "@shared/lib/orpc-query-utils"` then `useQuery(orpc.<module>.<action>.queryOptions())` / `useMutation(orpc.<module>.<action>.mutationOptions())`.

### Authentication & Authorization

- Use helpers from `@repo/auth` (Better Auth) for session handling, invitations, passkeys, organizations.
- Server-side: `getSession()` from `@auth/lib/server` (i.e. `apps/saas/modules/auth/lib/server.ts`).
- Client-side: `useSession()` from `@auth/hooks/use-session`.
- Active org context (client): `useActiveOrganization()` from `@organizations/hooks/use-active-organization`.
- Respect organization scoping: access-control helpers live in `apps/saas/modules/*/lib`.
- When updating auth flows, ensure email templates (`packages/mail/emails`) and audit hooks stay consistent.

### Notifications

- Server: `createNotification` from `@repo/notifications` (`{ userId, type, data?, link? }`). User preferences gate in-app row + email.
- New notification types require updating the `NotificationType` enum in Prisma schema **and** keeping `packages/notifications/types.ts` and `packages/notifications/catalog.ts` (`NOTIFICATION_GROUPS`, i18n labels in `saas.json` → `settings.notificationsPage`) aligned.

### Internationalization

- Strings come from `packages/i18n/translations/<locale>/<scope>.json` where `locale ∈ {en, de, es, fr, ru}` and `scope ∈ {mail, marketing, saas, shared}`.
- Pick the right scope file: SaaS-only feature → `saas.json`, marketing-only → `marketing.json`, both → `shared.json`, email copy → `mail.json`.
- Server: `setRequestLocale(locale)` and `getMessagesForLocale(locale, scope)` from `@repo/i18n`.
- Client: `useTranslations()` from `next-intl`.
- Honor cookie name `NEXT_LOCALE` from `packages/i18n/config.ts`.

### Tooling & Quality

- Package manager: **pnpm 10+**. Workspace commands via Turbo (`pnpm dev`, `pnpm build`, `pnpm lint`).
- **Lint: Oxlint** (`pnpm lint` / `pnpm lint:fix`). **Format: Oxfmt** (`pnpm format` / `pnpm format:check`). Configs: `.oxlintrc.json`, `.oxfmtrc.json`. **Not** Biome, **not** ESLint+Prettier.
- Target Node.js ≥ 20. ESM imports.
- The shared `tooling/typescript/base.json` uses `target: "ES6"`. Packages that need `BigInt` literals (`0n`, `100_00n`) must override per-package: `"compilerOptions": { "target": "ES2020", "lib": ["ES2020"] }` (add `"DOM"` to `lib` if the package transitively imports browser-typed code from `@repo/ui`). Or call `BigInt(0)` explicitly.
- E2E tests (Playwright) live under `apps/marketing/tests` and `apps/saas/tests`.
- When introducing dependencies, add at the correct workspace package; prefer the workspace `catalog:` versions in `pnpm-workspace.yaml`; wire up exports through the relevant `index.ts`.
- Env files: `.env.local` for app dev, `.env` is read by Prisma scripts (use a copy of `.env.local`).

### Documentation & Change Management

- Update relevant MDX docs under `apps/marketing/content` when altering user-facing behavior.
- Update `agents.md` (root) when architectural conventions, app boundaries, aliases, or shared workflows change.
- Log noteworthy consumer-impacting changes in `CHANGELOG.md`.
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`).

### Mandatory pre-write rules (anti-duplication, anti-bloat)

These are **MUST**, not preferences. Each row has a default; overriding it requires that you state in your reply: "I'm doing X because <concrete reason naming the call sites or constraint>." If you can't fill in the blank, don't override.

**Step 0 — grep before you write.** Every new file (component, hook, procedure, query, helper, type) MUST be preceded by a grep for the same noun in the relevant directory (see SKILL.md "MANDATORY pre-write protocol"). No exceptions.

| What you might add                                         | Default                                                                                                                                                                                     | You may override only if                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New UI component** (`Foo.tsx`)                           | **NO** — use the closest existing component from the [UI catalog](ui-component-catalog.md) (Layer 3 → Layer 2 → Layer 1) and add a prop if needed.                                          | The catalog truly has nothing close. Then place under `apps/<app>/modules/<feature>/components/` (Layer 3), not `packages/ui` (Layer 1) or `@shared` (Layer 2). |
| **New hook** (`useFoo`)                                    | **NO** — search `apps/saas/modules/*/hooks/`, `apps/saas/modules/shared/hooks/`.                                                                                                            | No matching hook exists AND ≥1 call site in this same task.                                                                                                     |
| **New oRPC procedure**                                     | **Only with a real caller in this same task.**                                                                                                                                              | — Speculative procedures are deleted in review.                                                                                                                 |
| **New `@repo/database` query helper**                      | **NO** — search `packages/database/prisma/queries/` and `packages/database/drizzle/queries/`. Many composite queries already exist (e.g. `getOrganizationById` already includes `members`). | No matching helper, and the inline query would repeat in ≥2 places.                                                                                             |
| **New zod schema for a Prisma model**                      | **NO** — `prisma-zod-generator` already wrote it under `packages/database/prisma/zod/`. Import `<Model>Schema` from `@repo/database`.                                                       | The schema needs project-specific refinements; then `extend()` the generated one — never duplicate fields.                                                      |
| **New abstraction / interface / wrapper / factory**        | **NO** — inline it.                                                                                                                                                                         | There are **≥2 existing call sites** that would otherwise duplicate logic. One future call site does not count.                                                 |
| **New `packages/<pkg>` workspace package**                 | **NO** — extend an existing one (`@repo/utils`, `@repo/payments`, ...).                                                                                                                     | New code has its own clear domain boundary AND ≥3 consumers AND its dependency graph would be uglier inside an existing package.                                |
| **New env-driven provider switch** (`MY_FEATURE_PROVIDER`) | **NO** — hard-code the one provider needed.                                                                                                                                                 | A second provider is being added in this same task.                                                                                                             |
| **New typed `Error` subclass**                             | **NO** — `throw new Error("MY_FOO_<CODE>:...")`.                                                                                                                                            | ≥3 `catch` sites need to discriminate this from other errors.                                                                                                   |
| **New config in `config.ts` "for future flexibility"**     | **NO** — hardcode the current value.                                                                                                                                                        | A real second value exists today.                                                                                                                               |
| **New i18n locale**                                        | **NO** — only the 5 locales already defined (en/de/es/fr/ru) unless the project owner has explicitly asked for another.                                                                     | A specific locale is requested AND all 4 scope files (`mail`/`marketing`/`saas`/`shared`) will be filled in this same task — partial locales break TS types.    |
| **New translation namespace / scope file**                 | **NO** — choose `saas` / `marketing` / `shared` / `mail` per [internationalization.md](internationalization.md).                                                                            | —                                                                                                                                                               |

**Hard reuse rules (do not negotiate):**

- ❌ NEVER instantiate `PrismaClient` / `Drizzle` directly — import `db` from `@repo/database`.
- ❌ NEVER call `auth.api.getSession` from app code — use `getSession()` from `@auth/lib/server` (server) or `useSession()` from `@auth/hooks/use-session` (client).
- ❌ NEVER write your own `cn()` — `import { cn } from "@repo/ui"`.
- ❌ NEVER hand-write Zod for an existing Prisma model — import generated `<Model>Schema` from `@repo/database`.
- ❌ NEVER mount a webhook outside `packages/api/index.ts` — that's where Hono lives.
- ❌ NEVER bypass `@repo/notifications` for in-app/email user notifications — `createNotification` handles preferences and templating.
- ❌ NEVER store money as `numeric`/`decimal` — `BigInt` minor units (kopecks/cents) only.

If you find yourself about to violate any of these, **STOP**. Re-state the goal and find the existing primitive.

### When in Doubt

- Inspect neighboring files for patterns before writing new code (e.g., `packages/api/modules/notifications/` is a complete reference module).
- Ask for clarification on product requirements rather than guessing.
- Prefer incremental, well-scoped changes over sweeping rewrites.
- Ensure any new feature has a corresponding server and client story (UI, API, data layer, emails/notifications if needed).
