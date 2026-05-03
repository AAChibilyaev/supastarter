import { ORPCError } from "@orpc/client";
import { db, type Prisma } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireOrganizationAdmin,
	requireOrganizationMember,
	requireSearchIndex,
} from "../lib/access";
import { searchIndexSlugSchema } from "../types";

export const WEBHOOK_EVENTS = [
	"index.created",
	"index.deleted",
	"ingest.completed",
	"reindex.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const webhookEventSchema = z.enum(WEBHOOK_EVENTS);

const webhookSchema = z.object({
	id: z.string(),
	url: z.string().url(),
	events: z.array(webhookEventSchema).min(1),
	active: z.boolean(),
	createdAt: z.string(),
});

interface OrgMetadata {
	webhooks?: Array<{
		id: string;
		url: string;
		events: WebhookEvent[];
		active: boolean;
		createdAt: string;
	}>;
}

function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as OrgMetadata;
	} catch {
		return {};
	}
}

function generateWebhookId(): string {
	return `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const listWebhooks = protectedProcedure
	.route({
		method: "GET",
		path: "/search/webhooks",
		tags: ["Search"],
		summary: "List webhooks",
		description: "Returns all webhook endpoints configured for this organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(webhookSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const meta = parseOrgMetadata(org.metadata);
		return (meta.webhooks ?? []).map((wh) => ({
			id: wh.id,
			url: wh.url,
			events: wh.events,
			active: wh.active,
			createdAt: wh.createdAt,
		}));
	});

export const createWebhook = protectedProcedure
	.route({
		method: "POST",
		path: "/search/webhooks",
		tags: ["Search"],
		summary: "Create webhook",
		description: "Adds a new webhook endpoint to the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			url: z.string().url(),
			events: z.array(webhookEventSchema).min(1),
		}),
	)
	.output(webhookSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const meta = parseOrgMetadata(org.metadata);
		const existing = meta.webhooks ?? [];

		const newWebhook = {
			id: generateWebhookId(),
			url: input.url,
			events: input.events,
			active: true,
			createdAt: new Date().toISOString(),
		};

		const updated: OrgMetadata = {
			...meta,
			webhooks: [...existing, newWebhook],
		};

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return newWebhook;
	});

export const deleteWebhook = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/webhooks/{webhookId}",
		tags: ["Search"],
		summary: "Delete webhook",
		description: "Removes a webhook endpoint from the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			webhookId: z.string(),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const meta = parseOrgMetadata(org.metadata);
		const existing = meta.webhooks ?? [];
		const filtered = existing.filter((wh) => wh.id !== input.webhookId);

		if (filtered.length === existing.length) {
			throw new ORPCError("NOT_FOUND", { message: "Webhook not found" });
		}

		const updated: OrgMetadata = { ...meta, webhooks: filtered };

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return { success: true };
	});

// ─── Incoming Webhook Receiver Config ────────────────────────────
// These manage the webhook signing secret used by the generic webhook
// receiver endpoint (POST /api/webhooks/sync/:indexSlug).
// The secret is stored in SearchIndex.schema._webhookConfig.

const webhookReceiverConfigSchema = z.object({
	secret: z.string().min(16).max(256).describe("HMAC-SHA256 signing secret"),
	enabled: z.boolean().default(true),
});

export const getWebhookReceiverConfig = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/webhook-receiver-config",
		tags: ["Search"],
		summary: "Get webhook receiver config",
		description:
			"Returns the webhook signing configuration for a search index. The secret is masked for security.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			hasSecret: z.boolean(),
			enabled: z.boolean(),
			secretPreview: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const index = await db.searchIndex.findFirst({
			where: { slug: input.slug, organizationId: input.organizationId },
			select: { schema: true },
		});
		if (!index) throw new ORPCError("NOT_FOUND", { message: "Index not found" });

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};
		const webhookConfig = rawSchema._webhookConfig as
			| { secret?: string; enabled?: boolean }
			| undefined;

		if (!webhookConfig?.secret) {
			return { hasSecret: false, enabled: false, secretPreview: "" };
		}

		const preview =
			webhookConfig.secret.length > 8 ? webhookConfig.secret.slice(0, 4) + "****" : "****";

		return {
			hasSecret: true,
			enabled: webhookConfig.enabled !== false,
			secretPreview: preview,
		};
	});

export const saveWebhookReceiverConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/webhook-receiver-config",
		tags: ["Search"],
		summary: "Save webhook receiver config",
		description:
			"Sets the webhook signing secret for a search index. The secret is used to verify HMAC-SHA256 signatures on incoming webhook payloads.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			config: webhookReceiverConfigSchema,
		}),
	)
	.output(z.object({ ok: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		await db.searchIndex.update({
			where: { id: index.id },
			data: {
				schema: {
					...rawSchema,
					_webhookConfig: {
						secret: input.config.secret,
						enabled: input.config.enabled,
					},
				} as Prisma.InputJsonValue,
			},
		});

		return { ok: true };
	});

export const deleteWebhookReceiverConfig = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/indexes/{slug}/webhook-receiver-config",
		tags: ["Search"],
		summary: "Delete webhook receiver config",
		description:
			"Removes the webhook signing secret for a search index, disabling signature verification.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(z.object({ ok: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const rawSchema =
			typeof index.schema === "object" && index.schema !== null
				? (index.schema as Record<string, unknown>)
				: {};

		const { _webhookConfig: _, ...rest } = rawSchema;

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: rest as Prisma.InputJsonValue },
		});

		return { ok: true };
	});

// ─── Webhook Delivery Log ────────────────────────────────────────

const deliveryEventOutputSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	type: z.string(),
	count: z.number(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.string(),
});

export const listWebhookDeliveries = protectedProcedure
	.route({
		method: "GET",
		path: "/search/webhooks/deliveries",
		tags: ["Search"],
		summary: "List webhook delivery events",
		description:
			"Returns recent webhook delivery events (webhook_delivery type) for the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().int().min(1).max(200).optional().default(50),
			offset: z.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			events: z.array(deliveryEventOutputSchema),
			total: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationMember(input.organizationId, context.user.id);

		type EventRow = {
			id: string;
			index_id: string;
			type: string;
			count: number;
			metadata: Record<string, unknown> | null;
			created_at: Date;
		};
		type CountRow = { total: bigint };

		const [events, totalRow] = await Promise.all([
			db.$queryRawUnsafe<EventRow[]>(
				`SELECT
					event.id,
					event.index_id,
					event.type,
					event.count,
					event.metadata,
					event.created_at
				FROM search_usage_event event
				WHERE event.organization_id = $1
				  AND event.type = 'webhook_delivery'
				ORDER BY event.created_at DESC
				LIMIT $2
				OFFSET $3`,
				input.organizationId,
				input.limit,
				input.offset,
			),
			db.$queryRawUnsafe<CountRow[]>(
				`SELECT COUNT(*)::bigint AS total
				FROM search_usage_event event
				WHERE event.organization_id = $1
				  AND event.type = 'webhook_delivery'`,
				input.organizationId,
			),
		]);

		return {
			events: events.map((e) => ({
				id: e.id,
				indexId: e.index_id,
				type: e.type,
				count: Number(e.count),
				metadata: e.metadata as Record<string, unknown> | null,
				createdAt: e.created_at.toISOString(),
			})),
			total: Number(totalRow[0]?.total ?? 0),
		};
	});
