# AACsearch E-commerce Search Setup — Video Script

**Duration**: ~6:30
**Audience**: E-commerce developers and store owners (Shopify, WooCommerce, PrestaShop, Magento)
**Format**: Screen recording + voiceover + captions
**CTA**: https://aacsearch.com → "Start for free"

---

## Scene 1: Hook — The E-commerce Search Problem (0:00-0:45)

**Visual**: Side-by-side comparison: default platform search showing "no results" vs AACsearch showing rich product cards with filters

**Narration**:

> "A customer types 'blue running shoes' into your store search. Default platform search returns three mismatched results. They bounce. You just lost a sale."
>
> "E-commerce search is your highest-converting page — customers who use search are 2-3x more likely to buy. Let me show you how to set up a product search that actually works — with faceted navigation, instant results, and connector-based sync."

**On-screen**: Stats overlay: "Search users convert 2-3x higher", "43% of users go straight to search"

---

## Scene 2: Overview — What We're Building (0:45-1:15)

**Visual**: Split view — left side: product catalog in WooCommerce/Shopify admin, right side: AACsearch connector config screen

**Narration**:

> "We're going to take your product catalog — whether it's WooCommerce, Shopify, or PrestaShop — connect it to AACsearch using one of our pre-built connectors, and have a live product search running on your store in under ten minutes."

**On-screen**: Connector logos: WooCommerce, Shopify, PrestaShop, Contentful, Strapi, Sanity

---

## Scene 3: Creating a Project & Collection (1:15-2:30)

**Visual**:

1. Login to AACsearch dashboard
2. Create new project > "my-store"
3. Navigate to Collections > Create "products"
4. Show auto-detected schema: title (string), price (float), category (string), tags (string[]), image_url (string)

**Narration**:

> "First, create a project in your AACsearch dashboard. I'll name mine 'my-store'. Then create a collection called 'products'. AACsearch auto-detects field types from your data — no manual schema definition needed."
>
> "You can upload a JSON export directly, but the better approach is to use a connector for live sync."

**Tip overlay**: "Use a connector for live sync — keeps your search index in sync automatically as products change."

---

## Scene 4: Setting Up a Connector (2:30-4:00)

**Visual**:

1. Navigate to Connectors tab
2. Click "Add Connector" > select WooCommerce (or Shopify)
3. Enter API credentials (URL, consumer key, consumer secret)
4. Select collection mapping: products → products
5. Map fields: title → name, price → price, category → categories
6. Click "Connect and Sync"
7. Show sync progress bar → "Sync complete — 1,247 products indexed"

**Narration**:

> "Go to the Connectors tab and click 'Add Connector'. AACsearch has pre-built connectors for the most popular e-commerce platforms. I'll use WooCommerce."
>
> "Enter your store URL and API credentials, then map your product fields. AACsearch handles the rest — incremental sync, field type detection, image URL indexing."
>
> "Click 'Connect and Sync'. In seconds, your entire product catalog is searchable. The connector keeps itself in sync — when you update a price in WooCommerce, it updates in search automatically."

**On-screen**: "Incremental sync: ON" badge, "Last sync: 30 seconds ago"

---

## Scene 5: Faceted Search Configuration (4:00-5:15)

**Visual**:

1. In dashboard > Search Settings > Facets
2. Enable facets: Category (exact), Price Range (range 0-100-500-1000+), Brand (exact), Rating (range)
3. Configure display: checkbox for Category, slider for Price, star rating for Rating
4. Preview the search widget with facets active

**Narration**:

> "Now for the secret weapon — faceted navigation. Go to Search Settings and enable facets for the fields your customers actually filter by: Category, Price Range, Brand, maybe Rating."
>
> "Configure how each facet displays — checkboxes for categories, a slider for price ranges, star ratings for reviews. Customers can narrow down from hundreds of products to exactly what they want in two clicks."
>
> "You can also set up scoped API tokens per storefront — perfect if you run multiple stores from one AACsearch project."

**On-screen**: Demo of facet filtering: "Shoes → Nike → Under $100 → 4 stars+" showing results narrowing in real-time

---

## Scene 6: Embedding the Search Widget (5:15-6:00)

**Visual**:

1. Go to Widget > Embed
2. Copy the JavaScript snippet
3. Paste into store theme (show WooCommerce theme editor or Shopify liquid)
4. Reload store — show product search with instant results, faceted sidebar, autocomplete

**Narration**:

> "Time to put it on your store. AACsearch gives you a three-line JavaScript snippet — copy it, paste it into your store's theme just before the closing body tag."
>
> "Reload your store. Instant search, autocomplete suggestions, faceted filters — all styled to match your theme automatically. The widget works on desktop and mobile."
>
> "That's it. Your store now has enterprise-grade product search."

**On-screen**: Side-by-side before/after: default WooCommerce search → AACsearch rich interactive search

---

## Scene 7: Analytics — See What Customers Are Searching (6:00-6:30)

**Visual**: Dashboard > Analytics tab showing:

- Top search queries ("nike air max", "wireless headphones", "size 10")
- Zero-result queries ("purple sweater" — note: no inventory)
- Click-through rate per query
- Conversion rate for search users vs browse users

**Narration**:

> "The dashboard also shows you what your customers are searching for. See queries with zero results? That's lost revenue — you should stock those products. See what's trending, spot null- result patterns, and optimize your catalog based on real search data."
>
> "That's the e-commerce search setup. Your store now has search that converts."

**On-screen**: CTA overlay: "Start for free at aacsearch.com"
