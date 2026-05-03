import {
	createRoadmapItem,
	deleteRoadmapItem,
	listRoadmapItems,
	reorderRoadmapItems,
	updateRoadmapItem,
} from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

const roadmapStatusSchema = z.enum(["shipped", "inProgress", "planned"]);

export const listRoadmapItemsProcedure = adminProcedure
	.route({
		method: "GET",
		path: "/admin/roadmap",
		tags: ["Administration"],
		summary: "List roadmap items",
	})
	.handler(async () => {
		const items = await listRoadmapItems();
		return { items };
	});

export const createRoadmapItemProcedure = adminProcedure
	.route({
		method: "POST",
		path: "/admin/roadmap",
		tags: ["Administration"],
		summary: "Create a roadmap item",
	})
	.input(
		z.object({
			key: z.string().min(1).max(100),
			title: z.string().min(1).max(200),
			description: z.string().min(1).max(500),
			status: roadmapStatusSchema,
			quarter: z.string().min(1).max(20),
			iconName: z.string().min(1).max(50),
			sortOrder: z.number().int().min(0).default(0),
			changelogSlug: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const item = await createRoadmapItem(input);
		return { item };
	});

export const updateRoadmapItemProcedure = adminProcedure
	.route({
		method: "PATCH",
		path: "/admin/roadmap/{id}",
		tags: ["Administration"],
		summary: "Update a roadmap item",
	})
	.input(
		z.object({
			id: z.string(),
			key: z.string().min(1).max(100).optional(),
			title: z.string().min(1).max(200).optional(),
			description: z.string().min(1).max(500).optional(),
			status: roadmapStatusSchema.optional(),
			quarter: z.string().min(1).max(20).optional(),
			iconName: z.string().min(1).max(50).optional(),
			sortOrder: z.number().int().min(0).optional(),
			changelogSlug: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const { id, ...data } = input;
		const item = await updateRoadmapItem(id, data);
		return { item };
	});

export const deleteRoadmapItemProcedure = adminProcedure
	.route({
		method: "DELETE",
		path: "/admin/roadmap/{id}",
		tags: ["Administration"],
		summary: "Delete a roadmap item",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		await deleteRoadmapItem(input.id);
		return { success: true };
	});

export const reorderRoadmapItemsProcedure = adminProcedure
	.route({
		method: "POST",
		path: "/admin/roadmap/reorder",
		tags: ["Administration"],
		summary: "Reorder roadmap items",
	})
	.input(
		z.object({
			ids: z.array(z.string()),
		}),
	)
	.handler(async ({ input }) => {
		await reorderRoadmapItems(input.ids);
		return { success: true };
	});
