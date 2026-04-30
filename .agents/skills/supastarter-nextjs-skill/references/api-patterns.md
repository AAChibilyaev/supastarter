# API Patterns (Next.js)

Hono + oRPC, with three procedure types, in supastarter Next.js.

## Layout

```
packages/api/
  index.ts                    # Hono app — mounts CORS, payments webhook, oRPC, OpenAPI
  orpc/
    procedures.ts             # publicProcedure, protectedProcedure, adminProcedure
    router.ts                 # root router — mounts all module routers
    handler.ts                # rpcHandler, openApiHandler
    middleware/locale-middleware.ts
  modules/
    <name>/
      types.ts                # zod schemas for input/output (shared with frontend forms)
      procedures/
        <action>.ts           # one procedure per file (create, list, get, update, delete, ...)
      router.ts               # router object for the module
```

The Hono app from `packages/api` is mounted in `apps/saas/app/api/[[...rest]]/route.ts`.

## Procedure Types

From `packages/api/orpc/procedures.ts`:

```typescript
import { ORPCError, os } from "@orpc/server";
import { auth } from "@repo/auth";

// Public — no auth
export const publicProcedure = os.$context<{ headers: Headers }>();

// Protected — adds context.session and context.user
export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
	const session = await auth.api.getSession({ headers: context.headers });
	if (!session) throw new ORPCError("UNAUTHORIZED");
	return next({ context: { session: session.session, user: session.user } });
});

// Admin — requires user.role === "admin"
export const adminProcedure = protectedProcedure.use(async ({ context, next }) => {
	if (context.user.role !== "admin") throw new ORPCError("FORBIDDEN");
	return next();
});
```

Always pick the **lowest privilege** procedure type that gets the job done.

## Module Pattern

### types.ts

```typescript
// packages/api/modules/feedback/types.ts
import { z } from "zod";

export const createFeedbackSchema = z.object({
	message: z.string().min(1).max(2000),
	organizationId: z.string().optional(),
});

export type CreateFeedbackValues = z.infer<typeof createFeedbackSchema>;
```

### procedures/create.ts

```typescript
// packages/api/modules/feedback/procedures/create.ts
import { z } from "zod";
import { createFeedback } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { createFeedbackSchema } from "../types";

export const createFeedbackProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/feedback",
		tags: ["Feedback"],
		summary: "Create feedback",
		description: "Create a feedback entry for the current user",
	})
	.input(createFeedbackSchema)
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const row = await createFeedback({
			userId: context.user.id,
			organizationId: input.organizationId,
			message: input.message,
		});
		return { id: row.id };
	});
```

### procedures/list.ts

```typescript
// packages/api/modules/feedback/procedures/list.ts
import { z } from "zod";
import { listFeedbackByOrg } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";

export const listFeedback = protectedProcedure
	.route({ method: "GET", path: "/feedback", tags: ["Feedback"], summary: "List feedback" })
	.input(z.object({ organizationId: z.string() }))
	.output(z.object({ items: z.array(z.any()) }))
	.handler(async ({ input }) => {
		const items = await listFeedbackByOrg(input.organizationId);
		return { items };
	});
```

### router.ts

```typescript
// packages/api/modules/feedback/router.ts
import { createFeedbackProcedure } from "./procedures/create";
import { listFeedback } from "./procedures/list";

export const feedbackRouter = {
	create: createFeedbackProcedure,
	list: listFeedback,
};
```

### Mount in root router

```typescript
// packages/api/orpc/router.ts
import { feedbackRouter } from "../modules/feedback/router";
import { publicProcedure } from "./procedures";
// ...other imports

export const router = publicProcedure.router({
	admin: adminRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	ai: aiRouter,
	notifications: notificationsRouter,
	feedback: feedbackRouter,
});
```

## Frontend Usage (TanStack Query + oRPC)

```typescript
"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function FeedbackList({ organizationId }: { organizationId: string }) {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery(
		orpc.feedback.list.queryOptions({ input: { organizationId } }),
	);
	const createMut = useMutation(
		orpc.feedback.create.mutationOptions({
			onSuccess: () => qc.invalidateQueries(orpc.feedback.list.key()),
		}),
	);

	// ...
}
```

The typed `orpc` client lives in `apps/saas/modules/shared/lib/orpc-query-utils.ts` (alias `@shared/lib/orpc-query-utils`).

## Existing Modules (read for reference)

- `packages/api/modules/notifications/` — list, unread count, mark read, preferences (good template)
- `packages/api/modules/organizations/` — multi-tenant org procedures
- `packages/api/modules/payments/` — checkout, portal, plans
- `packages/api/modules/users/` — user CRUD
- `packages/api/modules/admin/` — admin-only procedures (uses `adminProcedure`)
- `packages/api/modules/ai/` — AI procedures (often streaming)

## Streaming

oRPC supports streaming responses (e.g., AI). See `packages/api/modules/ai/` and the [streaming docs](https://supastarter.dev/docs/nextjs/api/streaming).

## OpenAPI

The Hono entry mounts `openApiHandler` so a Swagger / OpenAPI spec is exposed automatically based on the `route()` metadata you set in each procedure (path, method, tags, summary). See [OpenAPI docs](https://supastarter.dev/docs/nextjs/api/openapi).

## Key Paths

- Root router: `packages/api/orpc/router.ts`
- Procedures: `packages/api/orpc/procedures.ts`
- Hono entry: `packages/api/index.ts`
- Module template: `packages/api/modules/notifications/`
- Client: `apps/saas/modules/shared/lib/orpc-query-utils.ts` (alias `@shared/lib/orpc-query-utils`)

## Gotchas (verified)

### `bigint` does not survive JSON

oRPC serializes responses as JSON; `JSON.stringify(BigInt)` throws. For any field that is a `bigint` on the server, project it to `string` in the output schema:

```typescript
const bigintAsString = z.bigint().transform((v) => v.toString());

const walletDtoSchema = z.object({
	id: z.string(),
	availableBalanceKopecks: bigintAsString, // wire format: "12345"
	// ...
});
```

The client decodes back via `BigInt(value)` only when arithmetic is needed; otherwise format the string directly (e.g. `Intl.NumberFormat`).

### `localeMiddleware` for localized errors

For procedures that produce user-facing messages (especially 4xx errors shown in UI), chain `localeMiddleware` so `context.locale` is available:

```typescript
import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";

export const createTopup = protectedProcedure
	.use(localeMiddleware)
	.route({
		/* ... */
	})
	.handler(async ({ context: { user, locale } }) => {
		// build redirect URLs with `locale`, look up translations, etc.
	});
```

## Docs

- [API overview](https://supastarter.dev/docs/nextjs/api/overview)
- [Define endpoint](https://supastarter.dev/docs/nextjs/api/define-endpoint)
- [Protect endpoints](https://supastarter.dev/docs/nextjs/api/protect-endpoints)
- [Usage in frontend](https://supastarter.dev/docs/nextjs/api/usage-in-frontend)
- [Streaming](https://supastarter.dev/docs/nextjs/api/streaming)
- [OpenAPI](https://supastarter.dev/docs/nextjs/api/openapi)
- oRPC: <https://orpc.unnoq.com>
- Hono: <https://hono.dev>
