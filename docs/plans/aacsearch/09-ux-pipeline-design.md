# 09 — Full UX/UI Design: Ingest Pipeline, Indexing & View/Search Pages

> **Read after [06-ui-pages.md](06-ui-pages.md) and [08-collections-docs-crud.md](08-collections-docs-crud.md).**
> Defines the complete user journey from data ingestion → indexing → search → analytics, with all dashboard pages and their data flow.

## 9.0 Three customer pipelines

```
                          ┌──────────────────────────┐
  DATA →  │    INGEST PIPELINE    │ → SEARCH → ANALYTICS
                          └──────────────────────────┘

Pipeline A: Connector (PrestaShop/Bitrix)
  CMS → Connector API → SearchIngestBuffer → Worker → Typesense

Pipeline B: Direct API
  SDK/curl → v1 REST API → SearchIngestBuffer → Worker → Typesense

Pipeline C: Manual / UI
  Dashboard "Upsert doc" → searchRouter.upsertDocument → Buffer → Worker
  CSV import → searchRouter.importDocuments → Buffer → Worker
```

Each pipeline feeds into the same **ingest buffer** and follows the same **DB-first** pattern (Invariant #2).

---

## 9.1 Information Architecture — Full Sidebar

```
Sidebar (apps/saas/modules/shared/components/NavBar.tsx)
│
├─ Workspace switcher          (supastarter OrganizationSelect)
│
├─ ▸ Start                     — Getting-started checklist (auto-hides when complete)
│
├─ Day-to-day
│   ├─ Overview                — KPI dashboard, recent activity, alerts
│   ├─ Search                  ───┐
│   │   ├─ Indexes                 │ TabGroup: Indexes | Playground | API Keys | Import Jobs | Widget
│   │   ├─ Playground             │
│   │   ├─ API Keys               │
│   │   ├─ Import Jobs            │
│   │   └─ Widget                 │
│   ├─ [indexSlug]/           ────┤ NEW: Collection detail — 5 tabs: Overview | Schema | Documents | API | Settings
│   ├─ Analytics               — Searches / Zero-results / Top queries / CTR / Charts
│   ├─ Relevance               — Synonyms | Curations | Stopwords | Presets | Ranking weights
│   └─ Connectors              — PrestaShop / Bitrix / Direct-API + Sync jobs + Diagnostics
│
├─ ⊙ Notification center       (bell icon with badge)
│
└─ Settings & Admin
    ├─ Organization settings   — General | Members | Billing (with plan + wallet)
    ├─ Account settings        — General | Security | Notifications | AI Credits
    └─ Admin                   — Users | Orgs | Config | Security | Integrations | Audit | Wallet | Jobs | Notifications
```

**Key changes from current state:**

- Search page → TabGroup (Indexes, Playground, API Keys, Import Jobs, Widget) — no more separate routes
- NEW: `[indexSlug]/` collection detail route
- Start auto-hides when all 6 steps complete
- All routes use DashboardPage layout helper for consistent spacing

---

## 9.2 Ingest Pipeline — Full Visibility

### 9.2.1 Pipeline architecture (what user sees)

```
┌────────────────────────────────────────────────────────────┐
│                    INGEST PIPELINE STATUS                    │
│                                                             │
│  [CMS] ──POST──→ [Connector API] ──enqueue──→ [Buffer]      │
│                   gateway.ts         3,245 docs queued       │
│                       │                     │                │
│                       │                     ▼                │
│                       │              [Worker]                │
│                       │          processing: 12/s            │
│                       │                     │                │
│                       ▼                     ▼                │
│  [Typesense] ←──bulkUpsert── [Success: 3,210]                │
│               ←──retry────── [Failures: 35, auto-retrying]    │
└────────────────────────────────────────────────────────────┘
```

### 9.2.2 Pipeline visualization (NEW — ImportJobsPanel upgrade)

Current `ImportJobsPanel.tsx` (137 LOC) shows a flat list. Upgrade to:

```
┌───────────────────────────────────────────────────────────┐
│ Import Pipeline                        [Last 24h ▾] [↻]  │
├───────────────────────────────────────────────────────────┤
│ ┌─ Statistics bar ───────────────────────────────────────┐│
│ │  ████████████████████████████████████░░░  92% success  ││
│ │  3,245 indexed  ·  35 failed (retrying)  ·  0 pending  ││
│ └────────────────────────────────────────────────────────┘│
│                                                           │
│ ┌─ Timeline ─────────────────────────────────────────────┐│
│ │ ● 14:32:15  Full sync complete    3,210 docs   ✓ 12s  ││
│ │ ● 14:32:12  Δ 5 new products      5 docs       ✓ 0.3s ││
│ │ ● 14:30:00  ↻ Retry batch #3      12 docs      ⏳ 3s  ││
│ │ ● 14:29:45  ✗ Batch #3 failed     12 docs      ⚠      ││
│ │ ● 14:20:00  Full sync started                 🔄      ││
│ └────────────────────────────────────────────────────────┘│
│                                                           │
│ ┌─ Retry queue (collapsible) ────────────────────────────┐│
│ │  3 batches queued for retry  [Retry all]  [Clear]      ││
│ │  ├─ Batch #4: 8 docs, next retry at 14:35:00           ││
│ │  ├─ Batch #7: 15 docs, next retry at 14:37:00          ││
│ │  └─ Batch #9: 12 docs, next retry at 14:39:00          ││
│ └────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

### 9.2.3 Connector health panel (NEW — DashboardOverview)

```
┌─ Connector Health ───────────────────────────────────────┐
│  PrestaShop  ● Green  Last heartbeat: 2 min ago  [Detail]│
│  Bitrix      ○ Grey  Not connected               [Setup] │
│  Direct API  ● Green  Last sync: 1h ago          [Detail]│
└──────────────────────────────────────────────────────────┘
```

### 9.2.4 Import job detail drawer (NEW)

When clicking a job row:

```
┌──────────────────────────────────────────────────────────┐
│  Job #sync_20260430_144200                               │
│  Type: full_sync  ·  Status: completed  ·  3,210 docs   │
├──────────────────────────────────────────────────────────┤
│  ┌─ Progress ──────────────────────────────────────────┐ │
│  │  ████████████████████████████████████████████████ 100%│ │
│  │  Started: 14:20:00  ·  Duration: 12m 15s            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Events (56) ───────────────────────────────────────┐ │
│  │  ✅  14:32:15  bulkUpsert batch #12:   497 docs    │ │
│  │  ✅  14:32:12  bulkUpsert batch #11:   503 docs    │ │
│  │  ⚠️  14:32:10  bulkUpsert batch #10:   1/500 fail │ │
│  │  ...                                                │ │
│  │  [Show all 56 events ▾]                            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Diagnostics ───────────────────────────────────────┐ │
│  │  Connector API: 200 OK at 14:20:00                  │ │
│  │  Typesense: 200 OK throughout                       │ │
│  │  Avg latency: 45ms per batch                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                    [Re-run sync] [Download log]          │
└──────────────────────────────────────────────────────────┘
```

### 9.2.5 Data deps for pipeline UI

| Procedure                              | Status    | Purpose                                                     |
| -------------------------------------- | --------- | ----------------------------------------------------------- |
| `searchRouter.usage`                   | ✅ exists | Event counts, success/failure rates                         |
| `searchRouter.importJobs`              | ✅ exists | Job history list                                            |
| `searchRouter.listConnectorSyncJobs`   | ✅ exists | Sync jobs from in-memory store                              |
| NEW: `searchRouter.pipelineStatus`     | ❌ add    | Real-time buffer depth, worker throughput, retry queue size |
| NEW: `searchRouter.retryFailedBatches` | ❌ add    | Manual retry trigger                                        |

---

## 9.3 Indexing — Schema + Document Management

### 9.3.1 Collection detail route: `[organizationSlug]/search/[indexSlug]/`

5 tabs in `TabGroup`. URL state: `?tab=overview|schema|documents|settings|api`.

#### TAB 1: Overview (default)

```
┌─ Collection Overview ────────────────────────────────────┐
│  Running shoes (products)    ● Active    v3    #1234     │
├──────────────────────────────────────────────────────────┤
│  ┌─ Stats row ─────────────────────────────────────────┐ │
│  │  📄 12,304 docs  │  ⚡ 45k searches/mo  │  🗄️ 3.2MB│ │
│  │  Last reindex: 2d ago  │  Created: 14 Apr 2026     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Recent activity (last 24h) ────────────────────────┐ │
│  │  🔄 14:30  Sync completed    3,210 docs  ✓          │ │
│  │  🔍 14:25  1,245 searches    avg 23ms               │ │
│  │  📝 13:00  Schema updated    +field 'color'          │ │
│  │  🔑 11:00  API key generated "storefront-widget"     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Schema summary ────────────────────────────────────┐ │
│  │  Fields: title(s), price(f), brand(f), ... 10 total │ │
│  │  Default sort: _text_match  ·  Searchable: 4 fields │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### TAB 2: Schema (spreadsheet-grade)

Per `08-collections-docs-crud.md §8.4`:

```
┌────────────────────────────────────────────────────────────┐
│ [+ Add field]            [Import JSON] [Export] [Preview]  │
├────────────────────────────────────────────────────────────┤
│ ⠿ id           string    [pk] [auto]                   ⚙ ⋯ │
│ ⠿ title*       string    [search] [req]                ⚙ ⋯ │
│ ⠿ sku          string    [search]  filter               ⚙ ⋯ │
│ ⠿ price        float     [filter]  sort                 ⚙ ⋯ │
│ ⠿ brand        string    [facet]   filter               ⚙ ⋯ │
│ ⠿ in_stock     bool      [filter]                        ⚙ ⋯ │
│ ⠿ tags         string[]  [facet]                         ⚙ ⋯ │
│ ⠿ description  string    [search]                        ⚙ ⋯ │
│ ⠿ image_url    string                                    ⚙ ⋯ │
│ ⠿ created_at   int64     [sort]                          ⚙ ⋯ │
├────────────────────────────────────────────────────────────┤
│ Default sort: [_text_match ▾]                    [↻ Reindex]│
└────────────────────────────────────────────────────────────┘
```

**Features:**

- Drag-to-reorder fields (dnd-kit)
- Click type → popover with 13 Typesense types
- Toggle badges inline
- ⚙ → Sheet with defaults, validators, locale settings
- Preview diff dialog before saving on populated indexes
- "Save + reindex now" or "Save schema only"

#### TAB 3: Documents (spreadsheet-grade)

Per `08-collections-docs-crud.md §8.5`:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 [Search docs...        ⏎] [+ Filter]  [Columns ▾] [▦ Density]│
├──────────────────────────────────────────────────────────────────┤
│ ☐  id  │  title       │  brand │  price │  in_stock │  updated   │
├───────┼──────────────┼────────┼────────┼──────────┼────────────┤
│ ☑  1  │ Running shoes│ Nike   │  8990  │  ✓       │  2 min ago │
│ ☐  2  │ Sandals      │ Adidas │  3490  │          │  1h ago    │
│ ☐  3  │ Hat          │ Nike   │  1990  │  ✓       │  1d ago    │
├──────────────────────────────────────────────────────────────────┤
│ Showing 1–50 of 12,304  [<] [1] [2] [3] ... [247] [>]  │ 3 sel  │
└──────────────────────────────────────────────────────────────────┘
```

**When rows selected, action bar slides in:**

```
┌─ 3 selected ──────────────────────────────────────────────────┐
│ [Edit] [Duplicate] [Delete] [Export CSV] [Reindex selected]   │
└────────────────────────────────────────────────────────────────┘
```

**Edit panel (slides from right or inline):**

```
┌─ Edit Document #1 ──────────────────────────────────────────┐
│ title:    Running Shoes Pro            [string]              │
│ sku:      NIKE-RS-2026-PRO             [string]              │
│ price:    12990                         [float]              │
│ brand:    Nike                          [string]             │
│ in_stock: ✓ [toggle]                                        │
│ tags:     ["featured","best-seller"]    [string[]]           │
│ description: [textarea]                                      │
├──────────────────────────────────────────────────────────────┤
│  [Cancel]  [Save & next]  [Save]                             │
└──────────────────────────────────────────────────────────────┘
```

#### TAB 4: API (curl examples + scoped tokens for this index)

```
┌─ API Access ────────────────────────────────────────────────┐
│  Index slug: products                                       │
│                                                             │
│  ┌─ Code snippets ────────────────────────────────────────┐ │
│  │  tab: [curl] [JavaScript] [Python] [PHP]               │ │
│  │                                                         │ │
│  │  curl -X POST https://api.aacsearch.com/search/public/  │ │
│  │    products \\                                          │ │
│  │    -H "Authorization: Bearer ss_search_xxx****" \\     │ │
│  │    -H "Content-Type: application/json" \\               │ │
│  │    -d '{"q":"running shoes","queryBy":"title,sku"}'    │ │
│  │                                                         │ │
│  │  [Copy] [Copy with real key (reveal once)]              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Scoped tokens for this index ─────────────────────────┐ │
│  │  [Generate scoped token for this index]                 │ │
│  │  Name  │  Prefix  │  Expires  │  Scopes    │  Actions   │ │
│  │  ...                                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### TAB 5: Settings

```
┌─ Index Settings ───────────────────────────────────────────┐
│  Display name:  [Products catalog              ]           │
│  Slug:          products                                   │
│  Default sort:  [_text_match ▾]                            │
│  Searchable fields: title(s) · sku(s) · brand · descr...  │
│  Allowed origins: [*.mystore.com  ✓] [+ Add origin]       │
│                                                             │
│  ┌─ Danger Zone ─────────────────────────────────────────┐ │
│  │  [Reindex] [Duplicate collection] [Delete collection] │ │
│  │  Delete: requires typing collection name to confirm   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 9.3.2 Data deps for Index management

| Procedure                               | Status    | Purpose                           |
| --------------------------------------- | --------- | --------------------------------- |
| `searchRouter.listIndexes`              | ✅ exists | Index list                        |
| `searchRouter.createIndex`              | ✅ exists | Create index dialog               |
| `searchRouter.reindex`                  | ✅ exists | Reindex trigger                   |
| `searchRouter.upsertDocument`           | ✅ exists | Single doc upsert                 |
| `searchRouter.importDocuments`          | ✅ exists | Bulk import                       |
| `searchRouter.usage`                    | ✅ exists | Usage stats                       |
| NEW: `searchRouter.getSchema`           | ❌ add    | Get current schema from Typesense |
| NEW: `searchRouter.updateSchema`        | ❌ add    | Update schema fields              |
| NEW: `searchRouter.listDocuments`       | ❌ add    | Paginated doc list + search       |
| NEW: `searchRouter.bulkDeleteDocuments` | ❌ add    | Bulk delete by IDs                |
| NEW: `searchRouter.getIndexAnalytics`   | ❌ add    | Per-index analytics               |
| NEW: `searchRouter.setDefaultSort`      | ❌ add    | Update default sort               |
| NEW: `searchRouter.setAllowedOrigins`   | ❌ add    | Update allowed origins            |

---

## 9.4 View / Search — Preview, Analytics, Relevance

### 9.4.1 Search → Playground (tab 2 in Search TabGroup)

```
┌─ Index: [products ▾] ────────────────────────────────────┐
│                                                            │
│  🔍 [running shoes                          ] [Search ⏎] │
│                                                            │
│  ┌─ Advanced (collapsible) ──────────────────────────────┐ │
│  │  query_by: [title^3,sku^2,brand^1,description     ▾] │ │
│  │  filter_by: [in_stock:=true && price:>1000        ▾] │ │
│  │  sort_by:   [_text_match ▾]                          │ │
│  │  per_page:  [20 ▾]  page: [1]                        │ │
│  │  🔍 [Highlight fields]   [Facet: brand,price_range]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  Results: 45 hits in 12ms                                  │
│  ┌─ Tabs ───────────────────────────────────────────────┐ │
│  │  [Hits] [Facets] [Raw JSON]                           │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  ★  Running Shoes Pro          Nike · 12,990 ₽       │ │
│  │     ...best <mark>running</mark> <mark>shoes</mark>   │ │
│  │     for marathon training...                          │ │
│  │     [→ Details]                                       │ │
│  │  ★  Trail Running Shoes        Nike · 14,990 ₽       │ │
│  │     ★  Running Socks           Adidas · 1,990 ₽      │ │
│  │     ...                                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ curl snippet ───────────────────────────────────────┐ │
│  │  curl ... -d '{"q":"running shoes"}'                  │ │
│  │  [Copy] [Copy with key]                               │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**UX touches:**

- Debounced auto-run (700ms) or manual with Cmd+Enter
- Last query persisted in localStorage per index
- facet counts as Badge groups
- Curl snippet masked by default

### 9.4.2 Search → API Keys (tab 3)

```
┌─ API Keys ────────────────────────────────────────────────┐
│  [Create API Key]  [Create Scoped Token]                   │
│                                                            │
│  Index: [All indexes ▾]                                    │
│                                                            │
│  Name         │  Prefix      │  Scopes   │  Last used  │  Actions │
│  Storefront   │  ss_search_  │  read     │  2 min ago  │  Revoke  │
│  Admin        │  ss_search_  │  read+write│ 1h ago     │  Revoke  │
│  PrestaShop   │  ss_conn_    │  conn_wr  │  5 min ago  │  Revoke  │
│  ...                                                      │
│                                                            │
│  ┌─ Scoped Tokens (HMAC, stateless) ────────────────────┐ │
│  │  Issued in this session:                              │ │
│  │  Name      │  Expires       │  Filter       │  Remove │ │
│  │  RU store  │  30 Apr 2026   │  locale:=ru   │  [x]   │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 9.4.3 Search → Widget (tab 5)

```
┌─ Widget Configuration ────────────────────────────────────┐
│  Index: [products ▾]                                       │
│                                                            │
│  ┌─ Appearance ──────────────────────────────────────────┐ │
│  │  Theme: [Light ▾]  Mode: [Overlay ▾]  Locale: [auto] │ │
│  │  Placeholder: [Search products...              ]      │ │
│  │  Items per page: [12 ▾]                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Install snippet ────────────────────────────────────┐ │
│  │  Copy this code and paste it before the </head> tag  │ │
│  │  on your storefront:                                  │ │
│  │                                                       │ │
│  │  <script                                                │ │
│  │    src="https://your-app.com/api/widget/widget.js"      │ │
│  │    data-project="products"                              │ │
│  │    data-key="ss_search_xxxx"                           │ │
│  │    data-locale="auto"                                  │ │
│  │  ></script>                                            │ │
│  │                                                       │ │
│  │  [Copy snippet]  [Copy with real key (once)]         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Live Preview ───────────────────────────────────────┐ │
│  │  [🔍 Search products...                   ]          │ │
│  │  ┌────────────────────────────────────────────┐     │ │
│  │  │  Product 1  │  Product 2  │  Product 3     │     │ │
│  │  │  ...         │  ...        │  ...            │     │ │
│  │  └────────────────────────────────────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 9.4.4 Analytics Page

Current `SearchAnalyticsCards.tsx` (176 LOC) — upgrade per phased plan:

**Phase A (now — using existing `searchRouter.usage` data):**

```
┌─ Analytics ──────────────────────────── [24h ▾] ──────────┐
│                                                            │
│  ┌─ KPI row ────────────────────────────────────────────┐ │
│  │  📊 45,234      │  📈 +12% vs yesterday  │           │ │
│  │  Total searches  │  Trend: up             │           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Chart ──────────────────────────────────────────────┐ │
│  │  Searches over time (sparkline)                       │ │
│  │  ▁▃▅▇▆▄▃▅▇▆▅▃▁▂▄▅▇▆▄▃▂▁▃▅▇▆▅▄▃▂▁▃▅                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Top 10 queries ────────────────────────────────────┐ │
│  │  #  Query             │  Count  │  % of total        │ │
│  │  1  running shoes     │  1,245  │  2.7%              │ │
│  │  2  nike              │  987    │  2.2%              │ │
│  │  3  iphone case       │  654    │  1.4%              │ │
│  │  ...                                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Callout ────────────────────────────────────────────┐ │
│  │  📡 Set up event tracking to see CTR, zero-results,  │ │
│  │  click-through rates. [Learn more →]                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Phase B (after AnalyticsEvent capture):** Add CTR, sessions, zero-result rate, funnel chart, click heatmap.

### 9.4.5 Relevance Page

Current `RelevanceTabs.tsx` (60 LOC stub) + `SynonymsPanel.tsx` + `CurationsPanel.tsx`.

**Full design with 5 sub-tabs:**

```
┌─ Relevance ──────────────────── Index: [products ▾] ─────┐
│                                                            │
│  ┌─ Live preview bar (always visible) ──────────────────┐ │
│  │  🔍 [Test your changes: type a query...         ] ⏎  │ │
│  │  Running shoes → 45 hits  (avg 12ms)                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  TabGroup: [Synonyms] [Curations] [Stopwords] [Presets] [Ranking] │
│                                                            │
│  ─── SYNONYMS TAB ────────────────────────────────────── │
│  [+ Add synonym set]                                       │
│  Filter: [Search synonyms...        ]                      │
│                                                            │
│  Bidirectional ─────────────────────────────────────────  │
│  │  iphone  ↔  айфон     "active since 20 Apr"  [Edit][x]│
│  │  sneakers  ↔  running shoes     locale:en    [Edit][x]│
│                                                            │
│  One-way ───────────────────────────────────────────────  │
│  │  mobile → cellphone                         [Edit][x] │
│                                                            │
│  ─── CURATIONS TAB ───────────────────────────────────── │
│  [+ Add curation]                                          │
│  │  Trigger: "phone" (exact)                               │
│  │  Pinned: iPhone 15 Pro, Samsung Galaxy S25              │
│  │  Hidden: iPhone 8                                      │
│  │  [Edit] [Test] [Delete]                                 │
│                                                            │
│  ─── STOPWORDS TAB ───────────────────────────────────── │
│  Language: [Russian ▾]                                     │
│  ["и", "в", "на", "с", "по", "для", "а", "но"]            │
│  [+ Add stopword]  [Import list]                           │
│                                                            │
│  ─── PRESETS TAB ─────────────────────────────────────── │
│  [+ Create preset]                                         │
│  │  "In stock products": query_by=title^3, filter=in_stock │
│  │  "Cheapest first": sort_by=price:asc                    │
│                                                            │
│  ─── RANKING TAB ─────────────────────────────────────── │
│  Searchable fields weights:                                │
│  │  title:       ████████████░░  10/10   (default: 10)   │ │
│  │  sku:         ████████░░░░░░   8/10   (default: 8)    │ │
│  │  brand:       ██████░░░░░░░░   6/10   (default: 6)    │ │
│  │  description: ████░░░░░░░░░░   4/10   (default: 4)    │ │
│  │                                                        │ │
│  │  Default sort: [_text_match ▾]                        │ │
│  │  [Save weights → triggers reindex if changed]         │ │
└────────────────────────────────────────────────────────────┘
```

---

## 9.5 Overview Page — Full KPI Dashboard

Current `DashboardOverview.tsx` (241 LOC) — upgrade:

```
┌─ Overview ────────────────────────────── [7d ▾] [↻] ────┐
│                                                            │
│  ┌─ Plan banner ────────────────────────────────────────┐ │
│  │  🚀 Free Plan · 45% of 1k searches used · 3 of 500 │ │
│  │  documents  [Upgrade →]                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ KPI row (4 cols → 2 cols → 1 col on mobile) ───────┐ │
│  │  📊 45,234      │  📄 12,304    │  ⚡ 45% quota   │ │ │
│  │  Total searches  │  Documents    │  Search usage   │ │ │
│  │  ↑ 12% vs prev  │  ↑ 3.2%      │  🔴 >80% = amber│ │ │
│  │                  │              │                  │ │ │
│  │  ❌ 2 failed sync│  Recent      │                  │ │ │
│  │  Failed jobs     │  activity    │                  │ │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Quick actions ──────────────────────────────────────┐ │
│  │  [Create index] [Add connector] [View analytics]     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Searches over time ─────────────────────────────────┐ │
│  │  ▁▃▅▇▆▄▃▅▇▆▅▃▁▂▄▅▇▆▄▃▂▁▃▅▇▆▅▄▃▂ (sparkline chart)      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Top 10 Queries ─────────┬─ Connector Health ────────┐ │
│  │  1. running shoes  1,245  │  PrestaShop  ● Green     │ │
│  │  2. nike            987   │  Bitrix      ○ No setup  │ │
│  │  3. iphone case     654   │                           │ │
│  │  [View all →]             │  [Manage connectors →]   │ │
│  └───────────────────────────┴───────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 9.6 Getting Started Checklist

Current `GettingStarted.tsx` (262 LOC). Steps (gated derivation — no DB writes):

```
┌─ Getting Started ────────────────────────────────────────┐
│  ████████████░░░░░░░░  3/6 complete     [Skip to dashboard]│
│                                                            │
│  1. ✅  Create your first index                            │
│       → [Create index]                                     │
│                                                            │
│  2. ✅  Connect a source                                   │
│       → [Add connector]                                    │
│                                                            │
│  3. 🔄  Run first sync                                     │
│       → [Run sync]                                         │
│                                                            │
│  4. ⏳  Test search in Playground                           │
│       → [Try search]                                       │
│                                                            │
│  5. ⏳  Generate API key                                    │
│       → [Create key]                                       │
│                                                            │
│  6. ⏳  Embed widget on your site                           │
│       → [Copy snippet]                                     │
│                                                            │
│  Each step has status: pending | in_progress | complete    │
│  Auto-hides from sidebar when all 6 complete.              │
└────────────────────────────────────────────────────────────┘
```

---

## 9.7 Connectors Page

Current `ConnectorsPage.tsx` (261 LOC) + `ConnectorWizard.tsx` (436 LOC). Upgrade:

```
┌─ Connectors ─────────────────────────────────────────────┐
│                                                            │
│  ┌─ Connection cards (3 cols) ──────────────────────────┐ │
│  │  ┌── PrestaShop ──┐  ┌── Bitrix ───────┐  ┌── API ─┐│
│  │  │  ● Connected    │  │  ○ Not set up   │  │  SDK   ││
│  │  │  Last sync:     │  │  [Setup →]      │  │  docs  ││
│  │  │  2 min ago      │  │                 │  │  [API] ││
│  │  │  [Manage]       │  │                 │  │        ││
│  │  └────────────────┘  └────────────────┘  └─────────┘│
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Active connectors (table) ──────────────────────────┐ │
│  │  Type    │  Status     │  Last Heartbeat │  Actions   │ │
│  │  Presta  │  ● Green    │  2 min ago      │  [Sync]    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Sync Jobs ──────────────────────────────────────────┐ │
│  │  Job ID    │  Type   │  Status     │  Items  │  Time │ │
│  │  sync_001  │  full   │  ✅ Done    │  3,210  │  12m  │ │
│  │  sync_002  │  delta  │  ✅ Done    │  5      │  0.3s │ │
│  │  sync_003  │  delta  │  ❌ Failed  │  0      │  —    │ │
│  │              [Retry] [View detail →]                   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 9.8 Admin Pages

### Admin Dashboard (root — `/admin`)

```
┌─ Admin Dashboard ────────────────────────────────────────┐
│  ┌─ Platform Overview ─────────────────────────────────┐ │
│  │  👥 245 users  │  🏢 189 orgs  │  📄 1.2M docs    │ │
│  │  💰 $12,450 MRR │  ⚡ 890k searches/mo            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Quick links ────────────────────────────────────────┐ │
│  │  [Users] [Organizations] [Config] [Security]         │ │
│  │  [Integrations] [Audit] [Wallet] [Jobs]              │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Admin pages (each with specific operational purpose):

| Page                   | Content                                         | Action                       |
| ---------------------- | ----------------------------------------------- | ---------------------------- |
| `/admin/users`         | Search users, impersonate, see plans            | 🔍 Look up customer          |
| `/admin/organizations` | Orgs list: plan, usage, status, last activity   | 🔗 Deep-link to org overview |
| `/admin/config`        | Feature flags, default plan, kill-switches      | Toggle on/off                |
| `/admin/security`      | Recent token issuances, suspicious patterns     | 👁 Review                    |
| `/admin/integrations`  | Tochka health, Typesense health, webhook status | ✅ Healthy / ❌ Failed       |
| `/admin/audit`         | Append-only log (in-memory for now)             | 📋 View                      |
| `/admin/wallet`        | Wallet ops: reconciliation, refunds, top-up     | 💰 Manual adjust             |
| `/admin/jobs`          | Cross-org sync jobs                             | 🔍 Monitor                   |
| `/admin/notifications` | System broadcast (maintenance window)           | 📢 Send                      |

---

## 9.9 New oRPC Procedures Summary

| Procedure                          | Priority | DB Change? | Purpose                                   |
| ---------------------------------- | -------- | ---------- | ----------------------------------------- |
| `searchRouter.onboardingStatus`    | P0       | No         | Gated getting-started steps               |
| `searchRouter.pipelineStatus`      | P0       | No         | Real-time buffer depth, worker throughput |
| `searchRouter.retryFailedBatches`  | P0       | No         | Manual retry trigger                      |
| `searchRouter.getSchema`           | P1       | No         | Read schema from Typesense                |
| `searchRouter.updateSchema`        | P1       | No         | Update schema fields                      |
| `searchRouter.listDocuments`       | P1       | No         | Paginated doc list from Typesense         |
| `searchRouter.bulkDeleteDocuments` | P1       | No         | Bulk delete by IDs                        |
| `searchRouter.getIndexAnalytics`   | P1       | No         | Per-index analytics                       |
| `searchRouter.getSynonyms`         | P1       | No         | Read synonyms from Typesense              |
| `searchRouter.setSynonyms`         | P1       | No         | Write synonyms to Typesense               |
| `searchRouter.getCurations`        | P1       | No         | Read curations from Typesense             |
| `searchRouter.setCurations`        | P1       | No         | Write curations to Typesense              |
| `searchRouter.getStopwords`        | P2       | No         | Read stopwords from Typesense             |
| `searchRouter.setStopwords`        | P2       | No         | Write stopwords to Typesense              |
| `searchRouter.getRankingWeights`   | P2       | Yes?       | Get/set field weights                     |
| `searchRouter.setRankingWeights`   | P2       | Yes?       | Requires additive schema change           |
| `searchRouter.setDefaultSort`      | P1       | No         | Update SearchIndex.defaultSortingField    |
| `searchRouter.setAllowedOrigins`   | P1       | No         | Update origin allow-list                  |
| `searchRouter.recentActivity`      | P1       | No         | Activity feed for Overview                |

---

## 9.10 New npm Packages Required

Per `08-collections-docs-crud.md §8.1`:

| Package                               | Size     | Why                                               | When     |
| ------------------------------------- | -------- | ------------------------------------------------- | -------- |
| `@tanstack/react-table`               | ~12kb gz | Headless table (sort, filter, pagination, select) | Sprint A |
| `@tanstack/react-virtual`             | ~3kb gz  | Row virtualization for documents tab              | Sprint A |
| `papaparse`                           | ~13kb gz | CSV import for documents                          | Sprint A |
| `@dnd-kit/core` + `@dnd-kit/sortable` | ~10kb gz | Drag-reorder schema fields                        | Sprint B |

Total: ~38kb gz, code-split to Documents tab only.

---

## 9.11 Implementation Sequence (Sprints A→E)

```
Sprint A — Pipeline & Documents (P0)
  1. searchRouter.pipelineStatus — real-time buffer/worker status
  2. ImportJobsPanel upgrade — timeline + retry queue visualization
  3. searchRouter.listDocuments — paginated doc list from Typesense
  4. Install @tanstack/react-table + react-virtual + papaparse
  5. Documents tab (collection detail) — spreadsheet-grade table
  6. Bulk actions (edit, duplicate, delete, export CSV)

Sprint B — Schema Editor (P0/P1)
  7. searchRouter.getSchema + updateSchema
  8. Install @dnd-kit for drag-reorder
  9. Schema tab — structured field editor with diff preview
  10. "Save + reindex" and "Save schema only" flow
  11. Import/export schema JSON

Sprint C — Relevance (P1)
  12. searchRouter.{get,set}Synonyms + {get,set}Curations
  13. RelevancePreviewBar (mini playground)
  14. Synonyms tab — port from AACSearchGen pattern
  15. Curations tab — port from AACSearchGen pattern
  16. Stopwords tab — Typesense endpoint
  17. Ranking weights tab (if user approves additive schema)

Sprint D — Relevance Phase 2 + Polish (P1/P2)
  18. Presets tab (saved query templates)
  19. searchRouter.recentActivity — activity feed
  20. ActivityFeed component — Overview page upgrade
  21. Collection detail tabs: API, Settings, Overview

Sprint E — Mobile + Admin + Polish
  22. Mobile responsive: Playground bottom-sheet, Connectors cards
  23. Admin pages fill (operational purpose per §9.8)
  24. DashboardPage layout helper (consistent spacing)
  25. Auto-hide Start from sidebar when complete
  26. Cross-route approaching-limit banner
```
