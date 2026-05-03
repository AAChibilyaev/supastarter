# Quickstart Video Script — "Get AACsearch Running in 5 Minutes"

**Target:** 5-minute screencast for developers
**Platform:** YouTube
**Format:** Code walkthrough with split-screen (terminal + browser)

---

## Scene 1: Hook (0:00-0:30)

**Visual:** Split screen — left side terminal, right side index.html + browser

**Narrator:**
"Search is one of those things you don't think about until it breaks. Or until the bill arrives.

AACsearch is a hosted search API that costs a fixed amount, responds in under 50 milliseconds, and takes about 5 minutes to set up.

Let me show you."

---

## Scene 2: Create account + API key (0:30-1:30)

**Visual:** Browser tab — app.aacsearch.com signup flow

**Narrator:**
"Go to app.aacsearch.com, create an account. You land in the dashboard with a Free plan — no credit card needed.

Grab your API key from the settings page. That's your master key. We'll also create a scoped search-only key for the frontend."

**On screen:** Highlight "Create API Key" → copy the search-only key

---

## Scene 3: Upload data (1:30-2:30)

**Visual:** Terminal — curl command uploading a JSON file

**Narrator:**
"Now let's add some data. I have a products.json with 500 e-commerce items. One curl command uploads everything:"

```
curl -X POST https://app.aacsearch.com/api/v1/indexes/products/documents \
  -H "X-API-KEY: ss_search_xxx" \
  -H "Content-Type: application/json" \
  -d @products.json
```

**Narrator:**
"That's it. Our index now has 500 products ready to search."

---

## Scene 4: Embed search widget (2:30-4:00)

**Visual:** Code editor — HTML file with widget embed

**Narrator:**
"To add search to a webpage, drop in our embed script:"

```html
<script
	src="https://cdn.aacsearch.com/widget.js"
	data-index="products"
	data-api-key="ss_search_xxx"
></script>
```

**Narrator:**
"This gives you a full search UI — search box, faceted filters, instant results, typo tolerance. It takes one line of HTML.

Refresh the browser. Start typing 'runing shoes' — misspelled on purpose. AACsearch corrects the typo and shows running shoes instantly."

**Visual:** Browser showing search widget, typing with typo, getting correct results

---

## Scene 5: SDK approach (4:00-4:45)

**Visual:** Code editor — Node.js / React code

**Narrator:**
"If you prefer to build your own UI, use our SDK:"

```javascript
import { SearchClient } from "@aacsearch/client";

const search = new SearchClient({
	apiKey: "ss_search_xxx",
	indexSlug: "products",
});

const { hits } = await search.search({
	q: "wireless headphones",
	queryBy: "title,description",
});
```

**Narrator:**
"The SDK handles authentication, caching, and type responses out of the box."

---

## Scene 6: Wrap + CTA (4:45-5:00)

**Visual:** Dashboard analytics view

**Narrator:**
"After a few searches, the analytics dashboard starts showing query volume, top searches, and zero-result queries — so you know exactly what your users are looking for.

Sign up at app.aacsearch.com. Free tier covers your first 50,000 documents. No credit card needed."

**On screen:** app.aacsearch.com → "Get Started" button

---

## YouTube Description

```
In 5 minutes, you'll have a production-ready search experience:

- Sign up and get your API key
- Upload data with curl
- Embed a search widget with 1 line of HTML
- Or use the @aacsearch/client SDK

Links:
- Dashboard: https://app.aacsearch.com
- Docs: https://docs.aacsearch.com
- SDK: https://www.npmjs.com/package/@aacsearch/client
- Pricing: https://aacsearch.com/pricing

#search #webdev #typesense #opensource #javascript
```

---

## Thumbnail Ideas

1. **"5 MIN SEARCH SETUP"** — Terminal + browser split, big red play button
2. **"SEARCH IN 1 LINE"** — Close-up of HTML `<script>` tag with search results behind
3. **"BYE BYE ALGOLIA"** — Side-by-side pricing comparison with AACsearch $0/mo
