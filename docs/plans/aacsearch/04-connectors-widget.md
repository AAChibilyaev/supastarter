# 04 — Connectors, Widget, Relevance & Analytics

> **Read after [03-domain-api.md](03-domain-api.md).** Concrete specs for the four "outside-the-Next.js-monorepo" surfaces: PrestaShop module, Bitrix module, hosted widget, plus the Typesense relevance defaults and analytics event schema.
>
> Status of everything in this file: ❌ **Not started.** No code exists. These specs are vision-stage and the contracts will tighten when Sprint 2 (PrestaShop) and Sprint 3 (Bitrix) actually start.

## 4.1 PrestaShop module

### Module identity

```
Name:    aacsearch
Target:  PrestaShop 8.x  (compatibility note: PrestaShop 9 hooks ≈ same API)
```

### Files (minimum)

```
modules/aacsearch/
  aacsearch.php                              # main module class (install/uninstall/hooks)
  config.xml
  controllers/
    admin/
      AdminAacSearchController.php           # /admin/AdminAacSearch
  classes/
    AacSearchClient.php                      # wraps Connector API HTTP calls
    AacSearchProductExporter.php             # normalizes products → ProductDocument shape
    AacSearchSyncQueue.php                   # batches + retry state
  views/
    templates/
      admin/configure.tpl
      hook/widget.tpl
```

### Settings page (admin form fields)

```
AACsearch API URL          (e.g. https://app.aacsearch.com)
Project ID
Connector token            (write-only; show masked after save)
Sync enabled               (bool)
Widget enabled             (bool)
Locale / language
Default currency
Batch size                 (default 200)
Debug mode                 (bool — verbose logs to /var/logs/)
```

### PrestaShop hooks used

| Hook | Why |
|---|---|
| `displayHeader` | Inject widget loader `<script>` into storefront `<head>` |
| `actionProductUpdate` | Trigger delta sync on product save |
| `actionObjectProductDeleteAfter` | Trigger delete on product removal |
| `actionUpdateQuantity` | Stock change → push delta |
| `addWebserviceResources` | Only if we expose a custom resource — likely not in MVP |

`displayHeader` is the canonical place to add `<script>` / `<link>` to the page head; `actionProductUpdate` fires after a product is saved.

### Full sync flow

```
1. Read module config.
2. Validate connector token via `POST /api/connectors/handshake`.
3. Iterate products in batches (configured batch size).
4. Normalize each product to ProductDocument shape (price, stock, categories, …).
5. Send batch to `POST /api/projects/:projectId/sync/full`.
6. Persist last-sync status row in module storage.
7. Render result on diagnostics page.
```

### Delta sync events

```
product created
product updated
product deleted
stock changed
price changed
category assignment changed
image changed
```

### Widget injection

The dashboard generates a snippet; the merchant doesn't write any JS. The module just reads the snippet from saved config and outputs it through `displayHeader`:

```html
<script
  src="https://cdn.aacsearch.com/widget.js"
  data-project-id="PROJECT_ID"
  data-locale="ru"
  data-container="#aac-search"
></script>
```

### Acceptance criteria

```
✓ Merchant installs the module from PrestaShop admin.
✓ Merchant opens AACsearch settings.
✓ Merchant enters API URL, project ID, connector token.
✓ Connection test succeeds.
✓ Full sync sends products to AACsearch.
✓ Updated product is re-indexed.
✓ Deleted product is removed.
✓ Widget appears when enabled.
✓ Diagnostics show API status, last sync, product count, errors.
✓ Uninstall flow leaves no orphaned cron / data.
```

## 4.2 Bitrix module (self-hosted 1C-Bitrix)

### Module identity

```
Name:    aac.search
Target:  1C-Bitrix 24+, on-premise, with iblock/catalog
```

> **Bitrix24 cloud REST is a separate connector track** — it uses REST/OAuth/webhooks and different catalog methods (`catalog.catalog.list`, product/SKU/offer methods, inventory methods). Not in MVP; revisit after self-hosted Bitrix lands.

### Layout

```
/local/modules/aac.search/
  install/
    index.php                 # install/uninstall + version
    version.php
  lib/
    Client.php                # HTTP client to Connector API
    ProductExporter.php       # normalizes Bitrix product → ProductDocument
    SyncAgent.php             # background agent (Bitrix's cron analog)
    EventHandlers.php         # iblock event listeners
  admin/
    aac_search_settings.php
    aac_search_diagnostics.php
  options.php
```

### Settings (admin form fields)

```
AACsearch API URL
Project ID
Connector token
IBlock / catalog selection      (multi-select)
Price type
Currency
Sync interval                   (minutes)
Widget mode                     (auto-inject | manual placement | component)
Debug mode
```

### Full sync flow

```
1. Admin selects catalog / iblock.
2. Module exports products + sections + prices + stock.
3. Module normalizes payload → ProductDocument.
4. Module sends batches to AACsearch Connector API.
5. AACsearch creates indexing job(s); module polls jobId for status.
6. Dashboard shows job status.
```

### Delta event handlers

```
OnAfterIBlockElementAdd
OnAfterIBlockElementUpdate
OnAfterIBlockElementDelete
OnPriceUpdate                  (if catalog module is active)
OnIBlockSectionUpdate
```

### Background work

Use a **Bitrix agent**:

```php
\Aac\Search\SyncAgent::run();
```

For periodic full-sync retries and delta-buffer drain.

### Widget / component

Three placement modes a merchant can choose from settings:

```
1. Auto-inject in template area (header/footer)
2. Bitrix component aac:search.widget — placed manually in template
3. Manual placement — merchant copies snippet into template
```

### Acceptance criteria

