# AACsearch UI/UX Component Audit

## Purpose

This document captures:

1. a precise component map by folder and responsibility
2. the best ready-made components and stacks to reuse for future tasks without building from scratch

Repo root: `/Users/aac/Projects/ts/supastarter`

---

## 1. Reuse hierarchy

For new UI work, use this order:

1. existing feature-level components in `apps/saas/modules/*` or `apps/marketing/modules/*`
2. shared app components in `apps/saas/modules/shared/*` or `apps/marketing/modules/shared/*`
3. reusable UI stacks in `packages/ui/components/*`
4. only then build new feature-specific UI

This repo already has strong reuse layers. Do not start from primitives by default.

---

## 2. SaaS component map

### 2.1 `apps/saas/modules/shared/components`

Purpose: common SaaS shell, layout, providers, navigation, shared account/settings UX.

Key components:

- `AppSidebar.tsx` — main left navigation shell
- `NavBar.tsx` — top navigation/header
- `AppWrapper.tsx` — shared app layout wrapper
- `PageHeader.tsx` — standard page header
- `ClientProviders.tsx` — app-level providers
- `ApiClientProvider.tsx` — client API provider
- `PostHogProvider.tsx` — analytics provider
- `AuthWrapper.tsx` — authenticated wrapping/gating
- `NotificationCenter.tsx` — notifications UI
- `StatsTile.tsx` — KPI/stat tile
- `StatsTileChart.tsx` — stat tile with embedded chart
- `Pagination.tsx` — shared pagination
- `TabGroup.tsx` — route-based nested tabs
- `SettingsList.tsx`, `SettingsItem.tsx` — settings navigation blocks
- `UserMenu.tsx`, `UserAvatar.tsx` — account controls
- `PasswordInput.tsx` — reusable password field
- `LocaleSwitch.tsx`, `ColorModeToggle.tsx` — locale/theme controls
- `ConsentBanner.tsx`, `ConsentProvider.tsx` — consent flow
- `ConfirmationAlertProvider.tsx` — confirm/alert infra

Best use cases:

- new dashboard shells
- settings/account pages
- shared KPI/status blocks
- common product navigation

### 2.2 `apps/saas/modules/search/components`

Purpose: the main AACsearch product UI. This is the heaviest and most reusable product domain.

#### Page-level orchestrators

- `pages/OverviewPage.tsx` — overview dashboard
- `pages/GettingStarted.tsx` — onboarding/setup flow
- `pages/SearchDashboard.tsx` — main search workspace
- `pages/CollectionDetail.tsx` — collection detail workspace
- `pages/ConnectorsPage.tsx` — connectors area
- `pages/RelevanceTabs.tsx` — relevance/ranking workspace
- `pages/WidgetPage.tsx` — widget workspace
- `pages/SearchConfigPage.tsx` — search configuration page
- `pages/RecommendationsPage.tsx` — recommendations/personalization workspace
- `pages/SdksPage.tsx` — SDK/developer surface

#### Operational panels

- `SearchApiKeysPanel.tsx` — API key management
- `ImportJobsPanel.tsx` — import/background job management
- `PlaygroundPanel.tsx` — live search playground/preview
- `SchemaEditorPanel.tsx` — schema editor
- `RankingRulesPanel.tsx` — ranking controls
- `SynonymsPanel.tsx` — synonyms management
- `CurationsPanel.tsx` — curations / merchandising
- `SpellCorrectionPanel.tsx` — spell-correction controls
- `StemmingPanel.tsx` — stemming settings
- `StopwordsPanel.tsx` — stopwords management
- `FacetsPanel.tsx` — facets configuration
- `NoHitsQueriesRulesPanel.tsx` — no-results rule management
- `ReindexPanel.tsx` — reindex controls
- `EmbeddingModelPanel.tsx` — embeddings/vector model setup

#### Widget subdomain

- `WidgetPanel.tsx` — widget overview panel
- `WidgetInstallPanel.tsx` — embed/install instructions
- `WidgetConfiguratorPanel.tsx` — widget configuration UI
- `WidgetAnalyticsPanel.tsx` — widget analytics
- `WidgetFiltersPanel.tsx` — filter behavior setup
- `WidgetAutocompletePanel.tsx` — autocomplete setup
- `WidgetVoicePanel.tsx` — voice search/widget controls

#### Tables

