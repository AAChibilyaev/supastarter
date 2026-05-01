# AACsearch — Typesense v30 Full Implementation + Shadcn Dashboard Overhaul

> PRD-формат: Objective → Initiatives → Epics → Features → Tasks
> Author: AI Agent | Date: 2026-05-01 | Status: PLAN

---

## Objective: Полная реализация Typesense v30 + shadcn-дашборд

Реализовать **все** возможности Typesense v30 (векторный, семантический, гибридный, голосовой, image поиск + гео + федеративный + аналитика + снапшоты) и полностью перестроить дашборд на готовых shadcn-блоках (dashboard, data-table, command-palette, sidebar, playground, cards, forms).

---

## 🟢 Аудит: что уже есть (27 oRPC процедур)

| Тип            | Реализовано                                                                                    | Статус  |
| -------------- | ---------------------------------------------------------------------------------------------- | ------- |
| Search (basic) | `searchDocuments`, `multiSearch`                                                               | ✅ v0.1 |
| Index CRUD     | `createIndex`, `listIndexes`, `reindex`, `schema`                                              | ✅      |
| Documents      | `upsertDocument`, `listDocuments`, `importDocuments`                                           | ✅      |
| API Keys       | `createApiKey`, `listApiKeys`, `revokeApiKey`, `createScopedToken`                             | ✅      |
| Connector      | `createConnectorToken`, `listConnectorTokens`, `revokeConnectorToken`, `listConnectorSyncJobs` | ✅      |
| Import Jobs    | `importJobs`, `retryFailedBatches`, `pipelineStatus`                                           | ✅      |
| Curations      | `curations` (list/create/update/delete)                                                        | ✅      |
| Synonyms       | `synonyms` (list/create/update/delete)                                                         | ✅      |
| Analytics      | `analytics`, `topQueries`, `usage`, `usageSummary`, `recentActivity`                           | ✅      |
| Widget         | `onboardingStatus`, `widgetConfig`                                                             | ✅      |

**Dashboard UI:** 30+ компонентов (SearchDashboard, OverviewPage, CollectionDetail, ConnectorsPage, RelevanceTabs, KnowledgeWorkbench, SchemaEditor, DocumentsTable, PlaygroundPanel, SearchApiKeysPanel, WidgetPanel, GettingStarted, ImportJobsPanel и др.)

---

## 🔴 Gap Analysis: Typesense v30 features NOT implemented

### Initiative A: Advanced Search (5 features)

| #   | Feature                         | Typesense API                                | Description                       | Priority |
| --- | ------------------------------- | -------------------------------------------- | --------------------------------- | -------- |
| A1  | **Vector Search**               | `vector_query` param                         | Embedding-based semantic search   | P1       |
| A2  | **Hybrid Search**               | `hybrid_search` + `alpha`                    | Combine keyword + vector (fusion) | P1       |
| A3  | **Semantic/NL Search**          | `query_by` with `use_natural_language_query` | Natural language queries          | P1       |
| A4  | **Conversational Search (RAG)** | `/conversational_search` endpoint            | Chat-based with context/history   | P2       |
| A5  | **Voice Search**                | `/voice_search_query` endpoint               | Speech-to-text preprocessing      | P3       |

### Initiative B: Search Enhancements (6 features)

| #   | Feature                    | Typesense API                    | Description              | Priority |
| --- | -------------------------- | -------------------------------- | ------------------------ | -------- |
| B1  | **Geo Search**             | `filter_by` with `_geo:`         | Location-based filtering | P1       |
| B2  | **Federated Multi-Search** | `/multi_search` with union/dedup | Cross-collection queries | P1       |
| B3  | **Grouping**               | `group_by`, `group_limit`        | Group results by field   | P1       |
| B4  | **Dynamic Sorting**        | `sort_by` runtime override       | User-defined sort order  | P2       |
| B5  | **Diversification**        | curation `diversify` param       | Diverse result sets      | P2       |
| B6  | **Query Suggestions**      | analytics-based                  | Typeahead suggestions    | P2       |

### Initiative C: Index Management (5 features)

| #   | Feature                | Typesense API          | Description            | Priority |
| --- | ---------------------- | ---------------------- | ---------------------- | -------- |
| C1  | **Presets**            | `/presets` CRUD        | Saved search configs   | P2       |
| C2  | **Aliases**            | `/aliases` CRUD        | Symlink collections    | P2       |
| C3  | **Stemming Overrides** | `/stemming` dictionary | Custom stem rules      | P3       |
| C4  | **Stopwords**          | `/stopwords` CRUD      | Custom stopwords lists | P3       |
| C5  | **Model Management**   | `/models` CRUD         | Embedding model config | P1       |

