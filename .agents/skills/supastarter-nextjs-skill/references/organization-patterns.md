# Organization Patterns (Next.js)

Multi-tenancy via Better Auth's organization plugin in supastarter Next.js.

## Schema

Organization, Member, and Invitation models are part of `packages/database/prisma/schema.prisma` (created by Better Auth's organization plugin). Foreign-key your org-scoped tables to `Organization`:

```prisma
model Project {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  // ...
  @@index([organizationId])
}
```

## Routing

Org-scoped pages live under:

```
apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/
```

Within these pages, the `[organizationSlug]` param identifies the active org.

## Active organization (client)

```typescript
"use client";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";

export function OrgHeader() {
	const { activeOrganization, isOrganizationAdmin, isOrganizationOwner } = useActiveOrganization();
	// ...
}
```

## Roles

Better Auth org plugin defines roles (typically `owner`, `admin`, `member`). Check via:

- Client: `useActiveOrganization()` returns flags like `isOrganizationAdmin`.
- Server: query members and the user's role for the org, or use Better Auth helpers in `packages/auth/lib/`.

For role helpers, prefer `as const` records over enums:

```typescript
const ORGANIZATION_ROLES = {
	owner: "owner",
	admin: "admin",
	member: "member",
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[keyof typeof ORGANIZATION_ROLES];

export function canManageMembers(role: OrganizationRole) {
	return role === "owner" || role === "admin";
}
```

## Invitations

- API: `packages/api/modules/organizations/procedures/` (invite, accept, reject)
- UI: `apps/saas/app/(authenticated)/organization-invitation/[invitationId]/`
- Email templates: `packages/mail/emails/`

## New-organization flow

`apps/saas/app/(authenticated)/new-organization/` — onboarding-like step for users without an org.

## Org access checks (server)

Pattern for org-scoped server logic:

```typescript
import { getSession } from "@auth/lib/server";
import { db } from "@repo/database";
import { notFound, redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ organizationSlug: string }> }) {
	const session = await getSession();
	if (!session) redirect("/login");

	const { organizationSlug } = await params;
	const org = await db.organization.findUnique({ where: { slug: organizationSlug } });
	if (!org) notFound();

	const member = await db.member.findFirst({
		where: { organizationId: org.id, userId: session.user.id },
	});
	if (!member) redirect("/");

	// ...
}
```

For oRPC procedures, accept `organizationId` (or slug) in input and check membership in the handler.

## Org-scoped billing

Billing can be per-user or per-org. With per-org billing, the active organization is the customer in the payment provider. See `references/payments-patterns.md`.

## Key Paths

- Org modules: `apps/saas/modules/organizations/{components,hooks,lib}/`
- Org routes: `apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/`
- Org API: `packages/api/modules/organizations/`
- Org plugin (Better Auth): `packages/auth/plugins/`

## Docs

- [Organizations overview](https://supastarter.dev/docs/nextjs/organizations/overview)
- [Configure organizations](https://supastarter.dev/docs/nextjs/organizations/configure)
- [Use organizations](https://supastarter.dev/docs/nextjs/organizations/use-organizations)
- [Store data for organizations](https://supastarter.dev/docs/nextjs/organizations/store-data-for-organizations)
- Better Auth org plugin: <https://better-auth.com/docs/plugins/organization>
