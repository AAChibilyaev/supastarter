# AAC-460: Demo Sandbox Site + Guided Tour

## Scope

1. Demo search page (marketing site) - public, no auth needed
2. Guided tour via Shepherd.js on first login
3. Interactive walkthrough (already exists as GettingStarted)

## Part 1: Demo/Sandbox Search Page

### Approach

- Create `POST /api/demo/search` public endpoint in Hono (no auth)
- Uses a hardcoded demo org + index slug from env vars
- Create demo page at `apps/marketing/app/[locale]/demo/page.tsx`
- Fashion catalog: category, name, price, image, description fields
- Search UI with input, category filters, results grid
- No i18n for demo page (single English instance for product evaluation)

### API: New demo-search.ts in public handlers

- Mount new Hono app for demo
- No auth gate, no quota check
- Uses DEMO_ORG_ID + DEMO_INDEX_SLUG env vars
- Reuses searchDocuments from @repo/search

### UI: DemoSearchPage

- Client component with search input + results
- Category facet sidebar
- Product cards with image, name, price, category badge
- "Sign up free" CTA

## Part 2: Guided Tour

### Shepherd.js

- Install `shepherd.js` via pnpm
- Create `apps/saas/modules/search/components/GuidedTour.tsx`
- Hook into onboarding status - show on first login
- Tour steps: Overview → Search → API Keys → Analytics → Getting Started → Settings
- Store dismissed state in localStorage

## Part 3: Interactive Walkthrough

- Already exists as GettingStarted.tsx with 6-step checklist
- Verify it works correctly

## Files to create/modify:

1. CREATE: packages/api/modules/search/demo-public.ts
2. MODIFY: apps/saas/app/api/[[...rest]]/route.ts (mount demo endpoint)
3. CREATE: apps/marketing/app/[locale]/demo/page.tsx
4. CREATE: apps/marketing/modules/demo/components/DemoSearchPage.tsx
5. CREATE: apps/saas/modules/search/components/GuidedTour.tsx
6. MODIFY: apps/saas/modules/search/components/pages/GettingStarted.tsx (add tour trigger)
