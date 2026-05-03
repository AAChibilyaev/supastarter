import { ORPCError } from "@orpc/client";
import {
	aggregateAiUsageByDay,
	aggregateAiUsageByMonth,
	aggregateAiUsageByWeek,
	getAiWalletByEntity,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";
import { getCreditUsageStatsOutputSchema, usageStatsPeriodSchema } from "../types";

export const getCreditUsageStats = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/credits/usage-stats",
		tags: ["Credits Analytics"],
		summary: "Get credit usage statistics aggregated by period",
		description:
			"Returns consumption history grouped by day, week, or month for the current billing period. Requires org membership.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			period: usageStatsPeriodSchema.default("daily"),
		}),
	)
	.output(getCreditUsageStatsOutputSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const wallet = await getAiWalletByEntity({ organizationId: input.organizationId });
		if (!wallet) throw new ORPCError("NOT_FOUND", { message: "Wallet not initialized" });

		const filter = {
			organizationId: input.organizationId,
			userId: user.id,
			from: wallet.periodStart,
			to: wallet.periodEnd,
		};

		switch (input.period) {
			case "weekly": {
				const rows = await aggregateAiUsageByWeek(filter);
				return {
					buckets: rows.map((r) => ({
						periodStart: r.week,
						totalKopecks: r.total_kopecks,
						events: Number(r.events),
					})),
				};
			}
			case "monthly": {
				const rows = await aggregateAiUsageByMonth(filter);
				return {
					buckets: rows.map((r) => ({
						periodStart: r.month,
						totalKopecks: r.total_kopecks,
						events: Number(r.events),
					})),
				};
			}
			default: {
				const rows = await aggregateAiUsageByDay(filter);
				return {
					buckets: rows.map((r) => ({
						periodStart: r.day,
						totalKopecks: r.total_kopecks,
						events: Number(r.events),
					})),
				};
			}
		}
	});
