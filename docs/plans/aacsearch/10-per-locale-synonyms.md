# AAC-911: Per-locale Synonyms + Alt-corrections

## Current State

### Already in schema (no changes needed)

- `SearchIndexSynonym.locale` — `String? @default("en")` ✅
- `GlobalSynonymSet.locale` — `String? @default("en")` ✅

### Not implemented

- `syncSynonymsToTypesense()` ignores locale — creates one set per root regardless
- No SynonymType field (alt_correction vs synonym) — needs new schema field ❌
- No locale-aware synonym filtering in search queries

## Per-locale Implementation (no schema changes)

### 1. Locale-aware synonym sync

Modify `syncSynonymsToTypesense()` to create separate Typesense synonym sets per locale:

```
Current: syn_collection_root
New:     syn_collection_root_en, syn_collection_root_de, ...
```

- ID format: `syn_{collection}_{locale}_{root}`
- Pass locale from the DB record through to the sync function
- When deleting stale sets, match by prefix per locale

### 2. Locale-aware query filtering

When search has a `locale` context (from `detectLanguage()` or user preference):

- Filter applicable synonyms to those matching the locale or universal (null locale)
- Apply only matching synonym sets during the search

### 3. Affected files

- `packages/search/lib/synonyms-sync.ts` — sync flow
- `packages/search/lib/search.ts` — search query building
- `packages/api/modules/search/public-handler.ts` — locale detection
- `packages/database/prisma/queries/search.ts` — synonym queries

## Alt-corrections (needs schema change)

### Blocker

- New `SynonymType` enum: `synonym | alt_correction`
- Typesense supports `root_replacement` + `one_way` for one-directional corrections
- Must add field to `SearchIndexSynonym` and `GlobalSynonymSet` models

### When unfrozen

- Add `type` field (default: "synonym")
- For alt_corrections: sync to Typesense with `one_way: true`
- In search: alt_corrections get boosted via `query_by` weighting or prefix match

## Plan

| Phase | Action                                                     | Schema? |
| ----- | ---------------------------------------------------------- | ------- |
| 1     | Locale-aware synonym sync (modify syncSynonymsToTypesense) | No      |
| 2     | Locale-based synonym filtering in search pipeline          | No      |
| 3     | Admin UI locale selector for synonym creation/editing      | No      |
| 4     | Alt-corrections: SynonymType + one_wayTypesense support    | Yes     |
