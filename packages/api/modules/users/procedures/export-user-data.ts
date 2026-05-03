import { exportUserData } from "@repo/database";
import { logger } from "../../../lib/scrubbed-logger";

import { protectedProcedure } from "../../../orpc/procedures";

export const exportMyData = protectedProcedure
	.route({
		method: "GET",
		path: "/users/export-data",
		tags: ["Users"],
		summary: "Export my data (GDPR Article 20)",
		description:
			"Returns all user data in a portable JSON format: profile, memberships, API keys, purchases, and usage summary. Implements GDPR Article 20 data portability right.",
	})
	.handler(async ({ context: { user } }) => {
		const data = await exportUserData(user.id);

		if (!data) {
			logger.error("User data export failed — user not found", {
				userId: user.id,
			});
			throw new Error("User not found");
		}

		logger.info("User data exported", {
			userId: user.id,
			membershipCount: data.memberships.length,
		});

		return data;
	});
