# Database Patterns (Next.js)

supastarter Next.js ships **both Prisma and Drizzle** clients in `packages/database/`. Choose one for your project — typically Prisma is the default; Drizzle is provided for teams that prefer it. Mixing within the same feature is allowed but uncommon.

## Layout

```
packages/database/
  prisma/
    schema.prisma          # source of truth for Prisma
    queries/<feature>.ts   # query helpers exported from @repo/database
    generated/             # generated client (do NOT edit)
    zod/                   # zod schemas auto-generated from Prisma
  drizzle/
    schema/                # Drizzle table definitions
    queries/<feature>.ts   # query helpers
    drizzle.config.ts
    client.ts
  index.ts                 # re-exports the active client (db)
```

`@repo/database` exports `db` (the active client) plus query helpers. Never instantiate Prisma/Drizzle in app code.

## Prisma Workflow

### 1. Edit the schema

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

### 2. Sync the database

```bash
# Dev (no migration history)
pnpm --filter @repo/database push

# Prod / track migrations
pnpm --filter @repo/database migrate
```

Note: scripts read `.env` (not `.env.local`). Keep them in sync: `cp .env.local .env`.

### 3. Regenerate the client

```bash
pnpm --filter @repo/database generate
```

This refreshes `prisma/generated/` AND the auto-generated zod schemas under `prisma/zod/` (used in API input validation).

### 4. Add query helpers

```typescript
// packages/database/prisma/queries/feedback.ts
import { db } from "../client";

export async function listFeedbackByOrg(organizationId: string) {
	return db.feedback.findMany({
		where: { organizationId },
		orderBy: { createdAt: "desc" },
	});
}

export async function createFeedback(input: {
	userId: string;
	organizationId?: string;
	message: string;
}) {
	return db.feedback.create({ data: input });
}
```

Re-export from `packages/database/prisma/queries/index.ts` (or directly from `packages/database/index.ts`) so consumers can `import { listFeedbackByOrg } from "@repo/database"`.

### 5. Use in oRPC procedure

```typescript
// packages/api/modules/feedback/procedures/create.ts
import { z } from "zod";
import { createFeedback } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";

export const createFeedbackProcedure = protectedProcedure
	.route({ method: "POST", path: "/feedback", tags: ["Feedback"], summary: "Create feedback" })
	.input(z.object({ message: z.string().min(1).max(2000), organizationId: z.string().optional() }))
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

## Common Prisma Patterns

### Find with relations

```typescript
const item = await db.feedback.findUnique({
	where: { id },
	include: { user: true, organization: true },
});
```

### Find many with filters

```typescript
const items = await db.feedback.findMany({
	where: { organizationId, status: "open" },
	orderBy: { createdAt: "desc" },
	take: 20,
});
```

### Transaction

```typescript
await db.$transaction(async (tx) => {
  const fb = await tx.feedback.create({ data: { ... } });
  await tx.notificationLog.create({ data: { feedbackId: fb.id } });
  return fb;
});
```

## Drizzle Workflow

### 1. Define table

```typescript
// packages/database/drizzle/schema/feedback.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const feedback = pgTable("feedback", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.references(() => user.id, { onDelete: "cascade" })
		.notNull(),
	message: text("message").notNull(),
	status: text("status").default("open").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 2. Push schema

Run drizzle-kit per `packages/database/drizzle/drizzle.config.ts` (script may need wiring in `package.json`).

### 3. Query helpers

```typescript
// packages/database/drizzle/queries/feedback.ts
import { db } from "../client";
import { feedback } from "../schema/feedback";
import { eq, desc } from "drizzle-orm";

export async function getFeedback(id: string) {
	return db.query.feedback.findFirst({ where: eq(feedback.id, id) });
}

export async function listFeedback(userId: string) {
	return db
		.select()
		.from(feedback)
		.where(eq(feedback.userId, userId))
		.orderBy(desc(feedback.createdAt));
}
```

## Studio (Prisma)

```bash
pnpm --filter @repo/database studio
```

Opens Prisma Studio on http://localhost:5555.