- `tables/DocumentsTable.tsx` — documents list/CRUD table
- `tables/SearchIndexesList.tsx` — index listing
- `tables/SyncJobsTable.tsx` — sync/job history

#### Dialogs and wizards

- `dialogs/CreateSearchIndexDialog.tsx` — create search index flow
- `dialogs/ConnectorWizard.tsx` — connector setup wizard
- `wizard/SearchConfigWizard.tsx` — guided config flow

#### Cards / sections / blocks

- `cards/SearchAnalyticsCards.tsx` — analytics summary cards
- `cards/SearchUsageCards.tsx`, `SearchUsageCard.tsx` — usage and limit visibility
- `cards/ActivityLog.tsx` — activity feed/log
- `cards/FailedQueriesTable.tsx` — failed query surfacing
- `cards/ConnectorCard.tsx` — connector summary card
- `cards/EmptyState.tsx` — empty states
- `sections/BillingPlanInfo.tsx` — billing/plan status
- `sections/OverageStatusCard.tsx` — overage/quota surfacing
- `blocks/DashboardCard.tsx` — dashboard content container
- `blocks/DataTable.tsx` — local table wrapper block
- `blocks/KanbanBoard.tsx` — board-like layout block
- `GuidedTour.tsx` — guided product onboarding

#### File/document UX

- `files/FileCard.tsx` — file card view
- `files/FileTable.tsx` — file table view
- `files/FilePreview.tsx` — preview surface
- `files/DeleteFileDialog.tsx` — delete confirmation flow

#### Recommendations / personalization

- `RecommendationsDashboardCards.tsx`
- `RecommendationsSettings.tsx`
- `RecommendationsTestPanel.tsx`
- `RecommendationsGraphRAG.tsx`
- `RecommendationsPersonalizedAnalytics.tsx`
- `PersonalizationOverviewCard.tsx`
- `UserSegmentsPanel.tsx`
- `TestPersonalizationPanel.tsx`

Best use cases:

- any search-related feature work
- schema/documents/index management
- connectors
- widget config/install/analytics
- relevance, ranking, curations, synonyms
- usage, quota, billing visibility
- recommendation/personalization UX

### 2.3 `apps/saas/modules/my-search/components`

Purpose: lighter, file-first personal search flow.

Key components:

- `pages/MySearchDashboard.tsx` — dashboard
- `pages/MySearchIndexPage.tsx` — index detail
- `pages/MySearchCrossSearch.tsx` — cross-search view
- `CreateIndexForm.tsx` — create index flow
- `ShareIndexDialog.tsx` — share flow
- `SharedSearchView.tsx` — public/shared view
- `PersonalSearch.tsx` — main personal search experience
- `SearchResults.tsx`, `ResultCard.tsx` — search result presentation

Upload stack:

- `upload/DropZone.tsx`
- `upload/UrlInput.tsx`
- `upload/FileList.tsx`
- `upload/UploadProgress.tsx`

Files stack:

- `files/MySearchFileTable.tsx`
- `files/MySearchFileCard.tsx`
- `files/MySearchFilePreview.tsx`
- `files/MySearchDeleteFileDialog.tsx`

Best use cases:

- file upload + search
- shareable search spaces
- simplified search experience separate from main search workspace

### 2.4 `apps/saas/modules/indexing/components`

Purpose: indexing, reindex, delta sync, index health and history.

Key components:

- `pages/IndexManagementPage.tsx` — indexing control page
- `panels/FullReindexPanel.tsx` — full reindex
- `panels/DeltaSyncPanel.tsx` — delta sync controls
- `panels/DeltaSyncConfirm.tsx` — delta sync confirm step
- `actions/ScheduleConfigPanel.tsx` — schedule/config controls
- `history/ReindexHistoryTable.tsx` — run history
- `dashboard/IndexHealthChart.tsx` — index health chart
- `dashboard/IndexStatusCards.tsx` — health/status cards
- `dashboard/LastSyncInfo.tsx` — last sync summary
- `dialogs/CancelJobDialog.tsx` — cancel job flow
- `errors/ErrorList.tsx` — error list surface

Best use cases:

- ops/index management panels
- ingestion health
- sync scheduling and job history

### 2.5 `apps/saas/modules/collections/components`

Purpose: collections landing and import flow.

Key components:

- `pages/CollectionsPage.tsx` — collections list/landing
- `cards/CollectionCard.tsx` — collection summary card
- `import/ImportDialog.tsx` — import entry
- `import/ImportFileUpload.tsx` — file upload importer
- `import/ImportPaste.tsx` — paste-based import
- `import/ImportPreview.tsx` — import preview/review

Best use cases:

- collection onboarding
- import-first entry flows

### 2.6 `apps/saas/modules/knowledge/components`

Purpose: knowledge/RAG workspace.

Key component:

- `KnowledgeWorkbench.tsx` — knowledge workbench UI

Best use cases:

- specialized knowledge workflows
- RAG/knowledge management UI

### 2.7 `apps/saas/modules/admin/components`

Purpose: internal admin/backoffice.

Key components:

- `AdminOverview.tsx` — admin dashboard
- `AdminConfigView.tsx` — config/system view
- `AdminIntegrationsView.tsx` — integrations admin
- `AdminJobsView.tsx` — job monitoring
- `AdminAuditView.tsx` — audit/admin traceability
- `AdminNotificationsView.tsx` — notifications admin
- `AdminWalletOps.tsx` — wallet operations
- `BillingAnalyticsSection.tsx` — billing analytics
- `OnboardingAnalyticsCards.tsx` — onboarding metrics
- `AdminRoadmapPanel.tsx` — roadmap/admin product visibility
- `users/UserList.tsx`, `users/EmailVerified.tsx`
- `organizations/OrganizationList.tsx`, `organizations/OrganizationForm.tsx`

Best use cases:

- platform administration
- ops dashboards
- org/user management
- internal analytics

### 2.8 `apps/saas/modules/organizations/components`

Purpose: multi-tenant org lifecycle and member management.

Key components:

- `OrganizationsGrid.tsx` — organization list/grid
- `OrganizationSelect.tsx` — active org switcher
- `ActiveOrganizationProvider.tsx` — active org context
- `OrganizationMembersList.tsx`
- `OrganizationMembersBlock.tsx`
- `InviteMemberForm.tsx`
- `OrganizationInvitationsList.tsx`
- `OrganizationInvitationModal.tsx`
- `OrganizationInvitationAlert.tsx`
- `OrganizationRoleSelect.tsx`
- `CreateOrganizationForm.tsx`
- `ChangeOrganizationNameForm.tsx`
- `DeleteOrganizationForm.tsx`
- `OrganizationLogoForm.tsx`
- `OrganizationLogo.tsx`

Best use cases:

- member invites
- role assignment
- multi-tenant org settings
- org lifecycle UX

### 2.9 `apps/saas/modules/settings/components`

Purpose: user profile, security, preferences and billing settings.

Key components:

- profile:
    - `ChangeNameForm.tsx`
    - `ChangeEmailForm.tsx`
    - `UserAvatarForm.tsx`
    - `UserAvatarUpload.tsx`
    - `CropImageDialog.tsx`
    - `UserLanguageForm.tsx`
- security:
    - `ChangePassword.tsx`
    - `SetPassword.tsx`
    - `TwoFactorBlock.tsx`
    - `PasskeysBlock.tsx`
    - `ActiveSessionsBlock.tsx`
    - `ConnectedAccountsBlock.tsx`
- account/billing:
    - `DeleteAccountForm.tsx`
    - `SubscriptionStatusBadge.tsx`
    - `CustomerPortalButton.tsx`
    - `NotificationPreferencesForm.tsx`
    - `SettingsMenu.tsx`

Best use cases:

- account settings surfaces
- security center
- profile management
- user preferences

### 2.10 `apps/saas/modules/auth/components`

Purpose: authentication lifecycle.

Key components:

- `LoginForm.tsx`
- `SignupForm.tsx`
- `ForgotPasswordForm.tsx`
- `ResetPasswordForm.tsx`
- `OtpForm.tsx`
- `SocialSigninButton.tsx`
- `LoginModeSwitch.tsx`
- `SessionProvider.tsx`

Best use cases:

- auth forms and flows
- sign-in/sign-up/password reset surfaces

---

## 3. Marketing and docs component map

### 3.1 `apps/marketing/modules/shared/components`

Purpose: shared marketing shell and reusable landing sections.

Key components:

