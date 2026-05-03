#!/usr/bin/env python3
"""Fix en/integrations.json missing content - 68 keys across 8 integration sections"""
import json

with open('packages/i18n/translations/en/marketing/integrations.json') as f:
    en = json.load(f)

# Contentful integration details
en['integrationsContentful']['items']['localization'] = {
    'title': 'Localization support',
    'description': 'Sync content across all Contentful locales. Each locale maps to a separate AACsearch collection for multi-language search.'
}
en['integrationsContentful']['items']['mapping'] = {
    'title': 'Field mapping',
    'description': 'Map Contentful content fields to AACsearch index fields. Transform Rich Text to plain text, extract nested references, and flatten arrays.'
}
en['integrationsContentful']['items']['preview'] = {
    'title': 'Preview environment',
    'description': 'Sync draft content from Contentful preview environment for testing before publishing. Validate search results before going live.'
}
en['integrationsContentful']['items']['richText'] = {
    'title': 'Rich Text handling',
    'description': 'Automatically convert Contentful Rich Text fields to plain text for search indexing. Embedded assets and entries are extracted and processed.'
}

# Next.js integration details
en['integrationsNextJs']['items']['edgeRuntime'] = {
    'title': 'Edge Runtime support',
    'description': 'Use AACsearch SDK with Next.js Edge Runtime for sub-50ms search at the edge. Works with middleware and edge API routes.'
}
en['integrationsNextJs']['items']['hooks'] = {
    'title': 'React hooks',
    'description': 'useSearch, useFacets, and useAutocomplete hooks for declarative search UI in Next.js App Router. Type-safe and server-compatible.'
}
en['integrationsNextJs']['items']['routeHandlers'] = {
    'title': 'Route handlers',
    'description': 'Server-side API route handlers for scoped token generation, proxy search, and analytics endpoints. Keep API keys secure on the server.'
}
en['integrationsNextJs']['items']['ssg'] = {
    'title': 'Static generation',
    'description': 'Pre-render search pages at build time with AACsearch data. Reduce time-to-first-byte while keeping search results current via ISR.'
}
en['integrationsNextJs']['items']['typescript'] = {
    'title': 'TypeScript first',
    'description': 'Full TypeScript support with generated types from your AACsearch collection schema. Autocomplete for field names, filter values, and response shapes.'
}

# React integration details
en['integrationsReact']['items']['customUI'] = {
    'title': 'Custom UI components',
    'description': 'Build fully custom search UIs with React components. AACsearch SDK gives you the data layer — design your own search box, facets, and results grid.'
}
en['integrationsReact']['items']['performance'] = {
    'title': 'Performance optimized',
    'description': 'Tree-shakeable SDK. Import only the hooks you need. Bundle size under 5KB for a basic search implementation.'
}
en['integrationsReact']['items']['stateManagement'] = {
    'title': 'State management',
    'description': 'Search state is managed internally by the SDK. Syncs with URL params, browser history, and supports multi-search state for federated queries.'
}

# Sanity integration details
en['integrationsSanity']['items']['multiDataset'] = {
    'title': 'Multi-dataset sync',
    'description': 'Sync multiple Sanity datasets to separate AACsearch collections. Each dataset maintains its own search configuration and schema.'
}
en['integrationsSanity']['items']['realtime'] = {
    'title': 'Real-time sync',
    'description': 'Listen to Sanity GROQ mutations and update AACsearch in real time. Changes propagate within seconds of publishing in Sanity Studio.'
}
en['integrationsSanity']['items']['studio'] = {
    'title': 'Sanity Studio plugin',
    'description': 'Manage AACsearch configuration directly from Sanity Studio. View sync status, trigger reindex, and monitor errors without leaving Sanity.'
}
en['integrationsSanity']['items']['types'] = {
    'title': 'GROQ query support',
    'description': 'Use GROQ queries to define exactly what content gets synced to AACsearch. Filter, project, and join documents using Sanity query syntax.'
}

