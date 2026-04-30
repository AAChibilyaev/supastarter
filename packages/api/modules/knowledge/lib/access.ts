import { ORPCError } from "@orpc/client";
import { getOrganizationMembership } from "@repo/database";
import type { KnowledgeOwnerType } from "@repo/database/prisma/generated/client";

export interface KnowledgeOwnerInput {
	ownerType: KnowledgeOwnerType;
	ownerId: string;
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function requireKnowledgeOwnerMember(
	input: KnowledgeOwnerInput,
	user: { id: string; role?: string | null },
) {
	if (input.ownerType === "USER") {
		if (user.id !== input.ownerId) {
			throw new ORPCError("FORBIDDEN");
		}
		return;
	}

	const membership = await getOrganizationMembership(input.ownerId, user.id);
	if (!membership) {
		throw new ORPCError("FORBIDDEN");
	}
}

export async function requireKnowledgeOwnerAdmin(
	input: KnowledgeOwnerInput,
	user: { id: string; role?: string | null },
) {
	if (input.ownerType === "USER") {
		if (user.id !== input.ownerId) {
			throw new ORPCError("FORBIDDEN");
		}
		return;
	}

	const membership = await getOrganizationMembership(input.ownerId, user.id);
	if (!membership || (!ADMIN_ROLES.has(membership.role) && user.role !== "admin")) {
		throw new ORPCError("FORBIDDEN");
	}
}