- `NavBar.tsx` — marketing navbar
- `Footer.tsx` — marketing footer
- `CodeExampleSection.tsx` — reusable code/demo section
- `FeatureCardHeaderRow.tsx` — reusable heading row for feature cards
- `LocaleSwitch.tsx` — locale switcher
- `ColorModeToggle.tsx` — theme switcher
- `ConsentBanner.tsx` — consent surface
- `ThemeProvider.tsx` — marketing theme infra
- `ConsentProvider.tsx`
- `ClientProviders.tsx`

Best use cases:

- public site shell
- code example sections
- feature-card-based landing layouts

### 3.2 Marketing domain patterns

The marketing app is structured as a reusable landing-section library. The biggest reusable families are:

- `home/*` — hero, pricing, testimonials, CTA, logos, contact, feature grid
- `compare/*` — comparison pages, decision matrices, migration sections, comparison tables
- `integrations/*` — integration grids, setup steps, FAQs, snippets
- `company/*` — company/about/customers/careers/roadmap blocks
- `solutions/*` — industry-specific landing grids
- `use-cases/*` — scenario-specific landing grids

High-value reusable patterns already present in marketing:

- hero sections
- pricing sections
- testimonial carousel
- feature grids
- code example sections
- integration setup steps
- FAQ sections
- comparison tables and decision matrices
- public roadmap/customer story blocks

### 3.3 `apps/docs/components`

Purpose: docs search, locale handling and AI-friendly page actions.

Key components:

- `aacsearch-docs-search.tsx` — custom docs search dialog
- `aacsearch-search-provider.tsx` — search context + hotkeys
- `search-toggle.tsx` — search trigger button
- `i18n-provider.tsx` — docs i18n bridge
- `ai/page-actions.tsx` — AI/LLM page actions (copy markdown behavior)

Best use cases:

- docs search surfaces
- search hotkeys and command-like UX
- AI-friendly docs actions

---

## 4. Best ready-made components to reuse first

### 4.1 Highest-value feature components

Use these before building new custom UI:

- `apps/saas/modules/search/components/dialogs/CreateSearchIndexDialog.tsx`
    - best for create-index/create-entity flows
- `apps/saas/modules/search/components/dialogs/ConnectorWizard.tsx`
    - best for guided setup wizards
- `apps/saas/modules/search/components/panels/SearchApiKeysPanel.tsx`
    - best for token/key management surfaces
- `apps/saas/modules/search/components/panels/SchemaEditorPanel.tsx`
    - best for schema/field editors
- `apps/saas/modules/search/components/tables/DocumentsTable.tsx`
    - best for document-heavy CRUD screens
- `apps/saas/modules/search/components/panels/ImportJobsPanel.tsx`
    - best for job management UIs
- `apps/saas/modules/search/components/tables/SyncJobsTable.tsx`
    - best for sync/history/status screens
- `apps/saas/modules/search/components/panels/PlaygroundPanel.tsx`
    - best for preview/test/live-validation UIs
- widget stack:
    - `WidgetConfiguratorPanel.tsx`
    - `WidgetInstallPanel.tsx`
    - `WidgetAnalyticsPanel.tsx`
- relevance stack:
    - `RankingRulesPanel.tsx`
    - `SynonymsPanel.tsx`
    - `CurationsPanel.tsx`
    - `SpellCorrectionPanel.tsx`
    - `StemmingPanel.tsx`
    - `StopwordsPanel.tsx`
    - `FacetsPanel.tsx`
- `apps/saas/modules/search/components/GuidedTour.tsx`
    - best for product onboarding and in-feature guidance

### 4.2 Best reusable stacks in `packages/ui/components`

#### Admin stack

Path:

- `packages/ui/components/admin/*`

Best for:

- admin panels
- CRUD backoffice
- moderation/internal tools

Most useful pieces:

- list/create/edit/show flows
- filter forms
- admin data table
- simple forms
- saved queries
- reference fields and inputs
- bulk action toolbars

#### Data-table stack

Path:

- `packages/ui/components/data-table/*`

Best for:

- data-heavy tables
- filters
- analytics lists
- jobs/users/orders/logs

Most useful pieces:

- `data-table-provider.tsx`
- `data-table-toolbar.tsx`
- `data-table-view-options.tsx`
- `data-table-filter-input.tsx`
- `data-table-filter-slider.tsx`
- `data-table-filter-controls-drawer.tsx`
- `date-picker-with-range.tsx`

