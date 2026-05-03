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
