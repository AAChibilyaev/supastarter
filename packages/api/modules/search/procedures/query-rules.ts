import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// ─── Zod schemas ───────────────────────────────────────────────────────────

const ruleConditionOperator = z.enum([
	"contains",
	"not_contains",
	"starts_with",
	"ends_with",
	"exact",
	"is_empty",
	"is_not_empty",
	"regex",
	"greater_than",
	"less_than",
]);

const ruleActionType = z.enum([
	"pin",
	"hide",
	"boost",
	"bury",
	"add_filter",
	"redirect",
	"show_message",
]);

const ruleConditionSchema = z.object({
	field: z.enum(["query", "query_string", "attribute"]).default("query"),
	attribute: z.string().optional(),
	operator: ruleConditionOperator,
	value: z.string().optional(),
});

const ruleActionSchema = z.object({
	type: ruleActionType,
	documentId: z.string().optional(),
	position: z.number().int().positive().optional(),
	filterField: z.string().optional(),
	filterValue: z.string().optional(),
	url: z.string().optional(),
	message: z.string().optional(),
	boostFactor: z.number().min(0.1).max(10).optional(),
});

const queryRuleSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255),
	enabled: z.boolean().default(true),
	priority: z.number().int().min(1).max(9999).default(100),
	matchMode: z.enum(["and", "or"]).default("and"),
	applyOnMultipleMatch: z.boolean().default(false),
	conditions: z.array(ruleConditionSchema).min(1),
	actions: z.array(ruleActionSchema).min(1),
});

export type QueryRule = z.infer<typeof queryRuleSchema>;

// ─── Index metadata helpers ────────────────────────────────────────────────

interface IndexSchema {
	fields?: unknown[];
	queryRules?: QueryRule[];
	[key: string]: unknown;
}

function parseIndexSchema(raw: unknown): IndexSchema {
	if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
		return raw as IndexSchema;
	}
	return {};
}

// ─── Procedures ────────────────────────────────────────────────────────────

export const getQueryRules = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/query-rules",
		tags: ["Search"],
		summary: "Get query rules for a search index",
		description: "Returns the configured query rules stored in the index metadata.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(
		z.object({
			rules: z.array(queryRuleSchema),
		}),
	)
	.handler(async ({ input }) => {
		await requireSearchIndex(input.organizationId, input.slug);

		const index = await db.searchIndex.findUnique({
			where: {
				organizationId_slug: {
					organizationId: input.organizationId,
					slug: input.slug,
				},
			},
			select: { schema: true },
		});

		if (!index) {
			return { rules: [] };
		}

		const schema = parseIndexSchema(index.schema);
		return { rules: schema.queryRules ?? [] };
	});

export const updateQueryRules = protectedProcedure
	.route({
		method: "PUT",
		path: "/search/indexes/{slug}/query-rules",
		tags: ["Search"],
		summary: "Update query rules for a search index",
		description: "Stores query rules in index metadata for the given index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			rules: z.array(queryRuleSchema),
		}),
	)
	.output(
		z.object({
			success: z.literal(true),
			rules: z.array(queryRuleSchema),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const currentSchema = parseIndexSchema(index.schema);
		const updatedSchema: IndexSchema = {
			...currentSchema,
			queryRules: input.rules,
		};

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: updatedSchema as never },
		});

		logger.info(
			{
				organizationId: input.organizationId,
				slug: input.slug,
				ruleCount: input.rules.length,
			},
			"Query rules updated",
		);

		return { success: true as const, rules: input.rules };
	});
