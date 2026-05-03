"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	CheckCircle2Icon,
	DatabaseIcon,
	ServerIcon,
	WifiIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminConfigView() {
	const t = useTranslations("admin");
	const { data, isLoading, isError } = useQuery(orpc.admin.config.queryOptions({ input: {} }));

	if (isLoading) {
		return <LoadingSkeleton />;
	}

	if (isError || !data) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-destructive">{t("config.loadError")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="gap-6 grid grid-cols-1">
			{/* Row 1: App + System */}
			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				<Card>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							<ServerIcon className="size-4" />
							{t("config.application")}
						</CardTitle>
					</CardHeader>
					<CardContent className="gap-2 text-sm grid grid-cols-1">
						<ConfigRow label={t("config.appName")} value={data.config.appName} />
						<ConfigRow
							label={t("config.nodeVersion")}
							value={data.config.nodeVersion}
						/>
						<ConfigRow label={t("config.runtimeEnv")} value={data.config.runtimeEnv} />
						<ConfigRow label={t("config.platform")} value={data.config.platform} />
						<ConfigRow
							label={t("config.uptime")}
							value={formatUptime(data.config.uptime)}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="gap-2 text-base flex items-center">
							<WifiIcon className="size-4" />
							{t("config.typesenseHealth")}
						</CardTitle>
					</CardHeader>
					<CardContent className="gap-2 text-sm grid grid-cols-1">
						{data.typesenseHealth.ok ? (
							<>
								<div className="gap-2 flex items-center">
									<CheckCircle2Icon className="size-4 text-success" />
									<span className="font-medium text-success">
										{t("config.healthy")}
									</span>
								</div>
								{data.typesenseHealth.version && (
									<ConfigRow
										label={t("config.version")}
										value={data.typesenseHealth.version}
									/>
								)}
							</>
						) : (
							<div className="gap-2 flex items-center">
								<XCircleIcon className="size-4 text-destructive" />
								<span className="font-medium text-destructive">
									{data.typesenseHealth.error ?? t("config.unhealthy")}
								</span>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Row 2: Database stats */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<DatabaseIcon className="size-4" />
						{t("config.databaseStats")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data.prismaStats.ok ? (
						<div className="gap-4 md:grid-cols-4 text-sm grid grid-cols-2">
							<StatBadge
								label={t("config.users")}
								value={data.prismaStats.userCount ?? 0}
							/>
							<StatBadge
								label={t("config.organizations")}
								value={data.prismaStats.organizationCount ?? 0}
							/>
							<StatBadge
								label={t("config.searchIndexes")}
								value={data.prismaStats.searchIndexCount ?? 0}
							/>
							<StatBadge
								label={t("config.apiKeys")}
								value={data.prismaStats.totalApiKeys ?? 0}
							/>
							<StatBadge
								label={t("config.usageEvents")}
								value={data.prismaStats.totalUsageEvents ?? 0}
							/>
						</div>
					) : (
						<p className="text-sm text-destructive">
							{data.prismaStats.error ?? t("config.statsError")}
						</p>
					)}
				</CardContent>
			</Card>

			{/* Row 3: Services */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<ActivityIcon className="size-4" />
						{t("config.services")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="gap-3 md:grid-cols-2 text-sm grid grid-cols-1">
						{Object.entries(data.services).map(([key, configured]) => (
							<div key={key} className="gap-2 flex items-center justify-between">
								<span className="text-muted-foreground">
									{formatServiceName(key)}
								</span>
								{configured ? (
									<Badge status="success">{t("config.configured")}</Badge>
								) : (
									<Badge status="error">{t("config.notConfigured")}</Badge>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function ConfigRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="gap-2 flex items-center justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-right">{value}</span>
		</div>
	);
}

function StatBadge({ label, value }: { label: string; value: number }) {
	return (
		<Card className="rounded-lg text-center">
			<CardContent className="p-3">
				<p className="font-semibold text-2xl tabular-nums">{value.toLocaleString()}</p>
				<p className="text-xs mt-1 text-muted-foreground">{label}</p>
			</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				<Skeleton className="h-40" />
				<Skeleton className="h-40" />
			</div>
			<Skeleton className="h-32" />
			<Skeleton className="h-40" />
		</div>
	);
}

function formatUptime(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const parts: string[] = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	parts.push(`${m}m`);
	return parts.join(" ");
}

function formatServiceName(key: string): string {
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (s) => s.toUpperCase())
		.replace("Typesense", "AACsearch Engine")
		.trim();
}
