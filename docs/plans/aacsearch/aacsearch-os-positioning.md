# AACSearch OS — Strategic Positioning & Product Architecture

**Дата:** 3 мая 2026
**Автор:** Alexandr Chibilyaev (Чибиляев Александр)
**Статус:** Утверждённая концепция

---

## 1. Главная формула

```
AACSearch OS = Search + Discovery + Recommendations + GraphRAG + Control Plane
```

AACSearch OS — операционная система поиска для современных продуктов.
Не search API. Не индекс. Не vector search. А единый **операционный слой** для всего,
что связано с поиском, discovery, рекомендациями, AI-ответами и навигацией по данным.

---

## 2. Семь слоёв AACSearch OS

### 2.1 Input Layer
Text, Voice, Photo, Screenshot, Image, Conversational Search, Command Palette

### 2.2 Understanding Layer
Transcription, OCR, Embeddings, Intent Detection, Entity Extraction, Query Rewriting, Language Detection, Typo Correction, Synonyms, Filters Inference

### 2.3 Retrieval Layer
Full-text search, Prefix search, Typo-tolerant search, Faceted search, Vector search, Image similarity, Hybrid search, Graph retrieval, Multi-search, Federated search

### 2.4 Intelligence Layer
Autocomplete, Query suggestions, Recent searches, Pinned suggestions, Typo recovery, No-result recovery, Related results, Similar items, Recommendations, GraphRAG answers, Search Copilot

### 2.5 Control Plane
Indexes, Collections, Sources, Relevance Studio, Synonyms, Pinned Results, A/B Tests, Recommendations Engine, Knowledge Graph, Analytics, Keys & Quotas, Tenants, Audit Log

### 2.6 Security & Governance Layer
Scoped tokens, Origin allow-list, Tenant isolation, SSO, IP allow-list, Audit log, DPA, SLA

---

## 3. Ключевые продуктовые концепты

| Термин | Описание |
|--------|----------|
| **Search OS** | Продуктовая категория: операционная система поиска |
| **Search Control Plane** | Единый интерфейс управления всем поисковым слоем |
| **Discovery Layer** | Поиск + рекомендации + suggestions как единый слой |
| **Retrieval Core** | Ядро: keyword + vector + visual + graph retrieval |
| **Understanding Layer** | Понимание намерения до retrieval |
| **Suggestions Engine** | Autocomplete, typo recovery, no-result recovery |
| **Recommendation Engine** | Similar items, related docs, personalized recs |
| **Knowledge Graph** | Граф сущностей и связей между документами |
| **GraphRAG Layer** | Ответы поверх knowledge graph с цитатами |
| **Search Copilot** | AI Assistant нового поколения (не consumer-chat) |
| **Relevance Studio** | Инструмент настройки релевантности |
| **Security Plane** | Scoped access, tenant isolation, audit |
| **Search Analytics** | Аналитика поискового поведения |

---

## 4. Позиционирование

### One-liner
**AACSearch OS** — операционная система поиска для продуктов, каталогов и баз знаний.

### Expanded one-liner
Один слой для поиска, рекомендаций, GraphRAG, релевантности, аналитики и безопасного доступа.

### Hero
Search OS для продуктов, каталогов и баз знаний

### Hero subtitle
Один control plane для поиска и discovery: текст, голос, изображения, vector search,
recommendations, suggestions, GraphRAG, scoped-доступ и аналитика.

### Финальная формула (самая точная)
**AACSearch OS** — Search Operating System для product-grade discovery.
Один слой для поиска, рекомендаций, GraphRAG, релевантности, аналитики и безопасного доступа.

---

## 5. Product Visual Concept

```
Слева:                    Центр:                            Справа:
  Text                    AACSearch OS                       Results
  Voice                     Understanding → Retrieval →      Suggestions
  Image                     Ranking → GraphRAG →             Recommendations
  Chat                      Recommendations                  Answer with citations
  API                     + Control Plane                    Analytics event
                            (Relevance · Analytics · Security · Tenants · Quotas)
```

---

## 6. Что менять на сайте

1. Hero: "Search OS для продуктов, каталогов и баз знаний"
2. OS Stack diagram: 7 слоёв (Input → Understanding → Retrieval → Intelligence → Control → Security)
3. Input Modes секция: text, voice, image, chat
4. Retrieval Core: full-text, vector, visual, graph
5. Suggestions & Recommendations секция (новая)
6. GraphRAG / Knowledge Graph секция (новая)
7. Control Plane секция
8. AI Assistant → Search Copilot
9. Command Palette → Search OS Console
10. "Что вы получаете из коробки" → "Что входит в AACSearch OS"
11. "Как работает AACsearch" → "Как устроен AACSearch OS"
12. Pricing: тарифы Search OS, не search API
13. Footer: "Search OS для продуктов, каталогов и баз знаний"

---

## 7. Запрещённые термины

| ❌ Не использовать | ✅ Использовать |
|-------------------|-----------------|
| поиск как сервис | Search OS |
| умный поиск | Discovery Layer |
| магический поиск | Retrieval Core |
| AI для всего | Search Copilot |
| просто API | Search Control Plane |
| search API | Search Operating System |
| Algolia alternative | Search OS для product-grade discovery |

---

## 8. Dashboard Navigation (внутри продукта)

```
Overview
Indexes
Sources
Search UX
Suggestions
Recommendations
Knowledge Graph / GraphRAG
Relevance Studio
Analytics
Security Plane
Tenants
API Keys
Usage & Billing
Search Copilot
API Playground
```

---

## 9. Связь с Gap Analysis

Этот документ — стратегическая основа для redesign (design-redesign-gap-analysis.md).
Все визуальные изменения (тема, типографика, отступы, карточки) служат этой концепции.
Сначала позиционирование, потом дизайн, потом реализация.
