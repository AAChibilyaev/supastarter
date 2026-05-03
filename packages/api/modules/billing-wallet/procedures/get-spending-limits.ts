import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";
import { spendingLimitDtoSchema } from "../types";

/**
 * Spending limits are stored in organization.metadata JSON:
 *   { spendingLimits: Array<{ projectId?, userId?, maxKopecks, period, enabled }> }
 */
interface OrgMetadata {
	spendingLimits?: Array<{
		projectId?: string;
		userId?: string;
		maxKopecks: string;
		period: "daily" | "weekly" | "monthly";
		enabled: boolean;
	}>;
}

function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as OrgMetadata;
	} catch {
		return {};
	}
}

export const getSpendingLimits = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/wallet/limits",
		tags: ["AI Wallet"],
		summary: "Get wallet spending limits",
		description:
			"Returns all configured spending limits for the organization — per-project, per-user, or global.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(spendingLimitDtoSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) return [];

		const meta = parseOrgMetadata(org.metadata);
		return (meta.spendingLimits ?? []).map((l) => ({
			projectId: l.projectId,
			userId: l.userId,
			maxKopecks: BigInt(l.maxKopecks),
			period: l.period,
			enabled: l.enabled,
		}));
	});
