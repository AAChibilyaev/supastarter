# DSLMRank plans

- **`dslmrank-build-plan-v2.md`** — Full Cursor agent build plan (schema, seed, score engine, jobs, Algolia, pages, API, admin, SEO). Follow phases in order.

**Supastarter note:** Where the plan says `npm`, use **`pnpm`** from the monorepo root. Database commands are typically `pnpm --filter database generate` and `pnpm --filter database push`.

Project-specific Cursor rules live in **`.cursor/rules/dslmrank.mdc`** (always applied).
