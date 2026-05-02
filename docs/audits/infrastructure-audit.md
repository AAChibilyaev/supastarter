# Infrastructure Audit Report — AACsearch (AAC-401)

**Date:** 2026-05-03
**Auditor:** Infrastructure Agent
**Project:** AACsearch (supastarter monorepo)
**Location:** `/Users/aac/Projects/ts/supastarter`

---

## 1. CI/CD Pipeline

### Current State

| Component                 | Status        | Details                                                                                           |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| **GitHub Actions CI**     | ✅ Active     | 4 workflows: validate-prs, deploy, rollback, benchmark                                            |
| **PR Validation**         | ✅ Configured | Lint (oxlint), format (oxfmt), type-check, build (saas + marketing), unit tests, E2E (Playwright) |
| **Deploy Pipeline**       | ✅ Configured | Build → push to GHCR → deploy staging → smoke tests → deploy production                           |
| **Rollback**              | ✅ Configured | Manual trigger via workflow_dispatch with tag validation                                          |
| **Performance Benchmark** | ✅ Configured | k6-based, nightly + manual trigger, regression checks against baselines                           |
| **Dependabot**            | ✅ Configured | Daily npm updates, grouped by type                                                                |

### Issues Found

1. **Missing Docker layer caching in PR validation** — the `validate-prs.yml` build job runs `pnpm install` from scratch every time. The Docker build has `cache-from: type=gha`, but PR jobs don't share it.
2. **No CI cache for pnpm store** — `pnpm install` runs full install each time (no `~/.pnpm-store` cache). Could save 30-60s per run.
3. **E2E tests require real credentials** — `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_ADMIN_API_KEY` must be set as secrets. This blocks external contributors from running E2E.

### Recommendations

- Add `actions/cache` for pnpm store in `validate-prs.yml`
- Consider a lightweight E2E mode with test-only credentials (factory bot seeds)
- Add `workflow_dispatch` trigger to `validate-prs.yml` for manual re-runs

---

## 2. Docker & Containerization

### Current State

| Component                     | Status        | Details                                                                         |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------- |
| **Dockerfile**                | ✅ Good       | Multi-stage (base → installer → builder → runner), standalone Next.js output    |
| **.dockerignore**             | ✅ Good       | Excludes node_modules, .next, .git, dev files, archive, docs                    |
| **Dev docker-compose**        | ✅ Good       | PostgreSQL 16, MinIO, Typesense 30.2 — all with healthchecks                    |
| **Production docker-compose** | ✅ Good       | app, cron-worker, postgres, minio, minio-setup, typesense — 2 isolated networks |
| **Nixpacks**                  | ✅ Configured | Coolify/Railway/Render support via `nixpacks.toml`                              |

### Issues Found

1. **MinIO image pinned to `:latest`** — both dev and production. Should pin to a specific version for reproducibility.
2. **Typesense uses port `8108` but production compose doesn't expose it** — correct (internal network), but could be a debugging hurdle.
3. **Cron-worker healthcheck missing** — the container restarts on failure via `unless-stopped`, but there's no health probe for the cron-worker itself.
4. **No resource limits** — no `deploy.resources.limits` on any service. On resource-constrained hosts, a runaway container could starve others.
5. **Dockerfile rebuilds ALL workspace packages** — `COPY . .` copies the entire monorepo, including e2e, loadtest, docs. A layered copy for only the necessary apps/packages would improve build cache efficiency.

### Recommendations

- Pin MinIO to `minio/minio:RELEASE.2024-11-17T00-27-47Z` (or similar stable tag)
- Add healthcheck to cron-worker
- Add `deploy.resources.limits` with sensible defaults
- Restructure Dockerfile COPY to only transport what the build stage needs

---

## 3. Deployment & Hosting

### Current State

