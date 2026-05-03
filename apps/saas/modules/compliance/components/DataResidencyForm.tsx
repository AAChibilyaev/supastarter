"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// ── Region Info Display ───────────────────────────────────────────

function RegionInfoCard({
	region,
	label,
	location,
	compliance,
}: {
	region: string;
	label: string;
	location: string;
	compliance: string[];
}) {
	const t = useTranslations("settings.compliance.dataResidency");

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-base">{label}</CardTitle>
				<CardDescription className="leading-snug text-foreground/60">
					{location}
				</CardDescription>
			</CardHeader>
			<CardContent className="gap-1.5 flex flex-wrap">
				{compliance.map((c) => (
					<Badge key={c} variant="secondary">
						{c}
					</Badge>
				))}
			</CardContent>
		</Card>
	);
}

// ── Migration Progress Display ─────────────────────────────────────

function MigrationProgress({
	results,
}: {
	results: Array<{
		collection: string;
		success: boolean;
		progress: {
			totalDocuments: number;
			exported: number;
			imported: number;
			failures: number;
			completed: boolean;
			errors: string[];
		};
	}>;
}) {
	const t = useTranslations("settings.compliance.dataResidency");

	return (
		<div className="gap-3 flex flex-col">
			<p className="text-sm font-medium">{t("migrationResults")}</p>
			{results.map((result) => (
				<Card key={result.collection}>
					<CardHeader>
						<CardTitle className="font-medium text-sm">
							{result.collection}
							{result.success ? (
								<Badge
									variant="secondary"
									className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
								>
									{t("success")}
								</Badge>
							) : (
								<Badge variant="destructive" className="ml-2">
									{t("failed")}
								</Badge>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="gap-2 text-sm flex flex-col text-foreground/60">
						<p>
							{t("documentsImported")}: {result.progress.imported} /{" "}
							{result.progress.totalDocuments}
						</p>
						{result.progress.failures > 0 && (
							<p>
								{t("failures")}: {result.progress.failures}
							</p>
						)}
						{result.progress.errors.length > 0 && (
							<div className="gap-1 flex flex-col">
								<p className="font-medium text-red-600 dark:text-red-400">
									{t("errors")}:
								</p>
								<ul className="list-inside list-disc">
									{result.progress.errors.slice(0, 5).map((err, i) => (
										<li key={i}>{err}</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ── Main Form ──────────────────────────────────────────────────────

export function DataResidencyForm() {
	const t = useTranslations("settings.compliance.dataResidency");
	const tCompliance = useTranslations("settings.compliance");
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";
	const queryClient = useQueryClient();

	// ── State ─────────────────────────────────────────────────────

	const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
	const [showMigrateAfterChange, setShowMigrateAfterChange] = useState(false);
	const [migrationResults, setMigrationResults] = useState<Array<{
		collection: string;
		success: boolean;
		progress: {
			totalDocuments: number;
			exported: number;
			imported: number;
			failures: number;
			completed: boolean;
			errors: string[];
		};
	}> | null>(null);

	// ── Queries ───────────────────────────────────────────────────

	const { data: regions, isLoading: regionsLoading } = useQuery(
		orpc.compliance.listRegions.queryOptions({
			enabled: true,
		}),
	);

	const { data: currentRegion, isLoading: regionLoading } = useQuery(
		orpc.compliance.getOrgRegion.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const { data: healthData } = useQuery(
		orpc.compliance.checkRegionsHealth.queryOptions({
			enabled: true,
		}),
	);

	const currentRegionHealth = useMemo(() => {
		if (!healthData || !currentRegion) return null;
		return healthData.find((h) => h.region === currentRegion.region) ?? null;
	}, [healthData, currentRegion]);

	// ── Mutations ─────────────────────────────────────────────────

	const setRegionMutation = useMutation(orpc.compliance.setOrgRegion.mutationOptions());

	const migrateMutation = useMutation(orpc.compliance.migrateOrgData.mutationOptions());

	// ── Handlers ──────────────────────────────────────────────────

	const handleChangeRegion = async () => {
		if (!selectedRegion || !organizationId) return;
		setMigrationResults(null);

		try {
			const result = await setRegionMutation.mutateAsync({
				organizationId,
				region: selectedRegion,
			});

			if (result.success) {
				toastSuccess(t("regionUpdated"));
				setShowMigrateAfterChange(true);
				await queryClient.invalidateQueries({
					queryKey: orpc.compliance.getOrgRegion.queryKey({ input: { organizationId } }),
				});

				// Reset selection
				setSelectedRegion(null);
			}
		} catch {
			toastError(tCompliance("notifications.error"));
		}
	};

	const handleMigrateData = async () => {
		if (!currentRegion || !selectedRegion || !organizationId) return;
		setMigrationResults(null);

		try {
			const result = await migrateMutation.mutateAsync({
				organizationId,
				sourceRegion: currentRegion.region,
				destRegion: selectedRegion,
				updateRegionAfterMigration: true,
			});

			setMigrationResults(result.results);

			if (result.success) {
				toastSuccess(t("migrationComplete"));
				setShowMigrateAfterChange(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.compliance.getOrgRegion.queryKey({ input: { organizationId } }),
				});
			} else {
				toastError(t("migrationFailed"));
			}
		} catch {
			toastError(t("migrationFailed"));
		}
	};

	const handleCancelMigration = () => {
		setSelectedRegion(null);
		setShowMigrateAfterChange(false);
		setMigrationResults(null);
	};

	// ── Loading ───────────────────────────────────────────────────

	if (regionsLoading || regionLoading) {
		return (
			<div className="py-12 flex items-center justify-center">
				<Spinner />
			</div>
		);
	}

	// ── Derived data ──────────────────────────────────────────────

	const availableRegions = regions?.regions ?? [];
	const targetInfo = selectedRegion
		? availableRegions.find((r) => r.code === selectedRegion)
		: null;

	return (
		<div className="gap-6 flex flex-col">
			{/* Current Region Display */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">{t("currentRegion")}</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("currentRegionDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-4 flex flex-col">
					{currentRegion && (
						<RegionInfoCard
							region={currentRegion.region}
							label={currentRegion.label}
							location={currentRegion.location}
							compliance={currentRegion.compliance}
						/>
					)}

					{/* Health indicator */}
					{currentRegionHealth && (
						<div className="gap-2 text-sm flex items-center">
							<span
								className={`size-2 inline-block rounded-full ${
									currentRegionHealth.online ? "bg-green-500" : "bg-red-500"
								}`}
							/>
							<span className="text-foreground/60">
								{currentRegionHealth.online
									? `${t("online")} (${currentRegionHealth.latencyMs ?? "?"}ms)`
									: `${t("offline")}${currentRegionHealth.error ? `: ${currentRegionHealth.error}` : ""}`}
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Region Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-base">{t("changeRegion")}</CardTitle>
					<CardDescription className="leading-snug text-foreground/60">
						{t("changeRegionDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-4 flex flex-col">
					<Select
						value={selectedRegion ?? ""}
						onValueChange={(v) => {
							setSelectedRegion(v);
							setShowMigrateAfterChange(false);
							setMigrationResults(null);
						}}
					>
						<SelectTrigger className="max-w-xs w-full">
							<SelectValue placeholder={t("selectRegionPlaceholder")} />
						</SelectTrigger>
						<SelectContent>
							{availableRegions
								.filter((r) => r.code !== currentRegion?.region)
								.map((r) => (
									<SelectItem key={r.code} value={r.code}>
										{r.label} — {r.compliance.join(", ")}
									</SelectItem>
								))}
						</SelectContent>
					</Select>

					{/* Target region preview */}
					{targetInfo && (
						<RegionInfoCard
							region={targetInfo.code}
							label={targetInfo.label}
							location={targetInfo.location}
							compliance={targetInfo.compliance}
						/>
					)}
				</CardContent>
				<CardFooter className="gap-3 justify-end">
					{selectedRegion && (
						<>
							<Button variant="outline" onClick={handleCancelMigration}>
								{t("cancel")}
							</Button>
							<Button
								onClick={handleChangeRegion}
								loading={setRegionMutation.isPending}
							>
								{t("updateRegion")}
							</Button>
						</>
					)}
				</CardFooter>
			</Card>

			{/* Migration prompt */}
			{showMigrateAfterChange &&
				selectedRegion &&
				currentRegion &&
				selectedRegion !== currentRegion.region && (
					<Card>
						<CardHeader>
							<CardTitle className="font-medium text-base">
								{t("migrateData")}
							</CardTitle>
							<CardDescription className="leading-snug text-foreground/60">
								{t("migrateDataDescription")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm mb-4 text-foreground/60">
								{t("migrateDataNote", {
									source: currentRegion.label,
									dest: targetInfo?.label ?? selectedRegion.toUpperCase(),
								})}
							</p>
						</CardContent>
						<CardFooter className="gap-3 justify-end">
							<Button
								variant="outline"
								onClick={() => setShowMigrateAfterChange(false)}
							>
								{t("skipMigration")}
							</Button>
							<Button
								onClick={handleMigrateData}
								loading={migrateMutation.isPending}
								variant="default"
							>
								{t("startMigration")}
							</Button>
						</CardFooter>
					</Card>
				)}

			{/* Migration Results */}
			{migrationResults && migrationResults.length > 0 && (
				<MigrationProgress results={migrationResults} />
			)}
		</div>
	);
}
