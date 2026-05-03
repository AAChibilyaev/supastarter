import { db } from "@repo/database";
import { resolveOrgPlan } from "@repo/payments/lib/entitlements";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../lib/access";

export const onboardingStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/search/onboarding-status",
		tags: ["Search"],
		summary: "Get onboarding checklist status",
		description:
			"Derives a 6-step onboarding checklist status from existing database tables. Read-only — no new DB writes.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			steps: z.array(
				z.object({
					step: z.number(),
					label: z.string(),
					completed: z.boolean(),
				}),
			),
			completedCount: z.number(),
			totalSteps: z.number(),
			allCompleted: z.boolean(),
			showUpgradePrompt: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationMember(organizationId, user.id);

		// Step 1: has index
		const indexCount = await db.searchIndex.count({
			where: { organizationId },
		});
		const hasIndex = indexCount > 0;

		// Step 2: has connector token (SearchApiKey with connector_write scope)
		const connectorTokenCount = await db.searchApiKey.count({
			where: {
				organizationId,
				scopes: { has: "connector_write" },
				revokedAt: null,
			},
		});
		const hasConnectorToken = connectorTokenCount > 0;

		// Step 3: has sync (SearchUsageEvent with ingest type)
		const syncEventCount = await db.searchUsageEvent.count({
			where: {
				organizationId,
				type: { in: ["ingest_write", "ingest", "documents_indexed", "ingest_enqueued"] },
			},
		});
		const hasSync = syncEventCount > 0;

		// Step 4: has search (SearchUsageEvent with search type)
		const searchEventCount = await db.searchUsageEvent.count({
			where: {
				organizationId,
				type: { in: ["search_query", "search"] },
			},
		});
		const hasSearch = searchEventCount > 0;

		// Step 5: has API key (SearchApiKey with search scope, not revoked)
		const apiKeyCount = await db.searchApiKey.count({
			where: {
				organizationId,
				scopes: { has: "search" },
				revokedAt: null,
			},
		});
		const hasApiKey = apiKeyCount > 0;

		// Step 6: widget embedded — always false, self-attestation by user
		const widgetEmbedded = false;

		const steps = [
			{ step: 1, label: "Create a search index", completed: hasIndex },
			{ step: 2, label: "Generate a connector token", completed: hasConnectorToken },
			{ step: 3, label: "Sync your data", completed: hasSync },
			{ step: 4, label: "Perform a search", completed: hasSearch },
			{ step: 5, label: "Generate an API key", completed: hasApiKey },
			{ step: 6, label: "Embed the search widget", completed: widgetEmbedded },
		];

		const completedCount = steps.filter((s) => s.completed).length;
		const allCompleted = completedCount === steps.length;

		// Expansion signal: prompt upgrade when health is 100 and org is on the free plan
		let showUpgradePrompt = false;
		if (allCompleted) {
			const plan = await resolveOrgPlan(organizationId);
			showUpgradePrompt = plan.planId === "free";
		}

		return {
			steps,
			completedCount,
			totalSteps: steps.length,
			allCompleted,
			showUpgradePrompt,
		};
	});