#### App-shell stack

Best for:

- dashboards
- settings shells
- internal tools

Most useful pieces:

- `sidebar.tsx`
- `navigation-menu.tsx`
- `breadcrumb.tsx`
- `menubar.tsx`
- `scroll-area.tsx`
- `resizable.tsx`

#### Forms stack

Best for:

- onboarding
- settings
- profile/security
- dense business forms

Most useful pieces:

- `form.tsx`
- `field.tsx`
- `input.tsx`
- `textarea.tsx`
- `select.tsx`
- `checkbox.tsx`
- `switch.tsx`
- `radio-group.tsx`
- `input-group.tsx`
- `input-otp.tsx`
- `calendar.tsx`

#### Overlay / workflow stack

Best for:

- modal flows
- mobile drawers/sheets
- confirm dialogs
- guided setup
- onboarding

Most useful pieces:

- `dialog.tsx`
- `drawer.tsx`
- `sheet.tsx`
- `alert-dialog.tsx`
- `popover.tsx`
- `tooltip.tsx`
- `command.tsx`
- `tour.tsx`
- `stepper.tsx`

#### Analytics / insight stack

Best for:

- dashboards
- activity streams
- status/progress surfaces

Most useful pieces:

- `chart.tsx`
- `timeline.tsx`
- `progress.tsx`
- `skeleton.tsx`
- `spinner.tsx`

#### Advanced interaction stack

Best for:

- reordering
- richer interaction-heavy screens

Most useful pieces:

- `sortable.tsx`
- `carousel.tsx`
- `resizable.tsx`

#### Chat stack

Path:

- `packages/ui/components/chat/*`

Best for:

- AI assistant
- support widget
- embedded messaging

Most useful pieces:

- `expandable-chat.tsx`
- `chat-message-list.tsx`
- `chat-bubble.tsx`
- `chat-input.tsx`
- `message-loading.tsx`

#### Landing/marketing stack

Best for:

- landing pages
- pricing sections
- CTA sections
- feature sections

Most useful pieces:

- `LandingFeature.tsx`
- `LandingFeatureList.tsx`
- `LandingPricingSection.tsx`
- `LandingPricingPlan.tsx`
- `LandingPrimaryCta.tsx`
- `LandingSaleCta.tsx`
- `LandingFooter.tsx`
- `LandingFooterColumn.tsx`
- `LandingFooterLink.tsx`
- `LandingImage.tsx`
- `LandingVideoPlayer.tsx`
- `LandingBand.tsx`
- `GlowBg.tsx`

---

## 5. Task-to-component shortcut map

If the task is about...

- admin/backoffice
    - first check `packages/ui/components/admin/*`
- tables / filters / listing
    - first check `packages/ui/components/data-table/*`
- new dashboard shell
    - first check `AppSidebar`, `NavBar`, `AppWrapper`, `PageHeader`, `StatsTile`
- onboarding / wizard / guided setup
    - first check `ConnectorWizard`, `SearchConfigWizard`, `tour.tsx`, `stepper.tsx`
- search settings / relevance / quality
    - first check `apps/saas/modules/search/components/panels/*`
- docs search or command-like UX
    - first check `aacsearch-docs-search.tsx`, `aacsearch-search-provider.tsx`, `command.tsx`
- marketing page blocks
    - first check `apps/marketing/modules/shared/*` and landing components in `packages/ui/components/*`
- chat or in-app assistant
    - first check `packages/ui/components/chat/*`
- org/member management
    - first check `apps/saas/modules/organizations/components/*`
- account/security settings
    - first check `apps/saas/modules/settings/components/*`

---

## 6. Highest-ROI reuse zones

The most valuable reuse zones in this repo are:

1. `apps/saas/modules/search/components/*`
    - richest product-level reusable UI
2. `packages/ui/components/data-table/*`
    - best foundation for data-heavy screens
3. `packages/ui/components/admin/*`
    - best foundation for internal admin tools
4. `apps/saas/modules/shared/components/*`
    - best shared SaaS shell layer
5. `packages/ui/components/chat/*` and landing components
    - strong specialized stacks

---

## 7. Final rule

Before building new UI in this repo:

- first search feature components
- then shared app components
- then reusable UI stacks
- only then write new code

That reuse order fits the architecture of AACsearch and avoids duplicate UI work.
