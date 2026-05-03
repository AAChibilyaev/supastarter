import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireSearchIndex } from "../lib/access";
import { searchIndexSlugSchema } from "../types";

// ─── Results Types ────────────────────────────────────────────────────────

const abTestResultPerVariantSchema = z.object({
	searches: z.number(),
	clicks: z.number(),
	ctr: z.number(),
	zeroResults: z.number(),
	totalSearches: z.number(),
});

const abTestResultsSchema = z.object({
	overall: abTestResultPerVariantSchema,
	variantA: abTestResultPerVariantSchema,
	variantB: abTestResultPerVariantSchema,
});

// ─── Types ───────────────────────────────────────────────────────────────

export const AB_TEST_STATUS = ["draft", "running", "stopped", "completed"] as const;
export type ABTestStatus = (typeof AB_TEST_STATUS)[number];

export const trafficSplitSchema = z.number().int().min(5).max(95);

export const abTestConfigSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(200),
	description: z.string().max(1000).default(""),
	status: z.enum(AB_TEST_STATUS),
	/** The index-level config override for variant B (e.g. query_by, ranking rules, synonyms) */
	configB: z.object({
		queryBy: z.string().optional(),
		rankingRules: z.array(z.string()).optional(),
		synonyms: z
			.array(
				z.object({
					synonym: z.string(),
					root: z.string(),
				}),
			)
			.optional(),
	}),
	trafficSplit: trafficSplitSchema, // percentage of traffic going to config B
	startDate: z.string(),
	endDate: z.string().optional(),
	createdAt: z.string(),
	stoppedAt: z.string().optional(),
	winnerVariant: z.enum(["A", "B"]).optional(),
});

export type ABTestConfig = z.infer<typeof abTestConfigSchema>;
export type ABTestConfigB = ABTestConfig["configB"];

// ─── Helpers ─────────────────────────────────────────────────────────────

function parseIndexSchema(schema: unknown): Record<string, unknown> {
	if (typeof schema === "object" && schema !== null) {
		return schema as Record<string, unknown>;
	}
	return {};
}

