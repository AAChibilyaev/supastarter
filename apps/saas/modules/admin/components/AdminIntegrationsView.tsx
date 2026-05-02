"use client";

import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	CheckCircle2Icon,
	DatabaseIcon,
	MailIcon,
	WalletIcon,
	WifiIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminIntegrationsView() {
	const t = useTranslations("admin");
	const { data, isLoading, isError } = useQuery(
		orpc.admin.integrations.queryOptions({ input: {} }),
	);

	if (isLoading) return <LoadingSkeleton />;

	if (isError || !data) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-destructive">{t("integrations.loadError")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="gap-6 grid grid-cols-1">
			{/* Row 1: Core services */}
			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				{/* Database */}
				<IntegrationCard
					title={t("integrations.database")}
					icon={<DatabaseIcon className="size-4" />}
					ok={data.database.ok}
					latencyMs={data.database.latencyMs}
					error={data.database.error}
					t={t}
				/>

				{/* Search Engine */}
				<IntegrationCard
					title={t("integrations.typesense")}
					icon={<WifiIcon className="size-4" />}
					ok={data.typesense.ok}
					latencyMs={data.typesense.latencyMs}
					error={data.typesense.error}
					t={t}
				/>
			</div>

			{/* Row 2: Service providers */}
			<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
				{/* Mail */}
				<ServiceCard
					title={t("integrations.mail")}
					icon={<MailIcon className="size-4" />}
					configured={data.mail.configured}
					detail={data.mail.provider}
					t={t}
				/>

				{/* Payments */}
				<ServiceCard
					title={t("integrations.payments")}
					icon={<WalletIcon className="size-4" />}
					configured={data.payments.configured}
					detail={data.payments.providers.join(", ")}
					t={t}
				/>

				{/* Storage */}
				<ServiceCard
					title={t("integrations.storage")}
					icon={<DatabaseIcon className="size-4" />}
					configured={data.storage.configured}
					detail={data.storage.endpoint ?? t("integrations.notConfigured")}
					t={t}
				/>
			</div>

			{/* Row 3: Wallet */}
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<WalletIcon className="size-4" />
						{t("integrations.walletProvider")}
					</CardTitle>
				</CardHeader>
				<CardContent className="gap-3 text-sm grid grid-cols-1">
					<div className="gap-2 flex items-center justify-between">
						<span className="text-muted-foreground">Tochka</span>
						{data.tochka.configured ? (
							<Badge status="success">{t("integrations.configured")}</Badge>
						) : (
							<Badge status="error">{t("integrations.notConfigured")}</Badge>
						)}
					</div>
					{data.tochka.baseUrl && (
						<div className="gap-2 flex items-center justify-between">
							<span className="text-muted-foreground">
								{t("integrations.endpoint")}
							</span>
							<span className="font-mono text-xs">{data.tochka.baseUrl}</span>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function IntegrationCard({
	title,
	icon,
	ok,
	latencyMs,
	error,
	t,
}: {
	title: string;
	icon: React.ReactNode;
	ok: boolean;
	latencyMs?: number;
	error?: string;
	t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{ok ? (
					<div className="gap-3 flex items-center">
						<CheckCircle2Icon className="size-5 text-success" />
						<div>
							<p className="font-medium text-sm text-success">
								{t("integrations.connected")}
							</p>
							{latencyMs !== undefined && (
								<p className="text-xs text-muted-foreground">
									{t("integrations.latencyMs", { ms: latencyMs })}
								</p>
							)}
						</div>
					</div>
				) : (
					<div className="gap-2 flex items-start">
						<XCircleIcon className="size-5 mt-0.5 shrink-0 text-destructive" />
						<div>
							<p className="font-medium text-sm text-destructive">
								{t("integrations.disconnected")}
							</p>
							{error && <p className="text-xs mt-1 text-muted-foreground">{error}</p>}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ServiceCard({
	title,
	icon,
	configured,
	detail,
	t,
}: {
	title: string;
	icon: React.ReactNode;
	configured: boolean;
	detail: string;
	t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="gap-2 text-sm grid grid-cols-1">
				<div className="gap-2 flex items-center justify-between">
					<span className="text-muted-foreground">{t("integrations.status")}</span>
					{configured ? (
						<Badge status="success">{t("integrations.configured")}</Badge>
					) : (
						<Badge status="error">{t("integrations.notConfigured")}</Badge>
					)}
				</div>
				<div className="gap-2 flex items-center justify-between">
					<span className="text-muted-foreground">{t("integrations.provider")}</span>
					<span className="font-medium">{detail}</span>
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
			</div>
			<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
			</div>
			<Skeleton className="h-32" />
		</div>
	);
}
