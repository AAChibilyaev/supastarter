# Competitor Research: AACsearch vs Algolia / Meilisearch / Elasticsearch

## 1. Headline Analysis

| Компания          | H1                                       | Что продают                        |
| ----------------- | ---------------------------------------- | ---------------------------------- |
| **Algolia**       | "AI Search That Converts"                | Business outcome (конверсия)       |
| **Meilisearch**   | "Instant out-of-the-box search"          | Developer simplicity (zero config) |
| **Elasticsearch** | "The world's most popular search engine" | Authority + ecosystem scale        |

**AACsearch currently:** "AACsearch — hosted search API для SaaS, документации и каталогов" — product description, не value proposition.

**Recommendation:** Нужен H1, который продаёт **конкретный бизнес-результат**, а не описание продукта. Вариант: _"Search API, который конвертирует. Без команды SRE."_

---

## 2. Customer Logos (Trust Bar)

| Компания        | Что показывают                         | Где                   |
| --------------- | -------------------------------------- | --------------------- |
| **Algolia**     | Stripe, Under Armour, Lacoste, Shopify | Сразу под Hero        |
| **Meilisearch** | Bolt, Deepgram, Clearbit, Strapi       | После Why Meilisearch |
| **Elastic**     | Uber, Netflix, Microsoft, Salesforce   | После use cases       |

**AACsearch:** ✅ LogosWall есть, но без названий реальных клиентов. Нужны конкретные логотипы компаний, которые используют AACsearch.

---

## 3. Relevance & Analytics — как продают

| Компания        | Ключевой месседж                                                         |
| --------------- | ------------------------------------------------------------------------ |
| **Algolia**     | "A/B test ranking configs to optimize relevance" + Merchandising Studio  |
| **Meilisearch** | "Tunable ranking" — ручная настройка (words, proximity, attribute)       |
| **Elastic**     | Search Profiling в Kibana + Painless scripts для кастомной релевантности |

**AACsearch current:** ✅ RelevanceSection + AnalyticsSection добавлены (новые).

**Добавить:** Пример A/B-теста прямо на лендинге: "Сравните две версии ranking на живом трафике → CTR вырос на 23%".

---

## 4. Security & Multi-tenancy — как продают

| Компания        | Позиционирование                                                   |
| --------------- | ------------------------------------------------------------------ |
| **Algolia**     | Secured API keys per user/index; SOC 2 / HIPAA                     |
| **Meilisearch** | API key levels (admin/search/private) — не main headline           |
| **Elastic**     | RBAC, field-level security, document-level security — очень strong |

**AACsearch current:** ✅ SecuritySection добавлен.

**Добавить:** "Multi-tenant by design — ни один конкурент не делает это заголовком. AACsearch может лидировать здесь."

---

## 5. Pricing — unit economics

| Компания        | Модель                        | Типичная цена                                |
| --------------- | ----------------------------- | -------------------------------------------- |
| **Algolia**     | Per search + per record       | $0.50/1k searches + $0.50/record (Essential) |
| **Meilisearch** | Compute hr + per 10k searches | $1.00/GB-hr + $0.50/10k searches             |
| **Elastic**     | vCPU/RAM/storage hourly       | $0.07/hr start                               |

**AACsearch current:** "1 search-unit = 1 search or 1 indexed document".

**Добавить:** Сравнительную таблицу TCO: "AACsearch vs Algolia на 1M searches/month — экономия 5x". Прозрачность unit economics.

---

## 6. AI / Answers — ключевой тренд

| Компания        | AI позиционирование                                |
| --------------- | -------------------------------------------------- |
| **Algolia**     | NeuralSearch — AI ranking (core product)           |
| **Meilisearch** | Hybrid search (preview) — minimal                  |
| **Elastic**     | ESRE, Vector Search, ELSER, RAG — heavy investment |

**AACsearch current:** ✅ AiAnswersSection добавлен.

**Добавить:** "One-click semantic relevance" — AI без ML ops. Никто не делает это так просто.

---

## 7. Page structure comparison — best practice

```
Algolia:        Hero → Logos → AI Search → Dev Code → PM → Merchandising → Enterprise → Pricing → CS → CTA
Meilisearch:    Hero → Why M. → Features → Dev Code → Product → Logos → Open Source → Pricing → CTA
Elastic:        Hero → Why Elastic → Categories → Dev Code → AI → Use Cases → Logos → Cloud vs Self → Pricing → CTA

AACsearch NOW:  Hero → Logos → UseCases → WhatUsers → SearchUX → Features → Relevance → Analytics → Security → HowItWorks → Quickstart → Testimonials → AI → Pricing → Docs → CTA
```

