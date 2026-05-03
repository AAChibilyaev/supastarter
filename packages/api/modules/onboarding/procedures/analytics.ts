import { getCohortData, getFunnelData, getTimeToFirstValue } from "@repo/database";

import { adminProcedure } from "../../../orpc/procedures";

export const analytics = adminProcedure
	.route({
		method: "GET",
		path: "/onboarding/analytics",
		tags: ["Onboarding", "Admin"],
		summary: "Get onboarding analytics (funnel, time-to-first-value, cohort data)",
		description:
			"Returns funnel completion rates with drop-off, median time to first search, and cohort analysis by signup week. Admin-only.",
	})
	.handler(async () => {
		const [funnel, timeToFirstValue, cohorts] = await Promise.all([
			getFunnelData(),
			getTimeToFirstValue(),
			getCohortData(),
		]);

		return { funnel, timeToFirstValue, cohorts };
	});
