"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Permissions data — maps to Better Auth RBAC from packages/auth/lib/rbac.ts ──

interface PermissionRow {
	actionKey: string;
	owner: boolean;
	admin: boolean;
	member: boolean;
	viewer: boolean;
}

const permissionsData: PermissionRow[] = [
	// Workflow actions (EDIT_WORKFLOWS for owner/admin/member)
	{ actionKey: "createIndex", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "deleteIndex", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "manageSchema", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "importData", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "manageSynonyms", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "manageCurations", owner: true, admin: true, member: true, viewer: false },
	{ actionKey: "manageWidget", owner: true, admin: true, member: true, viewer: false },
	// Integration / API actions (MANAGE_INTEGRATIONS for owner/admin)
	{ actionKey: "createApiKey", owner: true, admin: true, member: false, viewer: false },
	// Member management (MANAGE_MEMBERS for owner/admin)
	{ actionKey: "inviteMembers", owner: true, admin: true, member: false, viewer: false },
	// Billing actions (MANAGE_BILLING for owner/admin)
	{ actionKey: "manageBilling", owner: true, admin: true, member: false, viewer: false },
	{ actionKey: "changePlan", owner: true, admin: false, member: false, viewer: false },
	// Organization-level (DELETE_ORGANIZATION for owner only)
	{ actionKey: "deleteOrg", owner: true, admin: false, member: false, viewer: false },
	// Viewing (VIEW_ANALYTICS for all)
	{ actionKey: "viewAnalytics", owner: true, admin: true, member: true, viewer: true },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function RolePermissionsMatrix() {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);

	const roles = [
		{ key: "owner", label: t("organizations.roles.owner") },
		{ key: "admin", label: t("organizations.roles.admin") },
		{ key: "member", label: t("organizations.roles.member") },
		{ key: "viewer", label: t("organizations.roles.viewer") },
	] as const;

	return (
		<div className="mt-6 rounded-lg border">
			<Button
				variant="ghost"
				className="px-4 py-3 font-medium h-auto w-full justify-between"
				onClick={() => setIsOpen(!isOpen)}
			>
				<span>{t("organizations.settings.members.permissions.matrixTitle")}</span>
				<span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
			</Button>

			{isOpen && (
				<div className="px-4 pb-4 overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-[160px]">
									{t("organizations.settings.members.permissions.action")}
								</TableHead>
								{roles.map((role) => (
									<TableHead key={role.key} className="min-w-[100px] text-center">
										{role.label}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{permissionsData.map((row) => (
								<TableRow key={row.actionKey}>
									<TableCell className="font-medium">
										{t(
											`organizations.settings.members.permissions.actions.${row.actionKey}`,
										)}
									</TableCell>
									{[row.owner, row.admin, row.member, row.viewer].map(
										(allowed, i) => (
											<TableCell key={i} className="text-center">
												{allowed ? (
													<Badge status="success">✓</Badge>
												) : (
													<span className="text-muted-foreground/40">
														—
													</span>
												)}
											</TableCell>
										),
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
