# Common supastarter Code Patterns

Frequently used code patterns for building features in supastarter Next.js (split-app monorepo). For oRPC-specific patterns see [api-patterns.md](api-patterns.md).

## Database (Prisma)

### New model

```prisma
// packages/database/prisma/schema.prisma
model Feedback {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  message        String
  status         String   @default("open")

  @@index([userId])
  @@index([organizationId])
}
```

After editing: `pnpm --filter @repo/database push` then `pnpm --filter @repo/database generate`.

Avoid Prisma `enum` — use string fields with TS-side `as const` records (see Coding Conventions).

### Query patterns

```typescript
import { db } from "@repo/database";

// Find with relations
const item = await db.feedback.findUnique({
	where: { id },
	include: { user: true, organization: true },
});

// Find many with filters
const items = await db.feedback.findMany({
	where: { organizationId, status: "open" },
	orderBy: { createdAt: "desc" },
	take: 20,
});

// Transaction
await db.$transaction(async (tx) => {
	const fb = await tx.feedback.create({ data: { userId, message } });
	await tx.notificationLog.create({ data: { feedbackId: fb.id } });
	return fb;
});
```

Wrap into helpers in `packages/database/prisma/queries/<feature>.ts` rather than calling `db.*` from the API layer directly.

## API (oRPC)

See [api-patterns.md](api-patterns.md) for the canonical layout. Quick template:

```typescript
// packages/api/modules/feedback/procedures/create.ts
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { createFeedback } from "@repo/database";

export const createFeedbackProcedure = protectedProcedure
	.route({ method: "POST", path: "/feedback", tags: ["Feedback"], summary: "Create feedback" })
	.input(z.object({ message: z.string().min(1).max(2000) }))
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const row = await createFeedback({ userId: context.user.id, message: input.message });
		return { id: row.id };
	});
```

Mount in `packages/api/orpc/router.ts`:

```typescript
import { feedbackRouter } from "../modules/feedback/router";
export const router = publicProcedure.router({ ..., feedback: feedbackRouter });
```

## Frontend

### Server Component with auth + DB

```typescript
// apps/saas/app/(authenticated)/(main)/(organizations)/[organizationSlug]/feedback/page.tsx
import { getSession } from "@auth/lib/server";
import { db } from "@repo/database";
import { notFound, redirect } from "next/navigation";
import { FeedbackList } from "@shared/components/FeedbackList";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { organizationSlug } = await params;
  const org = await db.organization.findUnique({ where: { slug: organizationSlug } });
  if (!org) notFound();

  const feedback = await db.feedback.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  return <FeedbackList items={feedback} />;
}
```

### Client Component with TanStack Query + oRPC

```typescript
"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function FeedbackList({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(orpc.feedback.list.queryOptions({ input: { organizationId } }));
  const createMut = useMutation(orpc.feedback.create.mutationOptions({
    onSuccess: () => qc.invalidateQueries(orpc.feedback.list.key()),
  }));

  if (isLoading) return <div>Loading…</div>;

  return (
    <div>
      {data?.items?.map((f) => <div key={f.id}>{f.message}</div>)}
      <button onClick={() => createMut.mutate({ message: "Hi" })}>Send</button>
    </div>
  );
}
```

### Form (react-hook-form + zod)

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@repo/ui/components/form";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";

const schema = z.object({ message: z.string().min(1).max(2000) });
type FormValues = z.infer<typeof schema>;

export function FeedbackForm({ onSubmit }: { onSubmit: (v: FormValues) => Promise<void> }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your feedback</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Send</Button>
      </form>
    </Form>
  );
}
```

## UI (shadcn / Tailwind v4)

```typescript
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { cn } from "@repo/ui";

export function StatCard({ title, value, className }: { title: string; value: number; className?: string }) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
```

Theme tokens come from `tooling/tailwind/theme.css` (Tailwind v4 — no per-app `tailwind.config.ts`).

## Auth

### Get session (server)

```typescript
import { getSession } from "@auth/lib/server"; // apps/saas/modules/auth/lib/server.ts
import { redirect } from "next/navigation";

export async function requireUser() {
	const session = await getSession();
	if (!session) redirect("/login");
	return session.user;
}
```

### Get session (client)

```typescript
"use client";
import { useSession } from "@auth/hooks/use-session";

export function UserBadge() {
  const { user, loaded } = useSession();
  if (!loaded || !user) return null;
  return <span>{user.email}</span>;
}
```

## Notifications

```typescript
import { createNotification } from "@repo/notifications";

await createNotification({
	userId: targetUserId,
	type: "feedback_received",
	data: { headline: "New feedback", message: "..." },
	link: "/feedback/123",
});
```

See [notifications-patterns.md](notifications-patterns.md).

## Roles (no enums)

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

## i18n

```typescript
"use client";
import { useTranslations } from "next-intl";

export function Greeting() {
  const t = useTranslations();
  return <h1>{t("home.welcome.title")}</h1>;
}
```

Translation lives in `packages/i18n/translations/<locale>/<scope>.json` — pick `saas` / `marketing` / `shared` / `mail` per scope. See [internationalization.md](internationalization.md).

## Docs

- [API patterns (oRPC)](api-patterns.md)
- [Database patterns](database-patterns.md)
- [Notifications patterns](notifications-patterns.md)
- [Feedback widget recipe](../assets/recipes/feedback-widget.md)
- [supastarter Next.js docs](https://supastarter.dev/docs/nextjs)
