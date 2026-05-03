# Marketing i18n Audit — CMO Assessment

## Summary

Significant content gaps across the 5 marketing locale files. In many cases, the English
source (en) has _fewer_ keys than other locales — content was translated into es/fr/de/ru
but never authored in the English source of truth.

## Gap Matrix (keys missing per locale vs max)

| File           | en  | de  | es  | fr  | ru  | Max |
| -------------- | --- | --- | --- | --- | --- | --- |
| core.json      | 637 | 681 | 683 | 683 | 681 | 683 |
| features.json  | 282 | 314 | 340 | 340 | 314 | 340 |
| compare.json   | 447 | 365 | 397 | 397 | 365 | 447 |
| integrations   | 316 | 384 | 362 | 362 | 384 | 384 |
| solutions.json | 206 | 262 | 256 | 256 | 262 | 262 |

## English (en) Gaps — HIGHEST PRIORITY

**core.json (46 missing)**: affiliate (4), brand (2), community (2), faq (12),
glossary (10), newsletter (12), press (4), pricingPlans (2), resources (4),
status (4), support (6), trust (8)

**features.json (58 missing)**: Curations (8), Faceted Search (8), Geo Search (8),
InstantSearch (6), Relevance Tuning (10), Stopwords (12), Synonyms (6),
Typo Tolerance (6)

**integrations.json (68 missing)**: Contentful (10), Next.js (10), React (8),
Sanity (8), Shopify (8), Strapi (8), WooCommerce (10), WordPress (10)

**solutions.json (56 missing)**: Main (6), Education (10), Fintech (10),
Gaming (12), Healthcare (8), Media (14), Retail (8)

## Other Locale Gaps

**de (German)**: compare.json (-82), features.json (-26), core.json (-2)
**es (Spanish)**: compare.json (-50), features.json (equal), integrations (-22)
**fr (French)**: compare.json (-50), features.json (equal), integrations (-22)
**ru (Russian)**: compare.json (-82), features.json (-26), core.json (-2)

## Plan

Phase 1 — English source content (highest impact):

- features.json: author missing feature detail cards (58 keys)
- core.json: author missing sections (faq, glossary, newsletter, etc.)
- integrations.json: author missing integration detail cards (68 keys)
- solutions.json: author missing solution detail cards (56 keys)

Phase 2 — Sync compare.json to de/ru (82 missing) and es/fr (50 missing)
Phase 3 — Fill remaining gaps in de/es/fr/ru
