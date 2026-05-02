import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin } from "../../search/lib/access";

const scheduleViewSchema = z.object({
	id: z.string(),
	indexId: z.string(),
	organizationId: z.string(),
	slug: z.string(),
	cronExpression: z.string(),
	enabled: z.boolean(),
	lastRunAt: z.string().nullable(),
	createdAt: z.string(),
});

export const listSchedules = protectedProcedure
	.route({
		method: "GET",
		path: "/indexing/reindex/schedules",
		tags: ["Indexing"],
		summary: "List reindex schedules",
		description: "Returns all reindex schedules for the organization.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(z.array(scheduleViewSchema))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { listReindexSchedules } = await import("@repo/database");
		return listReindexSchedules(input.organizationId);
	});

export const createSchedule = protectedProcedure
	.route({
		method: "POST",
		path: "/indexing/reindex/schedules",
		tags: ["Indexing"],
		summary: "Create reindex schedule",
		description: "Creates a scheduled reindex job with a cron expression.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
			cronExpression: z.string().min(1).max(256),
			enabled: z.boolean().optional().default(true),
		}),
	)
	.output(scheduleViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { createReindexSchedule } = await import("@repo/database");

		const schedule = await createReindexSchedule({
			indexId: input.indexId,
			organizationId: input.organizationId,
			cronExpression: input.cronExpression,
			enabled: input.enabled,
		});

		logger.info("Reindex schedule created", {
			scheduleId: schedule.id,
			indexId: input.indexId,
			cron: input.cronExpression,
		});

		return schedule;
	});

export const updateSchedule = protectedProcedure
	.route({
		method: "PUT",
		path: "/indexing/reindex/schedules/{scheduleId}",
		tags: ["Indexing"],
		summary: "Update reindex schedule",
		description: "Updates the cron expression and/or enabled status of a schedule.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			scheduleId: z.string(),
			cronExpression: z.string().min(1).max(256).optional(),
			enabled: z.boolean().optional(),
		}),
	)
	.output(scheduleViewSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const { updateReindexSchedule } = await import("@repo/database");

		const updated = await updateReindexSchedule(input.scheduleId, {
			cronExpression: input.cronExpression,
			enabled: input.enabled,
		});

		if (!updated) {
			throw new ORPCError("NOT_FOUND", { message: "Reindex schedule not found" });
		}

		return updated;
	});

export const deleteSchedule = protectedProcedure
	.route({
		method: "DELETE",
		path: "/indexing/reindex/schedules/{scheduleId}",
		tags: ["Indexing"],
		summary: "Delete reindex schedule",
		description: "Permanently removes a reindex schedule.",
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

		const { deleteReindexSchedule } = await import("@repo/database");

		const deleted = await deleteReindexSchedule(input.scheduleId);
		if (!deleted) {
			throw new ORPCError("NOT_FOUND", { message: "Reindex schedule not found" });
		}

		return { deleted: true };
	});