### Initiative D: Operations (4 features)

| #   | Feature             | Typesense API                | Description        | Priority |
| --- | ------------------- | ---------------------------- | ------------------ | -------- |
| D1  | **Snapshots**       | `/operations/snapshot`       | Backup/restore     | P1       |
| D2  | **Cluster Ops**     | `/operations/vote`, `/debug` | Multi-node mgmt    | P2       |
| D3  | **Analytics Rules** | `/analytics/rules` CRUD      | Custom event rules | P2       |
| D4  | **Health/Metrics**  | `/health`, `/metrics.json`   | Monitoring         | P1       |

---

## 🟡 Shadcn Dashboard Upgrade Plan

### Current vs Target

| Current Component                              | Shadcn Replacement                   | Source        |
| ---------------------------------------------- | ------------------------------------ | ------------- |
| `SearchDashboard.tsx` (157 lines, custom tabs) | `dashboard-06` layout + `sidebar-07` | shadcn blocks |
| Index list table                               | `data-table` with faceted filters    | shadcn-ui/ui  |
| Usage cards                                    | `cards/stats` + `cards/chart`        | shadcn blocks |
| Playground panel                               | `playground-01` layout               | shadcn blocks |
| API Keys panel                                 | `data-table` + card                  | shadcn blocks |
| Widget panel                                   | `cards/create-account` style         | shadcn blocks |
| `OverviewPage.tsx`                             | `dashboard-01` (charts + stats)      | shadcn blocks |
| `CollectionDetail.tsx`                         | Tabs + integrated `data-table`       | shadcn blocks |
| `SchemaEditor`                                 | Drag-drop `data-table` + `command`   | shadcn        |
| `ConnectorsPage.tsx`                           | `cards/*` + `dashboard-05`           | shadcn blocks |
| `Analytics`                                    | `dashboard-02` + Recharts cards      | shadcn blocks |
| `RelevanceTabs`                                | `tasks-01` layout                    | shadcn blocks |
| `GettingStarted`                               | `cards/` + progress                  | shadcn blocks |
| NavBar (SaaS)                                  | `sidebar-07` (collapsible)           | shadcn blocks |
| ImportJobs                                     | `tasks-04` kanban view               | shadcn blocks |
| Admin pages                                    | `data-table` + `cards/team-members`  | shadcn blocks |

### New shadcn components to add

```bash
# Advanced blocks (copy-paste from shadcn-ui/ui)
dashboard-01 dashboard-04 dashboard-06
sidebar-07 sidebar-10
cards/stats cards/chart cards/activity cards/data-table
tasks-04
playground-01

# New primitives (already added in feat/shadcn-blocks-upgrade):
# sidebar, command, drawer, breadcrumb, toggle, checkbox,
# collapsible, scroll-area, separator, context-menu, hover-card,
# navigation-menu — 12 already added, total 39
```

---

## 📋 Implementation Plan (5 спринтов)

### Sprint 1: Vector + Hybrid + Semantic (A1-A3, C5) — Days 1-3

- [ ] `packages/search/lib/embeddings.ts` — embedding client (OpenAI/Cohere)
- [ ] `packages/api/modules/search/procedures/vector-search.ts` — new oRPC proc
- [ ] `packages/api/modules/search/procedures/hybrid-search.ts` — new oRPC proc
- [ ] `packages/api/modules/search/procedures/semantic-search.ts` — new oRPC proc
- [ ] `packages/api/modules/search/procedures/models.ts` — model CRUD
- [ ] Typesense client: `client.collections('x').documents().search({ vector_query: ... })`
- [ ] UI: Vector search panel в SearchDashboard
- [ ] UI: Model configuration page
- [ ] i18n: 5 locales × vector/hybrid/semantic keys
- [ ] Playwright: test vector search flow

### Sprint 2: Dashboard Overhaul (shadcn blocks) — Days 4-6

- [ ] Copy `dashboard-01`, `dashboard-04`, `dashboard-06` blocks
- [ ] Copy `sidebar-07` block → заменить NavBar
- [ ] Copy `cards/stats`, `cards/chart`, `cards/activity`, `cards/data-table`
- [ ] Copy `playground-01` → PlaygroundPanel upgrade
- [ ] Copy `tasks-04` → ImportJobs kanban view
- [ ] Переработать SearchDashboard с новыми блоками
- [ ] Переработать OverviewPage с новыми блоками
- [ ] Переработать CollectionDetail (data-table + cards)
- [ ] Переработать ConnectorsPage (cards layout)
- [ ] Переработать GettingStarted (progress cards)
- [ ] Переработать Admin pages (data-table + form blocks)
- [ ] i18n: все новые строки в 5 локалей
- [ ] Playwright: скриншоты всех переработанных страниц

