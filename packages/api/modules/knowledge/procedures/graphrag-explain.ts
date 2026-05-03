import { ORPCError } from "@orpc/client";
import { db, getKnowledgeSpaceBySlug } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireKnowledgeOwnerMember } from "../lib/access";
import { expandGraphNeighborhood } from "../lib/graphrag";
import { knowledgeOwnerTypeSchema, knowledgeSpaceSlugSchema } from "../types";

export const graphragExplain = protectedProcedure
	.use(creditGate("graphrag_extract", CREDIT_RATES.graphrag_extract))
	.route({
		method: "POST",
		path: "/knowledge/graphrag/explain",
		tags: ["Knowledge"],
		summary: "Explain graph retrieval neighborhood",
	})
	.input(
		z.object({
			ownerType: knowledgeOwnerTypeSchema,
			ownerId: z.string(),
			spaceSlug: knowledgeSpaceSlugSchema,
			query: z.string().min(2).max(600),
		}),
	)
	.output(
		z.object({
			seedNodes: z.array(z.record(z.string(), z.unknown())),
			nodes: z.array(z.record(z.string(), z.unknown())),
			edges: z.array(z.record(z.string(), z.unknown())),
		}),
	)
	.handler(async ({ input, context: { ...rest } }) => {
		const user = (rest as Record<string, unknown>).user as { id: string };
		const { creditReservationId } = rest as unknown as CreditGateContext;

		try {
			await requireKnowledgeOwnerMember(
				{
					ownerType: input.ownerType,
					ownerId: input.ownerId,
				},
				user,
			);

			const scope = {
				ownerType: input.ownerType,
				organizationId: input.ownerType === "ORGANIZATION" ? input.ownerId : undefined,
				userId: input.ownerType === "USER" ? input.ownerId : undefined,
			};
			const space = await getKnowledgeSpaceBySlug(scope, input.spaceSlug);
			if (!space) {
				throw new ORPCError("NOT_FOUND", { message: "Knowledge space not found" });
			}

			const queryTokens = input.query
				.toLowerCase()
				.split(/\s+/)
				.filter((token) => token.length > 2);
			const seedNodes = await db.graphNode.findMany({
				where: {
					knowledgeSpaceId: space.id,
					canonicalName: { in: queryTokens },
				},
				take: 12,
			});

			const edges = await expandGraphNeighborhood({
				knowledgeSpaceId: space.id,
				seedNodeIds: seedNodes.map((node) => node.id),
				limit: 120,
			});
			const connectedNodeIds = new Set<string>();
			for (const edge of edges) {
				connectedNodeIds.add(edge.fromNodeId);
				connectedNodeIds.add(edge.toNodeId);
			}

			const nodes = await db.graphNode.findMany({
				where: {
					id: { in: Array.from(connectedNodeIds) },
				},
			});

			// Commit flat-fee usage on successful GraphRAG extraction
			await commitFlatFeeUsage({
				reservationId: creditReservationId,
				operation: "graphrag_extract",
				provider: "aacsearch",
				model: "graphrag",
				flatFeeKopecks: CREDIT_RATES.graphrag_extract,
			});

			return {
				seedNodes,
				nodes,
				edges,
			};
		} catch (err) {
			// Release reservation on any error
			await releaseCreditReservation(creditReservationId);
			throw err;
		}
	});
