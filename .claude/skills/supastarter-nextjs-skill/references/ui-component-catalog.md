# UI Component Catalog (Next.js)

**Always reuse existing components — do not reinvent.** This is the canonical inventory of shadcn primitives, feature blocks, and providers shipped with supastarter Next.js.

## ⛔ STOP — pre-write protocol (mandatory)

**Before you create ANY new component / hook / dialog / form / card / list / table / page-section, run these greps and inspect the output.** If anything close exists, you MUST use it. If you still create new, state in your reply: "Existing X is insufficient because <concrete reason>." Skipping this step is the #1 cause of duplicate components in supastarter projects.

```bash
# 1. Is there already a primitive in @repo/ui?
ls packages/ui/components/                # 39 primitives — see Layer 1 below
rg -l "export.*Foo" packages/ui/components

# 2. Is there a shared SaaS block? (NavBar, PageHeader, UserAvatar, NotificationCenter,
#    SettingsList/SettingsItem, StatsTile, Pagination, ColorModeToggle, LocaleSwitch,
#    ConfirmationAlertProvider, PasswordInput, TabGroup, ConsentBanner ...)
ls apps/saas/modules/shared/components/
rg -l "Foo|<Foo" apps/saas/modules/shared/components

# 3. Is there a feature block under @auth/@organizations/@payments/@settings/@admin/@ai/@onboarding?
rg -l "FooDialog|FooForm|FooCard|FooList|FooBadge" apps/saas/modules

# 4. Is there a marketing block? (HeroSection, FeaturesSection, PricingSection,
#    FaqSection, NewsletterSection, ContactForm, PostListItem, PostContent ...)
rg -l "Foo" apps/marketing/modules
```

**Hard rules** (do not negotiate with these — they exist because previous agents shipped duplicates):

- ❌ **NEVER** create a `Pagination` — use `@shared/components/Pagination`.
- ❌ **NEVER** create a `UserAvatar` / `OrganizationLogo` — they handle initials fallback + size variants.
- ❌ **NEVER** create your own confirmation dialog — use `ConfirmationAlertProvider`'s `useConfirmationAlert()`.
- ❌ **NEVER** roll your own toast — `sonner`'s `toast.success/error/info` is wired in `ClientProviders`.
- ❌ **NEVER** create a `<Foo>SettingsRow` / `<Foo>SettingsCard` — use `SettingsList` + `SettingsItem`.
- ❌ **NEVER** wrap shadcn `Form*` — use them directly with `react-hook-form` + `zod`.
- ❌ **NEVER** create a `Loading` / `Spinner` / `LoadingButton` — `Button` has a `loading` prop; use `Skeleton` / `Spinner` from `@repo/ui/components`.
- ❌ **NEVER** invent your own `cn()` / class-merge helper — import from `@repo/ui` (`import { cn } from "@repo/ui"`).
- ❌ **NEVER** create your own session hook — use `@auth/hooks/use-session`.
- ❌ **NEVER** create your own active-org hook — use `@organizations/hooks/use-active-organization`.

**Three-layer pick order** when composing a new screen:

1. Look in **Layer 3** first (feature-specific block under `@auth/@organizations/@payments/@settings/@admin/@ai/@onboarding`). Use it as-is or extend.
2. Fall back to **Layer 2** (`@shared/components/*` in saas / marketing).
3. Lastly assemble from **Layer 1** (`@repo/ui/components/*`).

If a Layer 3 component is _almost_ right but you need a variant — **prefer adding a prop to the existing component** over copy-pasting it into a new file. Two slightly-different copies are worse than one component with one extra prop.

---

## How layers work (overview before the inventory)

