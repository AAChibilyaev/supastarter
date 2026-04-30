# 08 — Collections & Documents CRUD UX

> **Read after [06-ui-pages.md §6.2.3](06-ui-pages.md).** This file zooms into the two surfaces customers spend the most time in: **managing the schema** of a collection (fields, types, defaults) and **managing the documents** inside it (rows, filters, bulk ops).
>
> Goal: editing/filtering must feel as fast as a spreadsheet, not a CRUD admin panel from 2010.

## 8.0 What's already in code (don't reinvent)

| Surface                     | Component                      | Status                                         | Gap to fill                                          |
| --------------------------- | ------------------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| List of collections         | `SearchIndexesList.tsx`        | ✅ shipped                                     | Bulk-select, density toggle                          |
| Create collection           | `CreateSearchIndexDialog.tsx`  | ✅ shipped — but uses JSON textarea for fields | Replace with structured form + drag-reorder          |
| Row actions                 | `IndexRowActions.tsx`          | ✅ shipped                                     | Verify: Reindex / Duplicate / Export schema / Delete |
| Doc upsert (oRPC)           | `searchRouter.upsertDocument`  | ✅ shipped                                     | UI consumer missing                                  |
| Doc bulk import (oRPC)      | `searchRouter.importDocuments` | ✅ shipped                                     | UI consumer missing                                  |
| **Documents table UI**      | (none)                         | ❌ **biggest gap**                             | Full design below                                    |
| **Collection detail route** | (none)                         | ❌ **biggest gap**                             | `[indexSlug]/` route below                           |
| **Schema diff preview**     | (none)                         | ❌                                             | Required when editing live schema                    |

## 8.1 npm package decisions

The repo already has `react-hook-form + zod + recharts + sonner + 27 shadcn primitives`. Below are the additions needed for a great CRUD experience, each justified.

### Add (recommended)

| Package                                   | Why                                                                                                                                                                                                                         | Size              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **`@tanstack/react-table`**               | Headless table primitive — column sorting, filtering, pagination, row selection, column visibility, sticky headers. **Industry standard**. The shadcn `table.tsx` is just the visual shell; React Table provides the logic. | ~12kb gz          |
| **`@tanstack/react-virtual`**             | Row virtualization — required when rendering > 200 docs without scroll lag. Pairs with React Table.                                                                                                                         | ~3kb gz           |
| **`use-debounce`** _(or in-house)_        | Debounced filter input. Tiny, well-tested. Alternative: 8-line custom hook in `apps/saas/modules/shared/hooks/use-debounced-value.ts` (cheaper).                                                                            | < 1kb gz          |
| **`papaparse`**                           | CSV parsing for bulk import. Standard, streams large files.                                                                                                                                                                 | ~13kb gz          |
| **`@dnd-kit/core` + `@dnd-kit/sortable`** | Drag-reorder fields in schema editor + columns in documents table. **Already a Radix-friendly choice**.                                                                                                                     | ~10kb gz combined |

Total add: ~38kb gz. All loaded **only on the relevant route** (Next.js code splitting).

### Keep what we have, do NOT add duplicates

| Function                       | Use existing                                                                                                     | Don't add                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Forms                          | `react-hook-form` + `zod` (already used in `CreateSearchIndexDialog.tsx`)                                        | ~~`@tanstack/react-form`~~                                             |
| Date picker                    | `react-day-picker` (already in shadcn `calendar.tsx`)                                                            | ~~standalone date lib~~                                                |
| Command palette / quick-search | shadcn `command.tsx` (uses `cmdk` under the hood)                                                                | ~~separate cmdk install~~                                              |
| Toasts                         | `sonner` (already used in `WidgetPanel`/`SearchApiKeysPanel`)                                                    | ~~react-toastify, etc.~~                                               |
| JSON inspector                 | hand-rolled `<pre>{JSON.stringify(obj, null, 2)}</pre>` inside a `Card` for v1; copy button via existing pattern | ~~`react-json-view`, `@textea/json-viewer` until proven insufficient~~ |
| Charts                         | `recharts` (already in `StatsTileChart`)                                                                         | ~~chart.js, victory, etc.~~                                            |

