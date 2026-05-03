import { randomUUID } from "node:crypto";

import { createConversation, updateConversationMetadata } from "@repo/database";
import { logger } from "@repo/logs";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";
import { buildPersonalizationContext, type PersonalizationConnectors } from "../lib/personalization-context";
import { getConnectors } from "../connectors/registry";

export const createConversationProcedure = protectedProcedure
	.input(
		z.object({
			organizationId: z.string(),
			entryPoint: z
				.enum(["home", "catalog", "search_results", "product_card", "unknown"])
				.optional(),
			productContext: z
				.object({ productId: z.string(), categorySlug: z.string().optional() })
				.optional(),
			searchContext: z.object({ query: z.string() }).optional(),
			locale: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { user } = context;
		const orgId = input.organizationId;

		await requireOrganizationMember(orgId, user.id);

		const sessionId = randomUUID();

		const conversation = await createConversation({
			organizationId: orgId,
			userId: user.id,
			sessionId,
			mode: "product_consultation",
			entryPoint: input.entryPoint ?? null,
			metadata: {
				locale: input.locale ?? "en",
				...(input.productContext ? { currentProductId: input.productContext.productId, currentCategory: input.productContext.categorySlug } : {}),
				...(input.searchContext ? { searchQuery: input.searchContext.query } : {}),
			},
		});

		// Build personalization context in background — don't block response
		Promise.resolve().then(async () => {
			try {
				const registry = getConnectors(orgId);
				const personalizationConnectors: PersonalizationConnectors = {
					getUserConditions: async (uid) => {
						const conds = await registry.loyalty.getUserConditions(uid);
						return conds;
					},
					getPurchaseHistory: (uid, limit) => registry.loyalty.getPurchaseHistory(uid, limit),
					getViewHistory: (uid, limit) => registry.loyalty.getViewHistory(uid, limit),
				};
				const personalization = await buildPersonalizationContext(
					sessionId,
					user.id,
					undefined,
					personalizationConnectors,
				);
				await updateConversationMetadata(conversation.id, { personalization });
			} catch (err) {
				logger.warn({ conversationId: conversation.id, error: err }, "createConversation: personalization build failed");
			}
		});

		return { conversationId: conversation.id, sessionId };
	});
