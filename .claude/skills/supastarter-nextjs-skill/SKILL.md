---
name: supastarter-nextjs-skill
description: "Guides development with supastarter for Next.js only (not Vue/Nuxt): split-app monorepo (saas/marketing/docs), tech stack, setup with Docker, configuration, database (Prisma + Drizzle), API (Hono/oRPC), auth (Better Auth), organizations, payments (Stripe/Lemonsqueezy/Polar/Creem/DodoPayments), AI, customization, storage, mailing, i18n, SEO, deployment, background tasks, analytics, monitoring, E2E."
license: See LICENSE
metadata:
  author: supastarter
  version: "1.1"
  compatibility: "Designed for Cursor-like coding agents. Run commands from monorepo root."
---

# supastarter for Next.js - Skill

Expert guidance for the supastarter **Next.js** stack. This skill is scoped to Next.js docs and patterns only.

## When to Use

Use when the user asks about:

- supastarter Next.js architecture or feature work
- Prisma/Drizzle models and queries
- Hono/oRPC procedures and API wiring
- Better Auth and organization flows
- payments, storage, tasks, analytics, monitoring, or deployment

## Current Monorepo Shape

```
apps/
  saas/                   # Authenticated SaaS app + API routes
  marketing/              # Public website, blog, changelog
  docs/                   # Documentation app
  mail-preview/           # Email template preview
packages/
  api/ auth/ database/ i18n/ logs/ mail/ payments/ storage/ ui/ utils/
tooling/                  # Shared lint/ts/tailwind/tooling configs
```

Avoid legacy assumptions like `apps/web/`.

## Feature Workflow

1. **Data model**: update `packages/database/prisma/schema.prisma`.
2. **Database layer**: add queries under `packages/database/*/queries/`.
3. **API layer**: add module in `packages/api/modules/<feature>/`.
4. **UI layer**: implement in `apps/saas/modules/` or `apps/marketing/modules/`.
5. **Translations**: update `packages/i18n`.
6. **Validation**: run typecheck/lint/tests for affected workspace.

Full example: [assets/recipes/feedback-widget.md](assets/recipes/feedback-widget.md)

## References (Read by Topic)

Start with:

- [references/coding-conventions.md](references/coding-conventions.md)
- [references/code-patterns.md](references/code-patterns.md)
- [references/quick-reference.md](references/quick-reference.md)

Then load specific topics as needed:

- setup/config: `setup.md`, `configuration.md`, `troubleshooting.md`
- backend: `database-patterns.md`, `api-patterns.md`, `auth-patterns.md`
- product: `organization-patterns.md`, `payments-patterns.md`, `storage-patterns.md`
- runtime: `background-tasks.md`, `analytics.md`, `monitoring.md`
- frontend/seo: `customization.md`, `internationalization.md`, `seo.md`, `e2e-testing.md`

## Scripts and Assets

- env template: [assets/env.example](assets/env.example)
- implementation recipe: [assets/recipes/feedback-widget.md](assets/recipes/feedback-widget.md)
- scaffold helper: [scripts/generate_module.py](scripts/generate_module.py)
- script docs: [scripts/README.md](scripts/README.md)

Run script from monorepo root:

```bash
python .agents/skills/supastarter-nextjs-skill/scripts/generate_module.py <module-name>
```

## Official Docs

- [Next.js docs root](https://supastarter.dev/docs/nextjs)
- [Next.js setup](https://supastarter.dev/docs/nextjs/setup)
- [Next.js tech stack](https://supastarter.dev/docs/nextjs/tech-stack)
