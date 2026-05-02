# Load Testing & Performance Benchmarks

> `packages/loadtest/` — k6-based load testing suite for AACsearch.

## Prerequisites

- [k6](https://k6.io/docs/) v1.7+ installed (brew install k6 / apt install k6 / choco install k6)
- A running AACsearch instance (local dev or staging/production)
- A search-scoped API key (`ss_search_...`) for search and widget tests
- A connector-scoped API key (`ss_connector_...`) for ingest tests
- An existing index ID to target

## Quick Start

```bash
# 1. Set required env vars
export K6_API_KEY="ss_search_abc123..."
export K6_INDEX_ID="your-index-uuid"

# 2. Run search benchmark (1K RPS target)
k6 run -e API_KEY="$K6_API_KEY" -e INDEX_ID="$K6_INDEX_ID" scenarios/search-benchmark.js

# 3. Run ingest benchmark (100K docs/min target)
k6 run -e API_KEY="$K6_CONNECTOR_KEY" -e INDEX_ID="$K6_INDEX_ID" scenarios/ingest-benchmark.js

# 4. Run widget session simulation (500 concurrent users)
k6 run -e API_KEY="$K6_API_KEY" -e INDEX_ID="$K6_INDEX_ID" scenarios/widget-sessions.js
```

Or use the pnpm scripts for local dev defaults:

```bash
pnpm --filter @repo/loadtest search:local
pnpm --filter @repo/loadtest ingest:local
pnpm --filter @repo/loadtest widget:local
pnpm --filter @repo/loadtest all  # run sequentially
```

## Scenarios

### 1. Search Benchmark (`search-benchmark.js`)

**Target:** 1 000 requests/second, p99 < 100ms.

- Two concurrent scenarios:
    - **ramp_up**: ramps from 100 → 1 000 RPS over 2 min, sustains for 1 min
    - **stress**: constant 50 RPS throughout (background noise traffic)
- Queries: drawn from a 25-query pool (wildcards, common terms, UI labels)
- Think time: 50–200ms between requests

**Thresholds (fail = benchmark not passing):**
| Metric | Threshold |
|--------|-----------|
| p99 latency (ramp_up) | < 100ms |
| p95 latency (ramp_up) | < 50ms |
| Error rate | < 0.1% |
| Check pass rate | > 99% |

### 2. Ingest Benchmark (`ingest-benchmark.js`)

**Target:** 100 000 documents/minute (~1 670 docs/sec).

- Ramping rate from 200 → 1 700 docs/sec
- Each request batch-upserts 100 auto-generated documents
- Stages: 30s warm, 30s ramp, 60s sustain at target, 30s cooldown

**Thresholds:**
| Metric | Threshold |
|--------|-----------|
| p99 latency | < 5s |
| p95 latency | < 2s |
| Error rate | < 1% |
| Check pass rate | > 95% |

### 3. Widget Sessions (`widget-sessions.js`)

**Target:** 500 concurrent widget users, each performing 2–6 searches.

Simulates a full widget user flow:

1. Load widget script (`GET /api/widget/widget.js`)
2. Think time (1–3s)
3. Type 2–6 queries (mix of browse `"*"` and actual search terms)
4. Read results (300ms–3s think time between queries)

**Thresholds:**
| Metric | Threshold |
|--------|-----------|
| p99 latency (all) | < 200ms |
| p99 latency (browse) | < 150ms |
| p99 latency (search) | < 300ms |
| Error rate | < 0.1% |

## Environment Variables

| Variable        | Default                 | Required | Description                                |
| --------------- | ----------------------- | -------- | ------------------------------------------ |
| `BASE_URL`      | `http://localhost:3010` | No       | AACsearch SaaS base URL                    |
| `TYPESENSE_URL` | `http://localhost:8108` | No       | Typesense direct URL (ingest tests)        |
| `API_KEY`       | `""`                    | **Yes**  | Auth API key (scope depends on test type)  |
| `INDEX_ID`      | `""`                    | **Yes**  | Target index UUID                          |
| `INDEX_SLUG`    | `""`                    | No       | Target index slug (falls back to INDEX_ID) |

## CI Integration

The benchmark workflow (`.github/workflows/benchmark.yml`) runs load tests against staging:

- **Manual trigger:** `gh workflow run benchmark.yml -f scenario=search -f index_id=<uuid>`
- **Scheduled:** Runs nightly at 03:00 UTC against staging
- **Regression gate:** Fails if any p99 > baseline × 1.2

### Baselines

Baseline values are stored in `.baseline.env`. Update after a known-good deployment:

```bash
k6 run scenarios/search-benchmark.js --summary-export=/tmp/summary.json
jq '.metrics.http_req_duration.values."p(99)"' /tmp/summary.json
# Update .baseline.env with the new value
```

To analyze results locally:

```bash
k6 run scenarios/search-benchmark.js --summary-export=/tmp/summary.json
node lib/parse-results.js /tmp/summary.json
```

### GitHub Secrets Required

| Secret               | Description                          |
| -------------------- | ------------------------------------ |
| `LOADTEST_API_KEY`   | Search-scoped key for the test index |
| `LOADTEST_INDEX_ID`  | UUID of the index to benchmark       |
| `STAGING_URL`        | Staging deployment base URL          |

Add a step to the deploy workflow (optional, post-deploy performance gate):

```yaml
- name: Run performance benchmarks
  uses: ./.github/actions/k6-benchmark
  with:
    url: ${{ secrets.STAGING_URL }}
    api_key: ${{ secrets.LOADTEST_API_KEY }}
    index_id: ${{ secrets.LOADTEST_INDEX_ID }}
```

## Regression Detection

The regression gate is: **CI fails if p99 latency > baseline × 1.2**.

To establish a baseline, run the search benchmark against a known-good deployment and capture the p99:

```bash
k6 run scenarios/search-benchmark.js --out json=baseline.json
# Extract p99:
jq '.metrics.http_req_duration.values."p(99)"' baseline.json
```

Update baseline in a `.baseline.env` file:

```env
SEARCH_P99_BASELINE_MS=85
INGEST_P95_BASELINE_MS=1200
WIDGET_P99_BASELINE_MS=150
```