| Layer                           | Path                                                                                  | Owns                                                                                                                       | When to add a new one                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **L1: Primitives**              | `packages/ui/components/*`                                                            | Generic, app-agnostic shadcn/Radix building blocks (Button, Dialog, Form, Table, ...)                                      | Only via `pnpm dlx shadcn@latest add <name>` — never hand-written. |
| **L2: Shared blocks (per app)** | `apps/saas/modules/shared/components/*`, `apps/marketing/modules/shared/components/*` | Cross-cutting blocks within ONE app (NavBar, PageHeader, UserMenu, NotificationCenter, ...). May reach for L1 + auth/i18n. | Only when ≥2 features in the app already use the same composition. |
| **L3: Feature blocks**          | `apps/saas/modules/<feature>/components/*`                                            | Components owned by a single feature (auth/organizations/payments/...).                                                    | Default location for any new feature component.                    |

Imports respect the layer order: L1 imports nothing from L2/L3; L2 imports L1; L3 imports L1+L2 (and may import sibling L3 cautiously). Reverse imports (L1 → L2/L3, L2 → L3) are forbidden.

---

## Layer 1 — `@repo/ui` Primitives (shadcn)

Imports: `import { X } from "@repo/ui/components/<name>"`. Re-exports also live in `@repo/ui` index.

| Component                                                                                                                | Path            | Use for                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`                                                     | `accordion`     | FAQs, collapsible content                                                                                                                                               |
| `Alert`, `AlertTitle`, `AlertDescription`                                                                                | `alert`         | Inline notices, banners                                                                                                                                                 |
| `AlertDialog` (+ `Trigger/Content/Header/Title/Description/Footer/Action/Cancel`)                                        | `alert-dialog`  | Destructive confirms (delete, etc.)                                                                                                                                     |
| `Avatar`, `AvatarImage`, `AvatarFallback`                                                                                | `avatar`        | User/org avatars                                                                                                                                                        |
| `Badge`                                                                                                                  | `badge`         | Status pills, tags. Prop is **`status`** (not `variant`): `success` / `info` / `warning` / `error`.                                                                     |
| `Button` (with `loading` prop)                                                                                           | `button`        | All buttons. Variants: `primary` (default) / `secondary` / `outline` / `ghost` / `destructive` / `link`. **No `default`** — use `primary`. Sizes: `default/sm/lg/icon`. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                                        | `card`          | Boxed sections                                                                                                                                                          |
| `Chart*`                                                                                                                 | `chart`         | recharts wrapper for dashboards                                                                                                                                         |
| `Dialog` (+ `Trigger/Content/Header/Title/Description/Footer/Close`)                                                     | `dialog`        | Modals (forms, info)                                                                                                                                                    |
| `DropdownMenu` (+ `Trigger/Content/Item/CheckboxItem/RadioItem/Label/Separator/Shortcut/Group/Sub*`)                     | `dropdown-menu` | Action menus, user menu                                                                                                                                                 |
| `Form`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormField`                            | `form`          | react-hook-form integration (always use this)                                                                                                                           |
| `Input`                                                                                                                  | `input`         | Text/email/number inputs                                                                                                                                                |
| `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`                                                         | `input-otp`     | 2FA / OTP / verify codes                                                                                                                                                |
| `Label`                                                                                                                  | `label`         | Form labels (also used inside FormLabel)                                                                                                                                |
| `Logo`                                                                                                                   | `logo`          | App brand logo (SVG)                                                                                                                                                    |
| `Popover`, `PopoverTrigger`, `PopoverContent`                                                                            | `popover`       | Inline pickers, hover panels                                                                                                                                            |
| `Progress`                                                                                                               | `progress`      | Linear progress bars                                                                                                                                                    |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` | `select`        | Dropdown selects                                                                                                                                                        |
| `Sheet` (+ `Trigger/Content/Header/Title/Description/Footer/Close`)                                                      | `sheet`         | Drawer/sidebar overlays                                                                                                                                                 |
| `Skeleton`                                                                                                               | `skeleton`      | Loading placeholders                                                                                                                                                    |
| `Spinner`                                                                                                                | `spinner`       | Inline loading indicator                                                                                                                                                |
| `Switch`                                                                                                                 | `switch`        | Boolean toggles (settings)                                                                                                                                              |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`                 | `table`         | Data tables                                                                                                                                                             |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                         | `tabs`          | Tabbed views (settings, etc.)                                                                                                                                           |
| `Textarea`                                                                                                               | `textarea`      | Multi-line text input                                                                                                                                                   |
| `Toast` system (`useToast`, `toast()` from sonner is also configured)                                                    | `toast`         | Notifications                                                                                                                                                           |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                         | `tooltip`       | Hover help                                                                                                                                                              |