```
✓ Module installs.
✓ Admin configures API URL, project, token, catalog.
✓ Connection test succeeds.
✓ Full catalog sync works.
✓ Changed product updates index.
✓ Deleted product disappears.
✓ Widget / component renders on storefront.
✓ Diagnostics show module version, API status, last sync, failed jobs.
```

## 4.3 Hosted search widget

### Tech decisions

```
Adapter:       typesense-instantsearch-adapter
UI engine:     instantsearch.js
Isolation:     Shadow DOM (preferred)  ─ namespaced CSS as fallback
Distribution:  hosted JS bundle on cdn.aacsearch.com
Bootstrap:     widget reads project config from /api/search/:projectId/config
```

The Typesense InstantSearch adapter exposes Typesense to InstantSearch widgets (`searchBox`, `hits`, `refinementList`, …). We wrap it with our auth gate so the widget never sees an admin key.

### Modes

| Mode | MVP? |
|---|---|
| `inline` — embedded into a page region | ✅ |
| `modal` — opens over content on hotkey / button | ✅ |
| `autocomplete-only` — search box without results page | ⏳ post-MVP |
| `results-page` — dedicated `/search` route | ⏳ post-MVP |

### UI states

```
idle                — pre-query, can show suggested categories
loading             — query in flight
results             — hits + facets + sort
no-results          — friendly empty state, may suggest queries
error               — degraded mode, still shows search input
offline / fallback  — cache-first if last query was successful
```

### Config (read from dashboard, signed bootstrap)

```
projectId
locale
container               # CSS selector
theme                   # light | dark | auto + accent
layout                  # inline | modal
showPrices              # bool
showImages              # bool
filters                 # ordered list of facet ids
sortOptions             # which sorts to expose
trackingEnabled         # bool
```

### Events emitted (forwarded to AACsearch analytics)

```
widget_open
search_query
zero_results
result_click
filter_used
sort_used
```

### Acceptance criteria

```
✓ Widget loads from CDN with one <script>.
✓ Widget does not break shop CSS (Shadow DOM verified on PrestaShop + Bitrix default themes).
✓ Widget uses public/search-only key — admin key never reaches browser.
✓ Widget respects allowedOrigins set on the API key.
✓ Widget supports facets + sorting + click tracking + no-results state.
```

## 4.4 Typesense MVP relevance

### MVP search parameters

```yaml
query_by:
  - title           # weight: highest
  - sku             # weight: high
  - brand           # weight: medium
  - categories      # weight: medium
  - description     # weight: lower
  - tags            # weight: lower

filter_by:
  - project_id      # always — tenant boundary
  - availability
  - categories      (or category_ids)
  - brand
  - price           (range)
  - locale

sort_by:
  - _text_match:desc          # default
  - price:asc | price:desc
  - sale_price:asc | sale_price:desc
  - created_at:desc           # "newest"
```

### MVP feature surface

```
collections
documents import / upsert / delete
search
filtering / faceting / sorting
highlighting
multi_search
scoped / search-only API keys
alias-based zero-downtime schema migration
```

### Beta relevance (next)

```
synonyms (global synonym sets — Typesense v30 surface)
curations (global curation rules)
stopwords
presets
zero-results suggestions
ranking profiles per-project
```

### Growth relevance (later)

```
hybrid search (BM25 + vector)
semantic search
natural language search
conversation search / AI assistant
MMR diversification
personalization
union search
JOINs across related entities
recommendations
```

> Typesense v30.1 promotes **synonyms** and **curations** to top-level global resources and adds MMR diversification, JOIN improvements, union search, dynamic facet sampling, analytics rule changes. Architecture decision: synonym sets and curation sets are owned **per project**, not encoded as fields on the product. This is what the Beta-relevance work will land.

## 4.5 Analytics — event schema

### MVP dashboard cards

```
Total searches              (period)
Unique search sessions      (period)
Top queries
Zero-result queries
Top clicked products
CTR (overall)
Searches over time          (sparkline)
```

### Event schema (`AnalyticsEvent`)

```yaml
projectId:        string
sessionId:        string         # ephemeral, browser tab/session bound
anonymousUserId:  string         # stable per browser, may be null in privacy mode
type:             string         # see table below
query:            string?
productId:        string?        # for click events
position:         int32?         # 1-indexed rank in result list
filters:          object?        # selected facets
sort:             string?
locale:           string
userAgent:        string         # capped to 256 chars
referrer:         string?
metadata:         object?        # capped JSON, opaque, no PII
timestamp:        int64
```

### Required events

| Event | Priority | Owner |
|---|---|---|
| `search_query` | P0 | widget / SDK |
| `zero_results` | P0 | widget / SDK |
| `result_click` | P0 | widget / SDK |
| `widget_open` | P1 | widget |
| `filter_used` | P1 | widget |
| `add_to_cart` | P1 | CMS module (PrestaShop hook / Bitrix event) |
| `conversion` | P1 | CMS module (order confirmation) |

### Acceptance

```
✓ Every search query is tracked.
✓ Zero-result queries are visible in the dashboard.
✓ Click events carry `productId` and `position`.
✓ Analytics is isolated per project.
✓ Dashboard shows last 7 / 30 days windows.
✓ No PII stored (no email, no full IP — only userAgent + locale + referrer).
```

### PII / privacy posture

```
DO NOT store:
  ─ full IP                (only country derivation if needed)
  ─ user email             (analytics is anonymous)
  ─ raw query string of    user-identifying params from referrer

DO store:
  ─ sessionId              (random, ephemeral)
  ─ anonymousUserId        (random, opt-out via cookie/header)
  ─ search query           (the search itself; this is the product)
```
