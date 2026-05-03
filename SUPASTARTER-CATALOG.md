# supastarter Reusable Asset Catalog — AACsearch Alignment

> Generated 2026-05-03 from source code analysis + supastarter.dev/docs/nextjs
> Project root: `/Users/aac/Projects/ts/supastarter/`

---

## 1. ARCHITECTURE OVERVIEW

supastarter is a **Turborepo monorepo** with 4 Next.js apps + 20+ packages:

| Surface             | Path                  | Purpose                                                 |
| ------------------- | --------------------- | ------------------------------------------------------- |
| `apps/marketing`    | Public marketing site | Homepage, blog, changelog, legal, SEO, pricing, compare |
| `apps/saas`         | Protected SaaS app    | Auth, orgs, billing, settings, dashboard                |
| `apps/docs`         | Documentation         | Fumadocs-powered docs site                              |
| `apps/mail-preview` | Email preview         | React Email dev server                                  |
| `packages/*`        | 20+ shared packages   | Code sharing across apps                                |

**AACsearch status**: ✅ USES this architecture. Apps in `apps/saas` and `apps/marketing` are the main surfaces.

---

## 2. UI COMPONENTS — packages/ui (@repo/ui)

### 2.1 Shadcn Primitives (27 base components)

Import: `import { Button, Card, Dialog, ... } from "@repo/ui"`

**Available in AACsearch:** ✅ ALL 27 primitives available
**Gaps:** None — AACsearch has all of them

Components exported: `accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `logo`, `navigation-menu`, `popover`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `tooltip`, `aspect-ratio`, `button-group`, `field`, `kbd`, `menubar`, `radio-group`, `slider`, `sonner` (SonnerToaster), `toggle-group`, `pagination`, `calendar`, `carousel`, `resizable`, `data-table`, `input-group`, `sortable`, `stepper`, `tour`, `timeline`

### 2.2 Landing Page Components (12 blocks)

Import: `import { LandingFeature, LandingPricingSection, ... } from "@repo/ui"\*\*

| Component               | Purpose                 | File                                               |
| ----------------------- | ----------------------- | -------------------------------------------------- |
| `LandingBand`           | Hero section band       | `packages/ui/components/LandingBand.tsx`           |
| `LandingFeature`        | Single feature card     | `packages/ui/components/LandingFeature.tsx`        |
| `LandingFeatureList`    | Feature grid/list       | `packages/ui/components/LandingFeatureList.tsx`    |
| `LandingFooter`         | Full page footer        | `packages/ui/components/LandingFooter.tsx`         |
| `LandingFooterColumn`   | Footer column           | `packages/ui/components/LandingFooterColumn.tsx`   |
| `LandingFooterLink`     | Footer link item        | `packages/ui/components/LandingFooterLink.tsx`     |
| `LandingImage`          | Image with overlay text | `packages/ui/components/LandingImage.tsx`          |
| `LandingPricingSection` | Pricing table section   | `packages/ui/components/LandingPricingSection.tsx` |
| `LandingPricingPlan`    | Single pricing card     | `packages/ui/components/LandingPricingPlan.tsx`    |
| `LandingPrimaryCta`     | CTA button block        | `packages/ui/components/LandingPrimaryCta.tsx`     |
| `LandingSaleCta`        | Sales CTA block         | `packages/ui/components/LandingSaleCta.tsx`        |
| `LandingVideoPlayer`    | Video embed             | `packages/ui/components/LandingVideoPlayer.tsx`    |

**AACsearch status:** ✅ ALL available. Used in marketing site.

### 2.3 Chat Components (5 base)

Import: `import { ChatBubble, ChatInput, ChatMessageList, ExpandableChat, MessageLoading } from "@repo/ui"`

| Component         | File                                                |
| ----------------- | --------------------------------------------------- |
| `ChatBubble`      | `packages/ui/components/chat/chat-bubble.tsx`       |
| `ChatInput`       | `packages/ui/components/chat/chat-input.tsx`        |
| `ChatMessageList` | `packages/ui/components/chat/chat-message-list.tsx` |
| `ExpandableChat`  | `packages/ui/components/chat/expandable-chat.tsx`   |
| `MessageLoading`  | `packages/ui/components/chat/message-loading.tsx`   |

**AACsearch status:** ✅ ALL available.

### 2.4 UI Utilities

Import: `import { cn, formatLatency, formatDate, ... } from "@repo/ui"`

| Utility                              | Signature             | File                                     |
| ------------------------------------ | --------------------- | ---------------------------------------- |
| `cn(...inputs: ClassValue[])`        | Tailwind class merge  | `packages/ui/lib/index.ts`               |
| `formatLatency(ms: number)`          | "3.1s" or "42.000ms"  | `packages/ui/lib/format.ts`              |
| `formatMilliseconds(value: number)`  | Formatted number      | `packages/ui/lib/format.ts`              |
| `formatDate(value: Date \| string)`  | "May 03, 26 12:14"    | `packages/ui/lib/format.ts`              |
| `formatCompactNumber(value: number)` | "1.5k" / "2.0M"       | `packages/ui/lib/format.ts`              |
| `isArray(value)`                     | Array check           | `packages/ui/lib/is-array.ts`            |
| `composeRefs(...refs)`               | Compose multiple refs | `packages/ui/lib/compose-refs.ts`        |
| `ControlsProvider`, `useControls`    | UI controls context   | `packages/ui/providers/controls.tsx`     |
| `SonnerToaster`                      | Sonner toast provider | `packages/ui/components/sonner.tsx`      |
| `datePresets`                        | Date preset constants | `packages/ui/constants/date-preset.ts`   |
| `localStorageKeys`                   | LS key constants      | `packages/ui/constants/local-storage.ts` |

