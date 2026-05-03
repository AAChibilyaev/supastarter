# shadcn/ui v4 Ecosystem & Component Reference

> Last updated: 2026-05-03
> Project: AACsearch (Next.js 16 + pnpm + Turborepo)

## 📍 Quick Links

| Resource | URL |
|----------|-----|
| Official Docs (LLM) | https://ui.shadcn.com/llms.txt |
| MCP Server (AI browsing) | https://ui.shadcn.com/docs/mcp |
| awesome-shadcn-ui | github: birobirobiro/awesome-shadcn-ui (19.5K ⭐) |
| Component CLI | `pnpm dlx shadcn@latest add <name> -c packages/ui` |

## 🏗 Project Setup

- **Style**: `radix-nova` (v4)
- **Tailwind**: v4, CSS-based config (`@theme` in `theme.css`)
- **Dark mode**: `class` strategy (`.dark` on `<html>`)
- **Base color**: neutral (CSS vars via `:root` / `.dark`)
- **UI package**: `packages/ui/components/` — import via `@repo/ui/components/<name>`
- **Index**: `packages/ui/index.ts` — barrels for all components
- **Type-check**: `pnpm --filter @repo/ui type-check` — 0 errors ✅

## 📦 Installed Components (75 total)

### 52 Official shadcn Primitives

```
accordion     alert         alert-dialog  aspect-ratio  avatar
badge         breadcrumb    button        button-group  calendar
card          carousel      chart         checkbox      collapsible
command       context-menu  dialog        drawer        dropdown-menu
field         form          hover-card    input         input-otp
kbd           label         logo          menubar       navigation-menu
pagination    popover       progress      radio-group   resizable
scroll-area   select        separator     sheet         sidebar
skeleton      slider        sonner        spinner       switch
table         tabs          textarea      toast         toggle
toggle-group  tooltip
```

### 13 Landing Blocks (PageAI-Pro/page-ui, 1.6K⭐)

| Component | Purpose |
|-----------|---------|
| `GlowBg` | SVG radial gradient glow background |
| `LandingBand` | Brand-colored full-width band section |
| `LandingFeature` | Single feature card with icon |
| `LandingFeatureList` | Features grid section with glow bg |
| `LandingPricingSection` | Pricing section wrapper |
| `LandingPricingPlan` | Individual pricing plan card |
| `LandingFooter` | Landing page footer with columns |
| `LandingFooterColumn` | Footer column layout |
| `LandingFooterLink` | Footer navigation link |
| `LandingPrimaryCta` | Hero-equivalent CTA (image/text/video) |
| `LandingSaleCta` | Sale/conversion CTA section |
| `LandingVideoPlayer` | Video player with play overlay |
| `LandingImage` | Native `<img>` wrapper |

### 6 Chat Components (jakobhoeg/shadcn-chat, 1.6K⭐)

Path: `packages/ui/components/chat/`

| Component | Description |
|-----------|-------------|
| `ChatBubble` | Chat bubble + avatar + message + timestamp + actions |
| `ChatInput` | Text input (native `<textarea>`) |
| `ChatMessageList` | Scrollable message list with auto-scroll |
| `ExpandableChat` | Expandable FAB chat widget (bottom-right/left) |
| `MessageLoading` | Animated loading dots SVG |
| `useAutoScroll` | Hook for auto-scrolling chat |

### 4 Specialized Components

| Component | Source | Description |
|-----------|--------|-------------|
| `Tour` | NiazMorshed2007/shadcn-tour (285⭐) | Product tour (581 lines) |
| `Timeline` | timDeHof/shadcn-timeline (306⭐) | Timeline component (538 lines) |
| `Stepper` | damianricobelli/stepperize (1.6K⭐) | Step wizard via npm `@stepperize/react` |
| `Billing` | dodopayments/billingsdk (448⭐) | Billing UI hub via `@billingsdk/cli` |

### Key Dependencies Added

- `@stepperize/react@^6.1.0` — stepper hook & primitives
- `@billingsdk/cli@^1.3.0` — billing UI CLI
- `motion@^12.38.0` — animation (used by Tour, Timeline)
- `lucide-react` — icon library (already present)

## ✅ Saved Install Scripts

```bash
# Add shadcn primitive
pnpm dlx shadcn@latest add button -c packages/ui

# Install billing components (requires network)
npx @billingsdk/cli add pricing-table

# Search available components
pnpm dlx shadcn@latest search
```

## ⏳ Pending (blocked by npm registry)

| Package | CLI Command |
|---------|-------------|
| marmelab/shadcn-admin-kit (875⭐) | `pnpm add @react-admin/ra-shadcn --filter @repo/ui` |
| openstatusHQ/data-table-filters (2K⭐) | copy src from GitHub |

## 📚 Best Practices Summary

See `AGENTS.md` Section 8 for full rules. TL;DR:

1. **NO raw card divs** — use `<Card>` from `@repo/ui`
2. **NO wrapping shadcn components** — edit `.tsx` directly
3. **NO barrel imports** — use `@repo/ui/components/<name>`
4. **NO app logic in `packages/ui/`** — belongs in `apps/*/modules/`
5. **Button NO forwardRef** — use native `<button>` + `buttonVariants()`
6. **Composition over props** — `Card > CardHeader > CardTitle > Content`
7. **Always `cn()`** for className merging