### Defer (only add if v1 surface proves limiting)

| Package                                    | When to add                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `react-resizable-panels`                   | If users ask for split-pane "documents list + edit panel" layout                                         |
| `@uiw/react-codemirror` or `monaco-editor` | If users need code-style editing of large JSON docs (today: `<textarea>` is fine for < 5KB)              |
| `react-hotkeys-hook`                       | If keyboard-shortcut surface grows past 5 commands (today: native event listeners suffice)               |
| `react-virtuoso`                           | Alternative to `@tanstack/react-virtual` — only if React Table's virtualization story turns out limiting |

### Per Hard Invariant #14

After adding any package: `pnpm install`, then verify `ls -l node_modules/@tanstack/react-table` shows it resolves. Also add to `pnpm-workspace.yaml` `catalog:` if multiple packages will use it.

## 8.2 Route map

```
[organizationSlug]/search/                            ← Indexes list (✅ exists)
[organizationSlug]/search/[indexSlug]/                ← Collection detail (NEW) — tabs:
   ?tab=overview     │  Health, doc count, last reindex, recent activity     (default)
   ?tab=schema       │  Fields editor + diff preview
   ?tab=documents    │  Documents table — heart of this doc
   ?tab=api          │  Curl examples, scoped tokens for this index
   ?tab=settings     │  Display name, default sort, allowed origins, danger zone
```

URL state (not nested file routes) — keeps the route file tree flat and lets us implement tabs as `TabGroup` (existing in `apps/saas/modules/shared/components/`).

Why one route with tabs instead of nested routes:

- Customers expect to switch tabs without page reload (preserve filter state, scroll position, draft edits).
- Server data dependencies overlap (all 5 tabs need the index meta).
- Matches the existing pattern in the codebase (`SearchDashboard.tsx` already uses tabs for org-level search dashboard).

## 8.3 Collection list page (`SearchIndexesList.tsx` improvements)

Today the list shows: name, slug, doc count, last updated, [Open] action. Improvements:

