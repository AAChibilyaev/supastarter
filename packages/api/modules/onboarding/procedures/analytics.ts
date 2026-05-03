import {
	getCohortData,
	getFunnelData,
	getHealthScoreDistribution,
	getMonthlyCohortData,
	getTimeToFirstValue,
} from "@repo/database";

import { adminProcedure } from "../../../orpc/procedures";

export const analytics = adminProcedure
	.route({
		method: "GET",
		path: "/onboarding/analytics",
		tags: ["Onboarding", "Admin"],
		summary:
			"Get onboarding analytics (funnel, time-to-first-value, cohort data, health score distribution)",
		description:
			"Returns funnel completion rates with drop-off, median time to first search, cohort analysis by signup week and month, and health score distribution across workspaces. Admin-only.",
	})
	.handler(async () => {
		const [funnel, timeToFirstValue, cohorts, monthlyCohorts, healthScoreDistribution] =
			await Promise.all([
				getFunnelData(),
				getTimeToFirstValue(),
				getCohortData(),
				getMonthlyCohortData(),
				getHealthScoreDistribution(),
			]);

		return { funnel, timeToFirstValue, cohorts, monthlyCohorts, healthScoreDistribution };
	});
