# 06 — UI Pages: SaaS dashboard sitemap & UX blueprints

> **Read after [02-architecture.md](02-architecture.md).** Designs each page in the SaaS dashboard sidebar at `http://localhost:3000/`. Every block must compose from existing primitives — see [Hard Invariant #12](../../../.claude/skills/supastarter-nextjs-skill/SKILL.md) layered ranking.

## 6.0 Customer mental model — what each visitor wants

Three customer profiles drive every UX decision:

| Profile            | What they came to do                                                                         | Time-to-value bar |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------------- |
| **Shop owner**     | Install module in PrestaShop/Bitrix → see products in widget on storefront → tweak relevance | < 30 min          |
| **SaaS dev**       | Push docs via SDK → embed widget OR call search API directly → check usage / quota           | < 15 min          |
| **Platform admin** | Manage members, audit access, watch incidents, debug a customer issue                        | as-needed         |

A successful day-1 looks like: **Sign up → Start checklist → Connect a source → See first products indexed → Test search → Embed widget**. Every page below either advances that flow or supports day-2+ operations.

## 6.1 Sidebar information architecture

Render order in `NavBar.tsx`. Top group = day-to-day work; bottom group = settings.

```
Sidebar (apps/saas/modules/shared/components/NavBar.tsx)
│
├─ Workspace switcher          (existing OrganizationSelect)
│
├─ Day-to-day work
│   ├─ ▶ Start                 — onboarding checklist (visible only while incomplete)
│   ├─ Overview                — KPI dashboard, recent activity, alerts
│   ├─ Search
│   │     ├─ Indexes           ← current "Search" page panels
│   │     ├─ Playground        ← "preview" route (rename in nav)
│   │     ├─ API keys          ← "api-keys" route
│   │     └─ Import jobs       ← "import-jobs" route
│   ├─ Analytics               — search/click/zero-results dashboards
│   ├─ Relevance               — synonyms / curations / ranking weights
│   └─ Connectors              — PrestaShop / Bitrix / Direct-API setup + diagnostics
│
├─ Notification center         (existing component, badge in NavBar)
│
└─ Settings & admin (footer cluster)
    ├─ Organization settings   ← settings/{general,members,billing}
    ├─ Account settings        ← /settings/{general,security,notifications,billing}
    └─ Admin                   ← /admin/* (visible only to platform admins)
```

### Why "Start" disappears once done

After a customer has at least 1 connected source + 1 successful sync + widget snippet copied, "Start" auto-hides from the sidebar (or moves to a "Re-run setup" item under Account → Help). Eliminates noise for power users.

### Collapsed-sidebar behavior

`NavBar.tsx` already supports collapsed mode (icon-only with tooltips, `Search` parent dropdown when active sub-item exists). New sub-items must register icon + tooltip — see existing `NavMenuItem` interface.

### Mobile

Sheet pattern from existing NavBar (`SheetTrigger` + `SheetContent`). All pages must be usable on phone — not in horizontal scroll, not fixed-width tables.

---

## 6.2 Page blueprints

Each blueprint follows the same template:

- **Route**: file path under `apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/`
- **Customer goal**: one-sentence job-to-be-done
- **Top-line metric** (if any) — what a visitor sees first
- **Layout**: PageHeader + sections (composed from shared/ui)
- **Blocks**: existing shared components and what to add
- **Data deps**: oRPC procedures (existing or to add)
- **Empty / Loading / Error states**
- **Edge cases**
- **DB-frozen workaround** (if needed)
- **DoD**: how to know it's customer-ready

### 6.2.1 Start — Getting-started checklist

- **Route**: `[organizationSlug]/start/page.tsx` (NEW route; auto-redirect to `/overview` once all steps complete)
- **Customer goal**: «I just signed up — what do I do first to get search on my site within 30 minutes?»
- **Top-line metric**: progress bar `n / 6 steps complete`
- **Layout**: `PageHeader` with title + subtitle → vertical step list → "Skip to dashboard" link

#### Blocks (compose, don't reinvent)

```
PageHeader                           ✅ shared/components/PageHeader
ProgressBar                          ✅ packages/ui/components/progress
StepCard (NEW — feature-block):     compose from
  ├─ Card                            ✅ packages/ui/components/card
  ├─ Badge (status: pending/done)   ✅ packages/ui/components/badge
  ├─ CheckCircle / Circle icons      lucide-react (already used)
  └─ Button (primary action)         ✅ packages/ui/components/button
ConfirmationAlertProvider           ✅ shared/components for "skip step" confirms
```

#### The 6 steps (gated derivation — no DB writes)

1. **Create your first index** — done if `searchRouter.listIndexes` returns ≥ 1 row.
2. **Connect a source** — done if Connector token exists (`SearchApiKey.scopes` includes `connector_write`) OR an index has documents (count > 0 via Typesense `aliasName` lookup).
3. **Run first sync** — done if `searchRouter.usage` shows ≥ 1 ingest event in last 24h.
4. **Test search in Playground** — done if any `search` event recorded for this org. _(Gracefully degrades: if no analytics capture yet, mark "complete" once 1 search exists in usage stats.)_
5. **Generate widget snippet** — done if at least 1 `ss_search_*` token exists.
6. **Embed widget on your site** — manual confirm via "I embedded it" button (no way to verify server-side without a public crawl).

Each step is a `StepCard`; primary action button → corresponding deep link. Steps are read-only (gated derivation), `done?` flag computed server-side in a single oRPC procedure.

#### Data deps

- `entitlementsRouter.plan({ organizationId })` — for plan name + limits in step 1 helper text ("Free plan: 1 index").
- New oRPC: `searchRouter.onboardingStatus({ organizationId })` — single procedure that returns `{ steps: { id: string, done: boolean }[] }`. **Read-only**, derives from existing tables (no new DB).

#### Empty / Error states

- New customer never returns "empty" (always 6 steps shown, all `pending`).
- If a step's data fetch fails: show neutral "Status unknown — refresh" with retry button. **Don't** block the whole checklist on one failed step.

#### DB-frozen workaround

Pure derivation; no `OnboardingProgress` table. Step 6 ("embedded widget") manual click sets a per-user `localStorage` flag — acceptable since it's a self-attestation, not authoritative.

#### DoD

- ✅ Brand-new account renders 6 cards with `pending` badge.
- ✅ Creating an index flips step 1 to `done` on next visit (no manual refresh required after action — invalidate query).
- ✅ "Skip to dashboard" link works without persisting any "skipped" state.
- ✅ All 5 locales translated.
- ✅ Mobile: each StepCard ≥ 56px tall, primary button full-width on `<sm`.

---

### 6.2.2 Overview — Day-2 KPI dashboard

- **Route**: `[organizationSlug]/overview/page.tsx` ✅ exists (likely stub — verify before extending)
- **Customer goal**: «Is my search healthy today? What changed since yesterday?»
- **Top-line metric**: 4 KPI tiles in a row

#### Layout

```
PageHeader (title="Overview", subtitle="Past 7 days")
   └─ inline period switcher: 24h | 7d | 30d (URL state via `?period=7d`)

Row 1: KPI tiles (4 columns on lg, 2 on md, 1 on sm)
   ├─ Total searches             (with trend arrow vs prior period)
   ├─ Documents indexed
   ├─ Quota usage % (plan)       (color: green <80%, amber <100%, red ≥100%)
   └─ Failed sync jobs           (red badge if > 0)

Row 2: Charts (2 columns on lg)
   ├─ Searches over time         StatsTileChart (sparkline)
   └─ Top 10 queries             Card with simple list + count

Row 3: Activity feed (full width)
   └─ "Recent" rolled-up events: index created, sync started/finished, key revoked, etc.

Row 4: Status / Alerts
   ├─ Connector heartbeat status (green/amber/red)
   └─ Quota warning banner (only if usage > 80%)
```

#### Blocks (existing)

- `PageHeader` — shared
- `StatsTile` — shared, supports `value` + `valueFormat` + `context` + `trend`
- `StatsTileChart` — shared (sparkline variant)
- `Card` / `CardHeader` / `CardContent` — UI primitives
- `Badge` — for trend / status
- `TabGroup` — if period switcher becomes tabs (could also be `Select`)
- New: `ActivityFeed` block (composes Card + List + relative time formatter — **check `apps/saas/modules/shared/lib` for an existing time formatter first**).

#### Data deps

- `searchRouter.usage({ organizationId, days })` — already shipped, returns aggregated rows.
- `entitlementsRouter.plan({ organizationId })` — plan + usage % derivable.
- `searchRouter.listIndexes({ organizationId })` — for sync-job last-failed indicator (today: ephemeral in-memory; surface only the _current_ connector state, not history).
- New oRPC `searchRouter.topQueries({ organizationId, days, limit })` — derived from raw `recordSearchUsage` rows. **DB-frozen-friendly**: read-only group-by query against `SearchUsage` table.

#### Empty state

A brand-new org with 0 searches: replace KPI tiles with a single full-width `EmptyState` card pointing to **Start** ("You haven't sent any searches yet — let's get started"). Hide chart row entirely.

#### Loading state

Skeleton tiles (use `Skeleton` UI primitive) — never spinning loaders for KPIs (they shift layout).

#### Error state

Per-tile fallback: "Couldn't load — retry" with refresh icon; the rest of the page still renders. **Don't** show one "failed to load Overview" banner that kills everything.

#### Edge cases

- **Period spans across plan upgrade** — quota usage % uses _current_ plan's limit, not prior. Helper tooltip: "Plan changed on YYYY-MM-DD; usage shown against current limit".
- **Multi-day timezone shifts** — server aggregates in UTC; display localizes via `next-intl`.
- **Stale data** — last-fetched timestamp visible bottom-right; manual refresh button next to period switcher.

#### DB-frozen workaround

`Top queries` requires aggregation of raw `SearchUsage` rows — readable today. `Activity feed` joins multiple existing tables (`SearchIndex.createdAt`, `SearchApiKey.createdAt`, `SearchUsage`); no new table.

#### DoD

- ✅ All 4 KPI tiles render with sparkline trend on a seeded org.
- ✅ Empty state shown on a brand-new org (0 searches).
- ✅ Quota tile changes color at correct thresholds.
- ✅ Period switcher changes URL + refetches data without page reload.
- ✅ All 5 locales translated.
- ✅ Mobile: tiles stack 1-per-row; charts get horizontal-scroll hint.

---

### 6.2.3 Search — index management hub

- **Route**: `[organizationSlug]/search/page.tsx` ✅ exists (currently the master dashboard with 5 panels)
- **Customer goal**: «Manage my indexes, push test data, copy widget snippet, share API keys with my team.»

#### Recommended split: tab-based, not 5 panels in one column

Current state: `SearchDashboard` renders all 5 panels stacked. Better UX: keep one route, use `TabGroup` (already shared) for sub-sections. **Routes are still flat** (no nested file routes) — simply URL-state via `?tab=...`.

```
PageHeader (title="Search")

TabGroup
  ├─ Indexes        (default)   ← SearchIndexesList + CreateSearchIndexDialog + SearchUsageCard
  ├─ Playground                  ← migrate `preview` route here, see 6.2.4
  ├─ API keys                    ← SearchApiKeysPanel + Scoped tokens table
  └─ Widget                      ← WidgetPanel (existing)
```

This collapses three current sidebar items (`Search`, `api-keys`, `preview`, `import-jobs`) into one page with tabs. **Customer benefit**: less hunting; everything search-related is one click away.

#### Blocks (mostly existing)

- `SearchIndexesList` ✅ — extend with row actions (Reindex, View schema, Delete)
- `SearchApiKeysPanel` ✅ — extend with separate sub-section "Scoped tokens" (HMAC-issued; can list only by `keyId` + `expiresAt`, not value)
- `WidgetPanel` ✅ — extend with embed-mode preview iframe (point at our own search demo)
- `CreateSearchIndexDialog` ✅
- `SearchUsageCard` ✅ — keep at top of "Indexes" tab
- New: `IndexRowActions` (Dropdown of Reindex / View schema / Delete) — composes `DropdownMenu` from `@repo/ui/components/dropdown-menu`
- New: `ScopedTokenList` — pure table listing existing scoped tokens (label, expires-at, last-used-at). **Note**: scoped tokens are stateless HMAC, so there's no DB list — track them in a small `ScopedTokenIssuance` table only if user approves a DB unfreeze; otherwise list issued in-session via `localStorage` (acceptable for "show me what I just made" UX).

#### Data deps (existing)

- `searchRouter.listIndexes` / `createIndex` / `reindex`
- `searchRouter.listApiKeys` / `createApiKey` / `revokeApiKey`
- `searchRouter.createScopedToken`
- `searchRouter.usage`

#### Edge cases

- **Reindex during active sync** — block with confirm dialog: "This will create a new collection version and swap aliases. Live searches continue on the old version until ready. Continue?" — the description matches actual behavior in `reindexCollection`.
- **Revoke active token** — confirm with "X widgets/connectors are still using this key" warning if last-used-at is < 24h ago.

#### DoD

- ✅ Tabs preserve URL state (deep-linkable).
- ✅ Each tab shows correct empty state on a fresh org (no indexes / no keys / etc.).
- ✅ Reindex confirm shows the alias-swap explanation in plain language.
- ✅ Revoking a key requires confirmation; revoked keys are visually struck out, not removed.

---

### 6.2.4 Search → Playground (sub-tab)

- **Route**: `[organizationSlug]/search/page.tsx?tab=playground` (URL state) — replaces standalone `preview` route. Keep `preview` page for one release as a redirect.
- **Customer goal**: «Try a query against my real index, tune `query_by` / `filter_by` / `sort_by`, see Typesense response shape.»

#### Layout

```
TabGroup (Search context — see 6.2.3)
  └─ Playground tab
      ├─ Index selector (Select)             — pre-filled with first index
      ├─ Query input (Input, autofocus)
      ├─ Collapsible "Advanced" panel:
      │     ├─ query_by (Input — default = collection's searchable fields)
      │     ├─ filter_by (Input — placeholder shows valid syntax)
      │     ├─ sort_by (Input)
      │     └─ per_page (NumberInput, 1–100)
      ├─ Run button (or Cmd+Enter)
      ├─ Response panel (3 sub-tabs):
      │     ├─ Hits — readable Card list with highlighted matches
      │     ├─ Facets — count breakdowns (Badge groups)
      │     └─ Raw JSON — collapsed by default, copy button
      └─ Curl snippet — shows the equivalent shell call (with masked key)
```

#### Customer-friendly touches

- **Persist last query** in `localStorage` per index (so refresh doesn't lose state).
- **Debounce auto-run** (700ms) — every keystroke triggers a search until customer hits Run, then sticks at manual.
- **Highlight syntax errors** in `filter_by` inline (parse client-side; show red caret + tooltip).
- **Show response time + hit count** above results.
- **Hide raw key** in the curl snippet — show `ss_search_xxxx****` and a "Copy with key" button that reveals once.

#### Blocks

- `Card` / `Input` / `Button` / `Select` / `Tabs` (UI primitives)
- New: `JsonViewer` — **GREP FIRST** (`rg "JsonViewer\|json-viewer\|<pre.*JSON" apps/`); if absent, smallest impl is `<pre>{JSON.stringify(data, null, 2)}</pre>` inside a `Card` with copy button. Don't pull a JSON-tree library without justification.
- `Badge` (for facet counts)

#### Data deps

- `searchRouter.search` (admin path) — uses caller's session, so no API key juggling. Server-side, so admin token never crosses to browser.

#### Edge cases

- **Query against empty index** — show friendly "No documents in this index yet — push some via SDK or Connector" with deep links.
- **Typesense down** — surface "Search engine unavailable, retry" (Hard Invariant #6 — never show raw Typesense error).

#### DoD

- ✅ Round-trip query → Hits tab populated; Facets tab populated when collection has facets.
- ✅ Cmd+Enter runs query.
- ✅ Last query restored on revisit.
- ✅ Curl snippet redacts key by default.

---

### 6.2.5 Analytics

- **Route**: `[organizationSlug]/analytics/page.tsx` ✅ exists (likely stub)
- **Customer goal**: «What did people search for? What didn't they find? What did they click?»
- **Status**: 🟡 **Capture not yet implemented**. The widget can emit client events but there's no server endpoint or `AnalyticsEvent` table. **This route is a designed-empty surface today** — see DB-frozen workaround.

#### Layout (target)

```
PageHeader (title="Analytics", subtitle="Past 30 days")
   └─ period switcher (24h | 7d | 30d)

Row 1: 4 KPI tiles
   ├─ Searches            (uses existing recordSearchUsage)
   ├─ Sessions            (❌ requires events)
   ├─ CTR                 (❌ requires click events)
   └─ Zero-result rate    (❌ requires zero-result events)

Row 2: Charts
   ├─ Searches over time  ✅ (StatsTileChart, from usage)
   └─ Funnel: search → click → conversion (❌ requires events)

Row 3: Tables
   ├─ Top queries         🟡 (works once topQueries proc lands — see 6.2.2)
   ├─ Zero-result queries (❌ requires events)
   └─ Top clicked products (❌ requires events)
```

#### Phased rollout (DB-frozen-friendly)

**Phase A (now)**: Show only what existing usage data supports. The 3 ❌ tiles are replaced with a single "Set up event tracking" callout linking to docs (when v0.7 ships) or the widget config tab. Customer sees something useful today, not a graveyard of empty tiles.

**Phase B (after AnalyticsEvent capture lands)**: Replace callout with the real charts.

#### Data deps

- `searchRouter.usage` — already there.
- `searchRouter.topQueries` — to add (read-only, no DB change).
- `analytics.captureEvent` (POST endpoint) — **deferred until DB unfreeze**. The spec is in [04-connectors-widget.md §4.5](04-connectors-widget.md).

#### Edge cases

- **Period > retention** (Free plan retains 7 days, Pro 30, Enterprise custom) — show retention banner: "Free plan retains 7 days of analytics. Upgrade to see longer trends."

#### DoD (Phase A)

- ✅ "Searches" tile + "Searches over time" chart populate from `searchRouter.usage`.
- ✅ Other tiles show an inline "Set up tracking" CTA, NOT empty zeros.
- ✅ Period switcher works for visible data.
- ✅ Retention banner shown when period exceeds plan retention.

---

### 6.2.6 Relevance

- **Route**: `[organizationSlug]/relevance/page.tsx` ✅ exists
- **Customer goal**: «Make 'iphone' return iPhones — and tweak which products show up first.»
- **Status**: ❌ Not yet implemented in code. Synonyms / curations / ranking are R3 Beta in [01-vision-scope.md §1.6](01-vision-scope.md). This route is design-stage.

#### Layout

```
PageHeader (title="Relevance", subtitle="Tune search results for this index")

Index selector (top-right, persisted in URL ?index=<slug>)

TabGroup
  ├─ Synonyms                    — bidirectional and one-way mappings
  ├─ Curations                   — pinned / hidden results for specific queries
  └─ Ranking                     — query_by weights + sort defaults
```

#### Synonyms tab

```
Search input (filter list)
+ "Add synonym" button → Dialog with form:
   ├─ Type: bidirectional | one-way
   ├─ "iphone, айфон, apple phone"     (chips input)
   └─ Optional: locale (default = all)
List rows:
   chips for terms, edit / delete actions, "active since" timestamp
```

Powered by Typesense **global synonym sets** (v30 surface). Each AACsearch project gets its own synonym set name (`syn_org_<orgId>_<slug>`). Stored entirely in Typesense — **no Prisma table** for synonyms.

#### Curations tab

```
"Add curation" → Dialog:
   ├─ Match type: exact | contains | regex
   ├─ Trigger query: "phone"
   ├─ Pin products (search-and-select)
   ├─ Hide products
   └─ Optional: filter override (e.g. only show "in_stock")
```

Same approach — global curation sets in Typesense, no Prisma.

#### Ranking tab

```
For the selected index, show editable form:
   ├─ Searchable fields with weights:
   │      title:    (slider 1–10) — default 10
   │      sku:      ............ — default 8
   │      brand:    ............ — default 6
   │      ...
   ├─ Default sort: _text_match | price_asc | price_desc | created_at_desc
   └─ Save → triggers reindex if `query_by_weights` changed (server-side)
```

#### Customer-friendly touches

- **Live preview** at the top: a mini search box that re-queries against current index every change, so customer sees the effect of their tweak immediately.
- **Undo last change** button (5-min window, stored in `localStorage`).
- **Per-locale synonyms** — important for RU market; ru-specific terms ("айфон" → "iphone") shouldn't apply to en-locale searches.

#### Blocks

- `TabGroup` ✅
- `Dialog` / `Form` / `Input` / `Slider` / `Select` / `Badge` (for chips) ✅
- New: `RelevancePreviewBar` — embed mini Playground at top of page; reuses Playground search code.
- New: `WeightSliderRow` — composes `Slider` + label + numeric value display.

#### Data deps

- New oRPC `searchRouter.getSynonyms({ indexId })` / `setSynonyms` — server-side calls Typesense `/synonyms/:set_name` endpoints; no DB.
- Same for curations.
- `searchRouter.getRanking` / `setRanking` — stored as part of `SearchIndex` row (uses existing `defaultSortingField` field; new fields require additive schema — confirm with user).

#### DB-frozen workaround

Synonyms + curations live in Typesense, not Prisma. Ranking weights need either:

- (a) A new `searchableFieldsConfig: Json` column on `SearchIndex` (additive — likely OK to ask).
- (b) Hardcoded weights baked into `packages/search/lib/collections.ts`, not editable via UI (no DB change but UX limitation).

Default to (b) for v0.x. Add (a) when "edit weights" becomes the most-requested customer feature.

#### Edge cases

- **Synonym typo'd into existence** — undo button + edit-in-place.
- **Curation with hidden + pinned same product** — UI prevents at validation; show explainer "Pinned overrides hidden".

#### DoD (Phase 1 — synonyms only)

- ✅ Add bidirectional synonym → reflects within 1 search round-trip.
- ✅ Live preview re-runs on synonym save.
- ✅ Per-locale synonym list filters correctly.
- ✅ Empty state ("No synonyms yet — most projects start with 5–10 terms") with a "Add your first" CTA.

---

### 6.2.7 Connectors

- **Route**: `[organizationSlug]/connectors/page.tsx` ✅ exists
- **Customer goal**: «Set up PrestaShop / Bitrix / direct API → see live sync status → fix errors when sync fails.»
- **Status**: ✅ Connector API shipped (`packages/api/modules/search/connector-public.ts`); 🟡 PrestaShop + Bitrix module skeletons untracked.

#### Layout

```
PageHeader (title="Connectors", subtitle="Connect PrestaShop, Bitrix, or push docs directly via API")

Row 1: Connection cards (one per source type)
   ├─ PrestaShop card           (logo, status, last sync, [Setup] / [Manage])
   ├─ Bitrix card               (...)
   └─ Direct API card           (using @repo/search-client SDK)

Row 2: Active connectors (table — only non-empty)
   columns: Type | Project | Status (heartbeat) | Last sync | Last error | Actions

Row 3: Sync jobs (collapsible, last 50)
   columns: Job ID | Type (full/delta) | Status | Started | Duration | Items / Failures
   row click → job detail drawer with full event log
```

#### Per-source setup wizard (PrestaShop / Bitrix)

Each card's `[Setup]` opens a wizard (5 steps, ~3 minutes for shop owner):

1. **Generate connector token** — clicks button, sees `ss_connector_xxx...` once with copy-to-clipboard, can name it.
2. **Download & install module** — link to (eventually) `apps/docs/connectors/prestashop`; for now, link to GitHub release or zip artifact.
3. **Configure module** — show the shop's `apiUrl` + `projectId` to paste in PrestaShop admin form.
4. **Test connection** — module sends `handshake`; UI watches for success heartbeat in the next 60s; live status badge.
5. **Run first sync** — once handshake green, "Trigger full sync" button calls module via webhook OR shows "Run sync from your admin panel".

#### Customer-friendly touches

- **Token reveal** — full token shown ONCE in step 1; after dialog close, only `prefix***` is recoverable. Customer must save it. Banner "We can't show you this again" + auto-copy to clipboard.
- **Heartbeat live indicator** — green pulse if last seen < 5 min; amber 5–60 min; red > 60 min OR last sync failed.
- **Sync job retry** — every failed-job row has a [Retry] action calling Connector API to re-trigger.
- **Job detail drawer** — full HTTP audit: request hash, response code, error code (Hard Invariant #6 — typed error, not raw Typesense). Useful for shop devs debugging.

#### Blocks

- `Card` / `Badge` / `Table` / `Drawer` (UI primitives)
- New: `ConnectorCard` (composes Card + status Badge + action Button)
- New: `ConnectorWizard` (composes existing Stepper / `Dialog` — check if Stepper exists in `packages/ui/components/`; if not, a simple numbered list of `Card`s with current-step highlight)
- New: `SyncJobsTable` (composes `Table` + status badge mapping)
- `Pagination` ✅ shared (for sync jobs list)

#### Data deps

- New oRPC `searchRouter.listConnectorTokens({ organizationId })` — derives from `SearchApiKey` filtered by `scopes.has(connector_write)`.
- New oRPC `searchRouter.createConnectorToken` — issues `ss_connector_*` row.
- New oRPC `searchRouter.listSyncJobs({ organizationId })` — reads from in-memory job map in `connector-public.ts`. **Important**: jobs are ephemeral (lost on restart). Surface this limitation: "Showing jobs from the last process restart" tooltip.

#### Empty state

Brand-new org: 3 connection cards with `[Setup]` CTAs. The "Active connectors" + "Sync jobs" rows are hidden until at least 1 connector exists.

#### Edge cases

- **Token compromise** — Revoke action immediately invalidates `SearchApiKey.revokedAt`; module gets 401 next call. Surface "Last used IP" if we capture it (currently not — won't fabricate).
- **Long-running full sync** — show progress bar based on `processedItems / totalItems` from job tracker; if ETA > 1h, send a notification on completion via `@repo/notifications`.
- **Server restart during sync** — job marked `interrupted` post-restart (since in-memory state is gone). Module's next heartbeat triggers re-sync from cursor.

#### DB-frozen workaround

Connector tokens reuse `SearchApiKey` (already shipped). Sync-job tracking is in-memory ephemeral — surface the limitation in UI ("ephemeral", "since last server restart"). When customer pain becomes real (jobs lost mid-day), DB-unfreeze a `SyncJob` table.

#### DoD

- ✅ Customer can complete PrestaShop wizard end-to-end with a working module — first sync round-trips successfully.
- ✅ Token reveal warning is tested (clear copy of "you can't see this again").
- ✅ Heartbeat indicator updates within 30s of module ping.
- ✅ Failed job's "Retry" action re-runs the same payload.
- ✅ Job detail drawer shows full audit trail without leaking raw Typesense errors.

---

### 6.2.8 Organization settings

- **Route**: `[organizationSlug]/settings/{general,members,billing}/page.tsx` ✅ exists (supastarter stock)
- **Customer goal**: «Manage org name / members / plan / payment.»

This is **supastarter-supplied** — don't redesign. AACsearch-specific touches:

- **General**: add `defaultLocale` + `currency` field on the org (additive Prisma change — confirm). Used as defaults for new indexes.
- **Members**: stock supastarter; verify `isOrganizationAdmin` is wired correctly to the new search/connectors/relevance routes (only admins can `createApiKey`, `revokeApiKey`, manage connectors).
- **Billing**: layered with our entitlements module — show:
    - Current plan + usage % (from `entitlementsRouter.plan`)
    - "Upgrade" CTA → existing supastarter checkout flow
    - "Top-up wallet" → `apps/saas/modules/payments/components/AiWalletCard` + `TopUpDialog` (Tochka driver, active WIP)

#### Customer-friendly touches

- **Approaching-limit banner** — if any usage > 80%, show banner across all org-scoped routes (not just billing). Component: `ConsentBanner`-like from shared.
- **Dunning** — if last Tochka top-up failed (status from `wallet-reconcile.ts`), banner "Payment failed — update method".

#### DoD

- ✅ Plan / usage shown matches `quotaCheck` in real time (no stale cache > 60s).
- ✅ Approaching-limit banner appears across all routes.
- ✅ Wallet top-up flow round-trips with Tochka sandbox successfully.

---

### 6.2.9 Account settings

- **Route**: `(account)/settings/{general,security,notifications,billing,billing/ai-credits}/page.tsx` ✅ exists (supastarter stock + ai-credits is custom)
- **Customer goal**: «Manage my profile, password, 2FA, email preferences, AI credits.»

Stock supastarter. AACsearch-specific:

- **`/billing/ai-credits`** is the personal AI Wallet UI (existing — `AiWalletCard` + `TopUpDialog` + transaction history). Active v0.6 surface.
- **Notifications**: ensure AACsearch-emitted notifications (sync failed, quota exceeded, plan changed) are togglable per channel (in-app, email).

#### DoD

- Stock pages: ensure AACsearch notifications types are listed in `NOTIFICATION_GROUPS` (check `packages/notifications/src/catalog.ts`).
- All 5 locales translated for any new notification labels.

---

### 6.2.10 Admin

- **Route**: `(account)/admin/{users,organizations,config,security,integrations,audit,wallet,jobs,notifications}/page.tsx` ✅ exists (most are untracked WIP)
- **Customer goal** (platform admin only): «Debug a customer issue, audit security events, manage platform-wide config.»
- **Visibility**: only when `session.user.role === "admin"`. Sidebar item hidden for everyone else.

#### Pages and their purpose

| Page                  | Purpose                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `admin/users`         | Search/impersonate users (stock supastarter); add filter for "has org membership"           |
| `admin/organizations` | List orgs by plan, usage, last activity; deep-link to per-org overview                      |
| `admin/config`        | Feature flags, default plan, kill-switches (untracked WIP — design TBD)                     |
| `admin/security`      | Recent token issuances, suspicious patterns (impossible without `AuditLog` — see below)     |
| `admin/integrations`  | Tochka / payment provider health, webhook delivery status                                   |
| `admin/audit`         | Append-only log of admin actions (impersonations, plan changes, ban) — needs DB             |
| `admin/wallet`        | Wallet operations dashboard — `AdminWalletOps` (untracked) — top-up reconciliation, refunds |
| `admin/jobs`          | All sync-job traffic across all orgs (currently in-memory; cross-org view)                  |
| `admin/notifications` | System-broadcast notifications (e.g. maintenance window)                                    |

#### Customer-friendly touches (admin = also a customer)

- **Impersonation banner** — fixed top-of-screen "You are impersonating user@example.com — [Stop]" while active. Already exists in supastarter; verify color is alarming enough.
- **Cross-link to customer-facing routes** — every org row in `admin/organizations` deep-links to that org's `/overview` (in impersonation mode if not member).

#### DB-frozen workarounds

- `admin/audit` — without an `AuditLog` table, only show in-memory recent admin actions per process. Surface the limitation: "Audit log persists per-process (in-memory) — full history requires DB unfreeze."
- `admin/security` — same; show only what `SearchApiKey` rows can derive (recent token creates / revokes within the last 24h via `createdAt` / `revokedAt`).

#### DoD

Each admin page has a **clear operational purpose** — admin should know within 2 seconds what action this page enables. Pages without an action become a `WIP` placeholder (don't ship empty stub if there's no use case yet).

---

## 6.3 Cross-cutting concerns

### 6.3.1 Plan-aware UI

Every action button that touches quota (create index, ingest, search) checks `entitlementsRouter.plan` and:

- If quota allows: enabled.
- If quota at hard limit: button disabled with tooltip "Quota exceeded — upgrade or wait until next period".
- If quota near limit: button enabled with subtle warning tooltip.

Implement as `useEntitlement(featureKey)` hook in `apps/saas/modules/shared/hooks/`.

### 6.3.2 Notification surfaces

Use `@repo/notifications`. Trigger conditions:

- **Sync job failed** — type=`sync_failed`, link to `connectors` page with job-detail drawer pre-opened.
- **Quota at 80% / 100%** — type=`quota_warning` / `quota_exceeded`, link to `billing`.
- **Connector heartbeat lost > 1h** — type=`connector_offline`, link to that connector's row.
- **Tochka top-up succeeded / failed** — type=`wallet_topup_*`, link to `ai-credits`.

All require entries in `NOTIFICATION_GROUPS` + 5-locale labels in `settings.notificationsPage`.

### 6.3.3 Optimistic UI vs server-truth

- **Optimistic**: small text edits (rename index, label a key). Reverts on error with toast.
- **Server-truth required**: anything affecting search behavior (reindex trigger, key revoke, sync start). Show pending spinner; never assume success.

### 6.3.4 Keyboard shortcuts

- `Cmd+K` — global command palette (future; not v0.x).
- `/` — focus search input on Playground.
- `Cmd+Enter` — submit form on Playground / Create Index dialog.
- `Esc` — close any open dialog / drawer.

### 6.3.5 Empty states pattern

Every list view follows this pattern:

```
<EmptyState
  icon={<RelevantIcon />}
  title="No <thing> yet"
  description="One sentence explaining what this is and why you'd use it."
  action={{ label: "Create your first <thing>", href: "?action=create" }}
/>
```

`EmptyState` lives in `apps/saas/modules/search/components/EmptyState.tsx` (already used in `SearchApiKeysPanel`). Reuse — don't reinvent.

### 6.3.6 Mobile

Most routes work on phone. Two that **need explicit work**:

- **Playground** — Advanced filter inputs go into a collapsible bottom-sheet on `<sm`.
- **Connectors → Sync jobs table** — collapse to per-row Card on `<md`; show Job ID + status + time, expandable for details.

### 6.3.7 Empty / Loading / Error consistency

A page must always render _something_ useful:

- Loading: skeleton-shaped placeholders, not spinners (preserves layout).
- Error: per-block fallback "Couldn't load — retry"; never wipe the page.
- Empty: dedicated `EmptyState` with clear next action.

---

## 6.4 Implementation sequence (from current code state)

Today there are 5 panels in one Search dashboard route, plus stub routes for `overview`, `analytics`, `relevance`, `connectors`, `import-jobs`, `preview`, `api-keys`. Below is the order to build out:

```
Sprint A — Compose what we already have, no DB
  1. Sidebar nav refactor — add the 9 items per §6.1; auto-hide Start once complete
  2. Overview page — 4 KPI tiles + sparkline + activity feed (extend listIndexes + usage; add topQueries)
  3. Search → split into TabGroup tabs (Indexes / Playground / Keys / Widget); deprecate `preview` / `api-keys` / `import-jobs` routes (redirect for 1 release)
  4. Playground — full impl with persisted query, debounce, response viewer
  5. Connectors page — 3 source cards + setup wizard for PrestaShop (Bitrix follows same pattern)

Sprint B — Add procedures, still no DB
  6. searchRouter.onboardingStatus — Start checklist gating
  7. searchRouter.topQueries / failedJobs — Overview + Connectors tables
  8. searchRouter.listConnectorTokens / createConnectorToken — Connectors UI

Sprint C — Relevance Phase 1 (synonyms only, Typesense-side only)
  9. searchRouter.{getSynonyms,setSynonyms} — Typesense global synonym sets
 10. Relevance page tabs + RelevancePreviewBar

Sprint D — DB-unfreeze track (after explicit user approval)
 11. Project as first-class entity → switcher
 12. SyncJob persistence → cross-restart history in Connectors
 13. AnalyticsEvent capture endpoint → Analytics Phase B charts
 14. AuditLog → admin/audit + admin/security real history

Sprint E — Polish
 15. Mobile passes for Playground + Connectors
 16. Keyboard shortcuts
 17. Approaching-limit cross-route banner
```

## 6.5 Definition of "customer-friendly" (used everywhere)

A page meets the bar when **all** of these are true:

- ✅ A new customer can find what they need within 1 click of clicking the sidebar item.
- ✅ The empty state names the next action (not just "no data").
- ✅ Loading does not shift layout.
- ✅ Errors are actionable (retry button, support link, or both).
- ✅ Quota / plan limits are surfaced where relevant, never as a surprise.
- ✅ Destructive actions require confirmation; recoverable actions don't.
- ✅ The page works on a 375×667 phone screen.
- ✅ All copy is in 5 locales (Hard Invariant #11).
- ✅ Every "create" action has the field a non-developer would expect first (e.g. "Display name", not "Slug" — slug derives by default, override is advanced).

---

## 6.6 Reality check — what's already in code

Cross-check of `apps/saas/modules/search/components/` (21 components) against §6.2 sections. Many blocks **already exist** — building on them, not from scratch.

| §6.2 section            | Existing component(s)                                                                                | Status   | Gap                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| §6.2.1 Start            | `GettingStarted.tsx`                                                                                  | 🟡       | Verify gating logic matches §6.2.1 6-step list; confirm auto-hide rule       |
| §6.2.2 Overview         | `DashboardOverview.tsx`, `ProjectOverview.tsx`, `SearchUsageCard.tsx`, `SearchUsageCards.tsx`        | 🟡       | Add KPI tile row; ActivityFeed; period switcher                              |
| §6.2.3 Search → Indexes | `SearchIndexesList.tsx`, `CreateSearchIndexDialog.tsx`, `ProjectsList.tsx`                           | ✅       | Wrap into `TabGroup` per §6.2.3; row actions (reindex/delete/view-schema)    |
| §6.2.3 Search → Keys    | `SearchApiKeysPanel.tsx`, `SearchApiKeysPage.tsx`                                                    | ✅       | Sub-section "Scoped tokens"                                                   |
| §6.2.3 Search → Widget  | `WidgetPanel.tsx`                                                                                     | ✅       | Add live preview iframe                                                      |
| §6.2.3 Search → Imports | `ImportJobsPanel.tsx`                                                                                | ✅       | Connect to in-memory sync-job map; add Retry/Replay actions                  |
| §6.2.4 Playground       | `SearchPreview.tsx`, `SearchPreviewPage.tsx`                                                          | ✅       | Verify debounce + persisted query + masked-curl per §6.2.4                  |
| §6.2.5 Analytics        | `SearchAnalyticsCards.tsx`, `BillingPlanInfo.tsx`                                                    | 🟡       | KPI tiles 2-4 still need event capture (Phase B)                            |
| §6.2.6 Relevance        | `RelevanceTabs.tsx` (parent), `SynonymsPanel.tsx`, `CurationsPanel.tsx`                               | 🟡       | Stopwords + Presets sub-tabs missing; ranking weights editor missing        |
| §6.2.7 Connectors       | (none in `modules/search/`)                                                                          | ❌       | New components needed — see §6.8 for reusable patterns                      |
| §6.2.8 Org settings     | (supastarter stock)                                                                                  | ✅       | AACsearch-specific: `defaultLocale` / `currency` field on org                |
| §6.2.9 Account settings | (supastarter stock + `apps/saas/modules/payments/components/AiWalletCard.tsx`)                       | ✅       | Notification group labels for new event types                                |
| §6.2.10 Admin           | `apps/saas/app/(authenticated)/(main)/(account)/admin/{users,organizations,config,security,integrations,audit,wallet,jobs,notifications}/page.tsx` | 🟡 | Most are stubs — fill with operational purpose per §6.2.10 |
| Cross-cutting           | `EmptyState.tsx`                                                                                     | ✅       | Already used; reuse everywhere new lists land                                |

**Implication for plan**: §6.4 Sprint A is **half-shipped**. The remaining work in Sprint A becomes:
- A1. Wrap existing panels into the §6.1 sidebar IA (NavBar updates + nested URL state with `TabGroup`)
- A2. Verify each existing component matches the §6.2 spec; add missing sub-blocks
- A3. Hide "Start" once `GettingStarted` reports complete

## 6.7 Owner discriminator — `SearchIndex` is org-OR-user-owned

Current schema state (per `packages/database/prisma/schema.prisma`):

```prisma
model SearchIndex {
  organizationId  String?
  userId          String?
  // …
}
```

Both fields are optional; **exactly one** is set per index. Query helpers (`packages/database/prisma/queries/search.ts`) split into:

- `listSearchIndexesByOwner({ organizationId?, userId? })` / `getSearchIndexByOwnerSlug` / `createSearchIndexByOwner` (owner-aware)
- Old `listSearchIndexes(organizationId)` / `getSearchIndexBySlug(organizationId, slug)` / `createSearchIndex` (org-only legacy)

oRPC procedures accept the discriminator: `ownerType: "organization" | "user"` + `ownerId`. Auth via `requireSearchOwnerMember` / `requireSearchOwnerAdmin` (`packages/api/modules/search/lib/access.ts`). Constants: `SEARCH_OWNER_TYPES`.

### UX implications across §6.2

| Section                  | What changes                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §6.1 Sidebar             | Workspace switcher already shows orgs. Personal indexes render under a synthetic "Personal" workspace at the top (or as a fixed pinned item). Don't add a separate "owner type" toggle on every page — too noisy.        |
| §6.2.1 Start             | Step 1 "Create your first index" — pre-select owner=personal if user has no org membership; owner=current-org otherwise. **Don't force the choice** if context is unambiguous.                                          |
| §6.2.3 Search → Indexes  | `SearchIndexesList` props need `ownerType` + `ownerId` (current props show only `organizationId` — it's stale; see §6.6).                                                                                                |
| §6.2.3 Search → Keys     | API keys still hang off `SearchIndex`, so no separate owner check needed — they inherit the index's owner. Visible in `SearchApiKeysPanel` only when caller is a member of the owner.                                     |
| §6.2.4 Playground        | Index selector populates from BOTH owner scopes (personal + each org membership). Selected index's owner determines which `searchRouter.search` call goes through (`requireSearchOwnerMember` gate).                     |
| §6.2.5 Analytics         | Per-owner aggregation. Personal usage and org usage are separate subjects; don't mix.                                                                                                                                    |
| §6.2.6 Relevance         | Synonyms / curations / stopwords scoped to a single index → owner-implicit (no explicit toggle).                                                                                                                          |
| §6.2.7 Connectors        | Connector tokens (`ss_connector_*`) are issued against an **index**, so owner-implicit. CMS modules don't care about owner type — they just see an `apiUrl + token + indexSlug`.                                          |
| §6.2.8 Org settings      | Only org-owned indexes appear in org-scoped views. Personal indexes are invisible from org settings (correct boundary).                                                                                                  |
| §6.2.10 Admin            | Platform admin can list across owners (`listSearchIndexesByOwner` with no owner filter — likely needs new "all owners" query helper if not yet present).                                                                  |

### Hard rule for new pages

Every list / create UI must use the **owner-aware** query helpers (`*ByOwner`), never the legacy `listSearchIndexes(organizationId)`. The legacy ones are kept for backwards compatibility but new code shouldn't bind to them.

## 6.8 External reference — AACSearchGen reusable assets

`/Users/aac/Projects/ts/AACSearchGen` (separate repo, **not for direct import**) contains 28+ packages. Most are auto-generated from OpenAPI. The **hand-written UI** has direct counterparts to many of our §6.2 sections — useful as design + copy reference, not as a code library.

**Rule of engagement**: read for patterns and copy/paste *deliberately into our `apps/saas/modules/search/`* with our naming and our supastarter UI imports — never `import` across repos.

### Per-section reference table

| Our §6.2 | AACSearchGen path | What's there | How to use |
|---|---|---|---|
| §6.2.1 Start | `ui/components/admin/shared/setup-checklist.tsx` | `SetupChecklist` + `ChecklistItem` interface; uses `Card`, `Progress`, `Check`/`Circle` icons | **Pattern reference** for our `GettingStarted.tsx` — verify props shape match; borrow `progressPercent` derivation |
| §6.2.1 Start | `ui/components/search/search-onboarding.tsx` | Step-by-step wizard with `Sparkles` / `BookOpen` / `ArrowRight` | Don't replace `GettingStarted.tsx` — but borrow icon set + step copy tone |
| §6.2.2 Overview | `ui/components/admin/shared/dashboard-page.tsx` | `DashboardPage` + `DashboardPageHeader` + `dashboardPagePaddingClass` / `dashboardSectionStackClass` constants | **Worth borrowing** the layout-class constants — gives consistent gutter / vertical rhythm. Add to `apps/saas/modules/shared/lib/dashboard-layout.ts` as a small helper module |
| §6.2.2 Overview | `ui/components/admin/shared/stats-card.tsx`, `metrics-overview.tsx`, `usage-card.tsx` | KPI tiles with trend arrows + sparkline area | Reference; we already use `StatsTile` + `StatsTileChart` from supastarter shared. Compare APIs and decide which is richer |
| §6.2.2 Overview | `ui/components/admin/shared/activity-feed.tsx` | Activity feed (rolled-up events, relative time) | **Direct copy candidate** — we don't have one. Place in `apps/saas/modules/shared/components/ActivityFeed.tsx`. Wire to a new `searchRouter.recentActivity` proc |
| §6.2.2 Overview | `ui/components/charts/{area,bar,line,pie,radial}-chart-card.tsx` | 5 recharts-based chart cards | **Decision needed**: we currently use only `StatsTileChart`. If we want richer charts, copy `area-chart-card` first (sparkline-equivalent already used). Recharts is `~80kb`; current sparkline impl uses recharts already (verify in `StatsTileChart.tsx`) — adding more chart variants is cheap |
| §6.2.3 Search → Indexes | `ui/components/search/search-index-management.tsx` | Full index management UI with row actions | Reference — our `SearchIndexesList.tsx` is more limited; add row actions per pattern |
| §6.2.3 Search → Indexes | `ui/components/admin/shared/crud-page.tsx` | Generic CRUD page wrapper | **Worth borrowing** as a shared block to factor out repeating list/create dialog pattern |
| §6.2.3 Search → Keys | `ui/components/admin/shared/api-key-display.tsx`, `api-key-setup.tsx` | Reveal-once UI for raw key with copy + warning | Reference; verify our `SearchApiKeysPanel` reveal flow matches the "you can't see this again" pattern |
| §6.2.4 Playground | `AACSearch-ui/packages/search-ui/src/components/{SearchBox,Hits,Pagination,Stats,SortBy,Facets,CurrentRefinements,NoResults}.tsx` | Full InstantSearch component set | **Don't pull as library** (Hard Invariant against InstantSearch in `packages/widget`). For the *admin* Playground, can copy `Hits.tsx` rendering pattern (highlighted matches), `Stats.tsx` (timing display), `CurrentRefinements.tsx` (chips of active filters) |
| §6.2.4 Playground | `ui/components/admin/universal-query-builder.tsx` | Visual query builder for filter_by / sort_by / etc | **Direct copy candidate** for the Advanced panel. Our current `SearchPreview.tsx` may already have this — diff before copying |
| §6.2.5 Analytics | `ui/components/admin/metrics/metrics-panel.tsx`, `metrics-overview.tsx` | Full analytics dashboard | Reference for Phase B once event capture lands |
| §6.2.6 Relevance → Synonyms | `ui/components/admin/synonyms/{synonyms-manager,synonyms-panel}.tsx` | Full synonyms UI: bidirectional / one-way, root word, locale, items list | **Direct copy candidate** — replaces our minimal `SynonymsPanel.tsx`. Adapt: i18n via `next-intl` (their `getT` → our `useTranslations`), use our `Card` + `Dialog` UI primitives |
| §6.2.6 Relevance → Curations | `ui/components/admin/curation/{curation-manager,curation-panel}.tsx` | Pin / hide / filter override per query | Same approach: copy patterns into our `CurationsPanel.tsx`, adapt i18n + UI primitives |
| §6.2.6 Relevance → Stopwords | `ui/components/admin/stopwords/{stopwords-manager,stopwords-panel}.tsx` | List of stopwords per locale | New sub-tab in `RelevanceTabs.tsx` — copy in adapted form. Schema source: `AACSearch-admin/src/stopwords/stopwords.ts` (Orval-gen Zod) |
| §6.2.7 Connectors | `ui/components/admin/integrations/{connector-card,connector-status-badge,connection-health,connector-catalog,connector-setup-dialog,connector-sync-schedule}.tsx` | **Full connector UX kit** — exactly the building blocks for §6.2.7 | **Highest-value copy candidate** for §6.2.7. Names map 1:1 to our spec. Adapt: drop their generic categories, hard-code `prestashop` / `bitrix` / `direct-api`. Keep `ConnectorStatus = "stable" | "beta" | "coming_soon"` enum |
| §6.2.7 Connectors → Jobs | `ui/components/admin/operations/{pipeline-card,workflow-timeline,workflow-visualization,pipeline-step-list,operations-panel}.tsx` | Pipeline run / step-by-step / timeline visualization | Reference for sync job detail drawer — adapt `pipeline-step-list` for our ephemeral in-memory job log |
| §6.2.10 Admin → Health | `ui/components/admin/health/health-status.tsx` | Service health indicator | Reference for `admin/integrations` page (Tochka health, Typesense health) |
| `EmptyState` | `ui/components/admin/shared/state-views.tsx` | Empty / loading / error / offline view kit | Reference; we already have `EmptyState.tsx` — verify states cover offline + error |

### Schemas reference (for `searchRouter` types when implementing Relevance / Analytics)

| AACSearchGen path | Schemas inside | Use for |
|---|---|---|
| `AACSearch-admin/src/synonyms/synonyms.ts` | Orval-generated TS client + Zod | `searchRouter.{listSynonyms,getSynonym,upsertSynonym,deleteSynonym}` types |
| `AACSearch-admin/src/curation-sets/curation-sets.ts` | same | curation procs |
| `AACSearch-admin/src/stopwords/stopwords.ts` | same | stopwords procs |
| `AACSearch-admin/src/presets/presets.ts` | same | presets procs |
| `AACSearch-admin/src/analytics/analytics.ts` | Analytics rules + events | Phase B Analytics procs |
| `AACSearch-admin/src/schemas/{collectionResponse,searchRequestParams,...}.ts` | All Typesense API entities | Reference for response shapes when wrapping Typesense calls |

**Don't blindly copy entire schema files** — they include types we don't expose (e.g. `nl-search-models`, `conversations`, `stemming-dictionary` — all out-of-scope for AACsearch v1). Pick fields used in your specific procedure and import minimal types.

## 6.9 Additional routes inspired by AACSearchGen mksaas — post-MVP candidates

`AACSearch-saas-mksaas/src/app/dashboard/` has these routes that **don't exist in our nav** but might fit a later release. Each marked with our recommendation.

| Route in mksaas             | What it is                                                            | Our verdict                                                                                            |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dashboard/presets/`        | Saved query templates ("preset_A: query_by=title^3, filter=in_stock") | **Add as sub-tab in Relevance** (R3 Beta) — Typesense feature, no DB needed                            |
| `dashboard/stopwords/`      | Words to exclude from indexing per locale                             | **Add as sub-tab in Relevance** — same release as Synonyms / Curations                                 |
| `dashboard/aliases/`        | Manage Typesense collection aliases manually                          | **Skip in customer-facing UI** — alias-swap is internal to `reindexCollection`. Move to `admin/integrations` |
| `dashboard/webhooks/`       | Outgoing webhooks (notify when sync done, when zero-result spike)    | **Defer post-v1.0** — needs DB (`Webhook` model + delivery log)                                        |
| `dashboard/logs/`           | HTTP request log viewer                                                | **Move to `admin/audit`** — already in our admin tree; needs `AuditLog` DB model (DB-frozen)            |
| `dashboard/jobs/`           | Sync / import job table                                               | **Already covered** by `ImportJobsPanel` + Connectors page                                              |
| `dashboard/team/`           | Members / invites                                                     | **Already covered** by `settings/members` (supastarter stock)                                          |
| `dashboard/knowledge-graph/`| Neo4j knowledge graph                                                  | **Out of scope for v1** — see [01-vision-scope.md §1.7 OUT](01-vision-scope.md)                       |
| `dashboard/collections/[name]` | Per-collection detail page                                            | **Not needed** — our index detail UX is panel-tabs inside Search route, no separate route                |
| `dashboard/analytics/`      | Analytics dashboard                                                    | **Already in our nav** as `analytics/page.tsx`                                                         |
| `dashboard/billing/`        | Billing / plan / quotas                                                | **Already covered** by `settings/billing` + AI Wallet                                                  |
| `dashboard/onboarding/`     | First-run onboarding                                                   | **Already covered** by `start/page.tsx` (our §6.2.1)                                                   |

### Net-add to our roadmap (after MVP)

- **Sprint C+1 (Relevance Phase 2)**: add Presets sub-tab + Stopwords sub-tab in `RelevanceTabs.tsx`. Schemas from `AACSearch-admin/src/{presets,stopwords}/*.ts`. No DB change.
- **Sprint D (DB-unfreeze track)**: `Webhook` model → `webhooks/page.tsx` ; `AuditLog` model → `admin/audit` real history.

## 6.10 Borrowable layout pattern — `DashboardPage` shell

AACSearchGen has a small but useful layout helper in `ui/components/admin/shared/dashboard-page.tsx`:

```ts
export const dashboardContentGutterXClass = "px-3 sm:px-5 lg:px-6";
export const dashboardPagePaddingYClass = "py-3 sm:py-5 lg:py-6";
export const dashboardPagePaddingClass = cn("min-w-0", dashboardContentGutterXClass, dashboardPagePaddingYClass);
export const dashboardSectionStackClass = "space-y-4 sm:space-y-5 lg:space-y-6";

export function DashboardPage({ children, className }) { /* … */ }
export function DashboardPageHeader({ children }) { /* … */ }
```

**Why borrow**: today every saas route hand-rolls its own padding rhythm. A 12-line helper file eliminates micro-decisions and makes mobile / desktop spacing consistent.

**Where it lands in our repo**: `apps/saas/modules/shared/lib/dashboard-layout.ts` (export the constants) + a tiny `apps/saas/modules/shared/components/DashboardPage.tsx` (export the wrappers). Then refactor existing pages onto this shell during Sprint A (~30 min of touch-ups).

**Why not under `packages/ui/`**: `packages/ui` is design-system primitives shared between saas + marketing. `DashboardPage` is saas-specific (inherits sidebar shell). Keep the boundary clean — see Hard Invariant #12 layered ranking.

## 6.11 Updated implementation sequence (replaces §6.4 — half of Sprint A is shipped)

```
Sprint A — Wire shipped components into the §6.1 sidebar IA
  1. Add `start` route → render existing GettingStarted.tsx; auto-redirect to /overview when complete
  2. NavBar refactor — register all 9 items per §6.1; collapse Search/api-keys/import-jobs into Search tabs
  3. DashboardPage layout helper (§6.10) → refactor 5 search routes to use it
  4. Verify SearchIndexesList props → switch to ownerType+ownerId per §6.7
  5. Add Connectors page from scratch using AACSearchGen integrations/* as pattern (§6.8)

Sprint B — Procedures + small polish (no DB)
  6. searchRouter.onboardingStatus (gating for §6.2.1)
  7. searchRouter.topQueries / recentActivity (Overview KPIs)
  8. searchRouter.listConnectorTokens / createConnectorToken (Connectors)
  9. ActivityFeed component (copy from AACSearchGen shared/activity-feed.tsx, adapt)

Sprint C — Relevance Phase 1 (Synonyms via Typesense)
 10. searchRouter.{getSynonyms,setSynonyms} via Typesense /synonyms/:set_name
 11. SynonymsPanel.tsx → port AACSearchGen synonyms-manager.tsx pattern (i18n via next-intl, our UI primitives)
 12. Live preview bar (RelevancePreviewBar) — small wrapper around SearchPreview.tsx

Sprint C+1 — Relevance Phase 2 (Curations / Stopwords / Presets)
 13. Same pattern for curations, stopwords, presets — port AACSearchGen managers

Sprint D — DB-unfreeze track (gated on user approval)
 14. Project as first-class entity (with Project switcher in NavBar)
 15. SyncJob persistence
 16. AnalyticsEvent capture endpoint → unlock Analytics Phase B
 17. AuditLog → unlock real admin/audit
 18. WidgetConfig → unlock draft/published widget versioning

Sprint E — Polish + power users
 19. Mobile passes (Playground bottom-sheet, Connectors cards)
 20. Keyboard shortcuts (Cmd+K palette, Cmd+Enter, /)
 21. Cross-route approaching-limit banner (uses entitlementsRouter.plan)
 22. Webhooks & Presets routes if customer demand surfaces
```

## 6.12 What's deliberately **not** ported from AACSearchGen

To prevent scope creep:

- **InstantSearch.js + adapter** in `packages/widget` — Hard Invariant gate in SKILL.md
- **NL search models** (`AACSearch-admin/src/nl-search-models/`, `ui/components/admin/nl-models/`) — out of scope per §1.7
- **Conversations / ChatSearch** (`AACSearch-ui/packages/search-ui/src/components/ChatSearch.tsx`, `ui/components/admin/conversations/`) — out of scope per §1.7
- **Voice / visual search** (`VoiceSearch.tsx`, `voice-command-palette.tsx`, `visual-search.tsx`) — out of scope
- **Knowledge graph** (`AACSearch-saas-mksaas/.../knowledge-graph/`) — out of scope
- **Stemming dictionaries**, **debug endpoints**, **slow-request logs** — power-user features, post-v1
- **shadcn-admin** as separate shell — Hard Invariant #12: we already have supastarter SaaS shell, don't duplicate
- **MCP server** (`AACSearch-mcp`) — different product surface, not customer-facing

This list keeps the bar simple: AACsearch ships a focused **search + connectors + widget** product. Anything more is opt-in for v2+.
