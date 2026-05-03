import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const conversationSchema = z.object({
	id: z.number(),
	conversation: z.array(z.record(z.string(), z.unknown())),
	lastUpdated: z.number(),
	ttl: z.number(),
});

export const listConversations = protectedProcedure
	.route({
		method: "GET",
		path: "/search/conversations",
		tags: ["Search"],
		summary: "List active conversation sessions",
		description: "Returns all active conversation sessions managed by Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			conversations: z.array(
				z.object({
					id: z.number(),
					lastUpdated: z.number(),
					ttl: z.number(),
				}),
			),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any).conversations().retrieve();

		const data = result as { conversations?: Array<Record<string, unknown>> };

		return {
			conversations: (data.conversations ?? []).map((c: Record<string, unknown>) => ({
				id: (c.id ?? 0) as number,
				lastUpdated: (c.last_updated ?? 0) as number,
				ttl: (c.ttl ?? 86400) as number,
			})),
		};
	});

export const getConversation = protectedProcedure
	.route({
		method: "GET",
		path: "/search/conversations/{id}",
		tags: ["Search"],
		summary: "Get conversation details and history",
		description:
			"Returns the full conversation history and metadata for a specific conversation session.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.number().int(),
		}),
	)
	.output(
		z.object({
			id: z.number(),
			conversation: z.array(z.record(z.string(), z.unknown())),
			lastUpdated: z.number(),
			ttl: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (client as any).conversations(String(input.id)).retrieve();

		const turns = (result ?? []) as Array<Record<string, unknown>>;

		// The response is an array of conversation turns
		return {
			id: input.id,
			conversation: turns,
			lastUpdated: Date.now() / 1000,
			ttl: 86400,
		};
	});

export const deleteConversation = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/conversations/{id}",
		tags: ["Search"],
		summary: "Delete a conversation session",
		description: "Removes a conversation session and its history from Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.number().int(),
		}),
	)
	.output(z.object({ id: z.number() }))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).conversations(String(input.id)).delete();

		return { id: input.id };
	});
