"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Audit Log Action Labels ─────────────────────────────────────

const AUDIT_ACTION_LABELS: Record<string, string> = {
	created: "Created",
	updated: "Updated",
	deleted: "Deleted",
	override_set: "Override Set",
	override_removed: "Override Removed",
};

const AUDIT_ACTION_COLORS: Record<string, string> = {
	created: "default",
	updated: "secondary",
	deleted: "destructive",
	override_set: "secondary",
	override_removed: "destructive",
} as const;

function formatAuditValue(action: string, field: string | null, value: string | null): string {
	if (value === null) return "—";
	if (action === "deleted") return "Flag removed";
	if (field === "enabled" || field === "killSwitch") return value === "true" ? "On" : "Off";
	if (field === "rolloutPercentage") return `${value}%`;
	return value;
}

// ─── Audit Log Dialog ────────────────────────────────────────────

function AuditLogDialog({ flagId, flagKey }: { flagId: string; flagKey: string }) {
	const t = useTranslations("admin.featureFlags");
	const [open, setOpen] = useState(false);

	const { data, isLoading } = useQuery({
		...orpc.admin.featureFlags.auditLogs.list.queryOptions({
			flagId,
			limit: 50,
			offset: 0,
		}),
		enabled: open,
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					{t("auditLogButton")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("auditLogTitle")}: {flagKey}
					</DialogTitle>
					<DialogDescription>{t("auditLogDescription")}</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="py-8 text-sm text-center text-foreground/60">
						{t("loading")}
					</div>
				) : !data || data.entries.length === 0 ? (
					<div className="py-8 text-sm text-center text-foreground/60">
						{t("auditLogEmpty")}
					</div>
				) : (
					<div className="gap-2 flex flex-col">
						{data.entries.map((entry) => (
							<div
								key={entry.id}
								className="p-3 gap-1.5 text-sm flex flex-col rounded-lg border"
							>
								<div className="gap-2 flex items-center">
									<Badge
										variant={
											(AUDIT_ACTION_COLORS[entry.action] as
												| "default"
												| "secondary"
												| "destructive") ?? "outline"
										}
									>
										{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
									</Badge>
									<span className="text-xs text-foreground/60">
										{new Date(entry.createdAt).toLocaleString()}
									</span>
									{entry.organizationId && (
										<span className="text-xs font-mono ml-auto text-foreground/40">
											org: {entry.organizationId.slice(0, 8)}…
										</span>
									)}
								</div>

								{entry.field && (
									<div className="text-xs text-foreground/70">
										<span className="font-medium">{entry.field}:</span>{" "}
										{formatAuditValue(
											entry.action,
											entry.field,
											entry.oldValue,
										)}
										{entry.newValue !== null && (
											<>
												{" → "}
												{formatAuditValue(
													entry.action,
													entry.field,
													entry.newValue,
												)}
											</>
										)}
									</div>
								)}

								{entry.performedById && (
									<div className="text-xs text-foreground/40">
										by{" "}
										<span className="font-mono">
											{entry.performedById.slice(0, 8)}…
										</span>
									</div>
								)}
							</div>
						))}

						{data.total > 50 && (
							<p className="pt-2 text-xs text-center text-foreground/40">
								{t("auditLogMore", { count: data.total - 50 })}
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ─── Main Feature Flags View ─────────────────────────────────────

export function FeatureFlagsView() {
	const t = useTranslations("admin.featureFlags");
	const queryClient = useQueryClient();

	const { data: flags, isLoading } = useQuery(orpc.admin.featureFlags.list.queryOptions());

	const { data: globalKillSwitch } = useQuery(
		orpc.admin.featureFlags.globalKillSwitch.queryOptions(),
	);

	const deleteMutation = useMutation(orpc.admin.featureFlags.delete.mutationOptions());

	const handleDelete = async (id: string) => {
		try {
			await deleteMutation.mutateAsync({ id });
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.featureFlags.list.queryKey(),
			});
			toastSuccess(t("deleteSuccess"));
		} catch {
			toastError(t("deleteError"));
		}
	};

	if (isLoading) {
		return (
			<div className="py-12 flex items-center justify-center text-foreground/60">
				{t("loading")}
			</div>
		);
	}

	return (
		<div className="gap-6 flex flex-col">
			{globalKillSwitch?.active && (
				<div className="p-3 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive text-sm">
					<span className="font-medium">{t("globalKillSwitchTitle")}</span>
					<span className="text-destructive/80">{t("globalKillSwitchDescription")}</span>
				</div>
			)}

			<div className="flex items-center justify-between">
				<p className="text-sm text-foreground/60">{t("subtitle")}</p>
				<CreateFlagDialog />
			</div>

			{!flags || flags.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center text-foreground/60">
						{t("noFlags")}
					</CardContent>
				</Card>
			) : (
				<div className="gap-4 flex flex-col">
					{flags.map((flag) => (
						<FlagCard key={flag.id} flag={flag} onDelete={handleDelete} />
					))}
				</div>
			)}
		</div>
	);
}

// ─── Flag Card ───────────────────────────────────────────────────

function FlagCard({
	flag,
	onDelete,
}: {
	flag: {
		id: string;
		key: string;
		title: string;
		description: string | null;
		type: string;
		enabled: boolean;
		rolloutPercentage: number | null;
		killSwitch: boolean;
		_count: { overrides: number };
	};
	onDelete: (id: string) => void;
}) {
	const t = useTranslations("admin.featureFlags");
	const queryClient = useQueryClient();

	const updateMutation = useMutation(orpc.admin.featureFlags.update.mutationOptions());

	const handleToggleEnabled = async (enabled: boolean) => {
		try {
			await updateMutation.mutateAsync({ id: flag.id, enabled });
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.featureFlags.list.queryKey(),
			});
			toastSuccess(t("updateSuccess"));
		} catch {
			toastError(t("updateError"));
		}
	};

	const handleToggleKillSwitch = async (killSwitch: boolean) => {
		try {
			await updateMutation.mutateAsync({ id: flag.id, killSwitch });
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.featureFlags.list.queryKey(),
			});
			toastSuccess(killSwitch ? t("killSwitchEnabled") : t("killSwitchDisabled"));
		} catch {
			toastError(t("updateError"));
		}
	};

	const isKilled = flag.killSwitch;

	return (
		<Card className={isKilled ? "border-destructive/50" : ""}>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="gap-1 flex flex-col">
						<div className="gap-2 flex items-center">
							<CardTitle className="font-mono text-sm">{flag.key}</CardTitle>
							<Badge variant={flag.type === "variant" ? "secondary" : "outline"}>
								{flag.type}
							</Badge>
							{isKilled && (
								<Badge variant="destructive">{t("killSwitchBadge")}</Badge>
							)}
						</div>
						<CardDescription>{flag.description ?? t("noDescription")}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="gap-4 flex flex-col">
					<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
						<div className="p-3 flex items-center justify-between rounded-md border">
							<div className="gap-0.5 flex flex-col">
								<span className="text-sm font-medium">{t("enabledLabel")}</span>
								<span className="text-xs text-foreground/60">
									{flag.enabled ? t("enabled") : t("disabled")}
								</span>
							</div>
							<Switch
								checked={flag.enabled}
								onCheckedChange={handleToggleEnabled}
								disabled={isKilled}
							/>
						</div>

						<div className="p-3 flex items-center justify-between rounded-md border">
							<div className="gap-0.5 flex flex-col">
								<span className="text-sm font-medium">{t("rolloutLabel")}</span>
								<span className="text-xs text-foreground/60">
									{flag.rolloutPercentage !== null
										? `${flag.rolloutPercentage}%`
										: t("notSet")}
								</span>
							</div>
						</div>
					</div>

					<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
						<div className="p-3 flex items-center justify-between rounded-md border">
							<div className="gap-0.5 flex flex-col">
								<span className="text-sm font-medium">{t("overridesLabel")}</span>
								<span className="text-xs text-foreground/60">
									{flag._count.overrides > 0
										? t("overrideCount", { count: flag._count.overrides })
										: t("noOverrides")}
								</span>
							</div>
						</div>

						<div className="p-3 flex items-center justify-between rounded-md border">
							<div className="gap-0.5 flex flex-col">
								<span className="text-sm font-medium">{t("killSwitchLabel")}</span>
								<span className="text-xs text-foreground/60">
									{isKilled ? t("active") : t("inactive")}
								</span>
							</div>
							<Switch
								checked={flag.killSwitch}
								onCheckedChange={handleToggleKillSwitch}
							/>
						</div>
					</div>

					<div className="flex justify-between">
						<AuditLogDialog flagId={flag.id} flagKey={flag.key} />
						<Button
							variant="destructive"
							size="sm"
							onClick={() => onDelete(flag.id)}
							disabled={deleteMutation.isPending}
						>
							{t("deleteButton")}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Create Flag Dialog ──────────────────────────────────────────

function CreateFlagDialog() {
	const t = useTranslations("admin.featureFlags");
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [key, setKey] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(false);
	const [rolloutPercentage, setRolloutPercentage] = useState("");

	const createMutation = useMutation(orpc.admin.featureFlags.create.mutationOptions());

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!key || !title) return;

		try {
			await createMutation.mutateAsync({
				key,
				title,
				description: description || undefined,
				enabled,
				rolloutPercentage: rolloutPercentage ? Number(rolloutPercentage) : undefined,
			});
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.featureFlags.list.queryKey(),
			});
			toastSuccess(t("createSuccess"));
			setOpen(false);
			resetForm();
		} catch {
			toastError(t("createError"));
		}
	};

	const resetForm = () => {
		setKey("");
		setTitle("");
		setDescription("");
		setEnabled(false);
		setRolloutPercentage("");
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>{t("createFlag")}</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{t("createDialogTitle")}</DialogTitle>
						<DialogDescription>{t("createDialogDescription")}</DialogDescription>
					</DialogHeader>

					<div className="gap-4 py-4 grid">
						<div className="gap-2 grid">
							<Label htmlFor="flag-key">
								{t("keyLabel")}
								<span className="text-destructive">*</span>
							</Label>
							<Input
								id="flag-key"
								placeholder="e.g. analytics-v2"
								value={key}
								onChange={(e) => setKey(e.target.value)}
								required
							/>
							<p className="text-xs text-foreground/60">{t("keyHint")}</p>
						</div>

						<div className="gap-2 grid">
							<Label htmlFor="flag-title">
								{t("titleLabel")}
								<span className="text-destructive">*</span>
							</Label>
							<Input
								id="flag-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</div>

						<div className="gap-2 grid">
							<Label htmlFor="flag-desc">{t("descriptionLabel")}</Label>
							<Textarea
								id="flag-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>

						<div className="gap-2 grid">
							<Label htmlFor="flag-rollout">{t("rolloutLabel")}</Label>
							<Input
								id="flag-rollout"
								type="number"
								min={0}
								max={100}
								placeholder="0-100"
								value={rolloutPercentage}
								onChange={(e) => setRolloutPercentage(e.target.value)}
							/>
						</div>

						<div className="p-3 flex items-center justify-between rounded-md border">
							<div className="gap-0.5 flex flex-col">
								<span className="text-sm font-medium">{t("enabledLabel")}</span>
								<span className="text-xs text-foreground/60">
									{t("enableHint")}
								</span>
							</div>
							<Switch checked={enabled} onCheckedChange={setEnabled} />
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setOpen(false);
								resetForm();
							}}
						>
							{t("cancel")}
						</Button>
						<Button type="submit" disabled={createMutation.isPending || !key || !title}>
							{t("createButton")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