## Key Rules

- **Single source of truth**: don't mix Prisma + Drizzle for the same table.
- All queries in `packages/database/<orm>/queries/`; never call `db.*` from app/API code directly when a helper would do.
- Migrations require `.env` (not `.env.local`). Keep them in sync.
- After every schema change: `push` (dev) or `migrate` (prod) → `generate` → restart dev.

## XOR ownership pattern

A row that belongs to **either** a user **or** an organization (but not both) — used by `Purchase` and any wallet/credit/per-tenant resource. Two-step recipe:

**1. Prisma model** — both relations optional, both `@unique` at most one of them:

```prisma
model AiWallet {
  id             String        @id @default(cuid())
  userId         String?       @unique
  user           User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String?       @unique
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  // ...
}
```

**2. CHECK constraint via raw SQL** — Prisma does NOT generate XOR checks from comments; add it in a SQL file applied via `prisma db execute` (or in a `migrate dev` migration after the auto-generated CREATE TABLE):

```sql
ALTER TABLE "ai_wallet" DROP CONSTRAINT IF EXISTS ai_wallet_xor_owner;
ALTER TABLE "ai_wallet"
  ADD CONSTRAINT ai_wallet_xor_owner
  CHECK (
    ("userId" IS NOT NULL AND "organizationId" IS NULL)
    OR ("userId" IS NULL AND "organizationId" IS NOT NULL)
  );
```

Without the CHECK, an INSERT with both nullable owner FKs as `NULL` would succeed and orphan the row.

## Gotchas (verified)

### `prisma-zod-generator` + `BigInt @default(0)` → broken Zod default

Adding a `BigInt` field with a numeric default produces `z.bigint().default("0")` (a **string** default), which fails type-check against `z.bigint().default(bigint)`. Mitigation: a post-generate patch script.

```js
// packages/database/scripts/patch-zod-bigint-defaults.mjs
import { readFile, writeFile } from "node:fs/promises";
const target = new URL("../prisma/zod/index.ts", import.meta.url);
const src = await readFile(target, "utf8");
const patched = src.replace(
	/(z\.bigint\(\)(?:\.[a-zA-Z]+\(\))*\.default\()"(\-?\d+)"(\))/g,
	(_m, head, num, tail) => `${head}BigInt(${num})${tail}`,
);
if (src !== patched) await writeFile(target, patched, "utf8");
```

Wire it into `package.json`:

```json
"generate": "dotenv -c -e ../../.env -- prisma generate --no-hints && node ./scripts/patch-zod-bigint-defaults.mjs"
```

### Custom SQL via `prisma db execute` — drop `--schema`

The new Prisma client engine reads datasource from `prisma.config.ts`, so:

```bash
# Wrong (old API):
pnpm --filter @repo/database exec prisma db execute --file ./sql/x.sql --schema ./prisma/schema.prisma
# Right (current):
pnpm --filter @repo/database exec dotenv -c -e ../../.env -- prisma db execute --file ./prisma/sql/x.sql
```

`db push` does NOT apply custom SQL files — use `db execute` (one-off raw SQL) or `migrate dev` (versioned migrations) for RLS / RPC functions / CHECK constraints.

### `BigInt` literals require `target ≥ ES2020`

The shared `tooling/typescript/base.json` uses `target: "ES6"`. Packages that use `0n` / `100_00n` literals must override:

```json
{
	"extends": "@repo/tsconfig/base.json",
	"compilerOptions": { "target": "ES2020", "lib": ["ES2020", "DOM"] }
}
```

Or call `BigInt(0)` / `BigInt("100_00".replace(/_/g, ""))` instead of literals.

## Docs

- [Database overview](https://supastarter.dev/docs/nextjs/database/overview)
- [Client](https://supastarter.dev/docs/nextjs/database/client)
- [Update schema & migrate](https://supastarter.dev/docs/nextjs/database/update-schema)
- [Database studio](https://supastarter.dev/docs/nextjs/database/studio)
- Prisma: <https://www.prisma.io/docs>
- Drizzle: <https://orm.drizzle.team/docs>
