/**
 * RBAC — Role-Based Access Control for organizations.
 *
 * Roles (hierarchical, owner > admin > member > viewer):
 *   owner  — full control, can delete workspace
 *   admin  — manage members, billing, integrations
 *   member — create and edit workflows
 *   viewer — read-only
 *
 * Each role maps to a set of Permissions.
 * Use `hasPermission(role, permission)` to check access.
 */

// ─── Role type ───────────────────────────────────────────────────────────────

/** All organization member roles. String union for maximum compatibility. */
export type OrganizationMemberRole = "owner" | "admin" | "member" | "viewer";

export const ORGANIZATION_ROLES = ["owner", "admin", "member", "viewer"] as const satisfies readonly OrganizationMemberRole[];

// ─── Permissions ──────────────────────────────────────────────────────────────

export const Permission = {
	/** Invite/remove members, change roles */
	MANAGE_MEMBERS: "manage_members",
	/** View and manage billing, subscriptions */
	MANAGE_BILLING: "manage_billing",
	/** View billing details */
	VIEW_BILLING: "view_billing",
	/** Create, edit, delete workflows (indexes, documents, config) */
	EDIT_WORKFLOWS: "edit_workflows",
	/** Execute/run workflows */
	RUN_WORKFLOWS: "run_workflows",
	/** View workflows, indexes, settings */
	VIEW_WORKFLOWS: "view_workflows",
	/** Manage integrations and API keys */
	MANAGE_INTEGRATIONS: "manage_integrations",
	/** Delete the workspace */
	DELETE_ORGANIZATION: "delete_organization",
	/** Manage AI/ML features */
	MANAGE_AI: "manage_ai",
	/** Manage analytics */
	MANAGE_ANALYTICS: "manage_analytics",
	/** View analytics */
	VIEW_ANALYTICS: "view_analytics",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ─── Role → Permissions mapping ──────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<OrganizationMemberRole, ReadonlySet<Permission>> = {
	owner: new Set([
		Permission.MANAGE_MEMBERS,
		Permission.MANAGE_BILLING,
		Permission.VIEW_BILLING,
		Permission.EDIT_WORKFLOWS,
		Permission.RUN_WORKFLOWS,
		Permission.VIEW_WORKFLOWS,
		Permission.MANAGE_INTEGRATIONS,
		Permission.DELETE_ORGANIZATION,
		Permission.MANAGE_AI,
		Permission.MANAGE_ANALYTICS,
		Permission.VIEW_ANALYTICS,
	]),
	admin: new Set([
		Permission.MANAGE_MEMBERS,
		Permission.MANAGE_BILLING,
		Permission.VIEW_BILLING,
		Permission.EDIT_WORKFLOWS,
		Permission.RUN_WORKFLOWS,
		Permission.VIEW_WORKFLOWS,
		Permission.MANAGE_INTEGRATIONS,
		Permission.MANAGE_AI,
		Permission.MANAGE_ANALYTICS,
		Permission.VIEW_ANALYTICS,
	]),
	member: new Set([
		Permission.VIEW_BILLING,
		Permission.EDIT_WORKFLOWS,
		Permission.RUN_WORKFLOWS,
		Permission.VIEW_WORKFLOWS,
		Permission.MANAGE_ANALYTICS,
		Permission.VIEW_ANALYTICS,
	]),
	viewer: new Set([
		Permission.VIEW_BILLING,
		Permission.VIEW_WORKFLOWS,
		Permission.VIEW_ANALYTICS,
	]),
} as const;

// ─── Hierarchy (for role-level checks) ───────────────────────────────────────

const ROLE_HIERARCHY: Record<OrganizationMemberRole, number> = {
	owner: 100,
	admin: 80,
	member: 50,
	viewer: 10,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(
	role: string | null | undefined,
	permission: Permission,
): boolean {
	if (!role) return false;
	const permissions = ROLE_PERMISSIONS[role as OrganizationMemberRole];
	if (!permissions) return false;
	return permissions.has(permission);
}

/**
 * Get all permissions granted to a role.
 */
export function getRolePermissions(role: string | null | undefined): Permission[] {
	if (!role) return [];
	const permissions = ROLE_PERMISSIONS[role as OrganizationMemberRole];
	if (!permissions) return [];
	return [...permissions];
}

/**
 * Check whether `role` meets or exceeds `minimumRole` in the hierarchy.
 * Example: hasMinRole("admin", "member") → true (admin >= member)
 */
export function hasMinRole(
	role: string | null | undefined,
	minimumRole: OrganizationMemberRole,
): boolean {
	if (!role) return false;
	const actualLevel = ROLE_HIERARCHY[role as OrganizationMemberRole];
	const requiredLevel = ROLE_HIERARCHY[minimumRole];
	if (actualLevel === undefined || requiredLevel === undefined) return false;
	return actualLevel >= requiredLevel;
}

/**
 * Normalize a raw role string to an OrganizationMemberRole.
 * Returns `null` for unknown/invalid roles.
 */
export function normalizeRole(role: string | null | undefined): OrganizationMemberRole | null {
	if (!role) return null;
	if (ROLE_HIERARCHY[role as OrganizationMemberRole] !== undefined) {
		return role as OrganizationMemberRole;
	}
	return null;
}

// ─── Error-throwing helpers (for server-side use) ────────────────────────────

/**
 * Require that `role` has a specific permission. Throws on failure.
 * @throws Error with code "FORBIDDEN"
 */
export function requirePermission(
	role: string | null | undefined,
	permission: Permission,
	message?: string,
): void {
	if (!hasPermission(role, permission)) {
		const err = new Error(message ?? `Missing required permission: ${permission}`);
		(err as Error & { code: string }).code = "FORBIDDEN";
		throw err;
	}
}

/**
 * Require that `role` meets a minimum level in the role hierarchy. Throws on failure.
 * @throws Error with code "FORBIDDEN"
 */
export function requireMinRole(
	role: string | null | undefined,
	minimumRole: OrganizationMemberRole,
	message?: string,
): void {
	if (!hasMinRole(role, minimumRole)) {
		const err = new Error(message ?? `Requires at least "${minimumRole}" role`);
		(err as Error & { code: string }).code = "FORBIDDEN";
		throw err;
	}
}
