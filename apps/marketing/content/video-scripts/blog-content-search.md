# AACsearch Content / Blog Search — Video Script

**Duration**: ~4:15
**Audience**: Content creators, bloggers, documentation teams (Ghost, WordPress, Strapi, Contentful)
**Format**: Screen recording + voiceover + captions
**CTA**: https://aacsearch.com → "Start for free"

---

## Scene 1: Hook — Content Discovery Problem (0:00-0:30)

**Visual**: Blog homepage with standard WordPress search — user types "deploy with docker" → gets irrelevant category page matches. Cut to AACsearch showing instant, relevant results with highlighted snippets

**Narration**:

> "Your blog has a hundred posts. Your documentation site has five hundred articles. But your readers can't find anything because the built-in search just looks at titles."
>
> "Content is useless if people can't find it. Let me show you how to add instant, relevant full-text search to any blog or docs site — with typo tolerance, content preview, and analytics."

---

## Scene 2: Collection Setup for Content (0:30-1:30)

**Visual**:

1. AACsearch dashboard > Create collection "articles"
2. Fields: title (string), slug (string), excerpt (string), body (string), tags (string[]), author (string), published_at (string), category (string)
3. Advanced: Enable typo tolerance, set "body" as full-text search field, enable highlighting
4. Upload JSON export from Ghost/WordPress/Strapi or connect via connector

**Narration**:

> "Create a collection called 'articles'. The key fields are title, excerpt, body, tags, and published_at. Make sure to enable typo tolerance — your readers don't always type perfectly."
>
> "Set 'body' as your full-text search field and enable content highlighting. This way, search results show the exact sentence where the match occurs, not just the title."

**On-screen**: Highlight snippet example: "...deploy your search instance **with Docker** using our pre-built image..."

---

## Scene 3: Typo Tolerance & Synonyms (1:30-2:30)

**Visual**:

1. Settings > Typo Tolerance: Enable, set max typos to 2
2. Settings > Synonyms: Add pairs like "docker → container", "deploy → deployment → release"
3. Demo: Search "dockr" → matches "docker" posts. Search "set up container" → shows deployment posts too

**Narration**:

> "AACsearch handles typos automatically. A user searching for 'dockr' still finds your Docker deployment guide."
>
> "You can also add synonyms. If you write about 'deployment' and 'release' interchangeably, add them as synonyms — both terms will return the same results. Your readers find what they need regardless of which word they use."

**Tip overlay**: "Synonyms are one-directional by default. Use bidirectional if terms are truly interchangeable."

---

## Scene 4: Embedding on Your Site (2:30-3:30)

**Visual**:

1. Widget > Embed > Copy snippet
2. Show WordPress/Strapi theme integration
3. Or show React/SDK approach: `import { SearchProvider } from '@repo/search-client'`
4. Live demo: Search "how to deploy" → instant results with:
   - Title + highlighted excerpt
   - Category badge + author
   - Published date
   - Click → navigates to post

**Narration**:

> "Embedding is a three-line snippet for any CMS. Or if you're building with React, use the AACsearch React SDK for full control over the search UI."
>
> "Results appear instantly as the user types. Each result shows a highlighted content snippet so they can see why it matched before clicking. Category badges and metadata help them decide what's relevant."

**On-screen**: Animated search: typing "api key" → results updating in real-time with highlighted matches

---

## Scene 5: Usage Analytics for Content Teams (3:30-4:15)

**Visual**: Dashboard > Analytics > Search queries:

- Top queries: "typesense setup", "api keys", "connectors"
- Zero-result queries: "pricing europe" (note: content doesn't exist)
- Trending: "widget customization" (+240% this week)
- Click-through rate per query

**Narration**:

> "The analytics dashboard shows your readers' search behavior. Which topics are they looking for that you haven't covered? 'Pricing Europe' appears with zero results — time to write that post."
>
> "Trending queries show rising interest. If 'widget customization' is spiking, your readers are using that feature and need more guides."
>
> "Content teams use this data to plan their editorial calendar based on real demand. Write what people are searching for."

**On-screen**: CTA overlay: "Start for free at aacsearch.com"
