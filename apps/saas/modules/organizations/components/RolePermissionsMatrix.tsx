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

// ─── Permissions data ──────────────────────────────────────────────────────

interface PermissionRow {
	actionKey: string;
	owner: boolean;
	admin: boolean;
	developer: boolean;
	analyst: boolean;
}

const permissionsData: PermissionRow[] = [
	{ actionKey: "createIndex", owner: true, admin: true, developer: false, analyst: false },
	{ actionKey: "deleteIndex", owner: true, admin: true, developer: false, analyst: false },
	{ actionKey: "manageSchema", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "createApiKey", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "importData", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "viewAnalytics", owner: true, admin: true, developer: true, analyst: true },
	{ actionKey: "manageSynonyms", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "manageCurations", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "manageWidget", owner: true, admin: true, developer: true, analyst: false },
	{ actionKey: "inviteMembers", owner: true, admin: true, developer: false, analyst: false },
	{ actionKey: "changePlan", owner: true, admin: false, developer: false, analyst: false },
	{ actionKey: "manageBilling", owner: true, admin: false, developer: false, analyst: false },
	{ actionKey: "deleteOrg", owner: true, admin: false, developer: false, analyst: false },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function RolePermissionsMatrix() {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);

	const roles = [
		{ key: "owner", label: t("organizations.settings.members.roles.owner") },
		{ key: "admin", label: t("organizations.settings.members.roles.admin") },
		{ key: "developer", label: t("organizations.settings.members.roles.developer") },
		{ key: "analyst", label: t("organizations.settings.members.roles.analyst") },
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
									{[row.owner, row.admin, row.developer, row.analyst].map(
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
