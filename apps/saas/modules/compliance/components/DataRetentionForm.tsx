"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { Switch } from "@repo/ui/components/switch";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export function DataRetentionForm() {
	const t = useTranslations();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";
	const queryClient = useQueryClient();

	const { data: config, isLoading } = useQuery(
		orpc.compliance.getDataRetentionConfig.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	type RetentionConfigState = {
		searchUsageRetentionDays: number;
		auditLogRetentionDays: number;
		ingestBufferRetentionDays: number;
		autoDeleteEnabled: boolean;
		deletionSchedule: "daily" | "weekly" | "monthly";
	};

	const [formState, setFormState] = useState<RetentionConfigState | null>(null);

	const configState = useMemo(() => {
		if (formState) return formState;
		if (config) return config;
		return null;
	}, [formState, config]);

	const hasChanges = useMemo(() => {
		if (!config || !configState) return false;
		return (
			config.searchUsageRetentionDays !== configState.searchUsageRetentionDays ||
			config.auditLogRetentionDays !== configState.auditLogRetentionDays ||
			config.ingestBufferRetentionDays !== configState.ingestBufferRetentionDays ||
			config.autoDeleteEnabled !== configState.autoDeleteEnabled ||
			config.deletionSchedule !== configState.deletionSchedule
		);
	}, [config, configState]);

	const updateMutation = useMutation(orpc.compliance.updateDataRetentionConfig.mutationOptions());

	const handleSave = async () => {
		if (!configState) return;
		try {
			const result = await updateMutation.mutateAsync({
				organizationId,
				config: {
					searchUsageRetentionDays: configState.searchUsageRetentionDays,
					auditLogRetentionDays: configState.auditLogRetentionDays,
					ingestBufferRetentionDays: configState.ingestBufferRetentionDays,
					autoDeleteEnabled: configState.autoDeleteEnabled,
					deletionSchedule: configState.deletionSchedule,
				},
			});
			if (result.success) {
				setFormState(null);
				await queryClient.invalidateQueries({
					queryKey: orpc.compliance.getDataRetentionConfig.queryKey({
						input: { organizationId },
					}),
				});
				toastSuccess(t("settings.compliance.notifications.saved"));
			}
		} catch {
			toastError(t("settings.compliance.notifications.error"));
		}
	};

	const handleCancel = () => {
		setFormState(null);
	};

	const updateField = <K extends keyof RetentionConfigState>(
		key: K,
		value: RetentionConfigState[K],
	) => {
		setFormState((prev) => {
			const base = prev ?? {
				searchUsageRetentionDays: config?.searchUsageRetentionDays ?? 365,
				auditLogRetentionDays: config?.auditLogRetentionDays ?? 365,
				ingestBufferRetentionDays: config?.ingestBufferRetentionDays ?? 90,
				autoDeleteEnabled: config?.autoDeleteEnabled ?? true,
				deletionSchedule: (config?.deletionSchedule ?? "daily") as "daily" | "weekly" | "monthly",
			};
			return { ...base, [key]: value };
		});
	};

	if (isLoading) {
		return (
			<div className="py-12 flex items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="gap-6 flex flex-col">
			{/* Search Usage Retention */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">
						{t("settings.compliance.searchUsage.title")}
					</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("settings.compliance.searchUsage.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RetentionDaysSelect
						value={configState?.searchUsageRetentionDays ?? 365}
						onChange={(v) => updateField("searchUsageRetentionDays", v)}
					/>
				</CardContent>
			</Card>

			{/* Audit Log Retention */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">
						{t("settings.compliance.auditLog.title")}
					</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("settings.compliance.auditLog.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RetentionDaysSelect
						value={configState?.auditLogRetentionDays ?? 365}
						onChange={(v) => updateField("auditLogRetentionDays", v)}
					/>
				</CardContent>
			</Card>

			{/* Ingest Buffer Retention */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">
						{t("settings.compliance.ingestBuffer.title")}
					</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("settings.compliance.ingestBuffer.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RetentionDaysSelect
						value={configState?.ingestBufferRetentionDays ?? 90}
						onChange={(v) => updateField("ingestBufferRetentionDays", v)}
					/>
				</CardContent>
			</Card>

			{/* Auto-deletion Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">
						{t("settings.compliance.autoDelete.title")}
					</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("settings.compliance.autoDelete.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-4 flex flex-col">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							{t("settings.compliance.autoDelete.enableLabel")}
						</span>
						<Switch
							checked={configState?.autoDeleteEnabled ?? true}
							onCheckedChange={(v) => updateField("autoDeleteEnabled", v)}
						/>
					</div>

					{configState?.autoDeleteEnabled && (
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								{t("settings.compliance.autoDelete.scheduleLabel")}
							</span>
							<Select
								value={configState.deletionSchedule}
								onValueChange={(v) =>
									updateField(
										"deletionSchedule",
										v as "daily" | "weekly" | "monthly",
									)
								}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="daily">
										{t("settings.compliance.autoDelete.scheduleDaily")}
									</SelectItem>
									<SelectItem value="weekly">
										{t("settings.compliance.autoDelete.scheduleWeekly")}
									</SelectItem>
									<SelectItem value="monthly">
										{t("settings.compliance.autoDelete.scheduleMonthly")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Action buttons */}
			<div className="gap-3 flex justify-end">
				{hasChanges && (
					<Button variant="outline" onClick={handleCancel}>
						{t("settings.compliance.cancel")}
					</Button>
				)}
				<Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
					{updateMutation.isPending ? <Spinner className="mr-2 size-4" /> : null}
					{t("settings.compliance.save")}
				</Button>
			</div>
		</div>
	);
}

function RetentionDaysSelect({
	value,
	onChange,
}: {
	value: number;
	onChange: (value: number) => void;
}) {
	const t = useTranslations();
	const options = [
		{ value: 0, label: t("settings.compliance.retentionOptions.forever") },
		{ value: 7, label: t("settings.compliance.retentionOptions.sevenDays") },
		{ value: 14, label: t("settings.compliance.retentionOptions.fourteenDays") },
		{ value: 30, label: t("settings.compliance.retentionOptions.thirtyDays") },
		{ value: 90, label: t("settings.compliance.retentionOptions.ninetyDays") },
		{ value: 180, label: t("settings.compliance.retentionOptions.oneEightyDays") },
		{ value: 365, label: t("settings.compliance.retentionOptions.oneYear") },
		{ value: 730, label: t("settings.compliance.retentionOptions.twoYears") },
	];

	return (
		<Select value={String(value)} onValueChange={(v) => onChange(Number.parseInt(v, 10))}>
			<SelectTrigger className="max-w-xs w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((opt) => (
					<SelectItem key={opt.value} value={String(opt.value)}>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
