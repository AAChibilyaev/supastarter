# Playwright Regression Test Plan — Critical User Journeys

**Issue**: AAC-840
**Author**: QA Agent
**Target**: Under 5 min suite runtime, 95%+ pass rate on main
**Schedule**: Daily via CI (`0 5 * * *` UTC), plus on PR merge to main

---

## 1. Journey Inventory & Coverage Gap Analysis

| #   | Journey                                                    | Existing Coverage                                                                  | Gap                                                                                                                                         |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Signup → org creation → first index → first search         | auth-flows (15), project-creation (5), search-happy-path (8), index-lifecycle (12) | **Partial**: signup tested, but end-to-end signup→index→search as single flow is not combined. Prerequisite setup needed for new test user. |
| J2  | API key creation → use key for search → key revocation     | api-key-lifecycle (6)                                                              | **Good**: lifecycle covered (create, use, revoke, reuse).                                                                                   |
| J3  | Plan upgrade/subscription → entitlement change → downgrade | free-trial (5), quota (4)                                                          | **Partial**: free trial UI checks existing. Upgrade flow (Stripe checkout → plan change → feature unlock) not tested end-to-end.            |
| J4  | Widget embed → search via widget → analytics events        | widget-integration (3), widget-rendering (7), widget-filters (3), analytics (10)   | **Partial**: widget rendering and filters covered. Full embed flow + analytics pipeline as single journey not combined.                     |
| J5  | Multi-tenant isolation                                     | auth-flows (org switching), quota (4)                                              | **Minimal**: no dedicated cross-org isolation test that verifies org A data never leaks to org B.                                           |

---

## 2. Regression Test Suite Design

### 2.1 Architecture

```
Project: "regression"
Dependencies: ["setup"]
TestMatch: "tests/regression/**/*.spec.ts"
Workers: 2 (serial mode within files, parallel across files)
Retries: 1 (CI) / 0 (local)
Timeout: 60s per test, 300s total per file
```

### 2.2 Test Files & Scenarios

#### `regression/j1-signup-to-search.spec.ts` — 4 scenarios, ~60s

| Scenario                                   | Steps                                                          | Asserts                                       |
| ------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------- |
| 1. Signup → create org → land on dashboard | Navigate /signup, fill email/password/name, submit, create org | Dashboard loads, URL contains org slug        |
| 2. Create first search index               | Click "Create index", fill name, select schema fields          | Index appears in list, slug is valid          |
| 3. Add documents via UI                    | Upload/drag-drop JSON file or paste sample data                | Documents count shown, first document visible |
| 4. Execute search via search preview       | Navigate to search/playground, type query, submit              | Results returned, hit count > 0               |

**Preconditions**: Fresh browser context, new test user (time-based unique email)
**Postconditions**: None (teardown deletes index via API)

#### `regression/j2-api-key-search.spec.ts` — 4 scenarios, ~50s

| Scenario                            | Steps                                             | Asserts                          |
| ----------------------------------- | ------------------------------------------------- | -------------------------------- |
| 1. Create API key from dashboard    | Navigate to API keys tab, name key, select scopes | Key revealed once, shown in list |
| 2. Use key for public search        | POST /api/search/public/{slug} with Bearer key    | 200 OK, hits returned            |
| 3. Use key for admin operations     | POST /api/v1/indexes with Bearer key              | 200 OK, index created            |
| 4. Revoke key → verify search fails | Revoke key via UI, then reuse same key for search | 401 Unauthorized                 |

**Preconditions**: Authenticated user with existing index
**Postconditions**: Clean up test indexes

#### `regression/j3-upgrade-downgrade.spec.ts` — 3 scenarios, ~90s (skipped if no Stripe test mode)

| Scenario                                     | Steps                                               | Asserts                                                     |
| -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 1. View billing page as free user            | Navigate /settings/billing                          | Plan shows "Free" or "Trial", upgrade CTA present           |
| 2. Start upgrade flow                        | Click "Upgrade", verify pricing table loaded        | Stripe Checkout or embedded pricing visible                 |
| 3. Verify entitlement change after subscribe | (Stubbed) check plan feature flags reflect new tier | Pro features unlocked (synonyms, curations, full analytics) |

