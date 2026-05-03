# Marketing i18n Audit — CMO Progress Report

## Completed (this heartbeat)

| File                  | en  | de  | es  | fr  | ru  | Status    |
| --------------------- | --- | --- | --- | --- | --- | --------- |
| **features.json**     | 372 | 372 | 372 | 372 | 372 | ✅ Synced |
| **core.json**         | 718 | 718 | 718 | 718 | 718 | ✅ Synced |
| **integrations.json** | 418 | 418 | 418 | 418 | 418 | ✅ Synced |
| **solutions.json**    | 300 | 300 | 300 | 300 | 300 | ✅ Synced |

### Content authored

- **features.json**: Added 90 missing keys to EN (feature detail cards for Curations, Faceted Search, Geo Search, InstantSearch, Relevance Tuning, Stopwords, Synonyms, Typo Tolerance). Propagated to DE/RU (58 keys each) and ES/FR (32 keys each).
- **core.json**: Authored 84 missing keys across 19 sections (affiliate, brand, community, FAQ, glossary, newsletter, press, resources, status, support, trust, pricing plans). Propagated across all 5 locales.
- **integrations.json**: Authored 102 missing keys across 8 integrations (Contentful, Next.js, React, Sanity, Shopify, Strapi, WooCommerce, WordPress). Synced across all 5 locales.
- **solutions.json**: Authored 94 missing keys across 6 solution areas (Education, Fintech, Gaming, Healthcare, Media, Retail). Synced across all 5 locales.

## Remaining gap

| File             | en  | de  | es  | fr  | ru  | Gap                    |
| ---------------- | --- | --- | --- | --- | --- | ---------------------- |
| **compare.json** | 436 | 357 | 389 | 389 | 357 | DE/RU: -79, ES/FR: -47 |

The remaining gap is the **compareTypesense** section — a full Typesense comparison page with:

- Feature comparison table (16 rows × 3 columns)
- 3 pricing scenarios
- Decision matrix
- Testimonial with quote
- CTA section
- Why-migrate section

This needs:

- DE: translate ~79 keys
- RU: translate ~79 keys
- ES/FR: translate ~47 keys

## Files modified in this heartbeat

- packages/i18n/translations/{en,de,es,fr,ru}/marketing/features.json
- packages/i18n/translations/{en,de,es,fr,ru}/marketing/core.json
- packages/i18n/translations/{en,de,es,fr,ru}/marketing/integrations.json
- packages/i18n/translations/{en,de,es,fr,ru}/marketing/solutions.json
- docs/marketing-i18n-audit.md (this file)

## Scripts created

- scripts/fix-en-core-json.py, fix-de-core-json.py, fix-ru-core-json.py
- scripts/fix-en-integrations-json.py, fix-es-fr-integrations-json.py, fix-de-ru-integrations-json.py, fix-en-integrations-json-2.py
- scripts/fix-en-solutions-json.py, fix-es-fr-solutions-json.py, fix-solutions-all.py
