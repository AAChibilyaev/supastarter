# SaaS UI Structure Audit — 2026-04-30

## Scope

Audit and cleanup of `apps/saas/modules/search`, `apps/saas/modules/admin`, and duplicate shared sidebar context placement.

## Intentional architecture

The following layering is intentional and was preserved:

1. `apps/saas/app/**/page.tsx` — thin route wrappers
2. `apps/saas/modules/<feature>/**` — feature/domain UI
3. `packages/ui/components/**` — shared primitives

## Real issues found

### 1. Flat overloaded search component folder

Before cleanup, `apps/saas/modules/search/components/` mixed:

- page-level screens
- dialogs
- panels
- tables
- cards
- section blocks
- dead/orphan files

### 2. Duplicate sidebar context placement

Removed duplicate file:

- `apps/saas/modules/lib/sidebar-context.tsx`

Kept canonical file:

- `apps/saas/modules/shared/lib/sidebar-context.tsx`

### 3. Inconsistent admin folder naming

Normalized:

- `apps/saas/modules/admin/component/` → `apps/saas/modules/admin/components/`

### 4. Cross-domain leakage

Moved:

- `apps/saas/modules/search/components/KnowledgeWorkbench.tsx`
  → `apps/saas/modules/knowledge/components/KnowledgeWorkbench.tsx`

## Orphan / dead files removed

Deleted unused search files confirmed by reference scan:

- `DashboardOverview.tsx`
- `IndexRowActions.tsx`
- `ProjectOverview.tsx`
- `ProjectsList.tsx`
- `SchemaEditor.tsx`
- `SearchApiKeysPage.tsx`
- `SearchPreview.tsx`
- `SearchPreviewPage.tsx`

## Final search UI structure

### Pages

- `components/pages/CollectionDetail.tsx`
- `components/pages/ConnectorsPage.tsx`
- `components/pages/GettingStarted.tsx`
- `components/pages/OverviewPage.tsx`
- `components/pages/RelevanceTabs.tsx`
- `components/pages/SearchDashboard.tsx`

### Panels

- `components/panels/CurationsPanel.tsx`
- `components/panels/ImportJobsPanel.tsx`
- `components/panels/PlaygroundPanel.tsx`
- `components/panels/SearchApiKeysPanel.tsx`
- `components/panels/SynonymsPanel.tsx`
- `components/panels/WidgetPanel.tsx`

### Dialogs

- `components/dialogs/ConnectorWizard.tsx`
- `components/dialogs/CreateSearchIndexDialog.tsx`

### Tables

- `components/tables/DocumentsTable.tsx`
- `components/tables/SearchIndexesList.tsx`
- `components/tables/SyncJobsTable.tsx`

### Cards

- `components/cards/ConnectorCard.tsx`
- `components/cards/EmptyState.tsx`
- `components/cards/SearchAnalyticsCards.tsx`
- `components/cards/SearchUsageCard.tsx`
- `components/cards/SearchUsageCards.tsx`

### Sections

- `components/sections/BillingPlanInfo.tsx`

## Page → feature map after cleanup

- `/{organizationSlug}/overview` → `@search/components/pages/OverviewPage`
- `/{organizationSlug}/getting-started` → `@search/components/pages/GettingStarted`
- `/{organizationSlug}/search` → `@search/components/pages/SearchDashboard`
- `/{organizationSlug}/search/[indexSlug]` → `@search/components/pages/CollectionDetail`
- `/{organizationSlug}/analytics` → `@search/components/cards/SearchAnalyticsCards`
- `/{organizationSlug}/relevance` → `@search/components/pages/RelevanceTabs`
- `/{organizationSlug}/connectors` → `@search/components/pages/ConnectorsPage`
- `/{organizationSlug}/import-jobs` → `@search/components/panels/ImportJobsPanel`
- `/{organizationSlug}/settings/billing` → `@search/components/sections/BillingPlanInfo`
- `/(account)/knowledge` + `/{organizationSlug}/knowledge` → `@knowledge/components/KnowledgeWorkbench`

## Notes

- Import paths were updated to match the new folder boundaries.
- `apps/saas/tsconfig.json` now includes `@knowledge/*` for the extracted knowledge module.
- `apps/saas` verification passed after cleanup:
    - `pnpm exec oxlint apps/saas` → 0 warnings / 0 errors
    - `pnpm --filter saas type-check` → success

## Marketing follow-up completed in same workstream

Theme-aware styling was added for marketing CTA buttons with the “Start for free / Начать бесплатно” action via:

- `apps/marketing/modules/shared/lib/cta-button-styles.ts`
- updated Hero, Pricing, and CTA footer components
