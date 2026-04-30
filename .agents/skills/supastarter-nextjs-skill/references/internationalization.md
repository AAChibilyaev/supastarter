# Internationalization (Next.js)

i18n in supastarter Next.js uses `next-intl` and a 4-locale × 4-scope translation matrix.

## Locales

Configured in `packages/i18n/config.ts`:

- `en` (default), `de`, `es`, `fr`
- `defaultLocale: "en"`, `defaultCurrency: "USD"`, `localeCookieName: "NEXT_LOCALE"`

## Translation files (4 × 4 matrix)

```
packages/i18n/translations/
  en/{mail.json, marketing.json, saas.json, shared.json}
  de/{mail.json, marketing.json, saas.json, shared.json}
  es/{mail.json, marketing.json, saas.json, shared.json}
  fr/{mail.json, marketing.json, saas.json, shared.json}
```

Pick the right scope for new keys:

- `saas.json` — strings used only in `apps/saas`
- `marketing.json` — strings used only in `apps/marketing`
- `shared.json` — used across multiple apps
- `mail.json` — email templates only

When adding a key, add it to **all four locales** in the chosen scope file.

## Loading messages

Server-side (Server Components, Route Handlers):

```typescript
import { setRequestLocale } from "next-intl/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	// ...
}
```

The i18n loader (in `packages/i18n/lib/`) loads `getMessagesForLocale(locale, scope)` for the active scope.

Client-side:

```typescript
"use client";
import { useTranslations } from "next-intl";

export function Welcome() {
  const t = useTranslations();
  return <h1>{t("home.welcome.title")}</h1>;
}
```

## Routing

- **Marketing site** (`apps/marketing`) uses the `[locale]` segment: `apps/marketing/app/[locale]/...`. URLs include the locale (`/en/blog`, `/de/blog`).
- **SaaS app** (`apps/saas`) does NOT have a `[locale]` segment. The locale is detected via cookie/headers and applied via `setRequestLocale` server-side.

## Routing helpers

Per-app helpers under `apps/<app>/modules/i18n/lib/` (e.g., locale-aware `<Link>`, redirects, sitemap generation).

## Cookie

`NEXT_LOCALE` — set on locale change; respected by both Better Auth (in some flows) and the i18n loader. Don't rename it.

## Currency / formatting

Each locale config carries a `currency`. Use the `Intl` APIs for currency / date formatting:

```typescript
new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
```

## Adding a new locale

1. Add the locale entry in `packages/i18n/config.ts`.
2. Create `packages/i18n/translations/<locale>/{mail,marketing,saas,shared}.json` with all keys translated.
3. Verify `apps/marketing/middleware.ts` (or equivalent) routes the new locale.

## Content collections (Marketing MDX)

Blog posts, changelog, and legal MDX live under `apps/marketing/content/<locale>/...` (or use a single locale and translate later — check the existing layout).

## Docs

- [Internationalization](https://supastarter.dev/docs/nextjs/internationalization)
- next-intl: <https://next-intl-docs.vercel.app>
