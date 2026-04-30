# Configuration (Next.js)

Environment variables and per-app config in supastarter Next.js (split-app monorepo).

## Env files

- `.env.local` — primary dev env (read by `pnpm dev` / `pnpm build` via `dotenv-cli`)
- `.env` — duplicate for Prisma scripts (`packages/database/package.json` uses `dotenv -e ../../.env`)
- `.env.local.example` — template (copy to both `.env.local` and `.env`)

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Everything else is server-only. Never commit secrets.

## Required minimums

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
NEXT_PUBLIC_SAAS_URL="http://localhost:3000"
NEXT_PUBLIC_MARKETING_URL="http://localhost:3001"
NEXT_PUBLIC_DOCS_URL="http://localhost:3002"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

See [assets/env.example](../assets/env.example) for the full list (mail, payments, analytics, S3, AI).

## Per-app config

Each app has its own scoped config:

| File                                             | Purpose                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `apps/saas/config.ts`                            | SaaS app metadata                                                                       |
| `apps/marketing/config.ts`                       | Marketing site metadata, navigation, etc.                                               |
| `apps/docs/config.ts`                            | Docs site config                                                                        |
| `packages/i18n/config.ts`                        | Locales (`en`, `de`, `es`, `fr`), default locale, currency, cookie name (`NEXT_LOCALE`) |
| `packages/payments/config.ts`                    | Payment provider selection, plan→priceId mapping                                        |
| `packages/mail/config.ts`                        | Mail provider selection, from address                                                   |
| `packages/storage/config.ts`                     | S3 settings                                                                             |
| `packages/notifications/types.ts` + `catalog.ts` | Notification types, groups, i18n labels                                                 |

Import via package alias:

```typescript
import { config } from "@config"; // current app's config
import { config as i18nConfig } from "@repo/i18n";
```

## Feature flags / split decisions

There is no single feature-flags file by default — toggles live in the relevant config (e.g., enabled payment providers in `packages/payments/config.ts`). Add a project-specific flags file under `apps/<app>/config/features.ts` if you need one.

## Production env

Set the same env vars in your hosting platform per app (saas, marketing, docs). OAuth callback URLs and payment webhook URLs must match the production hostnames.

## Docs

- [Configuration](https://supastarter.dev/docs/nextjs/configuration)
