# AI Patterns (Next.js)

AI features in supastarter Next.js use the **Vercel AI SDK** with provider configs in `packages/ai/`.

## Layout

```
packages/ai/
  index.ts              # exports model factories / helpers
  ...                   # provider configs (OpenAI, Anthropic, etc.)

packages/api/modules/ai/
  procedures/<action>.ts   # streaming or non-streaming oRPC procedures
  router.ts                # mounts ai procedures

apps/saas/modules/ai/
  components/              # chatbot UI, prompt forms, etc.

apps/saas/app/(authenticated)/(main)/(account)/chatbot/   # default chatbot route
```

## Env

```env
OPENAI_API_KEY=
# Add others as needed:
# ANTHROPIC_API_KEY=
# GOOGLE_GENERATIVE_AI_API_KEY=
```

## Streaming (oRPC + AI SDK)

```typescript
// packages/api/modules/ai/procedures/chat.ts
import { protectedProcedure } from "../../../orpc/procedures";
import { z } from "zod";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const chat = protectedProcedure
	.route({ method: "POST", path: "/ai/chat", tags: ["AI"], summary: "Chat completion (stream)" })
	.input(z.object({ messages: z.array(z.object({ role: z.string(), content: z.string() })) }))
	.handler(async ({ input }) => {
		const result = streamText({
			model: openai("gpt-4o-mini"),
			messages: input.messages,
		});
		return result.toDataStreamResponse();
	});
```

## Client (Vercel AI SDK + React)

```typescript
"use client";
import { useChat } from "ai/react";

export function Chatbot() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/ai/chat",
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => <div key={m.id}><b>{m.role}:</b> {m.content}</div>)}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

## Picking models

The skill's parent project may have project-level guidance for which Anthropic models to use. In `packages/ai/`, prefer the latest stable Sonnet/Opus/Haiku model IDs (check provider's docs at deploy time).

## Docs

- [AI overview](https://supastarter.dev/docs/nextjs/ai/overview)
- [Chatbot](https://supastarter.dev/docs/nextjs/ai/chatbot)
- [Prompts](https://supastarter.dev/docs/nextjs/ai/prompts)
- Vercel AI SDK: <https://sdk.vercel.ai/docs>
