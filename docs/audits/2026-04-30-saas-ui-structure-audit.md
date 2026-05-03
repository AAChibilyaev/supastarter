# SaaS UI structure audit — 2026-04-30

## Scope

Audit and cleanup of SaaS dashboard UI structure in `apps/saas` with focus on:

- route wrapper → feature component mapping
- `search` module folder overload
- orphan / duplicate / ambiguous component cleanup
- inconsistent folder naming in `admin`
- domain leakage for `knowledge`

## Intentional architecture confirmed

The repo still follows the expected 3-layer structure:

1. `apps/saas/app/**/page.tsx` — thin Next.js route entrypoints
2. `apps/saas/modules/**` — feature/domain components
3. `packages/ui/components/**` — shared UI primitives

Deep App Router route groups like `(authenticated)/(main)/(organizations)` are structural noise, not debt.

## Module TSX counts

- `shared`: 25
- `search`: 23
- `settings`: 17
- `organizations`: 15
- `admin`: 11
- `payments`: 10
- `auth`: 9
- `onboarding`: 2
- `knowledge`: 1
- `ai`: 1

Result: `search` is still one of the heavier domains, but it is no longer a single flat component bucket.

## Page → feature component map

### Organization dashboard routes

- `/{organizationSlug}/overview` → `@search/components/pages/OverviewPage`
- `/{organizationSlug}/getting-started` → `@search/components/pages/GettingStarted`
- `/{organizationSlug}/search` → `@search/components/pages/SearchDashboard`
- `/{organizationSlug}/search/[indexSlug]` → `@search/components/pages/CollectionDetail`
- `/{organizationSlug}/analytics` → `@search/components/cards/SearchAnalyticsCards`
- `/{organizationSlug}/relevance` → `@search/components/pages/RelevanceTabs`
- `/{organizationSlug}/connectors` → `@search/components/pages/ConnectorsPage`
- `/{organizationSlug}/import-jobs` → `@search/components/panels/ImportJobsPanel`
- `/{organizationSlug}/knowledge` → `@knowledge/components/KnowledgeWorkbench`
- `/{organizationSlug}/settings/billing` → `@search/components/sections/BillingPlanInfo`

### Alias / redirect routes

These now redirect into the canonical search workspace instead of owning duplicate page implementations:

- `/{organizationSlug}/api-keys` → redirects to `/{organizationSlug}/search?tab=apiKeys`
- `/{organizationSlug}/preview` → redirects to `/{organizationSlug}/search?tab=playground`

## Structural cleanup applied

### 1) Search module decomposed by role

Previous problem: `apps/saas/modules/search/components/` mixed pages, dialogs, tables, cards, panels, and unrelated domain UI in one flat folder.

Current structure:

- `components/pages/`
    - `CollectionDetail.tsx`
    - `ConnectorsPage.tsx`
    - `GettingStarted.tsx`
    - `OverviewPage.tsx`
    - `RelevanceTabs.tsx`
    - `SearchDashboard.tsx`
- `components/panels/`
    - `CurationsPanel.tsx`
    - `ImportJobsPanel.tsx`
    - `PlaygroundPanel.tsx`
    - `SearchApiKeysPanel.tsx`
    - `SynonymsPanel.tsx`
    - `WidgetPanel.tsx`
- `components/dialogs/`
    - `ConnectorWizard.tsx`
    - `CreateSearchIndexDialog.tsx`
- `components/tables/`
    - `DocumentsTable.tsx`
    - `SearchIndexesList.tsx`
    - `SyncJobsTable.tsx`
- `components/cards/`
    - `ConnectorCard.tsx`
    - `EmptyState.tsx`
    - `SearchAnalyticsCards.tsx`
    - `SearchUsageCard.tsx`
    - `SearchUsageCards.tsx`
- `components/sections/`
    - `BillingPlanInfo.tsx`

### 2) Knowledge split into its own domain

Moved:

- from: `apps/saas/modules/search/components/KnowledgeWorkbench.tsx`
- to: `apps/saas/modules/knowledge/components/KnowledgeWorkbench.tsx`

Also added alias support for `@knowledge/*` and updated route imports.

### 3) Admin folder naming normalized

Renamed:

- from: `apps/saas/modules/admin/component/`
- to: `apps/saas/modules/admin/components/`

This removes the singular/plural inconsistency that existed against the rest of the repo.

### 4) Shared duplicate removed

Removed duplicate sidebar context implementation:

- kept: `apps/saas/modules/shared/lib/sidebar-context.tsx`
- removed: `apps/saas/modules/lib/sidebar-context.tsx`

## Orphans / duplicates / ambiguous files removed

Confirmed dead and removed:

- `apps/saas/modules/search/components/DashboardOverview.tsx`
- `apps/saas/modules/search/components/IndexRowActions.tsx`
- `apps/saas/modules/search/components/ProjectOverview.tsx`
- `apps/saas/modules/search/components/ProjectsList.tsx`
- `apps/saas/modules/search/components/SchemaEditor.tsx`
- `apps/saas/modules/search/components/SearchApiKeysPage.tsx`
- `apps/saas/modules/search/components/SearchPreview.tsx`
- `apps/saas/modules/search/components/SearchPreviewPage.tsx`
- `apps/saas/modules/lib/sidebar-context.tsx`

Post-cleanup check: no remaining references to those basenames inside `apps/saas/modules/search`.

## Naming drift resolved in behavior

Instead of keeping duplicate page-level implementations, the app now has a single canonical search workspace:

- API keys flow lives in `SearchDashboard` + `SearchApiKeysPanel`
- preview flow lives in `SearchDashboard` + `PlaygroundPanel`
- route aliases redirect into the canonical dashboard tabs

This reduces page-name ambiguity without changing user-facing URLs.

## Verification completed

Ran successfully:

- `pnpm lint` → 0 warnings, 0 errors
- `pnpm format:check` → pass
- `pnpm --filter saas type-check` → pass

Also cleaned pre-existing workspace lint warnings that blocked a zero-warning commit.

## Outcome

The SaaS UI structure now has:

- clear route-wrapper → feature-component boundaries
- decomposed search UI by responsibility
- no duplicate sidebar context implementation
- normalized admin folder naming
- knowledge isolated as its own domain
- removed dead search-page leftovers after dashboard consolidation
