import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

export const listShopifyStores = protectedProcedure
	.route({
		method: "GET",
		path: "/search/shopify-stores",
		tags: ["Search"],
		summary: "List Shopify stores",
		description: "Returns all Shopify stores connected to this organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.array(
			z.object({
				id: z.string(),
				shop: z.string(),
				name: z.string().nullable(),
				email: z.string().nullable(),
				domain: z.string().nullable(),
				syncStatus: z.string(),
				syncError: z.string().nullable(),
				lastSyncAt: z.date().nullable(),
				installedAt: z.date(),
				indexId: z.string().nullable(),
				index: z
					.object({
						id: z.string(),
						slug: z.string(),
						displayName: z.string(),
					})
					.nullable(),
			}),
		),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const stores = await db.shopifyStore.findMany({
			where: {
				organizationId,
				uninstalledAt: null,
			},
			include: {
				index: { select: { id: true, slug: true, displayName: true } },
			},
			orderBy: { installedAt: "desc" },
		});

		return stores.map((store) => ({
			id: store.id,
			shop: store.shop,
			name: store.name,
			email: store.email,
			domain: store.domain,
			syncStatus: store.syncStatus,
			syncError: store.syncError,
			lastSyncAt: store.lastSyncAt,
			installedAt: store.installedAt,
			indexId: store.indexId,
			index: store.index,
		}));
	});
