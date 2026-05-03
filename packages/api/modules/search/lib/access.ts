import { ORPCError } from "@orpc/client";
import { hasMinRole, normalizeRole, type OrganizationMemberRole } from "@repo/auth";
import {
	getOrganizationMembership,
	getSearchIndexByOwnerSlug,
	getSearchIndexBySlug,
} from "@repo/database";

const ADMIN_ROLES = new Set(["owner", "admin"]);
export const SEARCH_OWNER_TYPES = {
	organization: "organization",
	user: "user",
} as const;

export type SearchOwnerType = (typeof SEARCH_OWNER_TYPES)[keyof typeof SEARCH_OWNER_TYPES];

export interface SearchOwnerInput {
	ownerType: SearchOwnerType;
	ownerId: string;
}

export async function requireOrganizationMember(organizationId: string, userId: string) {
	const membership = await getOrganizationMembership(organizationId, userId);
	if (!membership) {
		throw new ORPCError("FORBIDDEN");
	}
	return membership;
}

export async function requireOrganizationAdmin(
	organizationId: string,
	user: { id: string; role?: string | null },
) {
	if (user.role === "admin") {
		const membership = await getOrganizationMembership(organizationId, user.id);
		return membership;
	}

	const membership = await getOrganizationMembership(organizationId, user.id);
	if (!membership || !ADMIN_ROLES.has(membership.role)) {
		throw new ORPCError("FORBIDDEN");
	}
	return membership;
}

/**
 * Require the user to have at least the specified role level in the organization.
 * Uses the centralized RBAC hierarchy from @repo/auth.
 */
export async function requireOrganizationMinRole(
	organizationId: string,
	user: { id: string; role?: string | null },
	minimumRole: OrganizationMemberRole,
) {
	if (user.role === "admin") {
		const membership = await getOrganizationMembership(organizationId, user.id);
		return membership;
	}

	const membership = await getOrganizationMembership(organizationId, user.id);
	if (!membership) {
		throw new ORPCError("FORBIDDEN");
	}

	const role = normalizeRole(membership.role);
	if (!role || !hasMinRole(role, minimumRole)) {
		throw new ORPCError("FORBIDDEN");
	}

	return membership;
}

export async function requireSearchIndex(organizationId: string, slug: string) {
	const index = await getSearchIndexBySlug(organizationId, slug);
	if (!index) {
		throw new ORPCError("NOT_FOUND");
	}
	return index;
}

export async function requireSearchIndexByOwner(input: SearchOwnerInput, slug: string) {
	if (input.ownerType !== SEARCH_OWNER_TYPES.organization) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Search indexes currently support organization owner only",
		});
	}

	const index = await getSearchIndexByOwnerSlug(
		{
			organizationId: input.ownerId,
		},
		slug,
	);
	if (!index) {
		throw new ORPCError("NOT_FOUND");
	}
	return index;
}

export async function requireSearchOwnerMember(
	input: SearchOwnerInput,
	user: { id: string; role?: string | null },
) {
	if (input.ownerType === SEARCH_OWNER_TYPES.user) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Search indexes currently support organization owner only",
		});
	}

	await requireOrganizationMember(input.ownerId, user.id);
}

export async function requireSearchOwnerAdmin(
	input: SearchOwnerInput,
	user: { id: string; role?: string | null },
) {
	if (input.ownerType === SEARCH_OWNER_TYPES.user) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Search indexes currently support organization owner only",
		});
	}

	await requireOrganizationAdmin(input.ownerId, user);
}
