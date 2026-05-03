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
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangleIcon,
	BellIcon,
	CheckCircle2Icon,
	ExternalLinkIcon,
	Loader2Icon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

interface AlertThreshold {
	threshold: number;
	enabled: boolean;
}

interface AlertRule {
	resource: "search" | "ingest";
	enabled: boolean;
	thresholds: AlertThreshold[];
	channels: string[];
	cooldownHours: number;
}

interface AlertSettings {
	slackWebhookUrl: string | null;
	rules: AlertRule[];
}

const CHANNEL_OPTIONS = ["email", "webhook", "slack"] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

function percentLabel(pct: number): string {
	return `${Math.round(pct * 100)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AlertRuleRow({
	rule,
	resourceLabel,
	onToggle,
	onEdit,
	useTranslations: t,
}: {
	rule: AlertRule;
	resourceLabel: string;
	onToggle: () => void;
	onEdit: () => void;
	useTranslations: (key: string) => string;
}) {
	const activeThresholds = rule.thresholds.filter((t) => t.enabled);

	return (
		<div className="gap-4 p-4 flex items-center justify-between rounded-lg border">
			<div className="min-w-0 flex-1">
				<div className="gap-2 flex items-center">
					<h4 className="text-sm font-medium">{resourceLabel}</h4>
					<Badge variant={rule.enabled ? "success" : "secondary"}>
						{rule.enabled ? t("enable") : t("disable")}
					</Badge>
				</div>
				<div className="mt-1 gap-2 text-xs flex flex-wrap items-center text-muted-foreground">
					<span>{t("thresholds")}:</span>
					{activeThresholds.map((th) => (
						<span
							key={th.threshold}
							className="px-2 py-0.5 font-medium inline-flex items-center rounded-full bg-muted"
						>
							{percentLabel(th.threshold)}
						</span>
					))}
					<span className="mx-1">·</span>
					<span>{t("cooldownHours", { hours: rule.cooldownHours })}</span>
					<span className="mx-1">·</span>
					<span>{rule.channels.map((ch) => t(ch)).join(", ")}</span>
				</div>
			</div>
			<div className="gap-2 flex shrink-0 items-center">
				<Switch checked={rule.enabled} onCheckedChange={onToggle} />
				<Button variant="outline" size="sm" onClick={onEdit}>
					{t("edit")}
				</Button>
			</div>
		</div>
	);
}

function AlertRuleEditDialog({
	open,
	onOpenChange,
	rule,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule: AlertRule;
	onSave: (updated: AlertRule) => void;
}) {
	const t = useTranslations("settings.alertsPage");
	const [edited, setEdited] = useState<AlertRule>({ ...rule });
	const [showSlackInput, setShowSlackInput] = useState(false);
	const [slackUrl, setSlackUrl] = useState("");

	// Sync state when dialog opens
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (newOpen) {
				setEdited({ ...rule });
			}
			onOpenChange(newOpen);
		},
		[rule, onOpenChange],
	);

	const handleThresholdToggle = useCallback((index: number) => {
		setEdited((prev) => {
			const updated = { ...prev };
			updated.thresholds = prev.thresholds.map((th, i) =>
				i === index ? { ...th, enabled: !th.enabled } : th,
			);
			return updated;
		});
	}, []);

	const handleChannelToggle = useCallback(
		(channel: string) => {
			setEdited((prev) => {
				const has = prev.channels.includes(channel);
				return {
					...prev,
					channels: has
						? prev.channels.filter((c) => c !== channel)
						: [...prev.channels, channel],
				};
			});
			if (channel === "slack" && !edited.channels.includes("slack")) {
				setShowSlackInput(true);
			}
		},
		[edited.channels],
	);

	const handleCooldownChange = useCallback((value: string) => {
		const hours = Number.parseInt(value, 10);
		if (!Number.isNaN(hours) && hours >= 1 && hours <= 168) {
			setEdited((prev) => ({ ...prev, cooldownHours: hours }));
		}
	}, []);

	const handleSave = useCallback(() => {
		// Ensure at least one threshold is enabled
		if (!edited.thresholds.some((th) => th.enabled)) {
			toastError(t("settings.alertsPage.saveError"));
			return;
		}
		// Ensure at least one channel is selected
		if (edited.channels.length === 0) {
			toastError(t("settings.alertsPage.saveError"));
			return;
		}
		onSave(edited);
		onOpenChange(false);
	}, [edited, onSave, onOpenChange, t]);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{t("edit")} —{" "}
						{edited.resource === "search" ? t("searchQuota") : t("ingestQuota")}
					</DialogTitle>
					<DialogDescription>{t("subtitle")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 py-4">
					{/* Thresholds */}
					<div>
						<Label className="text-sm font-medium">{t("thresholds")}</Label>
						<div className="mt-2 space-y-2">
							{edited.thresholds.map((th, idx) => (
								<div key={th.threshold} className="gap-3 flex items-center">
									<Switch
										checked={th.enabled}
										onCheckedChange={() => handleThresholdToggle(idx)}
									/>
									<span className="text-sm">{percentLabel(th.threshold)}</span>
								</div>
							))}
						</div>
					</div>

					{/* Channels */}
					<div>
						<Label className="text-sm font-medium">{t("deliveryChannels")}</Label>
						<div className="mt-2 space-y-2">
							{CHANNEL_OPTIONS.map((ch) => (
								<div key={ch} className="gap-3 flex items-center">
									<Switch
										checked={edited.channels.includes(ch)}
										onCheckedChange={() => handleChannelToggle(ch)}
									/>
									<span className="text-sm">{t(ch)}</span>
								</div>
							))}
						</div>
					</div>

					{/* Slack Webhook URL */}
					{edited.channels.includes("slack") && (
						<div>
							<Label className="text-sm font-medium">{t("slackWebhookUrl")}</Label>
							<Input
								value={slackUrl}
								onChange={(e) => setSlackUrl(e.target.value)}
								placeholder={t("slackWebhookPlaceholder")}
								className="mt-1"
							/>
						</div>
					)}

					{/* Cooldown */}
					<div>
						<Label className="text-sm font-medium">{t("cooldown")}</Label>
						<div className="mt-1 gap-2 flex items-center">
							<Input
								type="number"
								min={1}
								max={168}
								value={edited.cooldownHours}
								onChange={(e) => handleCooldownChange(e.target.value)}
								className="w-24"
							/>
							<span className="text-sm text-muted-foreground">
								{t("cooldownHours", { hours: edited.cooldownHours })}
							</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("cancel")}
					</Button>
					<Button onClick={handleSave}>{t("save")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function AlertChannelsSection({
	slackWebhookUrl,
	onSlackUrlChange,
	loading,
	useTranslations: t,
}: {
	slackWebhookUrl: string | null;
	onSlackUrlChange: (url: string | null) => void;
	loading: boolean;
	useTranslations: (key: string) => string;
}) {
	const [editing, setEditing] = useState(!slackWebhookUrl);
	const [url, setUrl] = useState(slackWebhookUrl ?? "");

	const handleSaveSlack = useCallback(() => {
		if (url && !url.startsWith("https://hooks.slack.com/")) {
			toastError(t("settings.alertsPage.saveError"));
			return;
		}
		onSlackUrlChange(url || null);
		setEditing(false);
	}, [url, onSlackUrlChange, t]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("settings.alertsPage.channels")}</CardTitle>
				<CardDescription>{t("settings.alertsPage.configureChannels")}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="gap-2 flex items-center">
						<Badge variant="secondary">{t("settings.alertsPage.email")}</Badge>
						<span className="text-xs text-muted-foreground">— Always enabled</span>
					</div>

					<div className="gap-2 flex items-center justify-between">
						<div className="gap-2 flex items-center">
							<Badge variant={slackWebhookUrl ? "success" : "secondary"}>Slack</Badge>
							{slackWebhookUrl ? (
								<span className="text-xs max-w-[200px] truncate text-muted-foreground">
									{slackWebhookUrl}
								</span>
							) : (
								<span className="text-xs text-muted-foreground">
									Not configured
								</span>
							)}
						</div>
						{editing ? (
							<div className="gap-2 flex items-center">
								<Input
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder={t("settings.alertsPage.slackWebhookPlaceholder")}
									className="w-64 text-xs"
									size={40}
								/>
								<Button size="sm" onClick={handleSaveSlack} disabled={loading}>
									{t("settings.alertsPage.save")}
								</Button>
								{slackWebhookUrl && (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setUrl("");
											setEditing(false);
										}}
									>
										{t("settings.alertsPage.cancel")}
									</Button>
								)}
							</div>
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setUrl(slackWebhookUrl ?? "");
									setEditing(true);
								}}
							>
								{slackWebhookUrl
									? t("settings.alertsPage.edit")
									: t("settings.alertsPage.addWebhook")}
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Simulated alert history (UI-only; server persists via org.metadata)
function AlertHistoryPlaceholder({
	useTranslations: t,
}: {
	useTranslations: (key: string) => string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("settings.alertsPage.alertHistory")}</CardTitle>
				<CardDescription>{t("settings.alertsPage.noAlerts")}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="py-8 flex flex-col items-center justify-center text-center">
					<CheckCircle2Icon className="size-10 text-muted-foreground/40" />
					<p className="mt-2 text-sm text-muted-foreground">
						{t("settings.alertsPage.noAlerts")}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AlertsSettingsPage({ organizationId }: { organizationId: string }) {
	const t = useTranslations("settings.alertsPage");
	const queryClient = useQueryClient();
	const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

	const { data: settings, isLoading } = useQuery({
		...orpc.search.alertRules.get.queryOptions({
			input: { organizationId },
		}),
		enabled: Boolean(organizationId),
	});

	const updateMutation = useMutation({
		...orpc.search.alertRules.update.mutationOptions(),
		onSuccess: () => {
			toastSuccess(t("saveSuccess"));
			void queryClient.invalidateQueries({
				queryKey: orpc.search.alertRules.get.key(),
			});
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("saveError"));
		},
	});

	const handleToggleRule = useCallback(
		(index: number) => {
			if (!settings) return;
			const updated: AlertRule[] = settings.rules.map((r, i) =>
				i === index ? { ...r, enabled: !r.enabled } : r,
			);
			updateMutation.mutate({
				organizationId,
				rules: updated,
			});
		},
		[settings, organizationId, updateMutation],
	);

	const handleEditRule = useCallback(
		(updated: AlertRule) => {
			if (!settings) return;
			const newRules: AlertRule[] = settings.rules.map((r) =>
				r.resource === updated.resource ? updated : r,
			);
			updateMutation.mutate({
				organizationId,
				rules: newRules,
				slackWebhookUrl: settings.slackWebhookUrl,
			});
		},
		[settings, organizationId, updateMutation],
	);

	const handleSlackUrlChange = useCallback(
		(url: string | null) => {
			if (!settings) return;
			updateMutation.mutate({
				organizationId,
				rules: settings.rules,
				slackWebhookUrl: url,
			});
		},
		[settings, organizationId, updateMutation],
	);

	const isMutating = updateMutation.isPending;

	if (isLoading) {
		return (
			<div className="py-16 flex items-center justify-center">
				<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Alert rules cards */}
			{settings?.rules.map((rule, idx) => (
				<Card key={rule.resource}>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							{rule.resource === "search" ? (
								<AlertTriangleIcon className="size-4 text-muted-foreground" />
							) : (
								<BellIcon className="size-4 text-muted-foreground" />
							)}
							{rule.resource === "search" ? t("searchQuota") : t("ingestQuota")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<AlertRuleRow
							rule={rule}
							resourceLabel={
								rule.resource === "search" ? t("searchQuota") : t("ingestQuota")
							}
							onToggle={() => handleToggleRule(idx)}
							onEdit={() => setEditingRule(rule)}
							useTranslations={(key) => t(key)}
						/>
					</CardContent>
				</Card>
			))}

			{/* Slack channel config */}
			<AlertChannelsSection
				slackWebhookUrl={settings?.slackWebhookUrl ?? null}
				onSlackUrlChange={handleSlackUrlChange}
				loading={isMutating}
				useTranslations={(key) => t(key)}
			/>

			{/* Alert history placeholder */}
			<AlertHistoryPlaceholder useTranslations={(key) => t(key)} />

			{/* Edit dialog */}
			{editingRule && (
				<AlertRuleEditDialog
					open={true}
					onOpenChange={(open) => {
						if (!open) setEditingRule(null);
					}}
					rule={editingRule}
					onSave={handleEditRule}
				/>
			)}
		</div>
	);
}