**Preconditions**: Authenticated user with no active subscription
**Postconditions**: None (do not complete Stripe payment in CI)

#### `regression/j4-widget-to-analytics.spec.ts` — 4 scenarios, ~60s

| Scenario                            | Steps                                            | Asserts                                           |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| 1. Widget embed code generation     | Navigate to widget configurator, configure mode  | Embed script snippet visible, copyable            |
| 2. Widget renders with correct data | Load HTML page with embed script, wait for mount | Widget DOM visible, search input functional       |
| 3. Widget search returns results    | Type query in widget input, trigger search       | Results displayed, no errors                      |
| 4. Analytics reflect widget usage   | Navigate to analytics dashboard                  | Widget events visible, CTR/impressions data shown |

**Preconditions**: Existing index with documents, authenticated user
**Postconditions**: None

#### `regression/j5-tenant-isolation.spec.ts` — 5 scenarios, ~90s

| Scenario                                                 | Steps                                                    | Asserts                                |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| 1. Create org A with index A + documents                 | API: create org, index, seed documents                   | Org A has documents                    |
| 2. Create org B with index B + documents                 | API: create org, index, seed documents                   | Org B has documents                    |
| 3. Search org A from org B (via API key scoped to org B) | Use org B key to search index A                          | 403 or 0 results (no cross-org access) |
| 4. Search org B from org A (reverse)                     | Use org A key to search index B                          | 403 or 0 results                       |
| 5. Verify API keys are org-isolated                      | List API keys for each org, check no cross-contamination | Each org sees only its own keys        |

**Preconditions**: Admin API key with org creation scope
**Postconditions**: Delete both test orgs + indexes

---

## 3. Performance Budget

| File                   | Scenario Count | Est. Time  | Auth          |
| ---------------------- | -------------- | ---------- | ------------- |
| j1-signup-to-search    | 4              | 60s        | Fresh signup  |
| j2-api-key-search      | 4              | 50s        | Existing user |
| j3-upgrade-downgrade   | 3              | 90s        | Existing user |
| j4-widget-to-analytics | 4              | 60s        | Existing user |
| j5-tenant-isolation    | 5              | 90s        | Admin API     |
| **Setup overhead**     | —              | 30s        | —             |
| **Total**              | **20**         | **~5 min** | —             |

---

## 4. CI Integration

### 4.1 GitHub Actions Workflow: `.github/workflows/e2e-regression.yml`

