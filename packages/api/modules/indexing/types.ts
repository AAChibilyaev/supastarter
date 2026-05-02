import { z } from "zod";

export const indexingSlugSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, digits, and dashes");

export const reindexJobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export const reindexJobViewSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	status: reindexJobStatusSchema,
	processed: z.number(),
	total: z.number(),
	startedAt: z.string(),
	finishedAt: z.string().nullable(),
});

export const reindexScheduleViewSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	cronExpression: z.string(),
	enabled: z.boolean(),
	lastRunAt: z.string().nullable(),
	createdAt: z.string(),
});

export const indexingHealthStatsSchema = z.object({
	activeJobs: z.number(),
	completedLastHour: z.number(),
	completedLastDay: z.number(),
	failedLastHour: z.number(),
	totalJobs: z.number(),
});
