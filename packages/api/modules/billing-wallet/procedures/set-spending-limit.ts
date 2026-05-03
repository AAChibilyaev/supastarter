import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";

import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";
import { setSpendingLimitInputSchema, spendingLimitDtoSchema } from "../types";

/**
 * Spending limits stored in organization.metadata.spendingLimits[].
 * Limits can be:
 *   - Per-project (projectId set, userId omitted)
 *   - Per-user (userId set, projectId omitted)
 *   - Both (project + user specific)
 *   - Global/org-level (neither set — catches all unmatched consumption)
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

export const setSpendingLimit = protectedProcedure
	.use(localeMiddleware)
	.route({
		method: "POST",
		path: "/billing/wallet/limits",
		tags: ["AI Wallet"],
		summary: "Set or update wallet spending limit",
		description:
			"Sets a spending limit per project, per user, or globally for the organization. Replaces any existing limit for the same scope (projectId+userId+period combination).",
	})
	.input(setSpendingLimitInputSchema)
	.output(spendingLimitDtoSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		if (!org) throw new ORPCError("NOT_FOUND", { message: "Organization not found" });

		const meta = parseOrgMetadata(org.metadata);
		const existing = meta.spendingLimits ?? [];

		// Remove existing limit for the same scope (matching projectId+userId+period)
		const filtered = existing.filter(
			(l) =>
				l.projectId !== (input.projectId ?? undefined) ||
				l.userId !== (input.userId ?? undefined) ||
				l.period !== input.period,
		);

		const newLimit = {
			projectId: input.projectId ?? undefined,
			userId: input.userId ?? undefined,
			maxKopecks: input.maxKopecks.toString(),
			period: input.period,
			enabled: input.enabled,
		};

		const updated: OrgMetadata = {
			...meta,
			spendingLimits: [...filtered, newLimit],
		};

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify(updated) },
		});

		return {
			projectId: input.projectId,
			userId: input.userId,
			maxKopecks: input.maxKopecks,
			period: input.period,
			enabled: input.enabled,
		};
	});
