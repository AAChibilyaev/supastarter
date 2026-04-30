import { ORPCError } from "@orpc/client";
import { getOrganizationMembership, getSearchIndexBySlug } from "@repo/database";

const ADMIN_ROLES = new Set(["owner", "admin"]);

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

export async function requireSearchIndex(organizationId: string, slug: string) {
	const index = await getSearchIndexBySlug(organizationId, slug);
	if (!index) {
		throw new ORPCError("NOT_FOUND");
	}
	return index;
}
