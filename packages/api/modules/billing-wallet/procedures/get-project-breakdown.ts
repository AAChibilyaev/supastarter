import { ORPCError } from "@orpc/client";
import { db, getAiWalletByEntity, getWalletProjectBreakdown } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";
import { projectBreakdownOutputSchema } from "../types";

export const getProjectBreakdown = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/wallet/project-breakdown",
		tags: ["AI Wallet"],
		summary: "Get wallet consumption breakdown by project",
		description:
			"Returns AI credit consumption grouped by project for the current billing period, including totals and event counts.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(projectBreakdownOutputSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const wallet = await getAiWalletByEntity({ organizationId: input.organizationId });
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		const breakdown = await getWalletProjectBreakdown(input.organizationId, {
			from: wallet.periodStart,
			to: wallet.periodEnd,
		});

		// Resolve project names (if project exists in the search index collection)
		const projectIds = breakdown.map((b) => b.projectId).filter(Boolean);
		let projectNames: Map<string, string> = new Map();

		if (projectIds.length > 0) {
			try {
				const projects = await db.collection.findMany({
					where: { id: { in: projectIds } },
					select: { id: true, name: true },
				});
				projectNames = new Map(projects.map((p) => [p.id, p.name]));
			} catch {
				// Gracefully degrade if collection data is unavailable
			}
		}

		const totalKopecks = breakdown.reduce((sum, b) => sum + b.totalKopecks, BigInt(0));

		return {
			projects: breakdown.map((b) => ({
				projectId: b.projectId,
				projectName: projectNames.get(b.projectId),
				totalKopecks: b.totalKopecks,
				eventCount: Number(b.eventCount),
				lastUsed: b.lastUsed,
			})),
			totalKopecks,
		};
	});
