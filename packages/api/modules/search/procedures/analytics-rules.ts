import { getTypesenseClient } from "@repo/search";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../lib/access";

// ── Counter rule params ──────────────────────────────────────────
//
// Counter rules increment a numeric field in documents when events occur
// (click, conversion, visit). Used for popularity-based ranking:
//
//   sort_by: click_count:desc, _text_match:desc
//
// Typesense docs: https://typesense.org/docs/28.0/api/analytics-rule.html

const eventSchema = z.object({
	type: z.string().min(1).max(64).describe("Event type name, e.g. click, conversion, visit"),
	weight: z.number().min(0).max(1000).default(1).describe("Multiplier for this event"),
	name: z.string().min(1).max(128).describe("Unique event name used when tracking"),
});

const sourceConfigSchema = z.object({
	collections: z.array(z.string().min(1)).min(1).describe("Collections to watch"),
	events: z.array(eventSchema).min(1).describe("Events that trigger the counter increment"),
});

const destinationConfigSchema = z.object({
	collection: z.string().min(1).describe("Destination collection holding the counter field"),
	counter_field: z
		.string()
		.min(1)
		.max(128)
		.describe("Numeric field to increment (must exist in schema as int32)"),
});

const counterParamsSchema = z.object({
	source: sourceConfigSchema,
	destination: destinationConfigSchema,
});

// ── Log rule params ─────────────────────────────────────────────
//
// Log rules capture raw analytics events (click, conversion, search)
// into a dedicated collection for later ML training / personalization.
//
// Typesense docs: https://typesense.org/docs/28.0/api/analytics-rule.html

const logEventSchema = z.object({
	type: z.string().min(1).max(64).describe("Event type, e.g. click, conversion"),
	name: z.string().min(1).max(128).describe("Unique event name used when tracking"),
});

const logSourceConfigSchema = z.object({
	collections: z.array(z.string().min(1)).min(1).describe("Collections to watch"),
	events: z.array(logEventSchema).min(1).describe("Events to log"),
});

const logDestinationConfigSchema = z.object({
	collection: z.string().min(1).describe("Destination collection for logged events"),
});

const logParamsSchema = z.object({
	source: logSourceConfigSchema,
	destination: logDestinationConfigSchema,
});

// Keep loose schema for aggregation rules
const aggregationParamsSchema = z.record(z.string(), z.unknown());

type CounterParams = z.infer<typeof counterParamsSchema>;
type LogParams = z.infer<typeof logParamsSchema>;

const analyticsRuleSchema = z.object({
	name: z.string().min(1).max(200),
	type: z.enum(["counter", "aggregation", "log"]),
	params: z.record(z.string(), z.unknown()),
});

export type AnalyticsRule = z.infer<typeof analyticsRuleSchema>;

const createRuleInputSchema = z.object({
	organizationId: z.string(),
	name: z.string().min(1).max(200),
	type: z.enum(["counter", "aggregation", "log"]),
	params: z.union([counterParamsSchema, aggregationParamsSchema, logParamsSchema]),
});

function parseRuleParams(rule: {
	name: string;
	type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params: any;
}): AnalyticsRule {
	return {
		name: rule.name,
		type: rule.type as "counter" | "aggregation" | "log",
		params: rule.params as Record<string, unknown>,
	};
}

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

		const rules = (result?.rules ?? []) as Array<{
			name: string;
			type: string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			params: any;
		}>;

		return rules.map(parseRuleParams);
	});

export const createAnalyticsRule = protectedProcedure
	.route({
		method: "POST",
		path: "/search/analytics/rules",
		tags: ["Search"],
		summary: "Create a custom analytics rule",
		description: "Creates a new analytics rule for tracking custom metrics in Typesense.",
	})
	.input(createRuleInputSchema)
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
			params: input.params as Record<string, unknown>,
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

// ── Helpers for UI ───────────────────────────────────────────────

/**
 * Parse counter rule params from a generic analytics rule.
 * Returns null if the rule is not a counter type or has unexpected shape.
 */
export function parseCounterRuleParams(params: Record<string, unknown>): CounterParams | null {
	const result = counterParamsSchema.safeParse(params);
	return result.success ? result.data : null;
}

/**
 * Parse log rule params from a generic analytics rule.
 * Returns null if the rule is not a log type or has unexpected shape.
 */
export function parseLogRuleParams(params: Record<string, unknown>): LogParams | null {
	const result = logParamsSchema.safeParse(params);
	return result.success ? result.data : null;
}

export { type CounterParams, type LogParams };
