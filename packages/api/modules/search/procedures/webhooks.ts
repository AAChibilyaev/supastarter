import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

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
