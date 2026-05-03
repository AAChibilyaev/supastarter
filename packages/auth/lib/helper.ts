import type { ActiveOrganization } from "../auth";
import { hasMinRole, normalizeRole, Permission, requirePermission, type OrganizationMemberRole } from "./rbac";

/**
 * Get the requesting user's role within a specific organization.
 */
export function getOrganizationRole(
	organization?: ActiveOrganization | null,
	user?: { id: string } | null,
): OrganizationMemberRole | null {
	if (!organization || !user) return null;
	const member = organization.members.find((m) => m.userId === user.id);
	if (!member) return null;
	return normalizeRole(member.role);
}

/**
 * Check if the user is an admin or owner of the organization.
 */
export function isOrganizationAdmin(
	organization?: ActiveOrganization | null,
	user?: {
		id: string;
		role?: string | null;
	} | null,
) {
	// Platform-level admin bypasses org-level checks
	if (user?.role === "admin") return true;
	const orgRole = getOrganizationRole(organization, user);
	return orgRole !== null && hasMinRole(orgRole, "admin");
}

/**
 * Check if the user is the owner of the organization.
 */
export function isOrganizationOwner(
	organization?: ActiveOrganization | null,
	user?: { id: string } | null,
) {
	const orgRole = getOrganizationRole(organization, user);
	return orgRole === "owner";
}

/**
 * Check if the user is at most a viewer (no edit permissions).
 */
export function isOrganizationViewer(
	organization?: ActiveOrganization | null,
	user?: { id: string } | null,
) {
	const orgRole = getOrganizationRole(organization, user);
	return orgRole === "viewer";
}

/**
 * Check if the user has a specific permission within the organization.
 */
export function hasOrganizationPermission(
	organization: ActiveOrganization | null | undefined,
	user: { id?: string; role?: string | null } | null | undefined,
	permission: Permission,
): boolean {
	// Platform admin has all permissions
	if (user?.role === "admin") return true;
	const role = getOrganizationRole(organization, user as { id: string } | null);
	return role !== null && hasMinRole(role, getMinRoleForPermission(permission));
}

function getMinRoleForPermission(permission: Permission): OrganizationMemberRole {
	switch (permission) {
		case Permission.DELETE_ORGANIZATION:
			return "owner";
		case Permission.MANAGE_MEMBERS:
		case Permission.MANAGE_BILLING:
		case Permission.MANAGE_INTEGRATIONS:
		case Permission.MANAGE_AI:
			return "admin";
		case Permission.EDIT_WORKFLOWS:
		case Permission.RUN_WORKFLOWS:
		case Permission.MANAGE_ANALYTICS:
			return "member";
		case Permission.VIEW_WORKFLOWS:
		case Permission.VIEW_BILLING:
		case Permission.VIEW_ANALYTICS:
			return "viewer";
		default:
			return "admin";
	}
}
