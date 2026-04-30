# Auth Patterns (Next.js)

Better Auth, sessions, and protected endpoints in supastarter Next.js.

## Layout

```
packages/auth/
  auth.ts                # Better Auth setup with database adapter and plugins
  client.ts              # Better Auth React client
  config.ts              # config (providers, organization, passkeys, ...)
  index.ts
  lib/                   # helpers (invitation, organization, etc.)
  plugins/               # additional Better Auth plugins
  types.ts

apps/saas/modules/auth/
  components/            # LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm,
                         # OtpForm, SocialSigninButton, SessionProvider, LoginModeSwitch
  hooks/use-session.ts   # client session hook
  lib/server.ts          # getSession() server helper (alias @auth/lib/server)
  lib/api.ts             # client-side auth API wrappers
  lib/session-context.ts # React context for session (used by SessionProvider)
  constants/oauth-providers.tsx

apps/saas/app/(unauthenticated)/
  login/, signup/, verify/, forgot-password/, reset-password/

apps/saas/app/(authenticated)/
  ...all protected routes
```

## Server-side session

```typescript
// In a Server Component or layout
import { getSession } from "@auth/lib/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <div>Hello {session.user.name}</div>;
}
```

## Client-side session

```typescript
"use client";
import { useSession } from "@auth/hooks/use-session";

export function UserBadge() {
  const { user, loaded } = useSession();
  if (!loaded) return null;
  if (!user) return <a href="/login">Log in</a>;
  return <span>{user.email}</span>;
}
```

The session is provided by `<SessionProvider>` mounted in the authenticated layout (`apps/saas/app/(authenticated)/layout.tsx`).

## Protecting API procedures

Use the right procedure type from `packages/api/orpc/procedures.ts`:

```typescript
import { protectedProcedure, adminProcedure } from "../../../orpc/procedures";

// any logged-in user
export const myProcedure = protectedProcedure
  .handler(async ({ context }) => {
    // context.user, context.session
  });

// admin only (user.role === "admin")
export const adminOnlyProcedure = adminProcedure
  .handler(async ({ context }) => {
    // ...
  });
```

For the rare case where you need to inspect the session manually inside a `publicProcedure`:

```typescript
import { auth } from "@repo/auth";
import { publicProcedure } from "../../../orpc/procedures";

export const maybeAuthed = publicProcedure
  .handler(async ({ context }) => {
    const session = await auth.api.getSession({ headers: context.headers });
    // session may be null
  });
```

## OAuth providers

Configured in `packages/auth/config.ts`. Enable via env:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Callback URL: `${NEXT_PUBLIC_SAAS_URL}/api/auth/callback/<provider>`. Update OAuth app settings to match production URL.

When `*_CLIENT_ID` are empty in dev, Better Auth logs a warning per request — this is expected; email/password flows still work.

## Magic link / OTP / Passkeys

All wired via Better Auth plugins in `packages/auth/plugins/`. UI is in `apps/saas/modules/auth/components/`. Email templates live in `packages/mail/emails/` — keep them updated when changing flows.

## Organization scoping

When a procedure operates on org-scoped data, also verify the user is a member:

```typescript
import { hasOrganizationAccess } from "@organizations/lib/...";  // app-side helper
// or use Better Auth org plugin: auth.api.hasPermission(...)
```

Active org context (client) — `useActiveOrganization()` from `@organizations/hooks/use-active-organization`:

```typescript
"use client";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";

export function OrgGate() {
  const { activeOrganization, isOrganizationAdmin } = useActiveOrganization();
  if (!isOrganizationAdmin) return <div>Access denied</div>;
  // ...
}
```

## Superadmin

Better Auth's admin plugin gives certain users an `admin` role globally (separate from per-org roles). Used by `adminProcedure` in `packages/api/orpc/procedures.ts`. Configure who is a superadmin via `packages/auth/config.ts` or by setting `user.role = "admin"` directly in the DB during seeding. Docs: <https://supastarter.dev/docs/nextjs/authentication/superadmin>.

## Auth flow consistency checklist

When changing auth flows, update:
- Email templates in `packages/mail/emails/` (verify, reset, magic link, invitation)
- Translations in `packages/i18n/translations/<locale>/{saas,mail}.json`
- Better Auth audit hooks if any are wired in `packages/auth/`
- `apps/saas/modules/auth/components/` UI

## Docs

- [Authentication overview](https://supastarter.dev/docs/nextjs/authentication/overview)
- [User and session](https://supastarter.dev/docs/nextjs/authentication/user-and-session)
- [Permissions](https://supastarter.dev/docs/nextjs/authentication/permissions)
- [OAuth](https://supastarter.dev/docs/nextjs/authentication/oauth)
- Better Auth: <https://better-auth.com>
