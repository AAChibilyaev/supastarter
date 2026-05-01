import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

const analyticsRuleSchema = z.object({
	name: z.string().min(1).max(200),
	type: z.enum(["counter", "aggregation"]),
	params: z.record(z.string(), z.unknown()),
});

export const listAnalyticsRules = protectedProcedure
	.route({
		method: "GET",
		path: "/search/analytics/rules",
		tags: ["Search"],
		summary: "List custom analytics rules",
		description: "Returns all configured analytics rules for the Typesense cluster.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(analyticsRuleSchema))
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = (await (client as any).analytics.rules().retrieve()) as any;

		const rules = (result?.rules ?? []) as any[];
		return rules.map((rule: any) => ({
			name: rule.name as string,
			type: rule.type as "counter" | "aggregation",
			params: rule.params as Record<string, unknown>,
		}));
	});

export const createAnalyticsRule = protectedProcedure
	.route({
		method: "POST",
		path: "/search/analytics/rules",
		tags: ["Search"],
		summary: "Create a custom analytics rule",
		description: "Creates a new analytics rule for tracking custom metrics in Typesense.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(200),
			type: z.enum(["counter", "aggregation"]),
			params: z.record(z.string(), z.unknown()),
		}),
	)
	.output(analyticsRuleSchema)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (client as any).analytics.rules().upsert(input.name, {
			type: input.type,
			params: input.params,
		});

		return {
			name: input.name,
			type: input.type,
			params: input.params,
		};
	});

export const deleteAnalyticsRule = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/analytics/rules/{name}",
		tags: ["Search"],
		summary: "Delete a custom analytics rule",
		description: "Removes an analytics rule by name from the Typesense cluster.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(200),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			name: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrganizationAdmin(input.organizationId, context.user);

		const client = getTypesenseClient();
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (client as any).analytics.rules(input.name).delete();
			return { success: true, name: input.name };
		} catch {
			return { success: false, name: input.name };
		}
	});