| Component               | Status        | Details                                                                        |
| ----------------------- | ------------- | ------------------------------------------------------------------------------ |
| **Deployment Platform** | ✅ Coolify    | Self-hosted, two environments: staging + production                            |
| **Registry**            | ✅ GHCR       | `ghcr.io/<repo>` — Docker images pushed on main branch                         |
| **Deploy Trigger**      | ✅ Webhook    | Coolify deploy webhooks invoked after successful build+push                    |
| **Health Check**        | ✅ Configured | Docker HEALTHCHECK on app (wget /api/health, 30s interval)                     |
| **Rollback**            | ✅ Manual     | GitHub Actions `rollback.yml` — validates tag exists, triggers Coolify webhook |
| **Self-Hosting Guide**  | ✅ Documented | `SELF_HOSTING.md` covers Docker Compose and Coolify setup                      |

### Issues Found

1. **No staging database persists across deploys** — staging and production share the same Coolify stack definition. Staging deploys recreate containers, but volumes persist only if `external: true`.
2. **No blue/green or zero-downtime strategy** — Coolify's Docker Compose deploy stops old container before starting new one. Brief downtime window.
3. **No deployment notifications** — no Slack/Discord/Telegram notification on deploy success/failure.
4. **No automated database migration step in deploy pipeline** — `SELF_HOSTING.md` documents manual migration, but the pipeline doesn't run `prisma migrate deploy` as a step. Schema changes risk breaking production if forgotten.

### Recommendations

- Add `deployment_status` event notification via GitHub Actions (Slack/Discord webhook)
- Add a pre-deploy migration step in `deploy.yml` that runs before health check
- Document the expected downtime window and consider a nginx maintenance page approach
- Add `DEPLOY_ENVIRONMENT=staging|production` env variable for conditional logic

---

## 4. Monitoring & Observability

### Current State

| Component                  | Status        | Details                                                                                            |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| **Error Tracking**         | ⚠️ Partial    | Sentry configured (server + client + edge), but `SENTRY_DSN` env vars are empty in all env files   |
| **App Health**             | ✅ Configured | `HEALTHCHECK` in Dockerfile, `/api/health` endpoint exists, smoketests in CI                       |
| **Infrastructure Metrics** | ❌ Missing    | No CPU/RAM/disk monitoring, no Docker stats collection                                             |
| **Uptime Monitoring**      | ❌ Missing    | No external uptime checks (Pingdom, Better Uptime, etc.)                                           |
| **Logging**                | ⚠️ Partial    | Docker logs (docker compose logs), pino-based `@repo/logs` package, no centralized log aggregation |
| **APM**                    | ❌ Missing    | No application performance monitoring                                                              |
| **Alerting**               | ❌ Missing    | No alert channels (no Slack/PagerDuty integration for failures)                                    |

### Issues Found