**AACsearch status:** ✅ ALL available.

### 2.5 UI Hooks

Import: `import { useIsMobile, useDebounce, useHotKey, useLocalStorage, useMediaQuery } from "@repo/ui"`

| Hook                                       | Signature                    | File                                   |
| ------------------------------------------ | ---------------------------- | -------------------------------------- |
| `useIsMobile()`                            | `boolean` — 768px breakpoint | `packages/ui/hooks/use-mobile.ts`      |
| `useDebounce<T>(value: T, delay?: number)` | Debounced value              | `packages/ui/hooks/use-debounce.ts`    |
| `useHotKey(callback, key, options?)`       | Keyboard shortcut            | `packages/ui/hooks/use-hot-key.ts`     |
| `useMediaQuery(query: string)`             | Media query match            | `packages/ui/hooks/use-media-query.ts` |

**AACsearch status:** ✅ ALL available.

### 2.6 Admin Components (deep paths only)

Import: `import { AdminCreate, AdminList, ... } from "@repo/ui/components/admin/<name>"`

**Not barrel-exported** — must import via deep path. Components include: `sort-button`, `file-input`, `theme-provider`, `authentication`, `array-input`, `bulk-delete-button`, `radio-button-group-input`, `ready`, `icon-button-with-tooltip`, `reference-many-count`, `show-guesser`, `data-table`, `search-input`, `show-button`, `boolean-field`, `text-field`, `date-time-input`, `saved-queries`, `cancel-button`, `date-field`, `single-field-list`, `reference-array-field`, `simple-show-layout`, `list-pagination`, `text-array-input`, `autocomplete-array-input`, `list`, `create`, `export-button`, `image-field`, `show`, `edit-guesser`, `toggle-filter-button`, `number-input`, etc.

