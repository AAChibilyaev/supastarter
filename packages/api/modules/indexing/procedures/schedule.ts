import { ORPCError } from "@orpc/client";
import {
	createReindexSchedule,
	deleteReindexSchedule,
	getReindexSchedule,
	listReindexSchedules,
	updateReindexSchedule,
} from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	requireOrganizationAdmin,
	requireOrganizationMember,
	requireSearchIndex,
} from "../lib/access";
import { indexingSlugSchema, reindexScheduleViewSchema } from "../types";

export const listSchedules = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/schedules",
		tags: ["Indexing"],
		summary: "List reindex schedules for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(reindexScheduleViewSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);
		return listReindexSchedules(input.organizationId);
	});

export const createSchedule = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/schedules",
		tags: ["Indexing"],
		summary: "Create a scheduled reindex",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: indexingSlugSchema,
			cronExpression: z
				.string()
				.min(1)
				.max(100)
				.regex(/^(\S+\s){4}\S+$/, "Must be a valid cron expression (5 fields)"),
			enabled: z.boolean().optional().default(true),
		}),
	)
	.output(reindexScheduleViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);
		const index = await requireSearchIndex(input.organizationId, input.slug);

		const schedule = await createReindexSchedule({
			indexId: index.id,
			organizationId: input.organizationId,
			cronExpression: input.cronExpression,
			enabled: input.enabled,
		});

		logger.info("Reindex schedule created", {
			scheduleId: schedule.id,
			slug: input.slug,
			cronExpression: input.cronExpression,
		});

		return schedule;
	});

export const updateSchedule = protectedProcedure
	.route({
		method: "PATCH",
		path: "/indexing/schedules/{scheduleId}",
		tags: ["Indexing"],
		summary: "Update a reindex schedule",
	})
	.input(
		z.object({
			organizationId: z.string(),
			scheduleId: z.string(),
			cronExpression: z
				.string()
				.min(1)
				.max(100)
				.regex(/^(\S+\s){4}\S+$/, "Must be a valid cron expression (5 fields)")
				.optional(),
			enabled: z.boolean().optional(),
		}),
	)
	.output(reindexScheduleViewSchema.nullable())
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const existing = await getReindexSchedule(input.scheduleId);
		if (!existing) {
			throw new ORPCError("NOT_FOUND", {
				message: "Reindex schedule not found",
			});
		}

		const schedule = await updateReindexSchedule(input.scheduleId, {
			cronExpression: input.cronExpression,
			enabled: input.enabled,
		});

		return schedule;
	});

export const deleteSchedule = protectedProcedure
	.route({
		method: "DELETE",
		path: "/indexing/schedules/{scheduleId}",
		tags: ["Indexing"],
		summary: "Delete a reindex schedule",
	})
	.input(
		z.object({
			organizationId: z.string(),
			scheduleId: z.string(),
		}),
	)
	.output(
		z.object({
			deleted: z.boolean(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const existing = await getReindexSchedule(input.scheduleId);
		if (!existing) {
			throw new ORPCError("NOT_FOUND", {
				message: "Reindex schedule not found",
			});
		}

		const deleted = await deleteReindexSchedule(input.scheduleId);

		logger.info("Reindex schedule deleted", {
			scheduleId: input.scheduleId,
		});

		return { deleted };
	});
