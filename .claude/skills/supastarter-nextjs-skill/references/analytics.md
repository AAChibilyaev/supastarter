# Analytics (Next.js)

supastarter Next.js ships analytics adapters for **Pirsch, Plausible, Mixpanel, Google Analytics, PostHog, Umami, Vemetric, Vercel Analytics**, plus a custom adapter slot.

Per-provider docs: <https://supastarter.dev/docs/nextjs/analytics/overview> (links to each).

## Env (client-exposed)

```env
NEXT_PUBLIC_PIRSCH_CODE=
NEXT_PUBLIC_PLAUSIBLE_URL=
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_VEMETRIC_TOKEN=
```

The active providers depend on which env vars are populated. Check each provider's official supastarter doc for the exact var name (some change over time).

## Layout

The analytics provider/wrapper lives in `apps/marketing/modules/analytics/` (alias `@analytics` in marketing). The marketing root layout (`apps/marketing/app/[locale]/layout.tsx`) mounts the provider so analytics fire on public pages.

For the SaaS app, mount the relevant provider in `apps/saas/app/layout.tsx` if you want product analytics. Be careful with PII / consent.

## Usage

```typescript
// In a client component
"use client";
// Track an event via the provider's client API or via analytics provider helpers in @analytics
```

## Privacy / consent

If you serve EU users, gate analytics behind a consent banner. The SaaS app does not include a consent banner by default — add one before turning on third-party analytics.

## Docs

- [Analytics](https://supastarter.dev/docs/nextjs/analytics)
- Pirsch: <https://pirsch.io/docs>
- Plausible: <https://plausible.io/docs>
- Mixpanel: <https://docs.mixpanel.com>
- Google Analytics: <https://developers.google.com/analytics>
