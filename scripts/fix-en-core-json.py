#!/usr/bin/env python3
import json

with open('packages/i18n/translations/en/marketing/core.json') as f:
    en = json.load(f)

# Add missing items to core.json
en['affiliate']['items']['payouts'] = {
    'title': 'Generous payouts',
    'description': 'Earn 20% recurring commission on every subscription you refer. Paid monthly via Stripe, no minimum threshold.'
}
en['affiliate']['items']['support'] = {
    'title': 'Dedicated affiliate support',
    'description': 'Get a personal affiliate manager, promotional materials, and a custom landing page for your audience.'
}

en['brand']['items']['logos'] = {
    'title': 'Logos & assets',
    'description': 'Download AACsearch logos in SVG, PNG, and vector formats. Color, monochrome, and dark-background variants included.'
}

en['community']['items']['events'] = {
    'title': 'Events & meetups',
    'description': 'Join AACsearch at industry events, webinars, and community meetups. Connect with the team and fellow developers.'
}

# FAQ items
en['faq']['items']['data'] = {
    'title': 'Where is my data stored?',
    'description': 'AACsearch runs on AWS in the region closest to your user base. Data stays in the chosen region and never leaves without your authorization.'
}
en['faq']['items']['limits'] = {
    'title': 'What are the plan limits?',
    'description': 'Free: 1,000 search-units/month, 1 index, 1 API key. Pro: 50,000 search-units/month, unlimited indexes, 10 API keys. Enterprise: custom limits and SLAs.'
}
en['faq']['items']['migrate'] = {
    'title': 'How do I migrate from Typesense?',
    'description': 'AACsearch is built on Typesense and uses the same search core. Migrate by exporting your index schema and documents, then reindexing via the AACsearch API. Most users complete the move in under a day.'
}
en['faq']['items']['support'] = {
    'title': 'What support options are available?',
    'description': 'Free plan: community support via Discord. Pro: email support within 24 hours. Enterprise: dedicated Slack channel and phone support with 1-hour SLA.'
}
en['faq']['items']['typesense'] = {
    'title': 'How is AACsearch different from Typesense Cloud?',
    'description': 'AACsearch is a managed search platform built on Typesense with additional features: multi-tenancy, scoped tokens, analytics dashboard, CMS connectors, knowledge RAG, and a hosted widget — all included in the price.'
}

# Glossary items
en['glossary']['items']['bm25'] = {
    'title': 'BM25',
    'description': 'A ranking function that scores documents based on term frequency and inverse document frequency. AACsearch uses BM25 as the default text relevance algorithm.'
}
en['glossary']['items']['inverted'] = {
    'title': 'Inverted index',
    'description': 'A data structure mapping every unique term in a document collection to the documents containing it. Enables fast full-text search at scale.'
}
en['glossary']['items']['vector'] = {
    'title': 'Vector search',
    'description': 'A search method that finds documents based on semantic similarity using embeddings, rather than exact keyword matches. AACsearch supports hybrid keyword + vector search.'
}

# Newsletter items
en['newsletter']['items']['community'] = {
    'title': 'Community highlights',
    'description': 'A monthly roundup of the best AACsearch community projects, plugins, and success stories from developers worldwide.'
}
en['newsletter']['items']['product'] = {
    'title': 'Product updates',
    'description': 'New features, performance improvements, and API changes. Changelog highlights delivered to your inbox monthly.'
}
en['newsletter']['items']['tutorials'] = {
    'title': 'Tutorials & guides',
    'description': 'Step-by-step guides for setting up search, migrating from competitors, and integrating AACsearch with popular frameworks.'
}

# Press items
en['press']['items']['releases'] = {
    'title': 'Press releases',
    'description': 'Official announcements about AACsearch product launches, funding rounds, partnerships, and company milestones.'
}

# Resources items
en['resources']['items']['migration'] = {
    'title': 'Migration guides',
    'description': 'Step-by-step instructions for migrating from Typesense Cloud, Algolia, Elasticsearch, Meilisearch, and other search platforms to AACsearch.'
}

# Status items
en['status']['items']['uptime'] = {
    'title': '99.99% uptime SLA',
    'description': 'Enterprise plan includes a 99.99% uptime SLA with credits for any downtime. Real-time status at status.aacsearch.com.'
}

# Support items
en['support']['items']['docs'] = {
    'title': 'Documentation',
    'description': 'Comprehensive guides, API reference, SDK documentation, and integration tutorials at docs.aacsearch.com.'
}
en['support']['items']['enterprise'] = {
    'title': 'Enterprise support',
    'description': 'Dedicated Slack channel, phone support, custom SLAs, and a named support engineer. Priority response time under 1 hour.'
}

# Trust items
en['trust']['items']['audit'] = {
    'title': 'Third-party audits',
    'description': 'AACsearch undergoes regular security audits by independent third parties. Reports are available under NDA for enterprise customers.'
}
en['trust']['items']['isolation'] = {
    'title': 'Tenant isolation',
    'description': 'Every organization data is isolated at the infrastructure level. Cross-tenant access is architecturally impossible, not just policy-enforced.'
}
en['trust']['items']['tokens'] = {
    'title': 'Token-based authentication',
    'description': 'API keys are hashed at rest using bcrypt. Scoped tokens use HMAC signing with server-side secrets. Plaintext keys are shown once and never stored.'
}

with open('packages/i18n/translations/en/marketing/core.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'en/core.json: {count_leaves(en)} leaf values (was 637)')