```yaml
name: E2E Regression Tests

on:
    schedule:
        - cron: "0 5 * * *" # Daily at 05:00 UTC
    workflow_dispatch:
        inputs:
            environment:
                description: "Target environment"
                required: true
                default: staging
                type: choice
                options:
                    - staging
                    - preview

env:
    E2E_SAAS_URL: ${{ vars.E2E_SAAS_URL || 'http://localhost:3010' }}
    E2E_ADMIN_API_KEY: ${{ secrets.E2E_ADMIN_API_KEY }}
    NEXT_PUBLIC_SAAS_URL: ${{ vars.E2E_SAAS_URL || 'http://localhost:3010' }}

jobs:
    regression:
        name: "Regression (${{ github.event.inputs.environment || 'staging' }})"
        runs-on: ubuntu-latest
        timeout-minutes: 15
        environment: ${{ github.event.inputs.environment || 'staging' }}

        services:
            postgres:
                image: postgres:16
                env:
                    POSTGRES_DB: aacsearch
                    POSTGRES_USER: aacsearch
                    POSTGRES_PASSWORD: aacsearch
                ports:
                    - 5432:5432
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

            typesense:
                image: typesense/typesense:30.0.rc8
                env:
                    TYPESENSE_API_KEY: test-admin-key
                    TYPESENSE_DATA_DIR: /data
                ports:
                    - 8108:8108
                options: >-
                    --health-cmd "curl -f http://localhost:8108/health || exit 1"
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

        steps:
            - uses: actions/checkout@v4

            - uses: actions/setup-node@v4
              with:
                  node-version: lts/*

            - uses: pnpm/action-setup@v4

            - name: Install dependencies
              run: pnpm install

            - name: Generate Prisma client
              run: pnpm --filter @repo/database generate
              env:
                  DATABASE_URL: postgres://aacsearch:aacsearch@localhost:5432/aacsearch

            - name: Run database migrations
              run: pnpm --filter @repo/database db:push
              env:
                  DATABASE_URL: postgres://aacsearch:aacsearch@localhost:5432/aacsearch

            - name: Build app
              run: pnpm --filter saas build
              env:
                  NEXT_PUBLIC_SAAS_URL: ${{ env.E2E_SAAS_URL }}
                  DATABASE_URL: postgres://aacsearch:aacsearch@localhost:5432/aacsearch
                  BETTER_AUTH_SECRET: better-auth-e2e-secret-1234567890

            - name: Start app server
              run: |
                  pnpm --filter saas start -p 3010 &
                  npx wait-on tcp:3010 --timeout 60000

            - name: Install Playwright
              working-directory: packages/e2e
              run: npx playwright install chromium

            - name: Run regression tests
              working-directory: packages/e2e
              run: npx playwright test --project=regression --reporter=html,list
              env:
                  E2E_TEST_EMAIL: regression@aacsearch.io
                  E2E_TEST_PASSWORD: RegressionTest123!
                  E2E_ADMIN_API_KEY: test-admin-key

            - name: Upload report
              if: always()
              uses: actions/upload-artifact@v4
              with:
                  name: playwright-report-regression
                  path: packages/e2e/playwright-report/
                  retention-days: 7

            - name: Post Slack notification on failure
              if: failure()
              uses: slackapi/slack-github-action@v2
              with:
                  webhook: ${{ secrets.SLACK_WEBHOOK }}
                  webhook-type: incoming-webhook
                  payload: |
                      text: "⚠️ Regression test failure: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### 4.2 Trigger-on-merge (Lightweight)

Add to `validate-prs.yml` as a conditional job that runs only regression tests against the existing staging server:

```yaml
e2e-regression:
    name: "E2E Regression (staging)"
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'e2e-regression')
    steps:
        - uses: checkout/...
        - name: Run regression tests against staging
          run: npx playwright test --project=regression
          working-directory: packages/e2e
          env:
              E2E_SAAS_URL: https://staging.aacsearch.io
              E2E_ADMIN_API_KEY: ${{ secrets.E2E_ADMIN_API_KEY }}
              E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
              E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

---

## 5. Playwright Config Additions

Add to `packages/e2e/playwright.config.ts`:

```typescript
{
    name: "regression",
    dependencies: ["setup"],
    testMatch: "tests/regression/**/*.spec.ts",
    use: {
        ...devices["Desktop Chrome"],
        // Increased timeouts for regression suite
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
    },
    // Serial execution within each regression file
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000, // per test
},
```

---

## 6. Pass/Fail Criteria

| Metric          | Target              | Action on Miss                           |
| --------------- | ------------------- | ---------------------------------------- |
| Pass rate       | ≥95% (≥19/20 tests) | Block merge, notify Slack                |
| Suite duration  | ≤5 min              | Investigate slow tests, split file       |
| False positives | <5%                 | Add retries, improve selectors           |
| Flakiness rate  | <2% over 5 runs     | Mark test as `@flaky`, fix within 1 week |

---

## 7. Runbook

### Local Run

```bash
cd packages/e2e
pnpm test -- --project=regression
```

### CI Run (adhoc)

```bash
# Via GitHub UI: Actions → E2E Regression Tests → Run workflow
# Or via CLI:
gh workflow run e2e-regression.yml -f environment=staging
```

### Debugging Failures

```bash
# View HTML report
cd packages/e2e && npx playwright show-report
# Re-run with trace
npx playwright test --project=regression --trace=on --headed
```

---

## 8. Future Expansion (v2)

| Priority | Journey                                             | Reason                  |
| -------- | --------------------------------------------------- | ----------------------- |
| P0       | Connector sync → search results reflect synced data | PrestaShop/Bitrix users |
| P1       | SCIM 2.0 provisioning → user/group sync             | Enterprise SSO          |
| P2       | Knowledge RAG → file upload → AI search             | Knowledge module        |
| P3       | Overage billing → soft cap → hard block             | Monetization            |
| P4       | Analytics export CSV/JSON → verify data integrity   | Data team               |
