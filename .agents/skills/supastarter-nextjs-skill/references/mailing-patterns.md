# Mailing Patterns (Next.js)

React Email + multiple providers in supastarter Next.js.

## Layout

```
packages/mail/
  emails/                # React Email templates (.tsx)
  components/            # shared email components
  lib/                   # send helper, provider dispatch
  provider/              # Plunk, Resend, Postmark, Nodemailer (SMTP), Mailgun, Console
  config.ts              # active provider + from address
  types.ts
  index.ts
```

## Providers

Choose via env. The active provider is determined by which keys are set in `packages/mail/config.ts`.

| Provider          | Env key(s)                                         |
| ----------------- | -------------------------------------------------- |
| Nodemailer (SMTP) | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` |
| Plunk             | `PLUNK_API_KEY`                                    |
| Resend            | `RESEND_API_KEY`                                   |
| Postmark          | `POSTMARK_SERVER_TOKEN`                            |
| Mailgun           | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`                |
| Console (dev)     | (no keys — falls back when none configured)        |

`MAIL_FROM` is always required (e.g. `noreply@example.com`).

In dev with no provider configured, emails are logged to the `pnpm dev` console (search for `[mail]` lines).

## Sending mail

```typescript
import { sendMail } from "@repo/mail";

await sendMail({
	to: "user@example.com",
	template: "welcome", // file in packages/mail/emails/
	data: { name: "Alex" },
});
```

The `template` key matches a file in `packages/mail/emails/<template>.tsx`. The `data` object is passed as props.

## Built-in templates

`packages/mail/emails/` typically contains:

- `welcome.tsx`
- `verify-email.tsx`
- `magic-link.tsx`
- `forgot-password.tsx` / `reset-password.tsx`
- `organization-invitation.tsx`
- `notification.tsx` (used by `@repo/notifications` for email delivery — `data.headline` / `data.title` / `data.message` drive copy)

## Adding a new template

1. Create `packages/mail/emails/<name>.tsx`:

   ```tsx
   import { Html, Body, Container, Heading, Text } from "@react-email/components";

   export default function MyEmail({ name }: { name: string }) {
   	return (
   		<Html>
   			<Body>
   				<Container>
   					<Heading>Hi {name}</Heading>
   					<Text>...</Text>
   				</Container>
   			</Body>
   		</Html>
   	);
   }
   ```

2. Add i18n strings in `packages/i18n/translations/<locale>/mail.json` if needed.
3. Send via `sendMail({ template: "<name>", data: {...} })`.
4. Preview in `apps/mail-preview/` (`pnpm dev --filter=mail-preview`, http://localhost:3003).

## Preview

`apps/mail-preview/` is a separate Next.js app dedicated to viewing email templates in a browser during development.

## Notification emails

For user-facing notifications, prefer `createNotification` from `@repo/notifications` (which handles preferences and uses the `notification` template) instead of calling `sendMail` directly. See `references/notifications-patterns.md`.

## Docs

- [Mailing overview](https://supastarter.dev/docs/nextjs/mailing/overview)
- React Email: <https://react.email>
- Plunk: <https://docs.useplunk.com>
- Resend: <https://resend.com/docs>
