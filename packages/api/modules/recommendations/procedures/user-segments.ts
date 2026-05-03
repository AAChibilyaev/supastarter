import { ORPCError } from "@orpc/client";
import { computeSegmentStats, PREDEFINED_SEGMENTS, db } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireOrganizationAccess } from "../lib/access";

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSegmentCriteriaSchema = z.object({
	minEvents: z.number().int().min(0).optional(),
	maxEvents: z.number().int().min(1).optional(),
	queryPatterns: z.array(z.string()).max(10).optional(),
	lastActiveDays: z.number().int().min(1).max(365).optional(),
});

export type UserSegmentCriteria = z.infer<typeof UserSegmentCriteriaSchema>;

const UserSegmentSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().min(1).max(128),
	description: z.string().max(512).default(""),
	type: z.enum(["custom"]),
	criteria: UserSegmentCriteriaSchema,
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type UserSegment = z.infer<typeof UserSegmentSchema>;

const USER_SEGMENTS_KEY = "userSegments";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseOrgMetadata(raw: string | null): Record<string, unknown> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return {};
	} catch {
		return {};
	}
}

function readSegments(rawMetadata: string | null): UserSegment[] {
	const metadata = parseOrgMetadata(rawMetadata);
	const stored = metadata[USER_SEGMENTS_KEY];
	if (!Array.isArray(stored)) return [];
	const parsed = z.array(UserSegmentSchema).safeParse(stored);
	if (!parsed.success) return [];
	return parsed.data;
}

type PredefinedSegment = (typeof PREDEFINED_SEGMENTS)[number] & {
	type: "predefined";
};

const PREDEFINED_WITH_TYPE: PredefinedSegment[] = PREDEFINED_SEGMENTS.map((s) => ({
	...s,
	type: "predefined" as const,
}));

// ─── List User Segments ────────────────────────────────────────────────────

export const listUserSegments = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/user-segments",
		tags: ["Recommendations"],
		summary: "List all user segments (predefined + custom)",
		description:
			"Returns all user segments for an organization, including predefined segments " +
			"(New Users, Returning, VIP) and any custom segments created by the admin.",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.output(
		z.object({
			predefined: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					description: z.string(),
					type: z.literal("predefined"),
					criteria: UserSegmentCriteriaSchema,
				}),
			),
			custom: z.array(UserSegmentSchema.extend({ type: z.literal("custom") })),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const custom = readSegments(org.metadata).map((s) => ({
			...s,
			type: "custom" as const,
		}));

		return {
			predefined: PREDEFINED_WITH_TYPE,
			custom,
		};
	});

// ─── Create User Segment ───────────────────────────────────────────────────

export const createUserSegment = protectedProcedure
	.route({
		method: "POST",
		path: "/recommendations/user-segments",
		tags: ["Recommendations"],
		summary: "Create a custom user segment",
	})
	.input(
		z.object({
			organizationId: z.string(),
			segment: z.object({
				name: z.string().min(1).max(128),
				description: z.string().max(512).default(""),
				criteria: UserSegmentCriteriaSchema,
			}),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			segment: UserSegmentSchema.extend({ type: z.literal("custom") }),
		}),
	)
	.handler(async ({ input: { organizationId, segment }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const segments = readSegments(org.metadata);
		const metadata = parseOrgMetadata(org.metadata);

		const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const now = new Date().toISOString();

		const newSegment: UserSegment = {
			id,
			name: segment.name,
			description: segment.description,
			type: "custom",
			criteria: segment.criteria,
			createdAt: now,
			updatedAt: now,
		};

		segments.push(newSegment);
		metadata[USER_SEGMENTS_KEY] = segments;

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(metadata) },
		});

		return { success: true, segment: { ...newSegment, type: "custom" as const } };
	});

// ─── Update User Segment ───────────────────────────────────────────────────

