import { getAssistantAnalytics } from "@repo/database";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

export const assistantAnalyticsProcedure = protectedProcedure
	.input(
		z.object({
			organizationId: z.string(),
			from: z.string().datetime(),
			to: z.string().datetime(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { user } = context;

		await requireOrganizationMember(input.organizationId, user.id);

		const analytics = await getAssistantAnalytics(
			input.organizationId,
			new Date(input.from),
			new Date(input.to),
		);

		return analytics;
	});
