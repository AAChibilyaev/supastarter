# SEO (Next.js)

Meta tags, sitemap, and structured data — primarily for `apps/marketing` and `apps/docs`.

## Metadata

Each app uses Next.js `Metadata` API. Patterns:

### Root metadata
```typescript
// apps/marketing/app/[locale]/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_MARKETING_URL!),
  title: { default: "My App", template: "%s · My App" },
  description: "...",
  openGraph: { /* ... */ },
};
```

### Per-page (dynamic)
```typescript
// apps/marketing/app/[locale]/blog/[slug]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await getPost(slug, locale);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.image] },
  };
}
```

## Sitemap

Marketing site has a sitemap route — typically `apps/marketing/app/sitemap.ts` (or per-locale `apps/marketing/app/[locale]/sitemap.ts`). Generate from content-collections data:

```typescript
import { allPosts } from "content-collections";

export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_MARKETING_URL!;
  return [
    { url: `${base}/`, lastModified: new Date() },
    ...allPosts.map(p => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date) })),
  ];
}
```

## Robots

`apps/marketing/app/robots.ts` (Next.js convention) — return rules referencing the sitemap URL.

## Structured data

JSON-LD via the `<script type="application/ld+json">` element in pages or shared layout:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      author: { "@type": "Person", name: post.author },
    }),
  }}
/>
```

## Per-app

- **Marketing** — full SEO surface (blog, changelog, legal, home).
- **Docs** — typical docs SEO (canonical URLs, page titles per article).
- **SaaS** — usually `noindex` for protected pages; only public auth pages need basic meta.

## Docs

- [Meta tags](https://supastarter.dev/docs/nextjs/seo/meta-tags)
- [Sitemap](https://supastarter.dev/docs/nextjs/seo/sitemap)
- Next.js metadata: <https://nextjs.org/docs/app/api-reference/functions/generate-metadata>
