# AACsearch 5-Minute Quickstart — Video Script

**Duration**: ~5:00
**Audience**: Developers evaluating AACsearch (React/Next.js/Node.js background)
**Format**: Screen recording + voiceover + captions
**CTA**: https://aacsearch.com → "Start for free"

---

## Scene 1: Hook (0:00-0:30)

**Visual**: AACsearch landing page → dashboard login screen
**Narration**:

> "Search is the first thing your users reach for — and the last thing you want to maintain. Let me show you how to get a production-ready search running in five minutes. No servers to provision. No Elasticsearch cluster to tune. No surprise bills."

**On-screen**: Timestamp overlay "0:00"
**Captions**: Sync key phrases: "production-ready search", "five minutes", "no servers"

---

## Scene 2: Create Account & Project (0:30-1:15)

**Visual**:

1. Navigate to aacsearch.com → click "Start for free"
2. Sign up with Google/GitHub or email
3. Dashboard loads → "Create your first project" modal

**Narration**:

> "Sign up takes ten seconds — Google or GitHub, whichever you prefer. Once you're in, create your first project. Give it a name — I'll call mine 'product-catalog'. You'll land on your project dashboard, and this is your command center."

**On-screen**:

- Highlight "Create project" button with a pulsing ring
- After creation, show the "Getting Started" wizard

**Tip overlay**: "Project names are used only for your reference — no URL constraints."

---

## Scene 3: Upload Data (1:15-2:30)

**Visual**:

1. Click "Add Data" or "Create Collection"
2. Show the collection creation form: name = "products", fields auto-detected
3. Upload a JSON file (show a small sample — 10 products)

**Narration**:

> "Now let's add some data. Click 'Create Collection', name it 'products'. AACsearch auto-detects field types — string, integer, float, boolean — so you don't need to define a schema upfront. Just drag in a JSON file, or paste from clipboard."

**Demo data** (on-screen JSON snippet):

```json
[
	{ "title": "Ergonomic Chair", "price": 299, "category": "furniture" },
	{ "title": "Standing Desk", "price": 499, "category": "furniture" }
]
```

**Narration continued**:

> "Hit 'Upload'. That's it. Your data is indexed and searchable in seconds. No mapping configuration. No reindexing scripts."

**On-screen**: Show the upload progress bar → "Collection ready ✓" toast

---

## Scene 4: Test Search (2:30-3:15)

**Visual**:

1. Switch to "Search" tab in dashboard
2. Type "chair" in the search input
3. Show results appearing with typo tolerance (type "chaiir" → still finds "Chair")
4. Show faceted navigation (price range, category)

**Narration**:

> "Let's test it. Type 'chair' ... Instant results. Now misspell it — 'c-h-a-i-i-r'. AACsearch's built-in typo tolerance still finds what you meant. And because our engine uses Typesense under the hood, you get faceted navigation, sorting, and geosearch without any configuration."

**On-screen**:

- Highlight "23ms" response time badge
- Show faceted filters (Category: furniture, Office; Price: $100-$500)

---

## Scene 5: Embed Search Widget (3:15-4:00)

**Visual**:

1. Navigate to "Widget" section in dashboard
2. Copy the embed script (a `<script>` tag or React component)
3. Show a CodeSandbox or local dev environment
4. Paste the script, save, refresh — search widget appears

**Narration**:

> "Here's where it gets really fast. Go to the 'Widget' section, grab the embed code — it's a single script tag. Paste it into any HTML page. Refresh. You now have a full-featured search widget with instant results, loading states, and mobile responsiveness — zero CSS to write."

**On-screen**:

- Embed code snippet (highlighted):

```html
<script
	src="https://cdn.aacsearch.com/widget/v1.js"
	data-project="YOUR_PROJECT_ID"
	data-collection="products"
></script>
```

- Before/after split: plain page → page with widget

---

## Scene 6: API Key & Production (4:00-4:45)

**Visual**:

1. Navigate to "API Keys" section
2. Create a scoped search-only API key
3. Show the key prefix: `ss_scoped_xxx_…`
4. Show the one-time plaintext copy modal

**Narration**:

> "Ready for production? Head to API Keys. Create a scoped search-only token — it can only query, never modify data. AACsearch shows the plaintext key exactly once, so copy it now. Use this in your frontend code with our search client library. Your data stays isolated — no accidental cross-org access."

**On-screen**: Warning banner "This key will not be shown again. Store it securely."

---

## Scene 7: Wrap + CTA (4:45-5:00)

**Visual**: Dashboard overview — project stats, recent searches, analytics placeholder
**Narration**:

> "Five minutes. From zero to a live search widget with data, typo tolerance, and production-ready API keys. No infrastructure. No hidden costs. Start for free at aacsearch.com — or check the description for our SDK docs, pricing calculator, and migration guides."

**On-screen**:

- URL: aacsearch.com
- Social links: GitHub, Twitter/X
- "Subscribe for more tutorials" overlay

---

## Production Notes

### Equipment

- Screen resolution: 1920×1080 (16:9)
- Recording tool: OBS or Screen Studio
- Microphone: Clean, no echo (Shure MV7 or similar)
- Background music: Low-energy, ambient (credit in description)

### Captions

- Use auto-captioning (YouTube) or burn-in for shorts
- Style: White text with black outline, bottom-center

### Thumbnail

- Text: "5-min Quickstart"
- Background: AACsearch gradient (blue-purple)
- Visual: Search bar magnifying glass + timer icon
- Style: Bold, high contrast, readable at small sizes

### YouTube Description Template

```
🚀 Get AACsearch: https://aacsearch.com

In this 5-minute tutorial:
00:00 — What you'll build
00:30 — Sign up & create a project
01:15 — Upload data (no schema needed)
02:30 — Test search with typo tolerance
03:15 — Embed the search widget
04:00 — API keys for production
04:45 — Next steps

Links:
- Docs: https://docs.aacsearch.com
- Pricing: https://aacsearch.com/pricing
- GitHub: https://github.com/aacsearch

#search #typesense #webdev #tutorial #javascript
```

---

## Playlist Structure

### Use Case Playlist: E-commerce

1. **[Quickstart]** 5-Minute Quickstart → foundation
2. **[E-commerce]** Product search with faceted navigation, price range, category filters
3. **[Advanced]** Scoped tokens per storefront (multi-tenant)
4. **[Analytics]** Search analytics dashboard → identify product gaps

### Use Case Playlist: Content / Blog

1. **[Quickstart]** 5-Minute Quickstart → foundation
2. **[Blog]** Instant full-text search with typo tolerance
3. **[Advanced]** Custom ranking by date + relevance
4. **[Integrations]** WordPress / PrestaShop connector setup

### Use Case Playlist: SaaS App

1. **[Quickstart]** 5-Minute Quickstart → foundation
2. **[App]** Multi-tenant search with per-tenant isolation
3. **[Advanced]** Scoped API keys + rate limiting
4. **[API]** Using the REST API for custom UIs