export const updateUserSegment = protectedProcedure
	.route({
		method: "PUT",
		path: "/recommendations/user-segments",
		tags: ["Recommendations"],
		summary: "Update a custom user segment",
	})
	.input(
		z.object({
			organizationId: z.string(),
			segmentId: z.string(),
			updates: z.object({
				name: z.string().min(1).max(128).optional(),
				description: z.string().max(512).optional(),
				criteria: UserSegmentSchema.shape.criteria.optional(),
			}),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			segment: UserSegmentSchema,
		}),
	)
	.handler(async ({ input: { organizationId, segmentId, updates }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const segments = readSegments(org.metadata);
		const idx = segments.findIndex((s) => s.id === segmentId);

		if (idx === -1) {
			throw new ORPCError("NOT_FOUND", { message: "Segment not found" });
		}

		const metadata = parseOrgMetadata(org.metadata);
		const updated = {
			...segments[idx],
			...(updates.name !== undefined ? { name: updates.name } : {}),
			...(updates.description !== undefined ? { description: updates.description } : {}),
			...(updates.criteria !== undefined ? { criteria: updates.criteria } : {}),
			updatedAt: new Date().toISOString(),
		};

		segments[idx] = updated;
		metadata[USER_SEGMENTS_KEY] = segments;

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(metadata) },
		});

		return { success: true, segment: updated };
	});

// ─── Delete User Segment ───────────────────────────────────────────────────

export const deleteUserSegment = protectedProcedure
	.route({
		method: "DELETE",
		path: "/recommendations/user-segments",
		tags: ["Recommendations"],
		summary: "Delete a custom user segment",
	})
	.input(
		z.object({
			organizationId: z.string(),
			segmentId: z.string(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
		}),
	)
	.handler(async ({ input: { organizationId, segmentId }, context: { user } }) => {
		await requireOrganizationAdmin(organizationId, user);

		const org = await db.organization.findUniqueOrThrow({
			where: { id: organizationId },
			select: { metadata: true },
		});

		const segments = readSegments(org.metadata);
		const metadata = parseOrgMetadata(org.metadata);
		const filtered = segments.filter((s) => s.id !== segmentId);

		if (filtered.length === segments.length) {
			throw new ORPCError("NOT_FOUND", { message: "Segment not found" });
		}

		metadata[USER_SEGMENTS_KEY] = filtered;

		await db.organization.update({
			where: { id: organizationId },
			data: { metadata: JSON.stringify(metadata) },
		});

		return { success: true };
	});

// ─── Segment Stats (computed on the fly) ───────────────────────────────────

export const getUserSegmentStats = protectedProcedure
	.route({
		method: "GET",
		path: "/recommendations/user-segment-stats",
		tags: ["Recommendations"],
		summary: "Get computed stats for all segments",
		description:
			"Returns computed stats (user count, average events, total events) for " +
			"all predefined and custom segments, based on actual SearchUsageEvent data.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			window: z.coerce.number().min(1).max(365).default(90),
		}),
	)
	.output(
		z.object({
			segments: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					userCount: z.number(),
					averageEvents: z.number(),
					totalEvents: z.number(),
				}),
			),
		}),
	)
	.handler(async ({ input: { organizationId, window }, context: { user } }) => {
		await requireOrganizationAccess(organizationId, user.id);

		try {
			const org = await db.organization.findUniqueOrThrow({
				where: { id: organizationId },
				select: { metadata: true },
			});

			const custom = readSegments(org.metadata);

			// Compute stats for ALL segments (predefined + custom) in parallel
			const allSegments: Array<{
				id: string;
				name: string;
				type: string;
				criteria: {
					minEvents?: number;
					maxEvents?: number;
					queryPatterns?: string[];
					lastActiveDays?: number;
				};
			}> = [
				...PREDEFINED_SEGMENTS.map((s) => ({ ...s, type: "predefined" })),
				...custom.map((s) => ({
					id: s.id,
					name: s.name,
					type: "custom",
					criteria: s.criteria,
				})),
			];

			const statsResults = await Promise.all(
				allSegments.map(async (seg) => {
					const stats = await computeSegmentStats(organizationId, seg.criteria, window);
					return {
						id: seg.id,
						name: seg.name,
						type: seg.type,
						...stats,
					};
				}),
			);

			return { segments: statsResults };
		} catch (err) {
			logger.error({ err, organizationId }, "Failed to compute user segment stats");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Segment stats unavailable",
			});
		}
	});
