import { db } from "../client";
import type { Prisma } from "../generated/client";

export type RoadmapItemView = {
	id: string;
	key: string;
	title: string;
	description: string;
	status: "shipped" | "inProgress" | "planned";
	quarter: string;
	iconName: string;
	voteCount: number;
	sortOrder: number;
	changelogSlug: string | null;
};

function toView(item: Prisma.RoadmapItemGetPayload<{}>): RoadmapItemView {
	return {
		id: item.id,
		key: item.key,
		title: item.title,
		description: item.description,
		status: item.status as RoadmapItemView["status"],
		quarter: item.quarter,
		iconName: item.iconName,
		voteCount: item.voteCount,
		sortOrder: item.sortOrder,
		changelogSlug: item.changelogSlug,
	};
}

export async function listRoadmapItems(): Promise<RoadmapItemView[]> {
	if (!process.env.DATABASE_URL?.trim()) {
		return [];
	}
	const items = await db.roadmapItem.findMany({
		orderBy: { sortOrder: "asc" },
	});
	return items.map(toView);
}

export async function getRoadmapItemByKey(key: string): Promise<RoadmapItemView | null> {
	if (!process.env.DATABASE_URL?.trim()) {
		return null;
	}
	const item = await db.roadmapItem.findUnique({
		where: { key },
	});
	return item ? toView(item) : null;
}

export type CreateRoadmapItemInput = {
	key: string;
	title: string;
	description: string;
	status: "shipped" | "inProgress" | "planned";
	quarter: string;
	iconName: string;
	sortOrder: number;
	changelogSlug?: string | null;
};

export async function createRoadmapItem(input: CreateRoadmapItemInput): Promise<RoadmapItemView> {
	const item = await db.roadmapItem.create({
		data: {
			key: input.key,
			title: input.title,
			description: input.description,
			status: input.status,
			quarter: input.quarter,
			iconName: input.iconName,
			sortOrder: input.sortOrder,
			voteCount: 0,
			changelogSlug: input.changelogSlug ?? null,
		},
	});
	return toView(item);
}

export type UpdateRoadmapItemInput = Partial<CreateRoadmapItemInput>;

export async function updateRoadmapItem(id: string, input: UpdateRoadmapItemInput): Promise<RoadmapItemView | null> {
	const item = await db.roadmapItem.update({
		where: { id },
		data: {
			...(input.key !== undefined && { key: input.key }),
			...(input.title !== undefined && { title: input.title }),
			...(input.description !== undefined && { description: input.description }),
			...(input.status !== undefined && { status: input.status }),
			...(input.quarter !== undefined && { quarter: input.quarter }),
			...(input.iconName !== undefined && { iconName: input.iconName }),
			...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
			...(input.changelogSlug !== undefined && { changelogSlug: input.changelogSlug ?? null }),
		},
	});
	return toView(item);
}

export async function deleteRoadmapItem(id: string): Promise<void> {
	await db.roadmapItem.delete({ where: { id } });
}

export async function reorderRoadmapItems(ids: string[]): Promise<void> {
	await db.$transaction(
		ids.map((id, index) =>
			db.roadmapItem.update({
				where: { id },
				data: { sortOrder: index },
			}),
		),
	);
}