**Helper:** `cn(...inputs)` from `@repo/ui` (clsx + tailwind-merge) — always use for conditional classes.

Shipped (39 total, as of R2.5): all components above plus `Checkbox`, `Command`, `ScrollArea`, `Separator`, `Breadcrumb`, `NavigationMenu`, `ContextMenu`, `Toggle`, `HoverCard`, `Collapsible`, `Drawer`, `Sidebar`.

**Not yet installed** (run `pnpm dlx shadcn@latest add <name>` from `packages/ui` to add): `RadioGroup`, `Slider`, `Calendar`, `DatePicker`, `Combobox`, `Menubar`, `ToggleGroup`, `Resizable`, `Carousel`, `AspectRatio`.

---

## Layer 2 — SaaS Shared (`@shared/components/*`)

Path: `apps/saas/modules/shared/components/`. Used across multiple SaaS features.

| Component                           | What it is                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `AppWrapper`                        | Top-level layout shell for the authenticated app (sidebar + content)                      |
| `AuthWrapper`                       | Layout shell for unauthenticated routes (login/signup/etc.)                               |
| `ClientProviders`                   | Composes all client-side providers (Theme, QueryClient, Session, ConfirmationAlert, etc.) |
| `ApiClientProvider`                 | TanStack Query client + oRPC client init                                                  |
| `ConsentProvider` + `ConsentBanner` | Cookie/analytics consent gate                                                             |
| `ConfirmationAlertProvider`         | Programmatic destructive-action confirmation (use this instead of ad-hoc `confirm()`)     |
| `NavBar`                            | Top app bar (with `UserMenu` + `NotificationCenter`)                                      |
| `Footer`                            | App footer                                                                                |
| `UserMenu`                          | Avatar dropdown: settings, sign out, theme switch                                         |
| `UserAvatar`                        | Avatar with image + initials fallback                                                     |
| `NotificationCenter`                | Bell icon + popover with notifications list (uses `@repo/notifications` API)              |
| `ColorModeToggle`                   | Light/dark/system theme switcher                                                          |
| `LocaleSwitch`                      | Language switcher (5 locales)                                                             |
| `Pagination`                        | Page navigation for lists/tables                                                          |
| `PageHeader`                        | Standard page title + description + actions row                                           |
| `TabGroup`                          | Wrapper around `Tabs` with route-synced state                                             |
| `SettingsList` + `SettingsItem`     | Two-column settings rows (label/desc on left, control on right)                           |
| `StatsTile`                         | Single KPI tile                                                                           |
| `StatsTileChart`                    | KPI tile with sparkline                                                                   |
| `PasswordInput`                     | Input with show/hide eye toggle                                                           |

**Hooks/lib in `@shared/...`:**

- `@shared/lib/orpc-client` — typed oRPC client
- `@shared/lib/orpc-query-utils` — `orpc` helper for TanStack Query (`queryOptions`, `mutationOptions`)
- `@shared/lib/query-client` — QueryClient factory
- `@shared/lib/sidebar-context` — sidebar open/closed state
- `@shared/hooks/locale-currency` — current locale's currency

---

## Layer 3 — SaaS Feature Blocks

### Auth (`@auth/components/*`, `@auth/constants/*`, `@auth/hooks/*`, `@auth/lib/*`)

| Component            | Use for                                        |
| -------------------- | ---------------------------------------------- |
| `LoginForm`          | Email/password + magic link + OAuth login      |
| `SignupForm`         | New account creation                           |
| `ForgotPasswordForm` | Send reset link                                |
| `ResetPasswordForm`  | Set new password                               |
| `OtpForm`            | OTP/2FA code entry (uses `InputOTP`)           |
| `LoginModeSwitch`    | Toggle between password / magic link / passkey |
| `SocialSigninButton` | OAuth provider button (GitHub, Google, etc.)   |
| `SessionProvider`    | Client-side session context provider           |

