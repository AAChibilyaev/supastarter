# Customization (Next.js)

UI components, theming, and extensions in supastarter Next.js.

## UI Stack

- **Tailwind CSS v4** with design tokens in `tooling/tailwind/theme.css` (no per-app `tailwind.config.ts`)
- **Shadcn UI** primitives in `packages/ui/components/*`
- **Radix UI** for accessible behavior
- `cn()` helper from `@repo/ui`

> **Before building any UI, read [ui-component-catalog.md](ui-component-catalog.md).** ~80 reusable components ship across 3 layers (`@repo/ui` primitives → `@shared/components` blocks → feature blocks like `@auth/`, `@organizations/`, `@payments/`, `@settings/`). Reinventing them is the most common mistake.

## Editing the theme (Tailwind v4)

Design tokens (colors, radii, etc.) live in `tooling/tailwind/theme.css`:

```css
/* tooling/tailwind/theme.css (excerpt) */
@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch(0.55 0.2 260);
  --radius-md: 0.5rem;
  /* ... */
}
```

Edit this file to retheme all apps simultaneously. Per-app overrides go in `apps/<app>/app/globals.css`.

## Shared UI

```typescript
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui";
```

To customize a primitive, edit it directly in `packages/ui/components/<name>.tsx` (it's your code, not a dependency).

## App-specific UI

- SaaS feature components: `apps/saas/modules/<feature>/components/`
- Cross-cutting SaaS components: `apps/saas/modules/shared/components/` (e.g., notification center)
- Marketing components: `apps/marketing/modules/<area>/components/`

## Layouts & navigation

- SaaS root layout: `apps/saas/app/layout.tsx`
- Authenticated layout (renders `SessionProvider`, sidebar, etc.): `apps/saas/app/(authenticated)/layout.tsx`
- Main app shell: `apps/saas/app/(authenticated)/(main)/layout.tsx`
- Marketing layout: `apps/marketing/app/[locale]/layout.tsx`

## Onboarding

Steps are wired in `apps/saas/modules/onboarding/components/` and routed via `apps/saas/app/(authenticated)/onboarding/page.tsx`. The onboarding requirement is gated in middleware/server logic.

## Dashboard / settings

- Account settings: `apps/saas/app/(authenticated)/(main)/(account)/settings/`
- Org settings: `apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/settings/`
- Admin: `apps/saas/app/(authenticated)/(main)/(account)/admin/`
- Settings UI: `apps/saas/modules/settings/components/`

## Forms

Use `react-hook-form` + `zod` + the `Form*` primitives from `@repo/ui/components/form`. Reuse zod schemas from `packages/api/modules/<feature>/types.ts`.

## Conventions

- Server Components by default; `"use client"` only when needed.
- Named function exports for components; no default exports.
- `cn()` for conditional classes.
- Mobile-first responsive ordering.

## Docs

- [Customization overview](https://supastarter.dev/docs/nextjs/customization/overview)
- [Styling](https://supastarter.dev/docs/nextjs/customization/styling)
- [Dashboard](https://supastarter.dev/docs/nextjs/customization/dashboard)
- [Onboarding](https://supastarter.dev/docs/nextjs/customization/onboarding)
- shadcn/ui: <https://ui.shadcn.com>
- Tailwind v4: <https://tailwindcss.com/docs>