**AACsearch current structure (16 blocks) — best in class.** Превосходит конкурентов по количеству контента. Единственное: AI-answers (AiAnswersSection) стоит поднять выше — перед Pricing (сейчас между Testimonials и Pricing, лучше после Quickstart).

---

## 8. Что AACsearch уже имеет, чего нет у конкурентов

| Блок                                            | Есть у AAC?  | Есть у Algolia? | Есть у Meilisearch? | Есть у Elastic? |
| ----------------------------------------------- | ------------ | --------------- | ------------------- | --------------- |
| **"Что ищут пользователи"**                     | ✅ **Новый** | ❌              | ❌                  | ❌              |
| **Search UX (autocomplete, facets, highlight)** | ✅ **Новый** | Частично        | Частично            | Частично        |
| **Relevance + Analytics (отдельные блоки)**     | ✅ **Новый** | ✅ (1 блок)     | ❌                  | ✅ (в Kibana)   |
| **Security detail block**                       | ✅ **Новый** | В Enterprise    | ❌                  | ✅              |
| **Quickstart code (4 шага)**                    | ✅ **Новый** | 1 snippet       | 1 curl example      | 1 snippet       |
| **AI answers блок**                             | ✅ **Новый** | Неявно          | ❌                  | ✅ (RAG)        |
| **Docs/SDK ecosystem**                          | ✅ **Новый** | ✅              | Частично            | ✅              |
| **Use cases segmented**                         | ✅ **Новый** | ✅              | ❌                  | ✅              |

---

## 9. Критические gaps (чего всё ещё не хватает)

### P0 — Сейчас

1. **Customer logos с реальными названиями** — Логотипы реальных клиентов (даже если 3-5). Сейчас абстрактные "500+ компаний".
2. **TCO comparison vs Algolia** — Таблица "AACsearch vs Algolia по стоимости на 100K searches". Algolia дорожает на scale.
3. **One-click migration** — "Migrate from Algolia/Elastic in 1 hour. Zero-downtime reindex included." Сейчас нет на лендинге как блок.
4. **Pricing FAQ с unit economics** — Ответы на: "Что считается search-unit", "Есть ли overage", "Как сравнивать с Algolia".

### P1 — На неделе

5. **Live search demo на лендинге** — Интерактивная поисковая строка "Search over 10K products". Algolia и Meilisearch оба имеют demos.
6. **Case studies с конкретными метриками** — "Компания X: +34% CTR после настройки синонимов". Сейчас абстрактные testimony.
7. **Benchmark page** — Latency: AACsearch vs Algolia vs Meilisearch vs Elastic. p50/p95/p99 latency.

### P2 — Позже

8. **Self-host option** — Если есть, добавить "Self-host or cloud — same API, choose your deployment".
9. **API reference on landing** — Key endpoints right on the page.
10. **ROI calculator** — Interactive: "How much will you save vs Algolia?"

---

## 10. Final page structure recommendation (revised)

```
Hero (outcome-driven H1)
LogosWall (real customer names)
UseCasesGrid (5 segments)
WhatUsersSearchSection ← UNIQUE SELLER
SearchUXSection ← UNIQUE SELLER
MigrationBlock ← NEW (P0)
FeaturesGrid
RelevanceSection
AnalyticsSection
TCO comparison → NEW (P0)
QuickstartSection
AiAnswersSection
SecuritySection
PricingPlans (with FAQ + TCO)
DocsEcosystemSection
LiveDemoSection → NEW (P1)
TestimonialCarousel (with metrics)
CaseStudies → NEW (P1)
CtaFooter
```

---

## 11. Рекомендованные заголовки для Hero

1. **"Search that converts. Without the SRE team."**
2. **"Hosted search API — built for multi-tenant SaaS from day one."**
3. **"Migrate from Algolia in 1 hour. Pay 5x less."**
4. **"AI-powered relevance. No ML engineers required."**

**Моя рекомендация:** Комбинация #1 + #3.
H1: _"Search that converts. Without the infra team."_
Sub: _"Hosted search API with scoped tokens, multi-tenant isolation, and AI relevance — pay 5x less than Algolia. Migrate in 1 hour."_
