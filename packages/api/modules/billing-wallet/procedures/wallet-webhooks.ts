import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

export const WALLET_WEBHOOK_EVENTS = [
	"wallet.balance_low",
	"wallet.recharged",
	"wallet.overage_reached",
] as const;

export type WalletWebhookEvent = (typeof WALLET_WEBHOOK_EVENTS)[number];

const walletWebhookEventSchema = z.enum(WALLET_WEBHOOK_EVENTS);

const walletWebhookSchema = z.object({
	id: z.string(),
	url: z.string().url(),
	events: z.array(walletWebhookEventSchema).min(1),
	active: z.boolean(),
	createdAt: z.string(),
});

interface OrgMetadata {
	walletWebhooks?: Array<{
		id: string;
		url: string;
		events: WalletWebhookEvent[];
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
	return `wwh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const listWalletWebhooks = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/wallet/webhooks",
		tags: ["AI Wallet"],
		summary: "List wallet webhooks",
		description: "Returns all wallet webhook endpoints configured for this organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(walletWebhookSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) return [];

		const meta = parseOrgMetadata(org.metadata);
		return (meta.walletWebhooks ?? []).map((wh) => ({
			id: wh.id,
			url: wh.url,
			events: wh.events,
			active: wh.active,
			createdAt: wh.createdAt,
		}));
	});

export const createWalletWebhook = protectedProcedure
	.route({
		method: "POST",
		path: "/billing/wallet/webhooks",
		tags: ["AI Wallet"],
		summary: "Create wallet webhook",
		description: "Adds a new wallet webhook endpoint to the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			url: z.string().url(),
			events: z.array(walletWebhookEventSchema).min(1),
		}),
	)
	.output(walletWebhookSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const meta = parseOrgMetadata(org.metadata);
		const existing = meta.walletWebhooks ?? [];

		const newWebhook = {
			id: generateWebhookId(),
			url: input.url,
			events: input.events,
			active: true,
			createdAt: new Date().toISOString(),
		};

		const updated: OrgMetadata = {
			...meta,
			walletWebhooks: [...existing, newWebhook],
		};

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return newWebhook;
	});

export const deleteWalletWebhook = protectedProcedure
	.route({
		method: "DELETE",
		path: "/billing/wallet/webhooks/{webhookId}",
		tags: ["AI Wallet"],
		summary: "Delete wallet webhook",
		description: "Removes a wallet webhook endpoint from the organization.",
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
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const meta = parseOrgMetadata(org.metadata);
		const existing = meta.walletWebhooks ?? [];
		const filtered = existing.filter((wh) => wh.id !== input.webhookId);

		if (filtered.length === existing.length) {
			throw new ORPCError("NOT_FOUND", { message: "Webhook not found" });
		}

		const updated: OrgMetadata = { ...meta, walletWebhooks: filtered };

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return { success: true };
	});
