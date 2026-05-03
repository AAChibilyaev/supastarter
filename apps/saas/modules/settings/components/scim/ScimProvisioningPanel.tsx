"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Plus,
	ShieldAlert,
	Trash2,
	UserMinus,
	UserPlus,
	UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface ProvisioningRule {
	id: string;
	organizationId: string;
	groupName: string;
	targetRole: string;
	deprovisionAction: string;
	enabled: boolean;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ScimProvisioningPanelProps {
	organizationId: string;
}

const ROLE_OPTIONS = [
	{ value: "member", label: "Member", color: "info" as const },
	{ value: "admin", label: "Admin", color: "warning" as const },
	{ value: "owner", label: "Owner", color: "error" as const },
] as const;

const DEPROVISION_OPTIONS = [
	{
		value: "suspend",
		label: "Suspend User",
		icon: UserMinus,
		description: "Disable user access, preserve data",
	},
	{
		value: "remove",
		label: "Remove from Org",
		icon: UserMinus,
		description: "Remove organization membership",
	},
	{
		value: "notify",
		label: "Notify Only",
		icon: AlertCircle,
		description: "Send alert, no automatic action",
	},
] as const;

const ACTION_STYLES: Record<string, { color: "info" | "success" | "error"; label: string }> = {
	suspend: { color: "info", label: "Suspend" },
	remove: { color: "error", label: "Remove" },
	notify: { color: "success", label: "Notify" },
};

function AddRuleDialog({
	open,
	onOpenChange,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (rule: {
		groupName: string;
		targetRole: string;
		deprovisionAction: string;
		enabled: boolean;
		description: string | null;
	}) => Promise<void>;
}) {
	const t = useTranslations();
	const [groupName, setGroupName] = useState("");
	const [targetRole, setTargetRole] = useState("member");
	const [deprovisionAction, setDeprovisionAction] = useState("suspend");
	const [description, setDescription] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const reset = () => {
		setGroupName("");
		setTargetRole("member");
		setDeprovisionAction("suspend");
		setDescription("");
	};

	const handleSave = async () => {
		if (!groupName.trim()) return;
		setIsSaving(true);
		try {
			await onSave({
				groupName: groupName.trim(),
				targetRole,
				deprovisionAction,
				enabled: true,
				description: description.trim() || null,
			});
			reset();
			onOpenChange(false);
		} catch {
			// Toast handled by parent
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("settings.scim.provisioning.addRule")}</DialogTitle>
					<DialogDescription>
						{t("settings.scim.provisioning.addRuleDescription")}
					</DialogDescription>
				</DialogHeader>
				<div className="gap-4 grid">
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("settings.scim.provisioning.groupName")}
						</label>
						<Input
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							placeholder='e.g. "Engineering", "Admins"'
						/>
					</div>
					<div className="gap-4 grid grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								{t("settings.scim.provisioning.targetRole")}
							</label>
							<Select value={targetRole} onValueChange={setTargetRole}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ROLE_OPTIONS.map((role) => (
										<SelectItem key={role.value} value={role.value}>
											{role.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">
								{t("settings.scim.provisioning.deprovisionAction")}
							</label>
							<Select value={deprovisionAction} onValueChange={setDeprovisionAction}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DEPROVISION_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="add-desc">
						Description
						<Textarea
							id="add-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description for this rule"
							rows={2}
							className="mt-1.5"
						/>
					</label>
				</div>
					<div className="p-3 text-sm rounded-lg bg-muted text-muted-foreground">
						<p className="font-medium mb-1">
							{t("settings.scim.provisioning.deprovisionNote")}
						</p>
						<p>{t("settings.scim.provisioning.deprovisionNoteDescription")}</p>
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.actions.cancel")}
					</Button>
					<Button
						variant="primary"
						onClick={handleSave}
						disabled={!groupName.trim() || isSaving}
					>
						{isSaving ? (
							<Loader2 className="size-4 mr-1.5 animate-spin" />
						) : (
							<Plus className="size-4 mr-1.5" />
						)}
						{t("common.actions.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function EditRuleDialog({
	rule,
	open,
	onOpenChange,
	onSave,
}: {
	rule: ProvisioningRule;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (updates: {
		targetRole?: string;
		deprovisionAction?: string;
		enabled?: boolean;
		description?: string | null;
	}) => Promise<void>;
}) {
	const t = useTranslations();
	const [targetRole, setTargetRole] = useState(rule.targetRole);
	const [deprovisionAction, setDeprovisionAction] = useState(rule.deprovisionAction);
	const [enabled, setEnabled] = useState(rule.enabled);
	const [description, setDescription] = useState(rule.description ?? "");
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onSave({
				targetRole,
				deprovisionAction,
				enabled,
				description: description.trim() || null,
			});
			onOpenChange(false);
		} catch {
			// Toast handled by parent
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{t("settings.scim.provisioning.editRule")}: {rule.groupName}
					</DialogTitle>
				</DialogHeader>
				<div className="gap-4 grid">
					<div className="p-3 font-mono text-sm rounded-lg bg-muted break-all">
						{rule.groupName}
					</div>
					<div className="gap-4 grid grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								{t("settings.scim.provisioning.targetRole")}
							</label>
							<Select value={targetRole} onValueChange={setTargetRole}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ROLE_OPTIONS.map((role) => (
										<SelectItem key={role.value} value={role.value}>
											{role.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">
								{t("settings.scim.provisioning.deprovisionAction")}
							</label>
							<Select value={deprovisionAction} onValueChange={setDeprovisionAction}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DEPROVISION_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="edit-desc">
						Description
						<Textarea
							id="edit-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description"
							rows={2}
							className="mt-1.5"
						/>
					</label>
				</div>
					<div className="gap-2 flex items-center">
						<label className="gap-2 flex cursor-pointer items-center">
							<input
								type="checkbox"
								checked={enabled}
								onChange={(e) => setEnabled(e.target.checked)}
								className="size-4 rounded border-border accent-primary"
							/>
							<span className="text-sm font-medium">Rule enabled</span>
						</label>
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("common.actions.cancel")}
					</Button>
					<Button variant="primary" onClick={handleSave} disabled={isSaving}>
						{isSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
						{t("common.actions.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ScimProvisioningPanel({ organizationId }: ScimProvisioningPanelProps) {
	const t = useTranslations();
	const [rules, setRules] = useState<ProvisioningRule[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingRule, setEditingRule] = useState<ProvisioningRule | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const fetchRules = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/scim/config/${organizationId}/provisioning-rules`, {
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to load provisioning rules");
			const data = await response.json();
			setRules(data.rules);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load rules");
		} finally {
			setIsLoading(false);
		}
	}, [organizationId]);

	useEffect(() => {
		void fetchRules();
	}, [fetchRules]);

	const handleAddRule = async (ruleData: {
		groupName: string;
		targetRole: string;
		deprovisionAction: string;
		enabled: boolean;
		description: string | null;
	}) => {
		try {
			const response = await fetch(`/api/scim/config/${organizationId}/provisioning-rules`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(ruleData),
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error ?? "Failed to create rule");
			}
			toastSuccess("Provisioning rule created");
			void fetchRules();
		} catch (err) {
			toastError(err instanceof Error ? err.message : "Failed to create rule");
			throw err;
		}
	};

	const handleEditRule = async (
		ruleId: string,
		updates: {
			targetRole?: string;
			deprovisionAction?: string;
			enabled?: boolean;
			description?: string | null;
		},
	) => {
		try {
			const response = await fetch(
				`/api/scim/config/${organizationId}/provisioning-rules/${ruleId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify(updates),
				},
			);
			if (!response.ok) throw new Error("Failed to update rule");
			toastSuccess("Provisioning rule updated");
			void fetchRules();
		} catch (err) {
			toastError(err instanceof Error ? err.message : "Failed to update rule");
			throw err;
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		try {
			const response = await fetch(
				`/api/scim/config/${organizationId}/provisioning-rules/${ruleId}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);
			if (!response.ok) throw new Error("Failed to delete rule");
			toastSuccess("Provisioning rule deleted");
			setDeleteConfirm(null);
			void fetchRules();
		} catch (err) {
			toastError(err instanceof Error ? err.message : "Failed to delete rule");
		}
	};

	const getRoleBadge = (role: string) => {
		const opt = ROLE_OPTIONS.find((r) => r.value === role);
		if (!opt) return <Badge>{role}</Badge>;
		return <Badge status={opt.color}>{opt.label}</Badge>;
	};

	const getDeprovisionBadge = (action: string) => {
		const style = ACTION_STYLES[action];
		if (!style) return <Badge>{action}</Badge>;
		return <Badge status={style.color}>{style.label}</Badge>;
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 flex items-center">
						<UsersRound className="size-5" />
						{t("settings.scim.provisioning.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 flex items-center justify-center">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 flex items-center">
						<UsersRound className="size-5" />
						{t("settings.scim.provisioning.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">{error}</p>
					<Button variant="outline" size="sm" className="mt-2" onClick={fetchRules}>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<CardTitle className="gap-2 flex items-center">
						<UsersRound className="size-5" />
						{t("settings.scim.provisioning.title")}
					</CardTitle>
					<Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
						<Plus className="size-3.5 mr-1.5" />
						{t("settings.scim.provisioning.addRule")}
					</Button>
				</CardHeader>
				<CardContent>
					{rules.length === 0 ? (
						<div className="py-8 flex flex-col items-center justify-center text-center">
							<ShieldAlert className="mb-3 size-10 text-muted-foreground/40" />
							<p className="mb-1 text-sm font-medium text-muted-foreground">
								{t("settings.scim.provisioning.noRules")}
							</p>
							<p className="mb-4 text-xs max-w-sm text-muted-foreground/60">
								{t("settings.scim.provisioning.noRulesDescription")}
							</p>
							<Button
								variant="primary"
								size="sm"
								onClick={() => setShowAddDialog(true)}
							>
								<Plus className="size-3.5 mr-1.5" />
								{t("settings.scim.provisioning.addRule")}
							</Button>
						</div>
					) : (
						<div className="rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>
											{t("settings.scim.provisioning.groupName")}
										</TableHead>
										<TableHead>
											{t("settings.scim.provisioning.targetRole")}
										</TableHead>
										<TableHead>
											{t("settings.scim.provisioning.deprovisionAction")}
										</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-20">
											{t("common.actions.title")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rules.map((rule) => (
										<TableRow
											key={rule.id}
											className={rule.enabled ? "" : "opacity-50"}
										>
											<TableCell>
												<div className="gap-1.5 flex items-center">
													<UsersRound className="size-3.5 text-muted-foreground" />
													<span className="font-mono text-sm">
														{rule.groupName}
													</span>
												</div>
												{rule.description && (
													<p className="text-xs mt-0.5 text-muted-foreground">
														{rule.description}
													</p>
												)}
											</TableCell>
											<TableCell>{getRoleBadge(rule.targetRole)}</TableCell>
											<TableCell>
												<div className="gap-1.5 flex items-center">
													{getDeprovisionBadge(rule.deprovisionAction)}
												</div>
											</TableCell>
											<TableCell>
												{rule.enabled ? (
													<CheckCircle2 className="size-4 text-success" />
												) : (
													<AlertCircle className="size-4 text-muted-foreground" />
												)}
											</TableCell>
											<TableCell>
												<div className="gap-1 flex">
													<Button
														variant="ghost"
														size="icon"
														className="size-7"
														onClick={() => setEditingRule(rule)}
														title={t("common.actions.edit")}
													>
														<UserPlus className="size-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="size-7 text-destructive hover:text-destructive"
														onClick={() => setDeleteConfirm(rule.id)}
														title={t("common.actions.delete")}
													>
														<Trash2 className="size-3.5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add Rule Dialog */}
			<AddRuleDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSave={handleAddRule}
			/>

			{/* Edit Rule Dialog */}
			{editingRule && (
				<EditRuleDialog
					rule={editingRule}
					open
					onOpenChange={(open) => {
						if (!open) setEditingRule(null);
					}}
					onSave={(updates) => handleEditRule(editingRule.id, updates)}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!deleteConfirm}
				onOpenChange={(open) => {
					if (!open) setDeleteConfirm(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("settings.scim.provisioning.deleteRule")}</DialogTitle>
						<DialogDescription>
							{t("settings.scim.provisioning.deleteRuleDescription")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
							{t("common.actions.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={() => deleteConfirm && handleDeleteRule(deleteConfirm)}
						>
							<Trash2 className="size-4 mr-1.5" />
							{t("common.actions.delete")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
