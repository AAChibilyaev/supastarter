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
	const items = await db.roadmapItem.findMany({
		orderBy: { sortOrder: "asc" },
	});
	return items.map(toView);
}

export async function getRoadmapItemByKey(key: string): Promise<RoadmapItemView | null> {
	const item = await db.roadmapItem.findUnique({
		where: { key },
	});
	return item ? toView(item) : null;
}
