# Collection Regex Patterns for API Keys

> Part of AAC-640: Расширить API Keys
> Implements feature 2: Collection regex patterns

## Goal

Allow API keys to match multiple collections via regex pattern instead of being tied to a single `indexId`. This enables keys like `collections: ["org_abc_.*"]` that work across all collections matching the pattern.

## Current Architecture

- `SearchApiKey.indexId` links a key to exactly one `SearchIndex`
- During auth, `verifySearchApiKey` returns `indexId` + `indexSlug`
- The search middleware checks the requested slug against the verified key's slug

## Required Changes

### 1. DB Schema (NEW — blocked by Gate A)

Add `collectionPattern` column to `SearchApiKey`:

```prisma
model SearchApiKey {
  // ... existing fields
  collectionPattern String?  // Regex pattern, e.g. "org_abc_.*"
}
```

When `collectionPattern` is set, `indexId` becomes optional (or the pattern overrides the index check).

### 2. Create Flow (done — input schema accepts it)

- `create-api-key.ts` input: `collectionPattern?: string` ✅
- `v1/keys.ts` input: `collectionPattern?: string` ✅
- DB function: `createSearchApiKey` accepts it (no-op for now) ✅

### 3. Auth Gate Changes

In `verifySearchApiKey` (packages/search/lib/verify.ts):

- If `collectionPattern` is set on the key, skip the `indexId` → slug match
- Instead, match the requested slug against `new RegExp(collectionPattern)`
- Works for both SaaS auth (`public-auth.ts`) and V1 auth (`auth.ts`)

In `gatePublicSearchRequest`:

- When checking `allowedSlugs`, use regex match if key has `collectionPattern`

### 4. List Keys Output

The `list-api-keys.ts` and V1 `keys.ts` should return `collectionPattern` when set.

## Implementation Status

| Step                                      | Status                    |
| ----------------------------------------- | ------------------------- |
| Input schema (oRPC + V1)                  | ✅ DONE                   |
| DB function signature                     | ✅ DONE                   |
| DB migration (`collectionPattern` column) | ❌ BLOCKED (Gate A)       |
| Auth gate regex matching                  | ❌ BLOCKED (needs column) |
| List API keys output                      | ❌ BLOCKED (needs column) |