Hooks: `useSession()` from `@auth/hooks/use-session`. Server: `getSession()` from `@auth/lib/server`. OAuth provider list: `@auth/constants/oauth-providers`.

### Organizations (`@organizations/components/*`, `@organizations/hooks/*`, `@organizations/lib/*`)

| Component                                                     | Use for                                      |
| ------------------------------------------------------------- | -------------------------------------------- |
| `ActiveOrganizationProvider`                                  | Client-side active-org context               |
| `OrganizationStart`                                           | Empty/landing state for users without an org |
| `OrganizationsGrid`                                           | Card grid of all user's orgs                 |
| `OrganizationSelect`                                          | Dropdown to switch active org                |
| `CreateOrganizationForm`                                      | New org creation form                        |
| `ChangeOrganizationNameForm`                                  | Rename org                                   |
| `DeleteOrganizationForm`                                      | Destructive: delete org                      |
| `OrganizationLogo` + `OrganizationLogoForm`                   | Display + upload org avatar                  |
| `OrganizationMembersBlock` + `OrganizationMembersList`        | Members listing + management                 |
| `OrganizationRoleSelect`                                      | Member role dropdown (owner/admin/member)    |
| `InviteMemberForm`                                            | Email invitation form                        |
| `OrganizationInvitationsList`                                 | Pending invitations table                    |
| `OrganizationInvitationAlert` + `OrganizationInvitationModal` | UI for receiving invitation                  |

Hook: `useActiveOrganization()` from `@organizations/hooks/use-active-organization`.

### Settings (`@settings/components/*`)

Account settings building blocks:

| Component                             | Use for                                        |
| ------------------------------------- | ---------------------------------------------- |
| `SettingsMenu`                        | Sidebar navigation for settings pages          |
| `ChangeNameForm`                      | Update display name                            |
| `ChangeEmailForm`                     | Change email + verification                    |
| `ChangePassword` / `SetPassword`      | Password update / initial set                  |
| `UserLanguageForm`                    | Per-user locale preference                     |
| `UserAvatarForm` + `UserAvatarUpload` | Avatar upload (presigned S3)                   |
| `CropImageDialog`                     | Modal for cropping uploaded images             |
| `ConnectedAccountsBlock`              | OAuth providers connected to user              |
| `PasskeysBlock`                       | List/add WebAuthn passkeys                     |
| `TwoFactorBlock`                      | Enable/disable 2FA (TOTP)                      |
| `ActiveSessionsBlock`                 | Current sessions + revoke                      |
| `NotificationPreferencesForm`         | Per-type in-app/email notification preferences |
| `CustomerPortalButton`                | Open payment provider's billing portal         |
| `SubscriptionStatusBadge`             | Active plan badge                              |
| `DeleteAccountForm`                   | Destructive: delete account                    |

### Payments (`@payments/components/*`, `@payments/hooks/*`, `@payments/lib/*`)

| Component / Hook        | Use for                                  |
| ----------------------- | ---------------------------------------- |
| `PricingTable`          | Plan cards grid (used on `/choose-plan`) |
| `ActivePlan`            | Current plan summary                     |
| `ActivePlanBadge`       | Inline plan name pill                    |
| `ChangePlan`            | Upgrade/downgrade flow                   |
| `CheckoutReturnContent` | Post-checkout return screen content      |
| `usePurchases()`        | Hook: current purchases for user/org     |
| `usePlanData()`         | Hook: plan metadata helpers              |

### AI (`@ai/components/*`)

| Component | Use for                                            |
| --------- | -------------------------------------------------- |
| `AiChat`  | Full chatbot UI: messages list + input + streaming |

### Onboarding (`@onboarding/components/*`)

| Component               | Use for                      |
| ----------------------- | ---------------------------- |
| `OnboardingForm`        | Multi-step onboarding wizard |
| `OnboardingAccountStep` | Step: account info           |

### Admin (`@admin/component/*`)

> Note: directory is `component/` (singular) in this app.