# Shopify integration details
en['integrationsShopify']['items']['facets'] = {
    'title': 'Product facets',
    'description': 'Shopify product variants, options, and metafields are automatically indexed as search facets. Filter by size, color, material, or custom attributes.'
}
en['integrationsShopify']['items']['multilingual'] = {
    'title': 'Multi-language support',
    'description': 'Sync Shopify product content in all store languages. AACsearch indexes each locale separately for region-specific search experiences.'
}
en['integrationsShopify']['items']['sync'] = {
    'title': 'Automated sync',
    'description': 'Automatic product sync via Shopify webhooks. Product create, update, and delete events propagate to AACsearch in real time.'
}
en['integrationsShopify']['items']['variants'] = {
    'title': 'Variant indexing',
    'description': 'Index Shopify variants as separate searchable documents or as nested fields. Each variant maintains its own price, inventory, and SKU.'
}

# Strapi integration details
en['integrationsStrapi']['items']['adminPanel'] = {
    'title': 'Admin panel integration',
    'description': 'Manage AACsearch directly from the Strapi admin panel. View index status, trigger syncs, and monitor errors without leaving Strapi.'
}
en['integrationsStrapi']['items']['api'] = {
    'title': 'REST API sync',
    'description': 'Sync any Strapi content type via the REST API. Define which collection types and single types to include or exclude from search indexing.'
}
en['integrationsStrapi']['items']['lifecycle'] = {
    'title': 'Lifecycle hooks',
    'description': 'Strapi lifecycle hooks trigger AACsearch updates on content create, update, and delete. Zero configuration required — hooks are installed by the plugin.'
}
en['integrationsStrapi']['items']['localization'] = {
    'title': 'i18n support',
    'description': 'Sync Strapi localized content to separate AACsearch collections per locale. Each locale maintains independent search configuration.'
}

# WooCommerce integration details
en['integrationsWoocommerce']['items']['attributes'] = {
    'title': 'Product attributes',
    'description': 'Index WooCommerce product attributes as search facets. Color, size, material, and custom attributes become clickable filters in search results.'
}
en['integrationsWoocommerce']['items']['categories'] = {
    'title': 'Category hierarchy',
    'description': 'Preserve WooCommerce category tree structure in AACsearch. Navigate categories with hierarchical facets that respect parent-child relationships.'
}
en['integrationsWoocommerce']['items']['performance'] = {
    'title': 'Search performance',
    'description': 'AACsearch handles WooCommerce search at scale. Sub-50ms query latency even on catalogues with 500K+ products and 10M+ SKUs.'
}
en['integrationsWoocommerce']['items']['plugin'] = {
    'title': 'WordPress plugin',
    'description': 'Install the AACsearch WooCommerce plugin from the WordPress plugin directory. One-click activation, automatic product sync, no code required.'
}
en['integrationsWoocommerce']['items']['sync'] = {
    'title': 'Automated product sync',
    'description': 'Automatic sync via WooCommerce hooks. Product changes propagate to AACsearch in real time. Bulk sync on plugin activation catches existing products.'
}

# WordPress integration details
en['integrationsWordpress']['items']['acf'] = {
    'title': 'Advanced Custom Fields',
    'description': 'ACF field values are automatically indexed when using the AACsearch plugin. Text, number, select, and repeater fields become searchable without manual mapping.'
}
en['integrationsWordpress']['items']['instant'] = {
    'title': 'Instant search',
    'description': 'Replace default WordPress search with instant, as-you-type results. Search across posts, pages, custom post types, and ACF fields simultaneously.'
}
en['integrationsWordpress']['items']['multilingual'] = {
    'title': 'WPML & Polylang support',
    'description': 'Compatible with WPML and Polylang for multi-language WordPress sites. Search results respect the current language context automatically.'
}
en['integrationsWordpress']['items']['postTypes'] = {
    'title': 'Custom post types',
    'description': 'Index any WordPress custom post type. Each post type can have its own search configuration, field weights, and facet settings.'
}
en['integrationsWordpress']['items']['shortcode'] = {
    'title': 'Shortcode widget',
    'description': 'Embed AACsearch widget anywhere in WordPress using a shortcode. Customize placeholder text, locale, and search results per page.'
}

with open('packages/i18n/translations/en/marketing/integrations.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'en/integrations.json: {count_leaves(en)} leaf values (was 316)')
