# Background Tasks (Next.js)

Cron, queues, and background jobs in supastarter Next.js. Three integration paths are supported by the docs:

1. **Vercel Cron / native Route Handlers** — simplest, no extra service.
2. **trigger.dev v4** — typed durable functions in `packages/tasks/`.
3. **Upstash QStash** — message queue + scheduler, signature-verified webhooks.

Pick the one that fits your scale and ops preference.

---

## 1. Vercel Cron / Route Handler

Simplest pattern: a Next.js Route Handler in the SaaS app, hit on a schedule.

```typescript
// apps/saas/app/api/cron/<name>/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const auth = req.headers.get("authorization");
	if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
		return new NextResponse("Unauthorized", { status: 401 });
	}
	// ...do work
	return NextResponse.json({ ok: true });
}
```

Set `CRON_SECRET` in env. Schedulers:

- **Vercel Cron** — `apps/saas/vercel.json` with the path + cron expression
- **GitHub Actions** — schedule a workflow that `curl`s the endpoint
- **Cloudflare Worker / EasyCron / etc.**

Good for: occasional small jobs, simple data cleanup, daily digests.
Bad for: long-running jobs (Vercel timeout), retries, queues, observability.

---

## 2. trigger.dev v4

The supastarter-recommended path for typed durable jobs. Lives in a new workspace package `packages/tasks/`.

### Setup

Create a trigger.dev account and project first, then run from monorepo root:

```bash
mkdir -p packages/tasks/trigger
```

**File:** `packages/tasks/package.json`

```json
{
	"name": "@repo/tasks",
	"version": "0.0.0",
	"main": "./index.ts",
	"scripts": {
		"type-check": "tsc --noEmit",
		"dev": "pnpm dlx trigger.dev@latest dev --env-file ../../.env.local",
		"deploy": "pnpm dlx trigger.dev@latest deploy"
	},
	"dependencies": {
		"@repo/database": "workspace:*",
		"@trigger.dev/sdk": "^4.3.0"
	},
	"devDependencies": {
		"@repo/tsconfig": "workspace:*",
		"@trigger.dev/build": "^4.3.0"
	}
}
```

**File:** `packages/tasks/tsconfig.json`

```json
{
	"extends": "@repo/tsconfig/base.json",
	"include": ["**/*.ts"],
	"exclude": ["dist", "build", "node_modules"]
}
```

**File:** `packages/tasks/trigger.config.ts`

```typescript
import { additionalPackages } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	project: "your_project_id", // from trigger.dev dashboard
	runtime: "node",
	tsconfig: "./tsconfig.json",
	logLevel: "log",
	maxDuration: 300,
	dirs: ["./trigger"],
	build: {
		extensions: [
			additionalPackages({ packages: ["zod-prisma-types"] }),
			prismaExtension({
				mode: "legacy",
				schema: "../database/prisma/schema.prisma",
				typedSql: true,
				directUrlEnvVarName: "DATABASE_URL_UNPOOLED",
			}),
		],
		external: ["@react-email/render", "@react-email/components", "react-dom", "react"],
	},
});
```

> Note: import `defineConfig` from `@trigger.dev/sdk` (not `/v3`). v4 deprecates the v3 entrypoint.

### Define a task

**File:** `packages/tasks/trigger/test-task.ts`

```typescript
import { task } from "@trigger.dev/sdk";

export const testTask = task({
	id: "test-task",
	run: async () => {
		console.log("test task");
	},
});
```

### Trigger from API

Add `@repo/tasks` as a dependency in `packages/api/package.json`, then:

```typescript
// in any oRPC procedure
import { testTask } from "@repo/tasks/trigger/test-task";

export const someProcedure = protectedProcedure.handler(async () => {
	await testTask.trigger();
	// or testTask.batchTrigger([...]) for batches
});
```

### Run locally

```bash
pnpm install
pnpm --filter tasks dev
```

This runs the dev runner — your code stays on your machine, but the trigger.dev cloud orchestrates invocations.

### Deploy

```bash
pnpm --filter tasks deploy
```

Or via CI:

**File:** `.github/workflows/trigger-deploy.yml`

```yaml
name: Deploy to trigger.dev (prod)
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - uses: pnpm/action-setup@v4
      - name: Install dependencies
        run: pnpm install
      - name: Deploy trigger tasks
        env:
          TRIGGER_ACCESS_TOKEN: ${{ secrets.TRIGGER_ACCESS_TOKEN }}
        run: pnpm --filter tasks deploy
```

Set `TRIGGER_ACCESS_TOKEN` in repo secrets (from trigger.dev dashboard).