| Add                                       | Why                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Bulk-select column (checkbox)             | Multi-select for: bulk reindex, bulk delete, bulk export schema                                                |
| Bulk-action bar (sticky bottom)           | Appears when > 0 selected — actions: `Reindex selected`, `Export schemas`, `Delete (with confirm)`             |
| Density toggle (compact / comfortable)    | User preference, persisted in `localStorage`. Compact = 32px row, comfortable = 48px                           |
| Quick-search field (debounced)            | Filter by display name OR slug substring, client-side (lists are small — < 100 indexes per org)                |
| Status badge per row                      | green = healthy, amber = partial-fail in last sync, red = reindex stuck > 1h                                   |
| "Owner" column when org+user contexts mix | shows org logo or user avatar — relevant per [§6.7 owner discriminator](06-ui-pages.md#67-owner-discriminator) |

Composition (no new shadcn primitives needed):

```tsx
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
} from "@tanstack/react-table";

// 1 hook + existing Table primitives. ~80 lines total.
```

## 8.4 Collection detail — Schema tab

The current `CreateSearchIndexDialog` accepts JSON like:

```json
[
	{ "name": "title", "type": "string" },
	{ "name": "tags", "type": "string[]", "facet": true, "optional": true }
]
```

That's developer-friendly but customer-hostile. Replace with:

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [+ Add field]                       [Import JSON] [Export JSON]    │  ← toolbar
├─────────────────────────────────────────────────────────────────────┤
│ ⠿ id           string         [pk] [auto]              [⚙ ⋯]      │  ← row
│ ⠿ title        string         [searchable] [required]  [⚙ ⋯]      │
│ ⠿ price        float          [filter] [sort]          [⚙ ⋯]      │
│ ⠿ tags         string[]       [facet] [optional]       [⚙ ⋯]      │
├─────────────────────────────────────────────────────────────────────┤
│ Default sort:  [created_at:desc      ▾]                            │
└─────────────────────────────────────────────────────────────────────┘
[Cancel]                                          [Preview diff] [Save]
```

### Row interactions

- **`⠿` drag handle** → reorder fields (visual only — Typesense doesn't care about order, but customer mental model does). Powered by `@dnd-kit/sortable`.
- **Inline name edit** — click name → input. `Enter` to save, `Esc` to cancel.
- **Type popover** — click type → `Popover` with the 13 Typesense types (`string`, `int32`, `int64`, `float`, `bool`, `string[]`, `int32[]`, `int64[]`, `float[]`, `bool[]`, `object`, `object[]`, `auto`).
- **Toggle badges** (`searchable`, `facet`, `filter`, `sort`, `optional`, `index`, `infix`, `locale`) — click to toggle inline. Only valid combinations enabled (e.g. `facet` doesn't apply to `object[]`).
- **`⚙` advanced** → opens `Sheet` from right with: `default value`, `validators`, `embedding source`, `locale`.
- **`⋯` row menu** → Duplicate, Move-to-top, Delete.

### Add field

Plus button at top opens a small inline row at bottom of list (not a dialog) with the same row UX. Submitting via `Enter` adds + focuses next "Add field" input — fast keyboard flow.

### Preview diff (critical)

When schema is edited on a **populated** index, hitting [Save] without confirmation is dangerous. The flow:

1. [Preview diff] button compares draft vs current. Shows in a `Dialog`:

```
─ Schema changes ─────────────────────────────────────────────────
 + Field 'description' added (string, optional)
 ~ Field 'price' changed: filter+sort → filter+sort+facet
 - Field 'sku_legacy' removed
─ Impact ─────────────────────────────────────────────────────────
 • 12,304 documents affected
 • Reindex required: yes (alias swap, ~2 min downtime estimate: 0s)
 • Search service available throughout (zero-downtime via reindexCollection)
 • Old version v3 kept as rollback target
─────────────────────────────────────────────────────────────────
[Cancel] [Save schema only — won't reindex] [Save + reindex now]
```

2. "Save schema only" updates Prisma row but doesn't call Typesense. Useful for staged rollout.
3. "Save + reindex now" triggers `searchRouter.reindex` (existing proc). UI watches alias-swap progress via `searchRouter.usage` polling.

### When DB unfreezes

Today schema lives partly in Prisma `SearchIndex` (`displayName`, `defaultSortingField`) and partly in Typesense (the actual fields array via `createPhysicalCollection`). To unify, a future `SearchIndex.fieldsJson: Json` column would hold the canonical field list — but that's a DB change. Schema editor works today against Typesense's `/collections/:name` endpoint via a new `searchRouter.updateSchema` proc.

## 8.5 Collection detail — Documents tab (the heart)

This is the spreadsheet-grade surface. Customers will spend 80% of their dashboard time here.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Search docs... ⏎]      [+ Filter] [+ Filter]      [Columns ▾] [Density ▾] │  ← Toolbar (sticky)
├──────────────────────────────────────────────────────────────────────────────┤
│ ☐  id        title              brand    price    in_stock   updated_at    │  ← Header (sticky)
│    └────────────────────────────────────────────────────────────────────── │
│ ☑  4521      Running shoes      Nike     8990     ✓          2 min ago     │  ← Row (selectable, hoverable)
│ ☐  4522      Running shoes Pro  Nike     12990    ✓          2 min ago     │
│ ☐  4523      Sandals            Adidas   3490                yesterday     │  ← unchecked in_stock = grey
│ ...                                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│  Showing 1–50 of 12,304   [< prev] [next >]      Selected: 1 / 12,304       │  ← Pagination + selection state
└──────────────────────────────────────────────────────────────────────────────┘
```

When a row is selected:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  1 selected   [Edit] [Duplicate] [Delete] [Export] [Reindex]    [Clear]     │  ← Bulk action bar (slides in)
└──────────────────────────────────────────────────────────────────────────────┘
```

### Row click → side drawer (not page nav)

Clicking a row opens a `Sheet` from right with:

```
─ Document #4521 ───────────────────────────── [⌘+K save] [Esc close] [Delete]
 [Edit] [Raw JSON]
─ title ─
   Running shoes
─ description ─ (auto-grow textarea)
   …
─ tags (string[]) ─
   [+ tag]   [running] [shoes] [nike]  ← chips with ✕
─ price (float) ─
   [ 8990.00 ] (with currency suffix from collection.currency)
─ in_stock (bool) ─
   [ ◉ true   ◯ false ]
─ created_at, updated_at ─
   read-only
```

- All fields rendered per type (string→input, string[]→tag-chips, bool→radio, float/int→number, object→nested form, object[]→repeater).
- **Inline save**: `Cmd+Enter` saves and stays open; `Cmd+K` saves and closes; `Esc` discards.
- **Optimistic update** in the table (so close-edit-reopen doesn't lag).
- **Raw JSON tab** for power users — full document as editable JSON (validated on save).

Why drawer not page nav: preserves filter / scroll / selection in the table behind. This is the single biggest UX win vs. supabase-style admin tools that lose state on row click.

### Inline editing in the table itself

For fast updates without opening drawer:

- **Single-click** a cell to enter edit mode (only for editable types: string, number, bool, single-value enum).
- **Tab/Shift+Tab** moves between editable cells horizontally.
- **Enter** moves down (spreadsheet-style).
- **Esc** cancels current cell.
- **Cmd+Z** undoes last cell change (per-row, not global).

Implementation: react-table's `meta` field on column def + custom `cell` renderer that toggles between view/edit. ~150 lines for the cell-edit primitive, reused across all cells.

### Filter system — three tiers

**Tier 1 — quick search**
Top-left input. Debounced 300ms. Hits `searchRouter.search` with `q` only — server-side full-text. URL state: `?q=…`.

**Tier 2 — chip filters**
Inline below toolbar after first chip added. Each chip is `field operator value`:

```
[brand = Nike  ✕]  [price < 5000  ✕]  [in_stock = true  ✕]  [+ Filter]
```

Click chip → `Popover` to edit. Click `[+ Filter]` → field picker → operator picker → value picker (type-aware, with autocomplete from existing values via Typesense facet counts).

URL state: `?filter=brand:Nike;price:<5000;in_stock:true` — shareable links.

**Tier 3 — advanced filter expression**
Click "Show as expression" in chip bar → dropdown to a single line that mirrors Typesense `filter_by` syntax with **inline syntax check**:

```
brand:=Nike && price:<5000 && in_stock:=true
```

Inline parse error highlighting (red caret + tooltip). Power users live here. Saves as same URL state.

### Column controls

- **`[Columns ▾]` popover** — checkbox list of fields to show. Order via drag (reuses `@dnd-kit/sortable` from schema editor).
- **`[Density ▾]`** — compact / comfortable / spacious row heights.
- Column **header right-click** → Sort asc/desc, Group by, Hide column, Pin left/right.
- Column **drag-resize** by dragging right border — saves to `localStorage` per index.
- **Persisted preferences**: column visibility + order + width + density per `(userId, indexSlug)` in `localStorage`. Server-side persistence in a future `UserPreference` model (DB-frozen for now).

### Pagination + virtualization

For typical < 1k docs: standard pagination, 50 rows per page.
For > 1k docs: switch to **infinite scroll with `@tanstack/react-virtual`**. Server-side cursor pagination via Typesense's `page` + `per_page` params (already in `searchDocuments` API).

Decision threshold: `total_count > 500 || rendered_in_dom > 200` → virtualize.

### Export

Toolbar `[Export ▾]` → CSV / JSON / NDJSON. Streams from `searchRouter.search` with `per_page=250` paged calls until done. Progress in toast. Cancel via toast button.

### Bulk actions

Selecting rows enables the bulk action bar. Operations:

| Action               | Confirm                                                                  | API                                            |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| Edit common field    | inline value picker → preview "12 docs will get tags=archived" → confirm | `searchRouter.bulkUpdate` (NEW — needed)       |
| Duplicate            | optional id-prefix input                                                 | client loop over `upsertDocument` with new ids |
| Delete               | typed confirm "delete 12 documents"                                      | `searchRouter.bulkDelete` (NEW — needed)       |
| Export               | format picker                                                            | as above                                       |
| Reindex (re-process) | none                                                                     | `searchRouter.reindex`                         |

**New procs needed**: `bulkUpdate`, `bulkDelete`. Both go through `enqueueManySearchIngest` to preserve [DB-first ingest](../../.claude/skills/supastarter-nextjs-skill/SKILL.md) (Hard Invariant #2).

## 8.6 Bulk import flows

Three entry points from the empty-state and from the toolbar:

### A. Drag-and-drop / file picker (CSV or JSON)

```
┌───────────────────────────────────────────────────────┐
│   📂 Drop CSV / JSON here                              │
│      or click to browse                                │
│                                                        │
│   Tip: first row of CSV is field names — must match    │
│   collection schema. Mismatches will be shown before   │
│   import.                                              │
└───────────────────────────────────────────────────────┘
```

After file dropped:

1. **Parse** with `papaparse` (CSV) or `JSON.parse` — client-side.
2. **Map columns** — auto-match by name; show `Source column → Target field` table where mismatches are red. Customer can fix mappings inline.
3. **Preview first 5 rows** — rendered with target types applied (validation errors highlighted).
4. **Confirm + run**. Background job (uses existing `enqueueManySearchIngest` + buffer worker).
5. **Live progress** — sticky toast: "Imported 1,234 / 12,304 docs" with [Cancel].

### B. Paste JSON / NDJSON

For dev users — modal with `<textarea>`. Same parse → preview → confirm flow.

### C. Connect a CMS (PrestaShop / Bitrix)

Cross-link to Connectors page. Empty state in Documents tab includes:

> "Have 1k+ products? Connect PrestaShop or Bitrix instead — automatic sync."

## 8.7 Empty / Loading / Error

| State                         | Documents tab UI                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty** (0 docs)            | Centered card: "No documents yet. Drop a CSV, paste JSON, or connect a CMS." Three buttons → drop zone, paste dialog, Connectors page. |
| **Loading initial**           | Skeleton table (10 rows, animated shimmer). Same layout as real table — no shift on load.                                              |
| **Loading filter / page**     | Inline progress bar at top of table; rows stay visible (don't blank out).                                                              |
| **Error**                     | Inline `Alert` above table with retry button. Don't wipe rows on transient errors.                                                     |
| **Quota exceeded**            | Toolbar disabled; banner: "Search quota reached for this month — upgrade or wait until {date}." Read-only mode still works.            |
| **Schema mismatch on import** | Modal showing the mismatches with suggested fixes. Don't blanket-fail — let customer fix and retry.                                    |

## 8.8 Keyboard shortcuts (Documents tab)

| Key                          | Action                               |
| ---------------------------- | ------------------------------------ |
| `/`                          | Focus quick-search                   |
| `f`                          | Open `[+ Filter]` picker             |
| `c`                          | Open `[Columns ▾]` popover           |
| `n`                          | New document (drawer in create mode) |
| `↑ / ↓`                      | Move row selection                   |
| `Enter`                      | Open drawer for highlighted row      |
| `Space`                      | Toggle row checkbox                  |
| `Cmd+A`                      | Select all (with confirm if > 1k)    |
| `Cmd+Z`                      | Undo last cell edit                  |
| `Esc`                        | Close drawer / cancel cell edit      |
| `Cmd+K`                      | Save current edit and close drawer   |
| `Delete` (when row selected) | Delete with confirm                  |

## 8.9 Mobile (375×667)

- Documents table → cards: each row collapses into a card showing `id` + title field + 2 most-relevant fields. Tap card → drawer (full-screen on mobile).
- Filter toolbar → bottom-sheet (hidden until `[Filter]` tap).
- Bulk actions → fixed bottom bar.
- Column visibility: not exposed on mobile (5 columns max in card; user can change which 5 in desktop, persists across).

## 8.10 Accessibility

- All interactive elements have keyboard equivalents.
- ARIA labels on density toggles, sort handles, filter chips.
- Drag handles announce position changes via `aria-live` ("Field title moved to position 2").
- Focus management: closing drawer returns focus to the row that opened it.
- Color is never the only signal (status badges have icons too).

## 8.11 Implementation sequence

```
Sprint X — Documents CRUD MVP (no DB unfreeze)
  1. Add deps:  @tanstack/react-table  @tanstack/react-virtual  papaparse
              @dnd-kit/core @dnd-kit/sortable                       [pnpm install]
  2. New route: [organizationSlug]/search/[indexSlug]/page.tsx
       URL state for ?tab=...                                       [tabs reuse TabGroup]
  3. Component: DocumentsTable.tsx
       useReactTable + virtualization                                [no DB change]
  4. Component: DocumentDrawer.tsx
       Sheet from right, dynamic field renderer per type             [reuses upsertDocument]
  5. Component: DocumentFilterChips.tsx
       Tier 1 + Tier 2 filters (chips)                               [URL state]
  6. Component: DocumentBulkActionBar.tsx                            [needs bulkUpdate, bulkDelete procs]
  7. New procs: searchRouter.bulkUpdate / bulkDelete
       go through enqueueManySearchIngest                            [Hard Invariant #2]
  8. Component: DocumentImportDialog.tsx (CSV + JSON paste)
       papaparse client-side, schema-mapping UI

Sprint X+1 — Schema editor MVP
  9. Component: SchemaFieldsEditor.tsx
       drag-reorder + inline edit + type popover                     [@dnd-kit]
 10. Component: SchemaDiffPreview.tsx
       diff vs current, impact summary, [Save / Save + reindex]
 11. New proc: searchRouter.updateSchema
       wraps Typesense /collections/:name PATCH

Sprint X+2 — Polish
 12. Inline cell editing in DocumentsTable                            [react-table meta]
 13. Tier 3 advanced filter expression with parser
 14. Column visibility / order / width persistence (localStorage)
 15. Density toggle, density per index (localStorage)
 16. Export streaming with progress toast
 17. Mobile card view + bottom-sheet filter

Sprint X+3 — Power users
 18. Keyboard shortcuts (10 hotkeys)
 19. `Cmd+Z` undo (per-row, last 50 changes)
 20. Saved filter presets (localStorage; promote to DB when unfrozen)
```

## 8.12 Performance budget

- **Initial table render** (50 rows): < 50ms (skeleton → real).
- **Filter debounce → first row update**: < 600ms (300ms debounce + 200ms server + 100ms paint).
- **Drawer open**: < 100ms (data is in the row already; no extra fetch unless full doc differs).
- **Inline cell save**: optimistic update + background `upsertDocument`; error → rollback + toast.
- **Bulk delete 1k docs**: < 5s perceived (job-mode with progress bar, table updates as docs disappear).
- **Page hydration on slow 3G**: server-render the first 50 rows; virtualization kicks in only after hydration.

## 8.13 What this design deliberately rejects

- ❌ **Spreadsheet replica** (full Excel-like UX) — too heavy. Inline edit of single cells is enough.
- ❌ **Drag-resize columns to "auto-fit content"** — always proportional to viewport.
- ❌ **Column groups / pivot tables** — out of scope for v1 (analytics has its own surface).
- ❌ **Realtime collab cursors** — single-tenant editing only.
- ❌ **Undo across navigation** — undo dies when leaving the route. Saved server-side undo is a future feature gated on DB unfreeze (audit log).
- ❌ **Direct Typesense raw API access** — no "execute arbitrary Typesense query" surface. All goes through `searchRouter.search` with auth/quota.

## 8.14 Definition of "Documents CRUD done"

Customer journey:

```
Open collection → see 12k docs in < 1s →
type "nike" in quick-search → results filter in < 600ms →
click [+ Filter] → field=price, op=<, value=5000 → chip added →
select 3 rows → bulk-edit tags=archived → confirm →
optimistic update visible immediately, background job runs →
toast "3 docs updated" appears →
click row → drawer opens → edit description → Cmd+K saves and closes →
row reflects new value → done.
```

Plus:

- ✅ All 5 locales translated.
- ✅ Mobile usable (cards + bottom-sheet).
- ✅ Keyboard-only navigation works for all common actions.
- ✅ Accessibility audit passes.
- ✅ Performance budget hit on a seeded org with 10k docs.
