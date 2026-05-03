# Supabase Setup (Next.js)

Use Supabase as the **database + storage** provider for supastarter Next.js. Auth stays on Better Auth (Supabase Auth is **not** used — auth data lives directly in your Supabase Postgres via Better Auth's adapter).

## Prerequisites

- A Supabase account and a project (<https://supabase.com>).
- The Supabase password you set when creating the project.

## 1. Get connection strings

In the Supabase dashboard click **Connect** in the top row → **ORM** tab → **Prisma**. You'll need both:

- **Transaction Pooler URL (DATABASE_URL)** — pooled via Supavisor; use at runtime
  ```
  postgres://postgres.<supabase-project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **Direct URL (DIRECT_URL)** — direct database connection; use for migrations
  ```
  postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
  ```

Replace `<password>`, `<supabase-project>`, `<region>`, `<project-ref>` with your values.

## 2. Configure env

**File:** `.env.local` (and `.env` for Prisma scripts)

```env
DATABASE_URL="postgres://postgres.<supabase-project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

## 3. Point Prisma CLI at DIRECT_URL

Prisma CLI must use the direct connection for migrations (PgBouncer doesn't support all session-level features). Update `packages/database/prisma.config.ts`:

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "./prisma/schema.prisma",
	datasource: {
		url: process.env.DIRECT_URL || process.env.DATABASE_URL,
	},
});
```

At runtime, the Prisma client (in `packages/database/prisma/client.ts`) reads `DATABASE_URL` (the pooled one) — connections flow through Supavisor.

## 4. Push the schema

```bash
pnpm --filter @repo/database push
```

After tables are created, **enable Row Level Security (RLS)** for every supastarter table in the Supabase dashboard. supastarter does access control at the API layer, but RLS provides defense-in-depth — denying all by default protects against accidental direct SQL access.

## 5. Storage bucket

In Supabase dashboard → **Storage** → **Create bucket**. Name it `avatars` (matches `NEXT_PUBLIC_AVATARS_BUCKET_NAME` default). Keep "Public bucket" **off** — supastarter handles access at the API/image-proxy layer.

Optionally set a max file size and restrict file types.

## 6. S3 access keys

Navigate to **Project Settings → Storage**. Scroll to **S3 access keys** → **New access key**. Copy the access key ID and secret.

**File:** `.env.local`

```env
S3_ACCESS_KEY_ID="<your-access-key>"
S3_SECRET_ACCESS_KEY="<your-secret-key>"
S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
S3_REGION="us-east-1"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

(`S3_REGION` is required by the AWS SDK but Supabase ignores it.)

## 7. Run dev

```bash
pnpm dev
```

This also regenerates the Prisma client. To do it manually:

```bash
pnpm --filter @repo/database generate
```

## Notes

- **Auth**: Better Auth, not Supabase Auth. User/session/account tables are part of `packages/database/prisma/schema.prisma`.
- **Connection pooling**: keep `?pgbouncer=true` on `DATABASE_URL`. Without it, Prisma may exhaust connections quickly under load.
- **Direct URL** is also useful for some Better Auth migrations and for `pnpm --filter @repo/database studio`.
- **Production migrations**: run `pnpm --filter @repo/database migrate deploy` from CI with both env vars set.

## Docs

- [Supabase recipe](https://supastarter.dev/docs/nextjs/recipes/supabase-setup)
- Supabase Connect: <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Supabase Storage S3 protocol: <https://supabase.com/docs/guides/storage/s3/authentication>
- Supabase RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