1. **Sentry is wired but inactive** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` exist and are initialized via `instrumentation.ts`, but the DSN is empty in all configs. This means Sentry initializes but silently no-ops. No error tracking is actually active.
2. **No log aggregation** — logs live in Docker's ring buffer. On container restart, all logs are lost. No integration with Loki, CloudWatch, or similar.
3. **No infrastructure metrics** — no Prometheus node exporter, no Grafana dashboard, no Coolify resource monitoring enabled.
4. **No uptime monitoring** — no external service checking if production is online.

### Recommendations (Priority Order)

1. **Activate Sentry** — set `SENTRY_DSN` in production environment (basic free tier covers error tracking)
2. **Add Docker log driver** — configure `logging:` block in production compose to use `local` or `journald` driver with rotation
3. **Add Coolify resource monitoring** — Coolify has built-in container metrics; enable it via the Coolify dashboard
4. **Set up external uptime monitoring** — free tier of Better Uptime or HetrixTools for HTTP endpoint checks
5. **Consider basic APM** — Sentry performance monitoring or OpenTelemetry for request tracing

---

## 5. Cron Jobs & Background Processing

### Current State

| Component                        | Status            | Details                               |
| -------------------------------- | ----------------- | ------------------------------------- |
| **Cron Worker**                  | ✅ Active         | Alpine + crond container, 5 cron jobs |
| **Search Ingest Flush**          | ✅ Every 1min     | Flushes ingest buffer → Typesense     |
| **Reindex Runner**               | ✅ Every 2min     | Runs pending reindex jobs             |
| **Wallet Reservation Expiry**    | ✅ Every 5min     | Expires stale wallet reservations     |
| **Tochka Top-up Reconciliation** | ✅ Hourly         | Reconciles pending Tochka orders      |
| **Drip Emails**                  | ✅ Daily at 09:00 | Sends onboarding email sequences      |

### Issues Found

1. **No cron job monitoring** — if the cron-worker container crashes, no alert fires. Lost crons go unnoticed until a user reports stale data.
2. **Cron job output goes to /proc/1/fd/1** — this is correct for Docker log capture, but there's no per-job log rotation or failure detection.
3. **No dead letter queue** — if a cron HTTP call fails (network blip, app restart), the job simply errors. No retry mechanism beyond the next scheduled tick.

### Recommendations

- Add a "last successful run" heartbeat check — the cron-worker could touch a file or hit a `/api/health/cron` endpoint on the app
- Consider adding a simple retry wrapper around critical cron jobs (search-flush, reindex-runner)
- Document cron job failure logging and detection process

---

## 6. Security & Secrets Management

### Current State

| Component                 | Status              | Details                                                                      |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------- |
| **Secrets in .env.local** | ⚠️ Present          | `.env.local` contains dev API keys (OpenAI, Stripe, Mail providers)          |
| **.env.paperclip**        | ⚠️ Contains API key | Paperclip agent identity and API key in plaintext                            |
| **Production Secrets**    | ✅ In Coolify       | Production secrets managed through Coolify's env interface                   |
| **GitHub Secrets**        | ✅ Configured       | `DATABASE_URL`, `COOLIFY_DEPLOY_WEBHOOK_*`, `E2E_*`, staging/production URLs |
| **API Key Hashing**       | ✅ Per Invariant 3  | Search API keys stored hashed (only shown once at creation)                  |

### Issues Found

1. **`.env.paperclip` committed to repo** — contains plaintext API key (`pcp_c4...55e9`). Even if only for local dev, it's a credential in the git tree.
2. **`.env.local` contains real API keys for development** — OpenAI, Stripe, Mail provider keys are in plaintext on disk. Though `.env.local` is gitignored, it's a risk if the machine is compromised.
3. **No secrets rotation policy documented**
4. **GitHub token permissions are broad** — `packages: write` on deploy workflow gives full write access to GHCR packages

### Recommendations

- Add `.env.paperclip` to `.gitignore` or remove the API key and replace with a placeholder
- Document secrets management in a `SECURITY.md` or within `SELF_HOSTING.md`
- Consider using `gh secret set` for CI rather than storing plaintext in env files

---

## 7. Summary & Action Plan

### Strengths

1. Well-structured, multi-stage Docker build with standalone Next.js output (tiny production image)
2. Comprehensive GitHub Actions CI with lint, type-check, build, test, E2E, and benchmark regression
3. Clean deployment pipeline with staging → production progression and manual rollback capability
4. Good self-hosting documentation (SELF_HOSTING.md with multiple deploy options)
5. Proper docker-compose architecture with separate internal/public networks
6. All infrastructure is Docker-based, deployable via compose or Coolify

### Critical Gaps (Fix First)

1. **Sentry is dead** — DSN empty, zero error tracking in production
2. **No monitoring or alerting** — no metrics, no uptime checks, no log aggregation
3. **No automated DB migrations in deploy pipeline**
4. **Resource limits missing** — containers can run unbounded on the host

### Medium Priority

- Pin MinIO to a stable version
- Add pnpm store caching to CI
- Add deployment notifications
- Add cron job health heartbeat check

### Low Priority / Nice-to-Have

- Zero-downtime deployment strategy (Coolify can be configured for graceful rolling updates)
- Structured log aggregation (Loki + Grafana)
- APM with OpenTelemetry or Sentry performance

---

_End of Infrastructure Audit Report_
