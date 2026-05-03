import { db } from "../client";
import type { Prisma } from "../generated/client";

export async function listFeatureFlags() {
	return await db.featureFlag.findMany({
		orderBy: { key: "asc" },
		include: {
			_count: {
				select: { overrides: true },
			},
		},
	});
}

export async function getFeatureFlag(id: string) {
	return await db.featureFlag.findUnique({
		where: { id },
		include: {
			overrides: {
				include: {
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			},
		},
	});
}

export async function createFeatureFlag(data: {
	key: string;
	title: string;
	description?: string | null;
	type?: string;
	enabled?: boolean;
	rolloutPercentage?: number | null;
	killSwitch?: boolean;
	createdBy?: string | null;
}) {
	return await db.featureFlag.create({ data });
}

export async function updateFeatureFlag(id: string, data: Prisma.FeatureFlagUpdateInput) {
	return await db.featureFlag.update({ where: { id }, data });
}

export async function deleteFeatureFlag(id: string) {
	return await db.featureFlag.delete({ where: { id } });
}

export async function setFeatureFlagOverride(
	flagId: string,
	organizationId: string,
	enabled: boolean,
	reason?: string,
) {
	return await db.featureFlagOverride.upsert({
		where: {
			flagId_organizationId: { flagId, organizationId },
		},
		create: {
			flagId,
			organizationId,
			enabled,
			reason,
		},
		update: {
			enabled,
			reason,
		},
	});
}

export async function removeFeatureFlagOverride(flagId: string, organizationId: string) {
	return await db.featureFlagOverride.delete({
		where: {
			flagId_organizationId: { flagId, organizationId },
		},
	});
}

export async function listFeatureFlagOverrides(flagId: string) {
	return await db.featureFlagOverride.findMany({
		where: { flagId },
		include: {
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
		},
	});
}

export async function listOrganizationsForFlags(query?: string) {
	return await db.organization.findMany({
		where: query
			? {
					OR: [
						{ name: { contains: query, mode: "insensitive" } },
						{ slug: { contains: query, mode: "insensitive" } },
					],
				}
			: undefined,
		select: {
			id: true,
			name: true,
			slug: true,
		},
		orderBy: { name: "asc" },
		take: 50,
	});
}
