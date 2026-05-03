#!/usr/bin/env python3
import json

with open('packages/i18n/translations/en/marketing/solutions.json') as f:
    en = json.load(f)

# Education solutions
en['solutionsEducation']['items']['catalog'] = {'title': 'Course catalog search', 'description': 'Help students find courses across departments, levels, and formats. Filter by subject, instructor, schedule, and credit type.'}
en['solutionsEducation']['items']['knowledge'] = {'title': 'Knowledge base search', 'description': 'Index research papers, theses, and academic publications. Full-text and semantic search across your institution knowledge repository.'}
en['solutionsEducation']['items']['multilingual'] = {'title': 'Multilingual education', 'description': 'Support search across multiple languages for international universities. Each language indexed independently with language-aware stemming.'}
en['solutionsEducation']['items']['scorm'] = {'title': 'SCORM content search', 'description': 'Index SCORM learning objects and e-learning modules. Search across course titles, descriptions, learning objectives, and module metadata.'}

# Fintech solutions
en['solutionsFintech']['items']['auditLogs'] = {'title': 'Audit log search', 'description': 'Search millions of audit log entries by user, action, resource, and timestamp. Investigate compliance incidents in seconds instead of hours.'}
en['solutionsFintech']['items']['compliance'] = {'title': 'Compliance search', 'description': 'Search across KYC documents, transaction records, and regulatory filings. Boolean queries, date ranges, and filtered searches for compliance teams.'}
en['solutionsFintech']['items']['regions'] = {'title': 'Multi-region search', 'description': 'Deploy AACsearch across multiple regions for data residency compliance. Each region operates independently with isolated search infrastructure.'}
en['solutionsFintech']['items']['transactions'] = {'title': 'Transaction search', 'description': 'Search transaction history by amount, currency, merchant, date range, and status. Sub-50ms latency even across millions of transactions.'}

# Gaming solutions
en['solutionsGaming']['items']['highConcurrency'] = {'title': 'High concurrency', 'description': 'Handle thousands of concurrent search queries during peak gaming hours. AACsearch maintains sub-50ms latency under heavy load.'}
en['solutionsGaming']['items']['items'] = {'title': 'Item and inventory search', 'description': 'Search player inventories, item catalogs, and marketplaces. Filter by item type, rarity, stats, level requirement, and price range.'}
en['solutionsGaming']['items']['players'] = {'title': 'Player search', 'description': 'Search players by username, guild, level, rank, achievement score, and region. Power in-game social features and admin tools.'}
en['solutionsGaming']['items']['realtime'] = {'title': 'Real-time updates', 'description': 'Index updates propagate in real time as player data changes. New items, leaderboard positions, and player stats appear in search results immediately.'}
en['solutionsGaming']['items']['widget'] = {'title': 'In-game search widget', 'description': 'Embed AACsearch widget inside game UIs. Player-facing search for items, guilds, players, and leaderboards with game-themed styling.'}
en['solutionsGaming']['items']['wiki'] = {'title': 'Game wiki search', 'description': 'Search game wikis, guides, patch notes, and community content. Find the right guide, build, or strategy in seconds.'}

# Healthcare solutions
en['solutionsHealthcare']['items']['clinical'] = {'title': 'Clinical data search', 'description': 'Search clinical data across patient records, lab results, and medical histories. Support for structured and unstructured clinical notes.'}
en['solutionsHealthcare']['items']['hipaa'] = {'title': 'HIPAA compliance', 'description': 'AACsearch is built with HIPAA compliance in mind. Data encryption at rest and in transit, access controls, and audit logging included.'}
en['solutionsHealthcare']['items']['medicalCoding'] = {'title': 'Medical code search', 'description': 'Search ICD-10, CPT, and SNOMED codes with typo-tolerant and semantic search. Find the right code faster for billing and clinical documentation.'}
en['solutionsHealthcare']['items']['multilingual'] = {'title': 'Multilingual healthcare', 'description': 'Support search across multiple languages for healthcare providers serving diverse patient populations. Language-aware stemming per query.'}
en['solutionsHealthcare']['items']['patient'] = {'title': 'Patient portal search', 'description': 'Power patient portal search for appointments, medications, test results, and provider directories. Scoped tokens ensure patients only see their own data.'}

# Media & publishing solutions
en['solutionsMedia']['items']['articles'] = {'title': 'Article search', 'description': 'Search across thousands of articles by headline, author, category, publication date, and keyword. Typo-tolerant and facet-supported for news and editorial sites.'}
en['solutionsMedia']['items']['multiformat'] = {'title': 'Multi-format search', 'description': 'Index articles, videos, podcasts, and image galleries. Search across all content formats from a single search box with type-specific filters.'}
en['solutionsMedia']['items']['recommendations'] = {'title': 'Content recommendations', 'description': 'Surface related articles and content using vector search for semantic similarity. Increase page views and reader engagement with AI-powered recommendations.'}
en['solutionsMedia']['items']['subscription'] = {'title': 'Subscription-gated search', 'description': 'Combine search with subscription gating. Free users see preview results; subscribers access full content. Scoped tokens enforce access policies per query.'}
en['solutionsMedia']['items']['trending'] = {'title': 'Trending content', 'description': 'Surface trending articles based on recency, popularity, and editorial weight. Time-decay ranking keeps stale content out of top results.'}
en['solutionsMedia']['items']['video'] = {'title': 'Video search', 'description': 'Search across video titles, descriptions, transcripts, and tags. Facet by category, duration, publish date, and content type.'}

# Retail & e-commerce solutions
en['solutionsRetail']['items']['facets'] = {'title': 'Product facets', 'description': 'Multi-select facets for size, color, brand, price range, rating, and custom attributes. Real-time facet counts updated with every query.'}
en['solutionsRetail']['items']['instantSearch'] = {'title': 'Instant search', 'description': 'As-you-type search with typo tolerance. Results appear from the first keystroke, with debounced queries and client-side caching for a snappy UX.'}
en['solutionsRetail']['items']['multiCurrency'] = {'title': 'Multi-currency search', 'description': 'Display prices in the shoppers local currency. AACsearch handles multi-currency indexing with per-currency faceted price ranges.'}

with open('packages/i18n/translations/en/marketing/solutions.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'en/solutions.json: {count_leaves(en)} leaf values (was 206)')