### Sprint 3: Geo + Federated + Grouping + Analytics (B1-B6, D3-D4) — Days 7-9

- [ ] `geo-search.ts` — geo filtering procedure
- [ ] `federated-search.ts` — multi-search with union/dedup
- [ ] `grouped-search.ts` — group_by procedure
- [ ] `query-suggestions.ts` — analytics-based suggestions
- [ ] `analytics-rules.ts` — custom analytics rules
- [ ] `health-metrics.ts` — health/metrics endpoint
- [ ] `presets.ts` — saved search presets
- [ ] `aliases.ts` — collection aliases
- [ ] UI: Geo search panel
- [ ] UI: Federated search builder
- [ ] UI: Analytics rules management
- [ ] UI: Health dashboard (shadcn `dashboard-04`)
- [ ] i18n: 5 locales
- [ ] Playwright: test all new features

### Sprint 4: Conversational + Voice + Operations (A4-A5, D1-D2) — Days 10-11

- [ ] `conversational-search.ts` — RAG chat endpoint
- [ ] `voice-search.ts` — speech-to-text preprocessing
- [ ] `snapshots.ts` — backup/restore management
- [ ] `cluster-ops.ts` — cluster operations
- [ ] `stemming.ts` — stemming overrides
- [ ] `stopwords.ts` — stopwords management
- [ ] UI: Conversational search interface (shadcn `prompt-kit`)
- [ ] UI: Voice search button
- [ ] UI: Snapshot management page
- [ ] UI: Cluster status dashboard
- [ ] i18n: 5 locales
- [ ] Playwright: full test

### Sprint 5: Polish + Image Search + Full i18n + Final QA — Days 12-13

- [ ] `image-search.ts` — image-to-text/vector search
- [ ] UI: Image upload + search
- [ ] UI: Diversification controls
- [ ] UI: Dynamic sort controls
- [ ] Full i18n audit: все 5 локалей × все новые ключи
- [ ] Full Playwright suite: все 54+ страницы
- [ ] Performance: bundle size check, lazy loading
- [ ] Type-check: 0 errors
- [ ] Lint: 0 warnings/errors
- [ ] Format: all pass
- [ ] Commit + push

---

## 🏗️ Технические решения

### oRPC procedure template (для новых процедур)

```typescript
// packages/api/modules/search/procedures/vector-search.ts
import { z } from "zod/v4";
import { searchClient } from "@repo/search";
import { procedure } from "../../../trpc"; // actual import path

export const vectorSearch = procedure
	.input(
		z.object({
			organizationId: z.string(),
			indexSlug: z.string(),
			vector: z.array(z.number()),
			k: z.number().default(10),
			filterBy: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const results = await searchClient
			.collections(input.indexSlug)
			.documents()
			.search({
				q: "*",
				vector_query: `vec:(${input.vector.join(",")}, k:${input.k})`,
				filter_by: input.filterBy,
			});
		return results;
	});
```

### Shadcn block интеграция

```tsx
// apps/saas/modules/search/components/pages/SearchDashboardV2.tsx
import { DashboardLayout } from "@search/components/blocks/dashboard-06";
import { StatsCards } from "@search/components/blocks/cards/stats";
import { DataTable } from "@search/components/blocks/cards/data-table";
// ... reuse from shadcn blocks
```

### Инварианты (НЕ нарушать)

- DB frozen: не менять Prisma schema
- oRPC v1.13: `.queryOptions()` / `.call()` — не `.useQuery()`
- i18n: ВСЕ 5 локалей (en, de, es, fr, ru)
- NO console.log — только `logger` из `@repo/logs`
- NO enums — `as const` объекты
- BigInt: `.toString()` в oRPC output
- Marketing: `useTranslations()` без namespace

---

## 📊 Метрики успеха

| Метрика                | Target                |
| ---------------------- | --------------------- |
| Typesense v30 features | 20/20 (100%)          |
| Shadcn dashboard pages | 12/12 pages upgraded  |
| MISSING_MESSAGE        | 0 на всех страницах   |
| Type-check errors      | 0                     |
| Lint warnings/errors   | 0                     |
| Playwright скриншоты   | 54+ страниц           |
| i18n coverage          | 5 locales × все ключи |

---

## 🚀 Старт

Готов начать Sprint 1 немедленно. Командуй.