Good for: scheduled jobs, retries, observability, batch processing, fan-out, long-running.
Docs: <https://trigger.dev/docs>

---

## 3. Upstash QStash

Message queue + scheduler for serverless. Verifies webhooks via signature.

### Install

```bash
pnpm add --filter @repo/api @upstash/qstash
```

### Env

```env
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

(All from the Upstash dashboard.)

### Client

**File:** `packages/api/lib/qstash.ts`

```typescript
import { Client as QStashClient } from "@upstash/qstash";

export const qstashClient = new QStashClient({
	baseUrl: process.env.QSTASH_URL,
	token: process.env.QSTASH_TOKEN!,
});
```

### Verifier middleware + tasks router

**File:** `packages/api/lib/qstash-verify.ts`

```typescript
import { Receiver } from "@upstash/qstash";
import { createMiddleware } from "hono/factory";

export const qStashVerifyMiddleware = createMiddleware(async (c, next) => {
	const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
	const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
	if (!currentSigningKey || !nextSigningKey) {
		return c.json({ error: "QStash signing keys not configured" }, 500);
	}

	const signature = c.req.header("upstash-signature");
	const body = await c.req.text();
	if (!signature) return c.json({ error: "Missing signature" }, 401);

	try {
		const receiver = new Receiver({ currentSigningKey, nextSigningKey });
		const isValid = receiver.verify({ body, signature });
		if (!isValid) return c.json({ error: "Invalid signature" }, 401);
		await next();
	} catch (error) {
		console.error("QStash signature verification failed:", error);
		return c.json({ error: "Invalid signature" }, 401);
	}
});
```

Mount a tasks Hono sub-router (separate from the oRPC tree, since QStash hits raw routes):

**File:** `packages/api/lib/tasks-router.ts`

```typescript
import { Hono } from "hono";
import { qStashVerifyMiddleware } from "./qstash-verify";

export const tasksRouter = new Hono()
	.basePath("/tasks")
	.use(qStashVerifyMiddleware)
	.post("/test", async (c) => {
		const { message } = await c.req.json();
		console.log(message);
		return c.json({ message: "Task received" });
	});
```

Mount it in `packages/api/index.ts` (alongside the oRPC handlers).

### Trigger a task

```typescript
import { qstashClient } from "@repo/api/lib/qstash";
import { getBaseUrl } from "@repo/utils";

await qstashClient.publishJSON({
	url: `${getBaseUrl()}/api/tasks/test`,
	body: { message: "Hello, world!" },
});
```

### Cron jobs

```typescript
await qstashClient.schedules.create({
	destination: `${getBaseUrl()}/api/tasks/test`,
	cron: "*/1 * * * *",
});
```

### Queues

```typescript
const queue = await qstashClient.queues.create({ name: "my-queue" });

await queue.enqueueJSON({ url: `${getBaseUrl()}/api/tasks/step-1`, body: { ... } });
await queue.enqueueJSON({ url: `${getBaseUrl()}/api/tasks/step-2`, body: { ... } });
```

Good for: cron, simple queues, signed webhooks, multi-step pipelines.
Bad for: heavy compute (each task is a single HTTP invocation).
Docs: <https://upstash.com/docs/qstash>

---

## Picking one

| Need                                          | Use                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Single daily/hourly job                       | Vercel Cron + Route Handler                                      |
| Long-running, retries, fan-out, observability | trigger.dev                                                      |
| Lightweight queue + cron + webhooks           | Upstash QStash                                                   |
| Heavy ETL / data pipelines                    | trigger.dev (or Inngest as alternative)                          |
| Hosted job runner alternative                 | [Queuebase](https://supastarter.dev/docs/nextjs/tasks/queuebase) |

## Common candidates for cron jobs

- Daily/weekly notification digest emails
- Stripe/Lemonsqueezy reconciliation (DB ↔ provider state)
- Cleanup of expired invitations, sessions, signed URLs
- Anonymizing deleted-user data per retention policy
- Re-indexing search/vector data

## Docs

- [Background tasks & cron jobs](https://supastarter.dev/docs/nextjs/tasks/overview)
- [trigger.dev recipe](https://supastarter.dev/docs/nextjs/tasks/trigger-dev)
- [Upstash QStash recipe](https://supastarter.dev/docs/nextjs/tasks/qstash)
- [Queuebase recipe](https://supastarter.dev/docs/nextjs/tasks/queuebase)
- Vercel Cron: <https://vercel.com/docs/cron-jobs>
- trigger.dev: <https://trigger.dev/docs>
- QStash: <https://upstash.com/docs/qstash>
- Inngest: <https://www.inngest.com/docs>
