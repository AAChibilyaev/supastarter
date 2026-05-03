import { getAiWalletByEntity } from "@repo/database";
import { checkQuota } from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

const bigintAsString = z.bigint().transform((v) => v.toString());

export const getOverageStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/search/overage-status",
		tags: ["Search", "Billing"],
		summary: "Get overage/quota status for the organization",
		description:
			"Returns the current search quota usage, soft/hard cap status, and wallet overage balance (if overage billing is enabled).",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			percentUsed: z.number(),
			searchesUsed: z.number(),
			searchLimit: z.number(),
			isUnlimited: z.boolean(),
			isSoftCap: z.boolean(),
			isHardCap: z.boolean(),
			overageEnabled: z.boolean(),
			overageLimitKopecks: bigintAsString.nullable(),
			overageUsedKopecks: bigintAsString.nullable(),
			overageRemainingKopecks: bigintAsString.nullable(),
			overageRateUsdMicrosPerSearch: z.number(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		const quota = await checkQuota(organizationId, "search");
		const wallet = await getAiWalletByEntity({ organizationId });

		// Determine if overage is enabled (wallet exists with limit > 0)
		const overageLimitKopecks = wallet?.overageLimitKopecks ?? BigInt(0);
		const overageUsedKopecks = wallet?.overageUsedKopecks ?? BigInt(0);
		const overageEnabled = overageLimitKopecks > BigInt(0);
		const overageRemainingKopecks = overageEnabled
			? overageLimitKopecks - overageUsedKopecks
			: BigInt(0);

		return {
			percentUsed: quota.percentUsed * 100, // convert 0-1 to 0-100
			searchesUsed: quota.current,
			searchLimit: quota.limit,
			isUnlimited: quota.isUnlimited,
			isSoftCap: quota.isSoftCap,
			isHardCap: quota.isHardCap,
			overageEnabled,
			overageLimitKopecks: overageEnabled ? overageLimitKopecks : null,
			overageUsedKopecks: overageEnabled ? overageUsedKopecks : null,
			overageRemainingKopecks: overageEnabled ? overageRemainingKopecks : null,
			overageRateUsdMicrosPerSearch: quota.overageRateUsdMicrosPerSearch,
		};
	});
