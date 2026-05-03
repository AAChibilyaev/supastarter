# Документация AACsearch — Аудит (AAC-400)

## Дата аудита: 2026-05-03
## Проверялось: apps/docs/content/docs/ — все 5 локалей (en, de, es, fr, ru)

---

## 1. Текущая структура (33 страницы × 5 локалей = 165 MDX-файлов)

```
📁 docs/{locale}/
├── index.mdx                          # Главная страница документации
├── overview/                          # 5 страниц
│   ├── status-roadmap.mdx
│   ├── architecture.mdx
│   ├── domain-model.mdx
│   ├── auth-tenancy.mdx
│   └── plans-and-limits.mdx
├── getting-started/                   # 8 страниц
│   ├── overview.mdx
│   ├── local-development.mdx
│   ├── create-first-index.mdx
│   ├── api-keys.mdx
│   ├── ingest-and-reindex.mdx
│   ├── browser-sdk.mdx
│   ├── widget-installation.mdx
│   └── connector-onboarding.mdx
├── search-api/                        # 7 страниц
│   ├── overview.mdx
│   ├── public-search-endpoint.mdx
│   ├── scoped-search-tokens.mdx
│   ├── multi-search-and-querying.mdx
│   ├── filter-sort-pagination.mdx
│   ├── errors-and-rate-limits.mdx
│   └── reindexing-and-zero-downtime.mdx
├── connectors/                        # 6 страниц
│   ├── overview.mdx
│   ├── connector-api-lifecycle.mdx
│   ├── prestashop.mdx
│   ├── bitrix.mdx
│   ├── widget-overview.mdx
│   └── widget-analytics-events.mdx
└── dashboard/                         # 6 страниц
    ├── overview.mdx
    ├── search-workspace.mdx
    ├── analytics.mdx
    ├── relevance-tuning.mdx
    ├── index-management.mdx
    └── knowledge-and-admin.mdx
```

**Все 165 файлов имеют корректный frontmatter (title + description).**
**meta.json в каждой секции соответствуют реальным файлам — расхождений нет.**

---

## 2. Найденные дефекты

### 2.1. Битые ссылки (3 × 5 локалей = 15 файлов)

Во всех 5 локалях одинаковые битые ссылки на `authentication` — такой страницы не существует:

| Файл | Что исправить |
|------|--------------|
| `connectors/widget-analytics-events.mdx` | `/docs/search-api/authentication` → `/docs/search-api/scoped-search-tokens` |
| `connectors/widget-overview.mdx` | `/docs/search-api/authentication` → `/docs/search-api/scoped-search-tokens` |
| `dashboard/search-workspace.mdx` | `/docs/search-api/authentication` → `/docs/search-api/scoped-search-tokens` |

---

## 3. Крупные пробелы — отсутствующие темы документации

### 3.1. Панель администратора (нет совсем)

SaaS имеет полноценную админ-панель с 8+ страницами, но документация о них отсутствует:

- `/admin/overview` — обзор админ-панели
- `/admin/users` — управление пользователями
- `/admin/security` — глобальные настройки безопасности
- `/admin/audit` — аудит действий
- `/admin/integrations` — глобальные интеграции
- `/admin/wallet` — кошелёк (Tochka wallet, пополнения)
- `/admin/jobs` — панель фоновых задач / Jobs Dashboard
- `/admin/notifications` — глобальные уведомления
- `/admin/config` — конфигурация системы
- `/admin/organizations` — управление организациями

### 3.2. Настройки организации (нет совсем)

- `/settings/general` — общие настройки организации
- `/settings/members` — управление участниками и ролями
- `/settings/billing` — биллинг организации (частично упомянут в plans-and-limits, но без инструкций)

### 3.3. Биллинг и платежи (минимально)

- Страница биллинга существует (`/settings/billing`, `/settings/billing/ai-credits`), но документация ограничивается одной строкой в plans-and-limits
- Нет описания: тарифные планы, методы оплаты, инвойсы, AI-кредиты, пополнение кошелька

### 3.4. AI и Knowledge (частично)

- `dashboard/knowledge-and-admin.mdx` существует, но не описывает:
  - AI-чат / Chatbot (`/chatbot`)
  - Knowledge Spaces и DataSources
  - AI-кредиты и лимиты
  - GraphRAG функциональность
  - Различия между org-level и account-level knowledge

### 3.5. SDK и интеграции (минимально)

- `browser-sdk.mdx` покрывает браузерный SDK
- Нет документации по: `/sdks` страница (SDK Dashboard), команды установки, примеры кода для разных языков

### 3.6. Search Configurator (нет совсем)

- Страница `/search/[indexSlug]/search-configurator` существует в SaaS, но не документирована
- UI для настройки коллекций, полей, фасетов, сортировки

### 3.7. Import Jobs (нет совсем)