**AACsearch status:** ✅ Available but NOT used yet (AACsearch hasn't needed admin CRUD pages).

---

## 3. SAAS APP SHARED COMPONENTS — apps/saas/modules/shared/components

These are the **app-specific shared UI components** built on top of `@repo/ui` primitives.

### 3.1 Layout & Navigation

| Component         | Import                               | Purpose                  | AACsearch Uses? |
| ----------------- | ------------------------------------ | ------------------------ | --------------- |
| `NavBar`          | `@shared/components/NavBar`          | Top navigation bar       | ✅ In use       |
| `AppSidebar`      | `@shared/components/AppSidebar`      | Sidebar with org context | ✅ In use       |
| `AppWrapper`      | `@shared/components/AppWrapper`      | Full app layout wrapper  | ✅ In use       |
| `Footer`          | `@shared/components/Footer`          | SaaS app footer          | ✅ In use       |
| `UserMenu`        | `@shared/components/UserMenu`        | User dropdown menu       | ✅ In use       |
| `ColorModeToggle` | `@shared/components/ColorModeToggle` | Dark/light toggle        | ✅ In use       |
| `LocaleSwitch`    | `@shared/components/LocaleSwitch`    | Language switcher        | ✅ In use       |
| `BillingNav`      | `@shared/components/BillingNav`      | Billing tab navigation   | ✅ In use       |

### 3.2 Page & Settings Layout

| Component        | Import                              | Signature                                                                       | AACsearch Uses? |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------- | --------------- |
| `PageHeader`     | `@shared/components/PageHeader`     | `<PageHeader title="..." subtitle="..." />`                                     | ✅ In use       |
| `SettingsList`   | `@shared/components/SettingsList`   | `<SettingsList><SettingsItem>...</SettingsItem></SettingsList>`                 | ✅ In use       |
| `SettingsItem`   | `@shared/components/SettingsItem`   | `<SettingsItem title="..." description="..." danger?><children></SettingsItem>` | ✅ In use       |
| `SettingsMenu`   | `@shared/components/SettingsMenu`   | Settings sidebar menu                                                           | ✅ In use       |
| `StatsTile`      | `@shared/components/StatsTile`      | Dashboard stats card                                                            | ✅ In use       |
| `StatsTileChart` | `@shared/components/StatsTileChart` | Dashboard stats with chart                                                      | ✅ In use       |
| `TabGroup`       | `@shared/components/TabGroup`       | Tab navigation group                                                            | ✅ In use       |
| `Pagination`     | `@shared/components/Pagination`     | Page navigation                                                                 | ✅ In use       |

### 3.3 Auth & User

| Component       | Import                             | AACsearch Uses?                 |
| --------------- | ---------------------------------- | ------------------------------- | --------- |
| `AuthWrapper`   | `@shared/components/AuthWrapper`   | Auth layout wrapper             | ✅ In use |
| `UserAvatar`    | `@shared/components/UserAvatar`    | Avatar with fallback            | ✅ In use |
| `PasswordInput` | `@shared/components/PasswordInput` | Password with visibility toggle | ✅ In use |

### 3.4 Consent & Notifications

| Component                   | Import                                         | AACsearch Uses?              |
| --------------------------- | ---------------------------------------------- | ---------------------------- | --------- |
| `ConsentBanner`             | `@shared/components/ConsentBanner`             | Cookie consent banner        | ✅ In use |
| `ConsentProvider`           | `@shared/components/ConsentProvider`           | Consent context provider     | ✅ In use |
| `ConfirmationAlertProvider` | `@shared/components/ConfirmationAlertProvider` | Confirmation dialogs         | ✅ In use |
| `NotificationCenter`        | `@shared/components/NotificationCenter`        | In-app notifications         | ✅ In use |
| `PostHogProvider`           | `@shared/components/PostHogProvider`           | Analytics provider           | ✅ In use |
| `ApiClientProvider`         | `@shared/components/ApiClientProvider`         | oRPC client provider         | ✅ In use |
| `ClientProviders`           | `@shared/components/ClientProviders`           | All client providers wrapper | ✅ In use |

### 3.5 Shared Hooks (saas)

| Hook                                                       | Import                          | File                        | AACsearch Uses? |
| ---------------------------------------------------------- | ------------------------------- | --------------------------- | --------------- |
| `useCookieConsent()`                                       | `@shared/hooks/cookie-consent`  | `hooks/cookie-consent.ts`   | ✅ In use       |
| `useMediaQuery()`                                          | `@shared/hooks/use-media-query` | `hooks/use-media-query.ts`  | ✅ In use       |
| `localeCurrency`                                           | `@shared/hooks/locale-currency` | `hooks/locale-currency.tsx` | ✅ In use       |
| `router` — `useOAuthProviders, getTeamInvitationInfo, ...` | `@shared/hooks/router`          | `hooks/router.ts`           | ✅ In use       |

### 3.6 Auth Components (saas/modules/auth)

| Component            | Import                                | AACsearch Uses? |
| -------------------- | ------------------------------------- | --------------- |
| `LoginForm`          | `@auth/components/LoginForm`          | ✅ In use       |
| `SignupForm`         | `@auth/components/SignupForm`         | ✅ In use       |
| `ForgotPasswordForm` | `@auth/components/ForgotPasswordForm` | ✅ In use       |
| `ResetPasswordForm`  | `@auth/components/ResetPasswordForm`  | ✅ In use       |
| `OtpForm`            | `@auth/components/OtpForm`            | ✅ In use       |
| `LoginModeSwitch`    | `@auth/components/LoginModeSwitch`    | ✅ In use       |
| `SocialSigninButton` | `@auth/components/SocialSigninButton` | ✅ In use       |
| `SessionProvider`    | `@auth/components/SessionProvider`    | ✅ In use       |

### 3.7 Auth Hooks (saas/modules/auth/hooks)

| Hook           | Import                    | AACsearch Uses? |
| -------------- | ------------------------- | --------------- |
| `useSession()` | `@auth/hooks/use-session` | ✅ In use       |

### 3.8 Organization Components (saas/modules/organizations)

| Component                     | Import                                                  | AACsearch Uses? |
| ----------------------------- | ------------------------------------------------------- | --------------- |
| `OrganizationSelect`          | `@organizations/components/OrganizationSelect`          | ✅ In use       |
| `CreateOrganizationForm`      | `@organizations/components/CreateOrganizationForm`      | ✅ In use       |
| `OrganizationMembersList`     | `@organizations/components/OrganizationMembersList`     | ✅ In use       |
| `OrganizationMembersBlock`    | `@organizations/components/OrganizationMembersBlock`    | ✅ In use       |
| `InviteMemberForm`            | `@organizations/components/InviteMemberForm`            | ✅ In use       |
| `OrganizationInvitationsList` | `@organizations/components/OrganizationInvitationsList` | ✅ In use       |
| `ChangeOrganizationNameForm`  | `@organizations/components/ChangeOrganizationNameForm`  | ✅ In use       |
| `DeleteOrganizationForm`      | `@organizations/components/DeleteOrganizationForm`      | ✅ In use       |
| `OrganizationRoleSelect`      | `@organizations/components/OrganizationRoleSelect`      | ✅ In use       |
| `OrganizationLogo`            | `@organizations/components/OrganizationLogo`            | ✅ In use       |
| `OrganizationLogoForm`        | `@organizations/components/OrganizationLogoForm`        | ✅ In use       |
| `OrganizationsGrid`           | `@organizations/components/OrganizationsGrid`           | ✅ In use       |
| `OrganizationInvitationAlert` | `@organizations/components/OrganizationInvitationAlert` | ✅ In use       |
| `OrganizationInvitationModal` | `@organizations/components/OrganizationInvitationModal` | ✅ In use       |
| `ActiveOrganizationProvider`  | `@organizations/components/ActiveOrganizationProvider`  | ✅ In use       |

### 3.9 Settings Components (saas/modules/settings)

| Component                     | Import                                             | AACsearch Uses? |
| ----------------------------- | -------------------------------------------------- | --------------- |
| `ChangeNameForm`              | `@settings/components/ChangeNameForm`              | ✅ In use       |
| `ChangeEmailForm`             | `@settings/components/ChangeEmailForm`             | ✅ In use       |
| `ChangePassword`              | `@settings/components/ChangePassword`              | ✅ In use       |
| `UserAvatarForm`              | `@settings/components/UserAvatarForm`              | ✅ In use       |
| `UserAvatarUpload`            | `@settings/components/UserAvatarUpload`            | ✅ In use       |
| `UserLanguageForm`            | `@settings/components/UserLanguageForm`            | ✅ In use       |
| `TwoFactorBlock`              | `@settings/components/TwoFactorBlock`              | ✅ In use       |
| `PasskeysBlock`               | `@settings/components/PasskeysBlock`               | ✅ In use       |
| `ConnectedAccountsBlock`      | `@settings/components/ConnectedAccountsBlock`      | ✅ In use       |
| `ActiveSessionsBlock`         | `@settings/components/ActiveSessionsBlock`         | ✅ In use       |
| `CropImageDialog`             | `@settings/components/CropImageDialog`             | ✅ In use       |
| `DeleteAccountForm`           | `@settings/components/DeleteAccountForm`           | ✅ In use       |
| `NotificationPreferencesForm` | `@settings/components/NotificationPreferencesForm` | ✅ In use       |
| `SetPassword`                 | `@settings/components/SetPassword`                 | ✅ In use       |
| `SettingsMenu`                | `@settings/components/SettingsMenu`                | ✅ In use       |
| `SubscriptionStatusBadge`     | `@settings/components/SubscriptionStatusBadge`     | ✅ In use       |
| `CustomerPortalButton`        | `@settings/components/CustomerPortalButton`        | ✅ In use       |

### 3.10 Payment Components (saas/modules/payments)

| Component                | Import                                        | AACsearch Uses? |
| ------------------------ | --------------------------------------------- | --------------- |
| `ActivePlan`             | `@payments/components/ActivePlan`             | ✅ In use       |
| `ActivePlanBadge`        | `@payments/components/ActivePlanBadge`        | ✅ In use       |
| `PricingTable`           | `@payments/components/PricingTable`           | ✅ In use       |
| `ChangePlan`             | `@payments/components/ChangePlan`             | ✅ In use       |
| `CheckoutReturnContent`  | `@payments/components/CheckoutReturnContent`  | ✅ In use       |
| `AiWalletCard`           | `@payments/components/AiWalletCard`           | ✅ In use       |
| `CreditConsumptionTable` | `@payments/components/CreditConsumptionTable` | ✅ In use       |
| `CreditUsageChart`       | `@payments/components/CreditUsageChart`       | ✅ In use       |
| `InvoiceHistory`         | `@payments/components/InvoiceHistory`         | ✅ In use       |
| `InvoiceStatusBadge`     | `@payments/components/InvoiceStatusBadge`     | ✅ In use       |
| `LowBalanceBanner`       | `@payments/components/LowBalanceBanner`       | ✅ In use       |
| `PaymentMethodCard`      | `@payments/components/PaymentMethodCard`      | ✅ In use       |
| `PaymentMethodsCard`     | `@payments/components/PaymentMethodsCard`     | ✅ In use       |
| `PricingRateCard`        | `@payments/components/PricingRateCard`        | ✅ In use       |
| `TopUpDialog`            | `@payments/components/TopUpDialog`            | ✅ In use       |
| `UpgradeSuccessToast`    | `@payments/components/UpgradeSuccessToast`    | ✅ In use       |

---

## 4. CONFIGURATION PATTERNS

### 4.1 App Configs

Every app uses a `config.ts` pattern with `as const satisfies <ConfigType>`.

| Config File | Path                       | Key Fields                                                                                                          |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Marketing   | `apps/marketing/config.ts` | `appName`, `docsUrl`, `saasUrl`, `enabledThemes`, `defaultTheme`                                                    |
| SaaS        | `apps/saas/config.ts`      | `appName`, `docsUrl`, `marketingUrl`, `enabledThemes`, `defaultTheme`, `redirectAfterSignIn`, `redirectAfterLogout` |

**AACsearch status:** ✅ Both configs present and customized.

### 4.2 Package Configs

| Config File | Path                          | Key Fields                                                                                                                                                                                                                              |
| ----------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | `packages/auth/config.ts`     | `enableSignup`, `enableMagicLink`, `enableSocialLogin`, `enablePasskeys`, `enablePasswordLogin`, `enableTwoFactor`, `sessionCookieMaxAge`, `users.enableOnboarding`, `organizations.enable`, `organizations.forbiddenOrganizationSlugs` |
| Payments    | `packages/payments/config.ts` | `billingAttachedTo`, `requireActiveSubscription`, `aiWallet.monthlyIncludedByPlan`, `searchLimits`, `plans.{starter,pro,lifetime,enterprise}`                                                                                           |
| Storage     | `packages/storage/config.ts`  | `bucketNames.avatars`                                                                                                                                                                                                                   |
| Mail        | `packages/mail/config.ts`     | `mailFrom`, `locales`, `defaultLocale`                                                                                                                                                                                                  |
| i18n        | `packages/i18n/config.ts`     | `locales.{en,de,es,fr,ru}`, `defaultLocale`, `defaultCurrency`, `localeCookieName`                                                                                                                                                      |
| Search      | `packages/search/config.ts`   | `collectionPrefix`, `defaultPerPage`, `maxPerPage`, `tenantField`, `ingestBatchSize`, `defaultUsageWindowDays`                                                                                                                          |

**AACsearch status:** ✅ ALL present and customized for AACsearch (e.g., plans: starter/pro/business/lifetime/free, RUB prices added).

---

## 5. AUTHENTICATION — packages/auth (@repo/auth)

### 5.1 Server-side Auth

**File:** `packages/auth/auth.ts` → exports `auth`

```typescript
import { auth } from "@repo/auth";
// Session check:
const session = await auth.api.getSession({ headers: context.headers });
```

**Plugins:** `magicLink`, `organization`, `twoFactor`, `passkey`, `openAPI`, `admin`, `invitationOnlyPlugin` (custom)

**Config-driven:** All features toggleable via `packages/auth/config.ts`

**AACsearch status:** ✅ In use. AACsearch has added custom plugins: `invitation-only`.

### 5.2 Client-side Auth

**File:** `packages/auth/client.ts` → exports `authClient`

```typescript
import { authClient } from "@repo/auth/client";
// Usage: authClient.signIn.email(...), authClient.signUp.email(...)
```

**Plugins:** `magicLinkClient()`, `organizationClient()`, `adminClient()`, `passkeyClient()`, `twoFactorClient()`

**AACsearch status:** ✅ In use.

### 5.3 RBAC (Role-Based Access Control)

**File:** `packages/auth/lib/rbac.ts` → exports `ORGANIZATION_ROLES`, `Permission`, `hasPermission`, `getRolePermissions`, `hasMinRole`, `normalizeRole`, `requirePermission`, `requireMinRole`

**Roles:** `owner` (100) > `admin` (80) > `member` (50) > `viewer` (10)

**Permissions:** `MANAGE_MEMBERS`, `MANAGE_BILLING`, `VIEW_BILLING`, `EDIT_WORKFLOWS`, `RUN_WORKFLOWS`, `VIEW_WORKFLOWS`, `MANAGE_INTEGRATIONS`, `DELETE_ORGANIZATION`, `MANAGE_AI`, `MANAGE_ANALYTICS`, `VIEW_ANALYTICS`

**AACsearch status:** ✅ In use. Permissions are customized for AACsearch (added `MANAGE_ANALYTICS`, `VIEW_ANALYTICS`, etc.).

### 5.4 Auth Pages

**Login types:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`
**Flow:** Email/password, magic link, OAuth (Google, GitHub, Apple), passkeys, 2FA

**AACsearch status:** ✅ All auth pages present in `apps/saas/app/(unauthenticated)/`.

---

## 6. oRPC API LAYER — packages/api (@repo/api)

### 6.1 Procedure Definitions

**File:** `packages/api/orpc/procedures.ts`

```typescript
import { os, ORPCError } from "@orpc/server";
import { auth } from "@repo/auth";

// Public — no auth required
export const publicProcedure = os.$context<{ headers: Headers }>();

// Protected — requires session
export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
	const session = await auth.api.getSession({ headers: context.headers });
	if (!session) throw new ORPCError("UNAUTHORIZED");
	return await next({ context: { session: session.session, user: session.user } });
});

