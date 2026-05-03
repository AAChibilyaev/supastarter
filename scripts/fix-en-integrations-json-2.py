#!/usr/bin/env python3
import json

with open('packages/i18n/translations/en/marketing/integrations.json') as f:
    en = json.load(f)

en['integrationsContentful']['items']['fields'] = {'title': 'Field-level sync', 'description': 'Select which Contentful fields to sync to AACsearch. Exclude internal fields, hide metadata, and transform field values during sync.'}
en['integrationsContentful']['items']['locales'] = {'title': 'Locale management', 'description': 'Sync specific Contentful locales to AACsearch. Enable search in one, some, or all locales with per-locale index configuration.'}
en['integrationsContentful']['items']['sync'] = {'title': 'Automated sync', 'description': 'Contentful webhook integration triggers automatic sync on content publish, unpublish, and delete. No manual intervention required.'}
en['integrationsNextJs']['items']['routing'] = {'title': 'App Router support', 'description': 'Full Next.js App Router support with server components and client components. Search state syncs with URL search params automatically.'}
en['integrationsNextJs']['items']['ssr'] = {'title': 'Server-side rendering', 'description': 'Render initial search results server-side for SEO and faster page loads. Pages Route and App Router both supported.'}
en['integrationsReact']['items']['headless'] = {'title': 'Headless mode', 'description': 'Use AACsearch as a headless search API with React. No UI components included; build your own search experience from scratch.'}
en['integrationsReact']['items']['perf'] = {'title': 'Performance first', 'description': 'Memoized results, debounced queries, and incremental rendering. Search stays fast even with thousands of documents and complex facet configurations.'}
en['integrationsSanity']['items']['listener'] = {'title': 'GROQ listener', 'description': 'Listen for GROQ mutations and update AACsearch in real time. Filter which content types trigger sync updates to control indexing costs.'}
en['integrationsSanity']['items']['portable'] = {'title': 'Portable Text support', 'description': 'Convert Sanity Portable Text blocks to searchable plain text. Preserve heading structure, extract inline annotations, and strip formatting noise.'}
en['integrationsShopify']['items']['products'] = {'title': 'Product sync', 'description': 'Sync Shopify products including title, description, price, images, and metafields. Variants and options indexed as separate documents or nested fields.'}
en['integrationsStrapi']['items']['content'] = {'title': 'Content type sync', 'description': 'Sync any Strapi content type: collection types, single types, components, and dynamic zones. Configure sync per content type independently.'}
en['integrationsStrapi']['items']['populate'] = {'title': 'Deep population', 'description': 'Populate nested relations, components, and media fields during sync. AACsearch resolves Strapi relations up to the configured depth automatically.'}
en['integrationsWoocommerce']['items']['filters'] = {'title': 'Advanced filters', 'description': 'Price range sliders, category trees, attribute selectors, and rating filters generated automatically from WooCommerce product data.'}
en['integrationsWoocommerce']['items']['orders'] = {'title': 'Order search', 'description': 'Search WooCommerce orders by order number, customer name, email, or product. Power support and fulfillment teams with instant order lookup.'}
en['integrationsWoocommerce']['items']['products'] = {'title': 'Product search', 'description': 'Full-text search across product titles, descriptions, SKUs, and short descriptions. Typo-tolerant and facet-supported for complete e-commerce search.'}
en['integrationsWordpress']['items']['gutenberg'] = {'title': 'Gutenberg blocks', 'description': 'Index content from Gutenberg blocks: heading text, paragraph content, image alt text, and custom block attributes all become searchable.'}
en['integrationsWordpress']['items']['posts'] = {'title': 'Post and page search', 'description': 'Search across WordPress posts, pages, and custom post types. Title, content, excerpt, and custom fields are indexed with configurable weights.'}

with open('packages/i18n/translations/en/marketing/integrations.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'en/integrations.json: {count_leaves(en)} leaf values')
