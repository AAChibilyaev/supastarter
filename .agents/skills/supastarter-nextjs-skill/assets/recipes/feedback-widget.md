# Build a Feature: Feedback Widget (Next.js)

Full "build a feature" example for supastarter Next.js: database → queries → API (oRPC) → frontend → i18n → integration. Adapted from [Build a feedback widget](https://supastarter.dev/docs/nextjs/recipes/build-a-feedback-widget) for the current **split-app monorepo**.

## Overview

1. **Database schema** – Prisma `Feedback` model + `User` relation
2. **Database queries** – `createFeedback` helper, exported via `@repo/database`
3. **API endpoint** – oRPC procedure (Zod, `publicProcedure` + optional session, since feedback is allowed for anonymous users)
4. **Frontend component** – React form (shadcn, `useSession`, i18n, TanStack mutation)
5. **Translations** – keys in `saas.json` (or `shared.json` if used across apps) for all 4 locales
6. **Integration** – mount `<FeedbackWidget />` in a layout

---

## Step 1: Database Schema

**File:** `packages/database/prisma/schema.prisma`

```prisma
model Feedback {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  email     String?
  name      String?
  message   String
  type      String
  ipAddress String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("feedback")
}

model User {
  // ... existing fields ...
  feedbacks Feedback[]
}
```

Apply:

```bash
pnpm --filter @repo/database push
pnpm --filter @repo/database generate
```

---

## Step 2: Database Queries

**File:** `packages/database/prisma/queries/feedback.ts`

```typescript
import { db } from "../client";

export async function createFeedback({
  message,
  type,
  email,
  name,
  ipAddress,
  userId,
}: {
  message: string;
  type: string;
  email?: string;
  name?: string;
  ipAddress?: string;
  userId?: string;
}) {
  return db.feedback.create({
    data: { message, type, email, name, ipAddress, userId },
  });
}
```

Export from the queries index:

**File:** `packages/database/prisma/queries/index.ts`

```typescript
export * from "./ai-chats";
export * from "./feedback";
export * from "./organizations";
export * from "./purchases";
export * from "./users";
```

---

## Step 3: API Endpoint (oRPC)

### Schema

**File:** `packages/api/modules/feedback/types.ts`

```typescript
import { z } from "zod";

export const feedbackSchema = z.object({
  message: z.string().min(10).max(1000),
  type: z.enum(["bug", "feature", "general"]).default("general"),
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
```

### Procedure

Feedback can be submitted anonymously, so we use `publicProcedure` and pull the session manually (it's optional). For protected features use `protectedProcedure` instead.

**File:** `packages/api/modules/feedback/procedures/create.ts`

```typescript
import { ORPCError } from "@orpc/server";
import { auth } from "@repo/auth";
import { createFeedback } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";
import { feedbackSchema } from "../types";

export const createFeedbackProcedure = publicProcedure
  .route({
    method: "POST",
    path: "/feedback",
    tags: ["Feedback"],
    summary: "Submit user feedback",
    description: "Submit feedback with optional contact information",
  })
  .input(feedbackSchema)
  .output(z.object({ id: z.string(), message: z.string() }))
  .handler(async ({ input, context }) => {
    try {
      const session = await auth.api.getSession({ headers: context.headers });

      const ipAddress =
        context.headers.get("x-forwarded-for") ||
        context.headers.get("x-real-ip") ||
        undefined;

      const feedback = await createFeedback({
        message: input.message,
        type: input.type,
        email: input.email,
        name: input.name,
        ipAddress,
        userId: session?.user.id,
      });

      return { id: feedback.id, message: "Feedback submitted successfully" };
    } catch (error) {
      logger.error("Failed to submit feedback:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Could not submit feedback",
      });
    }
  });
```

### Router

**File:** `packages/api/modules/feedback/router.ts`

```typescript
import { createFeedbackProcedure } from "./procedures/create";

export const feedbackRouter = {
  create: createFeedbackProcedure,
};
```

### Mount in root router

**File:** `packages/api/orpc/router.ts`

```typescript
import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { aiRouter } from "../modules/ai/router";
import { feedbackRouter } from "../modules/feedback/router";
import { notificationsRouter } from "../modules/notifications/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
  admin: adminRouter,
  organizations: organizationsRouter,
  users: usersRouter,
  payments: paymentsRouter,
  ai: aiRouter,
  notifications: notificationsRouter,
  feedback: feedbackRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
```

---

## Step 4: Frontend Component

Use the SaaS app's aliases. Note:
- `@repo/ui/components/*` for shadcn primitives
- `cn` from `@repo/ui`
- `@auth/hooks/use-session` for the session hook
- `@shared/lib/orpc-query-utils` for the typed oRPC client

**File:** `apps/saas/modules/shared/components/FeedbackWidget.tsx`

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@auth/hooks/use-session";
import { orpc } from "@shared/lib/orpc-query-utils";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().min(10).max(1000),
  type: z.enum(["bug", "feature", "general"]).default("general"),
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackWidget({ className }: { className?: string }) {
  const t = useTranslations();
  const { user } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const createFeedbackMutation = useMutation(
    orpc.feedback.create.mutationOptions(),
  );

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { message: "", type: "general", email: "", name: "" },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    try {
      await createFeedbackMutation.mutateAsync({ input: data });
      setIsOpen(false);
      form.reset();
      toast.success(t("feedback.success.message"));
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(t("feedback.error.message"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("fixed bottom-4 right-4 z-50 shadow-lg", className)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("feedback.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("feedback.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedback.form.type.label")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("feedback.form.type.placeholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">
                        {t("feedback.form.type.options.general")}
                      </SelectItem>
                      <SelectItem value="bug">
                        {t("feedback.form.type.options.bug")}
                      </SelectItem>
                      <SelectItem value="feature">
                        {t("feedback.form.type.options.feature")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!user && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("feedback.form.name.label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("feedback.form.name.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("feedback.form.email.label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("feedback.form.email.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedback.form.message.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("feedback.form.message.placeholder")}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              loading={createFeedbackMutation.isPending}
            >
              {t("feedback.form.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 5: Translations (4 locales × 1 scope)

The widget is SaaS-only, so the keys go in `saas.json`. Add the same shape to **all four locales**.

**File:** `packages/i18n/translations/en/saas.json` (add at top level)

```json
{
  "feedback": {
    "button": "Feedback",
    "title": "Send Feedback",
    "success": {
      "title": "Thank you!",
      "message": "Your feedback has been submitted successfully."
    },
    "error": { "title": "Error", "message": "Failed to submit feedback" },
    "form": {
      "type": {
        "label": "Feedback Type",
        "placeholder": "Select feedback type",
        "options": {
          "general": "General",
          "bug": "Bug Report",
          "feature": "Feature Request"
        }
      },
      "name": { "label": "Name", "placeholder": "Your name" },
      "email": { "label": "Email", "placeholder": "your.email@example.com" },
      "message": { "label": "Message", "placeholder": "Tell us what you think..." },
      "submit": "Send Feedback"
    }
  }
}
```

**File:** `packages/i18n/translations/de/saas.json`

```json
{
  "feedback": {
    "button": "Feedback",
    "title": "Feedback senden",
    "success": {
      "title": "Vielen Dank!",
      "message": "Ihr Feedback wurde erfolgreich übermittelt."
    },
    "error": { "title": "Fehler", "message": "Feedback konnte nicht gesendet werden" },
    "form": {
      "type": {
        "label": "Feedback-Typ",
        "placeholder": "Feedback-Typ auswählen",
        "options": {
          "general": "Allgemein",
          "bug": "Fehlermeldung",
          "feature": "Feature-Anfrage"
        }
      },
      "name": { "label": "Name", "placeholder": "Ihr Name" },
      "email": { "label": "E-Mail", "placeholder": "ihre.email@beispiel.com" },
      "message": { "label": "Nachricht", "placeholder": "Sagen Sie uns, was Sie denken..." },
      "submit": "Feedback senden"
    }
  }
}
```

Repeat for `es/saas.json` and `fr/saas.json` with translated copy.

---

## Step 6: Integration

Mount the widget where you want it. For SaaS-only, add it to an authenticated layout:

**File:** `apps/saas/app/(authenticated)/(main)/layout.tsx` (or any existing layout)

```tsx
import { FeedbackWidget } from "@shared/components/FeedbackWidget";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget />
    </>
  );
}
```

To show on marketing too, build a shared marketing version (different alias scope) — or move the keys into `shared.json` and the component into a cross-app shared package.

---

## Step 7: Evaluation (next steps)

- View feedback in the admin module (`apps/saas/modules/admin/`) — add an `apps/saas/app/(authenticated)/(main)/(account)/admin/feedback/page.tsx` and a `feedback.list` admin procedure (`adminProcedure`).
- Email a digest of new feedback via a daily cron (see `references/background-tasks.md`).
- Trigger a Slack/Discord webhook in the procedure handler.
- Notify admins in-app via `createNotification` from `@repo/notifications` (see `references/notifications-patterns.md`).

## Features summary

- Session integration (auto-attach `userId` for logged-in users)
- Conditional fields (name/email hidden when logged in)
- Full i18n via `saas.json` × 4 locales
- Zod client + server validation
- shadcn UI primitives
- Type-safe oRPC mutation
- IP capture for anti-abuse

## Further considerations

- Rate limiting per IP (use Upstash Ratelimit, see `references/background-tasks.md` for QStash)
- Sentiment analysis via `packages/ai/`
- File attachments (presigned uploads — see `references/storage-patterns.md`)
- Dedicated feedback management dashboard
- Multi-channel notifications (email + Slack + in-app via `@repo/notifications`)