// Admin — requires admin role
export const adminProcedure = protectedProcedure.use(async ({ context, next }) => {
	if (context.user.role !== "admin") throw new ORPCError("FORBIDDEN");
	return await next();
});
```

**AACsearch status:** ✅ All three procedures in use.

### 6.2 oRPC Router Structure

**File:** `packages/api/orpc/router.ts`

```typescript
export const router = publicProcedure.router({
	admin: adminRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	ai: aiRouter,
	notifications: notificationsRouter,
	search: searchRouter,
	feedback: feedbackRouter,
	knowledge: knowledgeRouter,
	billingWallet: billingWalletRouter,
	entitlements: entitlementsRouter,
	collections: collectionsRouter,
	indexing: indexingRouter,
	mySearch: mySearchRouter,
	onboarding: onboardingRouter,
	recommendations: recommendationsRouter,
});
```

**Pattern:** Each domain has its own `router.ts` file in `packages/api/modules/<domain>/`.
Router files: `admin`, `ai`, `billing-wallet`, `collections`, `entitlements`, `feedback`, `indexing`, `knowledge`, `my-search`, `notifications`, `onboarding`, `organizations`, `payments`, `recommendations`, `search`, `users`

**AACsearch status:** ✅ In use. AACsearch has 16 domain routers mounted.

### 6.3 oRPC Handlers

**File:** `packages/api/orpc/handler.ts`

```typescript
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";

