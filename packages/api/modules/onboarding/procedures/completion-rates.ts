import { getCompletionRates } from "@repo/database";

import { adminProcedure } from "../../../orpc/procedures";

export const completionRates = adminProcedure
	.route({
		method: "GET",
		path: "/onboarding/completion-rates",
		tags: ["Onboarding", "Admin"],
		summary: "Get global activation milestone completion rates",
		description:
			"Returns the percentage of organizations that have completed each activation milestone. Admin-only.",
	})
	.handler(async () => {
		const rates = await getCompletionRates();
		return { rates };
	});
