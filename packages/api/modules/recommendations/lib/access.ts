import { ORPCError } from "@orpc/client";
import { getOrganizationMembership } from "@repo/database";

export async function requireOrganizationAccess(organizationId: string, userId: string) {
	const membership = await getOrganizationMembership(organizationId, userId);
	if (!membership) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not a member of this organization",
		});
	}
	return membership;
}

export async function requireOrganizationAdmin(organizationId: string, user: { id: string }) {
	const membership = await requireOrganizationAccess(organizationId, user.id);
	if (membership.role !== "owner" && membership.role !== "admin") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only organization admins can modify personalization settings",
		});
	}
	return membership;
}