export const rpcHandler = new RPCHandler(router, { ... });
export const openApiHandler = new OpenAPIHandler(router, {
  plugins: [new SmartCoercionPlugin(...), new OpenAPIReferencePlugin({ ... })],
});
```

**Dual mount:** RPC at `/api/rpc/*`, OpenAPI at `/api/*` (with auto-generated docs at `/api/docs`)

**AACsearch status:** ✅ In use.

### 6.4 Hono App Server

**File:** `packages/api/index.ts`

```typescript
export const app = new Hono()
  .basePath("/api")
  .route("/", publicSearchApp)
  .route("/", eventsApp)
  .route("/", connectorApp)
  .route("/", shopifyApp)
  .route("/", demoApp)
  .route("/", analyticsApp)
  .route("/v1", v1Router)
  .use("*", cors({ origin: ..., credentials: true }))
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .post("/webhooks/payments", ...)
  .get("/health", ...)
  .use("*", async (c, next) => { /* oRPC handlers */ });
```

**Pattern:** Public endpoints mounted BEFORE global CORS middleware. Auth and protected routes AFTER.

**AACsearch status:** ✅ In use.

---

## 7. DATABASE — packages/database (@repo/database)

### 7.1 ORM: Prisma (active) + Drizzle (legacy)

**File:** `packages/database/prisma/index.ts`

```typescript
import { db } from "@repo/database"; // Prisma client
```

**33 Prisma models** (AACsearch-specific + supastarter base)

### 7.2 Database Queries Pattern

**Path:** `packages/database/prisma/queries/*.ts`

19 query files: `activation.ts`, `ai-pricing.ts`, `ai-usage.ts`, `ai-wallets.ts`, `billing-analytics.ts`, `collections.ts`, `drip-emails.ts`, `knowledge.ts`, `my-search.ts`, `newsletter.ts`, `organizations.ts`, `personalization.ts`, `purchases.ts`, `roadmap.ts`, `search-rate-limit.ts`, `search.ts`, `users.ts`, `wallet-topup-orders.ts`

**Pattern:** All query files re-exported via `packages/database/prisma/queries/index.ts`, which is then re-exported via `packages/database/index.ts`.

```typescript
// Usage:
import { db, getUserByEmail, getPurchasesByUserId, ... } from "@repo/database";
```

**AACsearch status:** ✅ In use. AACsearch has added many custom query files.

### 7.3 Prisma Zod Schemas

**Path:** `packages/database/prisma/zod/`
Auto-generated Zod schemas from Prisma models. Re-exported via `packages/database/index.ts`.

**AACsearch status:** ✅ Available.

---

## 8. PAYMENTS — packages/payments (@repo/payments)

### 8.1 Provider Setup

**Path:** `packages/payments/provider/` — 5 providers: Stripe, LemonSqueezy, Polar, Creem, DodoPayments

**AACsearch:** Uses **Dodo Payments** provider.

### 8.2 Payment Libs

| Export                                          | File                        | Purpose                    |
| ----------------------------------------------- | --------------------------- | -------------------------- |
| `getPlanIdByProviderPriceId(priceId)`           | `lib/provider-price-ids.ts` | Resolve priceId → plan     |
| `getPaidPlan(planId)`                           | `lib/plans.ts`              | Get plan config            |
| `findPriceByPlanId(planId, { type, interval })` | `lib/plans.ts`              | Find specific price        |
| `cancelSubscription(organizationId)`            | `lib/customer.ts`           | Cancel subscription        |
| `webhookHandler(request)`                       | `provider/<name>`           | Unified webhook processing |
| `walletWebhookHandler(request)`                 | `wallet-webhook.ts`         | Wallet top-up webhook      |
| `walletProvider`                                | `wallet-provider.ts`        | Wallet operations          |

**AACsearch status:** ✅ In use. AACsearch extends `paymentsConfig` with `aiWallet` and `searchLimits` for plan-based entitlements.

### 8.3 Payment Config Structure

**File:** `packages/payments/config.ts`

```typescript
export const config = {
  billingAttachedTo: "user" | "organization",
  requireActiveSubscription: boolean,
  aiWallet: { monthlyIncludedByPlan: Record<string, bigint>, ... },
  searchLimits: Record<string, { searchPerMonth, indexedDocuments, overageRateUsdMicrosPerSearch }>,
  plans: {
    [planId]: {
      isFree?: boolean,
      isEnterprise?: boolean,
      recommended?: boolean,
      prices: [{ type: "subscription" | "one-time", priceId, interval, amount, currency, seatBased?, trialPeriodDays? }]
    }
  }
};
```

---

## 9. FILE STORAGE — packages/storage (@repo/storage)

```typescript
import { getPresignedUploadUrl, getPresignedDownloadUrl, ... } from "@repo/storage";
```

**Provider:** S3-compatible (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO, Supabase Storage)
**Config:** `packages/storage/config.ts` - `bucketNames.avatars`

**AACsearch status:** ✅ In use. AACsearch uses R2-compatible storage for document indexing uploads.

---

## 10. EMAIL — packages/mail (@repo/mail)

### 10.1 Send Function

```typescript
import { sendEmail } from "@repo/mail";

await sendEmail({
	to: "user@example.com",
	locale: "en",
	templateId: "magicLink",
	context: { url: "..." },
});

// Or raw:
await sendEmail({
	to: "user@example.com",
	subject: "Hello",
	html: "<p>Hello</p>",
});
```

**Provider:** Plunk (currently active). Also supports Postmark, Resend, Nodemailer.

**18 email templates** in `packages/mail/emails/`: `MagicLink`, `ForgotPassword`, `NewUser`, `OrganizationInvitation`, `EmailVerification`, `Notification`, `QuotaSoftCap/HardCapWarning`, `SubscriptionUpgrade`, `InvoicePaid`, `PaymentFailed`, `SubscriptionCancelled`, `DripDay0..30` (7 drip emails)

**Components:** `PrimaryButton.tsx`, `Wrapper.tsx`

**AACsearch status:** ✅ In use. AACsearch uses Plunk provider. Custom templates: `QuotaSoftCapWarning`, `QuotaHardCapWarning`, `SubscriptionUpgrade`.

---

## 11. INTERNATIONALIZATION — packages/i18n (@repo/i18n)

### 11.1 Config

**File:** `packages/i18n/config.ts`

```typescript
export const config = {
	locales: {
		en: { label: "English", currency: "USD" },
		de: { label: "Deutsch", currency: "USD" },
		es: { label: "Español", currency: "USD" },
		fr: { label: "Français", currency: "USD" },
		ru: { label: "Русский", currency: "RUB" },
	},
	defaultLocale: "en",
	defaultCurrency: "USD",
	localeCookieName: "NEXT_LOCALE",
};
```

**5 locales:** `en`, `de`, `es`, `fr`, `ru`

### 11.2 Message Loading

```typescript
import { getMessagesForLocale } from "@repo/i18n";
const messages = getMessagesForLocale("en", "saas"); // or "marketing", "mail"
```

### 11.3 Translation Files

**Structure:** `packages/i18n/translations/{en,de,es,fr,ru}/`

- `mail.json`
- `shared.json`
- `saas/` — `search.json`, `settings.json`, `admin.json`, `organizations.json`, `auth.json`, `onboarding.json`, `product.json`, `common.json`
- `marketing/` — `core.json`, `compare.json`, `features.json`, `integrations.json`, `solutions.json`

**Type exports:** `MailMessages`, `MarketingMessages`, `SaasMessages`, `SharedMessages`

**AACsearch status:** ✅ In use. AACsearch has split files into `saas/` and `marketing/` subdirectories. Uses `next-intl` v4.9.0.

---

## 12. ANALYTICS — packages/analytics (@repo/analytics)

**Provider:** PostHog

```typescript
import {
	getPostHogClient,
	flushPostHog,
	PostHogProvider,
	usePostHog,
	trackEvent,
	identifyUser,
	getClientEventProperties,
} from "@repo/analytics";
export type { PostHog, AacEventName, AacEventProperties } from "@repo/analytics";
```

**AACsearch status:** ✅ In use. A custom analytics package with PostHog. Note: supastarter supports 8 providers (Google Analytics, Mixpanel, Pirsch, Plausible, Umami, PostHog, Vercel, Vemetric), but AACsearch only uses PostHog.

---

## 13. LOGGING — packages/logs (@repo/logs)

```typescript
import { logger } from "@repo/logs";
logger.info("message", { data });
logger.error(error, { data });
```

**AACsearch status:** ✅ In use.

---

## 14. UTILITIES — packages/utils (@repo/utils)

```typescript
import { getBaseUrl } from "@repo/utils";
// getBaseUrl(url, fallbackPort) → resolves base URL for multi-app environments

import { validatePassword } from "@repo/utils";
// Password validation (min 8 chars)
```

**AACsearch status:** ✅ In use.

---

## 15. NOTIFICATIONS — packages/notifications (@repo/notifications)

```typescript
import {
	createWelcomeNotification,
	listNotifications,
	markNotificationRead,
	getNotificationPreferences,
	updateNotificationPreferences,
} from "@repo/notifications";
```

**AACsearch status:** ✅ In use.

---

## 16. BILLING WALLET — packages/billing-wallet (@repo/billing-wallet)

```typescript
import { applySubscriptionToWallet, getWalletBalance, reserveWalletAmount, releaseWalletReservation, consumeWallet, ... } from "@repo/billing-wallet";
```

**AACsearch status:** ✅ Custom AACsearch package for AI credits wallet. Not in base supastarter.

---

## 17. SEARCH — packages/search (@repo/search)

```typescript
import { searchDocuments, indexDocument, getCollections, ... } from "@repo/search";
```

**Config:** `packages/search/config.ts` — `collectionPrefix: "ss"`, `defaultPerPage: 20`, `maxPerPage: 100`, `tenantField: "tenant_id"`, `ingestBatchSize: 200`, `defaultUsageWindowDays: 30`

**AACsearch status:** ✅ Core custom package. Typesense-based search engine with multi-tenant support. AACsearch-specific (not in base supastarter).

---

## 18. SEO PATTERNS

**supastarter marketing app** uses `apps/marketing/modules/seo/` for SEO components.
**Blog** uses Content Collections (MDX-based CMS) at `apps/marketing/content/posts/`.
**Docs** uses Fumadocs with full-text search and AI-powered page actions.

**AACsearch status:** Marketing site has extensive custom SEO pages (compare, features, solutions, use-cases, etc.).

---

## 19. KEY PATTERNS FROM DOC PAGES

### 19.1 App Architecture

- `apps/marketing` = public site (home, blog, changelog, legal, pricing)
- `apps/saas` = protected app (auth, orgs, billing, settings, admin, API)
- `apps/docs` = documentation (Fumadocs)
- `apps/mail-preview` = email preview (React Email)

### 19.2 Tech Stack (from docs)

| Tool                   | Purpose                           |
| ---------------------- | --------------------------------- |
| Turborepo              | Monorepo orchestration            |
| Next.js (16)           | React framework (App Router, RSC) |
| Prisma (7.6)           | ORM (active)                      |
| Drizzle (0.45, legacy) | Reference only                    |
| Hono (4.12)            | HTTP server framework             |
| oRPC (1.13)            | Type-safe RPC                     |
| TanStack Query (5.96)  | Client data fetching              |
| better-auth (1.5)      | Auth (2FA, passkeys, RBAC, orgs)  |
| Tailwind CSS (4.2)     | Styling                           |
| Radix UI (1.4)         | Accessible primitives             |
| Content Collections    | MDX-based CMS for blog            |
| Fumadocs               | Documentation framework           |

### 19.3 Feature Summary (from docs intro page)

- Marketing site with hero, features, FAQ, newsletter, pricing, blog, changelog, contact, legal
- Auth: email/password, magic link, OAuth, passkeys, 2FA, RBAC
- Orgs: multi-tenancy, team management, role-based permissions
- Payments: 5 providers, subscriptions, one-time, webhooks, billing portal, paywall components
- DB: Prisma or Drizzle, PostgreSQL/MySQL/SQLite
- API: Hono + oRPC + TanStack Query + OpenAPI docs
- File storage: S3-compatible, presigned URLs, avatar/logo uploads
- Email: React Email, 4 providers, i18n templates, mail preview app
- AI: Vercel AI SDK, chatbot with history, text/image/audio
- Background tasks: trigger.dev, Upstash QStash, BullMQ
- i18n: multi-language, language switcher, browser detection, locale-based currency
- Analytics: 8 providers, custom events, page view tracking
- Monitoring: Sentry error tracking
- SEO: meta tags, sitemap generation
- Deployment: Vercel, Render, Fly.io, Netlify, Docker, Coolify, Railway

### 19.4 Configuration Patterns (from docs)

- `apps/marketing/config.ts` — marketing app config
- `apps/saas/config.ts` — SaaS app config
- Configs imported via `@config` alias within each app
- Payments config: plan-driven with `planId`, `type`, `interval`, `priceId`
- Storage config: bucket names

### 19.5 API Patterns (from docs)

- oRPC-based type-safe frontend-backend communication
- TanStack Query integration for data fetching
- OpenAPI documentation generation
- Protected endpoints with locale support

---

## 20. COMPREHENSIVE GAP ANALYSIS

### What supastarter provides that AACsearch uses:

✅ **Everything listed above** is in use. AACsearch is built ON supastarter, so almost all supastarter patterns are consumed.

### What AACsearch has CUSTOM beyond supastarter:

1. **Search engine** — `packages/search/` — Typesense-based, full-text search with multi-tenancy
2. **Search clients** — `packages/search-client*/` — JS, Go, PHP, Python, Swift SDKs
3. **Billing wallet** — `packages/billing-wallet/` — AI credits consumption tracking
4. **Analytics pipeline** — `packages/analytics/` — PostHog with custom event types
5. **Document processor** — `packages/document-processor/` — DOCX/PDF/HTML parsing
6. **NLP** — `packages/nlp/` — morphology, phonetics, spell check, synonyms, ranking
7. **Shopify connector** — `packages/shopify-connector/` — e-commerce integration
8. **Widget** — `packages/widget/` — Embeddable search widget (JS snippet)
9. **Recommendations** — `packages/recommendations/` — AI-powered recommendations
10. **AI Core** — `packages/ai-core/` — Knowledge RAG, GraphRAG
11. **MCP server** — `packages/aacsearch-mcp/` — Model Context Protocol server
12. **Load testing** — `packages/loadtest/` — k6-based performance testing
13. **E2E tests** — `packages/e2e/` — Playwright tests for all features
14. **CLI** — `packages/cli/` — Dev CLI tooling
15. **API v1** — `packages/api/v1/` — REST API version 1 (public)
16. **API modules** — 11 custom modules (collections, feedback, indexing, my-search, search, knowledge, notifications, recommendations, entitlements, billing-wallet, onboarding)

### Pattern Highlights (things AACsearch should NOT reimplement):

| Pattern                              | Import Path                                             | What It Saves                                  |
| ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------- |
| Auth (sessions, orgs, 2FA, passkeys) | `@repo/auth` + `@repo/auth/client`                      | 1000+ lines of auth code                       |
| RBAC                                 | `@repo/auth` (hasPermission, hasMinRole)                | 200+ lines of permission logic                 |
| oRPC procedures                      | `@repo/api` (protectedProcedure, adminProcedure)        | Auth middleware for every endpoint             |
| Email sending                        | `@repo/mail` (sendEmail)                                | Provider abstraction, template rendering, i18n |
| Payment integration                  | `@repo/payments` (webhook handler, plan resolution)     | 5-provider abstraction, webhook processing     |
| File uploads                         | `@repo/storage` (presigned URLs)                        | S3-compatible upload with any provider         |
| UI primitives                        | `@repo/ui` (all shadcn components)                      | Accessible, styled components                  |
| Landing page blocks                  | `@repo/ui` (LandingFeature, etc.)                       | Marketing sections                             |
| Chat UI                              | `@repo/ui` (ChatBubble, ExpandableChat)                 | AI chat interface                              |
| App layout                           | `@shared/components` (NavBar, AppSidebar, AppWrapper)   | Full app chrome                                |
| Settings pages                       | `@shared/components` (SettingsList, SettingsItem)       | Settings layout pattern                        |
| Auth forms                           | `@auth/components` (LoginForm, SignupForm)              | Complete auth UI                               |
| Organization management              | `@organizations/components` (all org components)        | Full org CRUD UI                               |
| Billing UI                           | `@payments/components` (PricingTable, ActivePlan, etc.) | Full billing UI                                |
| Settings pages                       | `@settings/components` (ChangeName, ChangeEmail, etc.)  | Full account settings UI                       |
| Notifications                        | `@repo/notifications`                                   | In-app notification system                     |
| Logging                              | `@repo/logs`                                            | Structured logging                             |
| i18n                                 | `@repo/i18n` (getMessagesForLocale)                     | Multi-language with 5 locales                  |
| Database queries                     | `@repo/database` (query files)                          | 19+ typed query helpers                        |
| Prisma schema migrations             | `packages/database/prisma/migrations/`                  | 33 models with migration history               |
| API router                           | `@repo/api/orpc/router.ts`                              | 16 domain routers mounted                      |
| OpenAPI docs                         | `@repo/api/orpc/handler.ts` (openApiHandler)            | Auto-generated API docs                        |
| Configuration                        | `config.ts` files per app/package                       | Type-safe, env-driven config                   |
| Analytics client                     | `@repo/analytics` (trackEvent, identifyUser)            | PostHog integration                            |
| Hono server                          | `@repo/api` (app)                                       | HTTP server with CORS, auth, webhooks          |