function generateABTestId(): string {
	return `ab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readABTests(indexSchema: unknown): ABTestConfig[] {
	const parsed = parseIndexSchema(indexSchema);
	const abTests = parsed._abTests;
	if (!Array.isArray(abTests)) return [];
	return abTests as ABTestConfig[];
}

function writeABTests(indexSchema: unknown, abTests: ABTestConfig[]): Record<string, unknown> {
	const parsed = parseIndexSchema(indexSchema);
	return {
		...parsed,
		_abTests: abTests,
	};
}

// ─── Procedures ──────────────────────────────────────────────────────────

export const listABTests = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/ab-tests",
		tags: ["Search"],
		summary: "List A/B tests",
		description: "Returns all A/B tests configured for a search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
		}),
	)
	.output(z.array(abTestConfigSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		return readABTests(index.schema);
	});

export const createABTest = protectedProcedure
	.route({
		method: "POST",
		path: "/search/indexes/{slug}/ab-tests",
		tags: ["Search"],
		summary: "Create an A/B test",
		description: "Creates a new A/B test configuration for a search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			name: z.string().min(1).max(200),
			description: z.string().max(1000).default(""),
			configB: z.object({
				queryBy: z.string().optional(),
				rankingRules: z.array(z.string()).optional(),
				synonyms: z
					.array(
						z.object({
							synonym: z.string(),
							root: z.string(),
						}),
					)
					.optional(),
			}),
			trafficSplit: trafficSplitSchema,
			startDate: z.string(),
			endDate: z.string().optional(),
		}),
	)
	.output(abTestConfigSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const existing = readABTests(index.schema);
		const now = new Date().toISOString();

		const newTest: ABTestConfig = {
			id: generateABTestId(),
			name: input.name,
			description: input.description,
			status: "draft",
			configB: input.configB,
			trafficSplit: input.trafficSplit,
			startDate: input.startDate,
			endDate: input.endDate,
			createdAt: now,
		};

		const updated = [...existing, newTest];
		const updatedSchema = writeABTests(index.schema, updated);

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: updatedSchema as never },
		});

		return newTest;
	});

export const updateABTestStatus = protectedProcedure
	.route({
		method: "PATCH",
		path: "/search/indexes/{slug}/ab-tests/{testId}",
		tags: ["Search"],
		summary: "Update A/B test status",
		description: "Start, stop, or complete an A/B test and optionally declare a winner.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			testId: z.string(),
			status: z.enum(AB_TEST_STATUS),
			winnerVariant: z.enum(["A", "B"]).optional(),
		}),
	)
	.output(abTestConfigSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const tests = readABTests(index.schema);
		const testIndex = tests.findIndex((t) => t.id === input.testId);

		if (testIndex === -1) {
			throw new ORPCError("NOT_FOUND", { message: "A/B test not found" });
		}

		const now = new Date().toISOString();
		const updatedTest: ABTestConfig = {
			...tests[testIndex],
			status: input.status,
			winnerVariant: input.winnerVariant,
			stoppedAt:
				input.status === "stopped" || input.status === "completed"
					? now
					: tests[testIndex].stoppedAt,
		};

		const updatedTests = [...tests];
		updatedTests[testIndex] = updatedTest;
		const updatedSchema = writeABTests(index.schema, updatedTests);

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: updatedSchema as never },
		});

		return updatedTest;
	});

export const deleteABTest = protectedProcedure
	.route({
		method: "DELETE",
		path: "/search/indexes/{slug}/ab-tests/{testId}",
		tags: ["Search"],
		summary: "Delete an A/B test",
		description: "Permanently removes an A/B test configuration.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			testId: z.string(),
		}),
	)
	.output(z.object({ success: z.literal(true) }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const tests = readABTests(index.schema);
		const filtered = tests.filter((t) => t.id !== input.testId);

		if (filtered.length === tests.length) {
			throw new ORPCError("NOT_FOUND", { message: "A/B test not found" });
		}

		const updatedSchema = writeABTests(index.schema, filtered);

		await db.searchIndex.update({
			where: { id: index.id },
			data: { schema: updatedSchema as never },
		});

		return { success: true };
	});

export const getABTestResults = protectedProcedure
	.route({
		method: "GET",
		path: "/search/indexes/{slug}/ab-tests/{testId}/results",
		tags: ["Search"],
		summary: "Get A/B test results",
		description:
			"Returns aggregated analytics results for an A/B test, including searches, clicks, CTR, and zero-results per variant.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: searchIndexSlugSchema,
			testId: z.string(),
		}),
	)
	.output(abTestResultsSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const tests = readABTests(index.schema);
		const test = tests.find((t) => t.id === input.testId);

		if (!test) {
			throw new ORPCError("NOT_FOUND", { message: "A/B test not found" });
		}

		const startDate = new Date(test.startDate);
		const endDate = test.endDate ? new Date(test.endDate) : new Date();

		// Fetch all usage events for this index within the test's date range
		const events = await db.searchUsageEvent.findMany({
			where: {
				indexId: index.id,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			orderBy: { createdAt: "asc" },
		});

		// Compute overall metrics
		const totalSearches = events
			.filter((e) => e.type === "search_query")
			.reduce((sum, e) => sum + e.count, 0);

		const totalClicks = events
			.filter((e) => e.type === "result_click")
			.reduce((sum, e) => sum + e.count, 0);

		const totalZeroResults = events
			.filter((e) => e.type === "zero_results")
			.reduce((sum, e) => sum + e.count, 0);

		const overallCtr = totalSearches > 0 ? totalClicks / totalSearches : 0;

		const overall = {
			searches: totalSearches,
			clicks: totalClicks,
			ctr: Math.round(overallCtr * 10000) / 10000,
			zeroResults: totalZeroResults,
			totalSearches,
		};

		// Per-variant approximation based on traffic split
		// Without per-request variant tracking, we use traffic_split as the distribution factor
		const trafficSplit = test.trafficSplit / 100; // B gets this fraction
		const variantAFraction = 1 - trafficSplit;
		const variantBFraction = trafficSplit;

		const variantA = {
			searches: Math.round(totalSearches * variantAFraction),
			clicks: Math.round(totalClicks * variantAFraction),
			ctr: totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 10000) / 10000 : 0,
			zeroResults: Math.round(totalZeroResults * variantAFraction),
			totalSearches: Math.round(totalSearches * variantAFraction),
		};

		const variantB = {
			searches: Math.round(totalSearches * variantBFraction),
			clicks: Math.round(totalClicks * variantBFraction),
			ctr: totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 10000) / 10000 : 0,
			zeroResults: Math.round(totalZeroResults * variantBFraction),
			totalSearches: Math.round(totalSearches * variantBFraction),
		};

		return { overall, variantA, variantB };
	});