| Component                        | Use for                               |
| -------------------------------- | ------------------------------------- |
| `EmailVerified`                  | Admin: toggle email verification flag |
| `users/UserList`                 | Admin: users table                    |
| `organizations/OrganizationList` | Admin: orgs table                     |
| `organizations/OrganizationForm` | Admin: edit org                       |

---

## Layer 2/3 — Marketing (`apps/marketing/`)

### Marketing shared (`@shared/components/*` in marketing scope)

`NavBar`, `Footer`, `ClientProviders`, `ColorModeToggle`, `LocaleSwitch`, `ConsentProvider`, `ConsentBanner`. Same names as SaaS shared but **separate copies** scoped per app — they may diverge in style.

### Marketing home (`@home/components/*`)

| Component           | Use for                                 |
| ------------------- | --------------------------------------- |
| `HeroSection`       | Top fold hero (headline + CTA + visual) |
| `FeaturesSection`   | Feature grid                            |
| `PricingSection`    | Public pricing (uses public plan data)  |
| `FaqSection`        | FAQ accordion                           |
| `NewsletterSection` | Email signup                            |
| `ContactForm`       | Contact form                            |

### Marketing blog (`@blog/components/*`)

| Component            | Use for                                |
| -------------------- | -------------------------------------- |
| `PostListItem`       | Blog index card                        |
| `PostContent`        | Single post body renderer (MDX)        |
| `lib/mdx-components` | MDX component overrides for blog posts |

### Marketing changelog (`@changelog/components/*`)

| Component          | Use for                                          |
| ------------------ | ------------------------------------------------ |
| `ChangelogSection` | Changelog list rendered from content-collections |

### Marketing analytics (`@analytics`)

`apps/marketing/modules/analytics/` exposes analytics provider implementations + a unified `<Analytics>` wrapper. Available providers:

- `provider/vercel`
- `provider/plausible`
- `provider/google` (GA)
- `provider/pirsch`
- `provider/mixpanel`
- `provider/posthog`
- `provider/umami`
- `provider/custom`

Active provider is selected by populating the matching `NEXT_PUBLIC_*` env var. Mount once in the marketing root layout.

---

## Email components (`packages/mail/components/*` + `packages/mail/emails/*`)

Reusable React Email building blocks live in `packages/mail/components/`. Templates in `packages/mail/emails/` already use them. When adding a new email, **import from `@repo/mail/components`** rather than `@react-email/components` directly so the shared layout/branding is consistent.

---

## How to choose

1. **Need a button / input / dialog?** → Layer 1 (`@repo/ui`).
2. **Need a list / table / page header / settings row?** → Layer 2 (`@shared`).
3. **Building auth / org / billing / settings UI?** → Layer 3 (`@auth`, `@organizations`, `@payments`, `@settings`).
4. **Adding a new SaaS feature?** → put new components under `apps/saas/modules/<feature>/components/`. Mirror the naming style (`PascalCase.tsx`, named exports).
5. **Adding a public marketing block?** → `apps/marketing/modules/<area>/components/`.

## Conventions to keep components reusable

- Named function export, no default export.
- Props as an interface above or at the bottom of the file.
- Accept `className?: string` and pass through `cn(...)`.
- Server Component by default; add `"use client"` only when the component needs hooks/events.
- Use `useTranslations()` for any user-visible string — never hardcode.
- For forms: react-hook-form + zod + Layer 1 `Form*` primitives. Reuse zod schemas from `packages/api/modules/<feature>/types.ts`.
- Avatars: use `UserAvatar` / `OrganizationLogo`, not raw `Avatar`.
- Confirmation dialogs: use `ConfirmationAlertProvider` (via `useConfirmationAlert`), not ad-hoc `AlertDialog` instances.
- Toasts: prefer `sonner`'s `toast.success/error/info` (already wired) over building custom notifications.

## Search this catalog first

Before creating `<MyButton>`, `<MyModal>`, `<MyTable>`, `<MyAvatar>`, `<MyForm>`: it almost certainly already exists. Grep `apps/saas/modules/*/components/` and `packages/ui/components/` for the noun you have in mind.