- Страница `/import-jobs` существует
- Нет документации по отслеживанию задач импорта, статусам, повторным попыткам

### 3.8. Preview (нет совсем)

- Страница `/preview` для предпросмотра результатов поиска
- Нет документации

### 3.9. Recommendations (нет совсем)

- Страница `/recommendations` существует в SaaS
- Не документировано (в roadmap указано как out of scope для v1 — возможно, намеренно)

### 3.10. Search Features (не выделены отдельно)

Следующие фичи упоминаются в существующих страницах, но не имеют выделенной документации:

| Фича | Где упоминается сейчас |
|------|----------------------|
| Typo Tolerance | relevance-tuning (3 упоминания) |
| Synonyms | relevance-tuning (8 упоминаний) + oRPC процедура |
| Curations | relevance-tuning (7 упоминаний) + oRPC процедура |
| Faceted Search | search-api (14 упоминаний) |
| Stopwords | relevance-tuning (5 упоминаний) |
| Geo-Search | не упоминается нигде в docs (0) |
| Ranking / Relevance Tuning | relevance-tuning существует, но не покрывает Ranking UI |
| Autocomplete / Instant Search | не выделено |
| Widget Filters / Voice | widget-overview, но не покрывает фильтры и голос |

---

## 4. Сравнение с marketing-страницами

Маркетинговые feature-страницы, которые НЕ имеют аналога в документации:

| Marketing page | Docs page | Статус |
|---------------|-----------|--------|
| `/features/analytics` | `dashboard/analytics.mdx` | ✅ Есть |
| `/features/connectors` | `connectors/overview.mdx` | ✅ Есть |
| `/features/curations` | Упоминается в relevance-tuning | ⚠️ Частично |
| `/features/faceted-search` | Упоминается в search-api | ⚠️ Частично |
| `/features/geo-search` | Нет | ❌ Отсутствует |
| `/features/instant-search` | Нет | ❌ Отсутствует |
| `/features/knowledge` | `dashboard/knowledge-and-admin.mdx` | ✅ Есть |
| `/features/multi-search` | `search-api/multi-search-and-querying.mdx` | ✅ Есть |
| `/features/rate-limiting` | `search-api/errors-and-rate-limits.mdx` | ✅ Есть |
| `/features/reindex` | `search-api/reindexing-and-zero-downtime.mdx` | ✅ Есть |
| `/features/relevance-tuning` | `dashboard/relevance-tuning.mdx` | ✅ Есть |
| `/features/scoped-tokens` | `search-api/scoped-search-tokens.mdx` | ✅ Есть |
| `/features/search-api` | `search-api/overview.mdx` | ✅ Есть |
| `/features/stopwords` | Упоминается в relevance-tuning | ⚠️ Частично |
| `/features/synonyms` | Упоминается в relevance-tuning | ⚠️ Частично |
| `/features/typo-tolerance` | Упоминается в relevance-tuning | ⚠️ Частично |
| `/features/widget` | `widget-overview.mdx` | ✅ Есть |

---

## 5. Сводка: что отсутствует (в порядке приоритета)

### 🔴 Критично — битые ссылки (исправить немедленно)
- 15 файлов с битой ссылкой `/docs/search-api/authentication` → исправить на `/docs/search-api/scoped-search-tokens`

### 🟡 Высокий приоритет — новая функциональность без документации
1. **Биллинг и платежи** — тарифы, подписки, инвойсы, AI-кредиты, пополнение кошелька
2. **Search Configurator** — UI настройки поисковых индексов
3. **Import Jobs** — мониторинг и управление задачами импорта
4. **Search Preview** — предпросмотр результатов поиска
5. **SDK Dashboard** — страница со SDK, команды установки, примеры кода
6. **Widget расширенные фичи** — фильтры, автокомплит, голосовой поиск

### 🟡 Средний приоритет
7. **Admin панель** — 9+ страниц без документации
8. **Настройки организации** — участники, роли, общие настройки
9. **AI/Knowledge подробно** — chatbot, knowledge spaces, GraphRAG
10. **Recommendations** — если не out of scope, то нужна документация

### 🟢 Низкий приоритет
11. **Geo-search** — выделенная страница
12. **Stopwords** — выделенная страница
13. **Typo tolerance / Instant search / Autocomplete** — выделенные страницы
14. **Актуализация status-roadmap.mdx** — синхронизация с текущим состоянием EPICов

---

## 6. Технические заметки

- **Стек**: Fumadocs MDX (fumadocs-mdx-config), 5 локалей через defineI18n с `parser: "dir"`
- **Навигация**: sidebar генерируется из meta.json → source.getPageTree(lang)
- **Изображения**: OG-изображения генерируются для каждой страницы через `/og/[...slug]/route.tsx`
- **Компоненты**: кастомные MDX-компоненты в `mdx-components.tsx`, LLM-копирование через `LLMCopyButton`
