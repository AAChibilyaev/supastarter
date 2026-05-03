export * from "./auth";

// Re-export RBAC helpers, but not OrganizationMemberRole (exported by auth.ts)
export {
	ORGANIZATION_ROLES,
	Permission,
	hasPermission,
	getRolePermissions,
	hasMinRole,
	normalizeRole,
	requirePermission,
	requireMinRole,
} from "./lib/rbac";

export type { Permission as PermissionType } from "./lib/rbac";
