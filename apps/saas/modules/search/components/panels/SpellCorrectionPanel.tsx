"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SpellCorrectionPanelProps {
	organizationId: string;
	slug: string;
}

const VERBOSITY_OPTIONS = [
	{ value: 0, label: "Top suggestion only" },
	{ value: 1, label: "Same minimal distance" },
	{ value: 2, label: "All suggestions" },
] as const;

const MODE_OPTIONS = [
	{ value: "auto", label: "Auto-correct" },
	{ value: "suggest", label: "Suggest only" },
] as const;

const LANGUAGES = ["ru", "en", "de", "es", "fr"] as const;

interface SpellConfig {
	maxEditDistance: number;
	verbosity: 0 | 1 | 2;
	maxResults: number;
	splitCompoundWords: boolean;
	mode: "auto" | "suggest";
	useContextCorrection: boolean;
	perLanguage: Record<
		string,
		{
			enabled: boolean;
			maxEditDistance?: number;
			fixKeyboardLayout: boolean;
			transliterate: boolean;
			normalizeYo: boolean;
		}
	>;
}

const DEFAULT_CONFIG: SpellConfig = {
	maxEditDistance: 2,
	verbosity: 2,
	maxResults: 10,
	splitCompoundWords: false,
	mode: "auto",
	useContextCorrection: false,
	perLanguage: {},
};

export function SpellCorrectionPanel({ organizationId, slug }: SpellCorrectionPanelProps) {
	const t = useTranslations();
	const [config, setConfig] = useState<SpellConfig>(DEFAULT_CONFIG);
	const [initialized, setInitialized] = useState(false);

	const { isLoading } = useQuery(
		orpc.search.spellConfig.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	// We read the data via the query, but manage local state for the form
	const { data } = useQuery(
		orpc.search.spellConfig.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	if (data && !initialized) {
		setConfig(data as SpellConfig);
		setInitialized(true);
	}

	const updateMutation = useMutation({
		...orpc.search.spellConfig.update.mutationOptions(),
		onSuccess: (result) => {
			setConfig(result as SpellConfig);
			toastSuccess(t("search.spellCorrection.saved"));
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("search.spellCorrection.error"));
		},
	});

	const handleSave = () => {
		updateMutation.mutate({ organizationId, slug, config });
	};

	const updateField = <K extends keyof SpellConfig>(key: K, value: SpellConfig[K]) => {
		setConfig((prev) => ({ ...prev, [key]: value }));
	};

	const updateLanguage = (lang: string, key: string, value: boolean | number | undefined) => {
		setConfig((prev) => ({
			...prev,
			perLanguage: {
				...prev.perLanguage,
				[lang]: {
					...(prev.perLanguage[lang] ?? {
						enabled: true,
						fixKeyboardLayout: true,
						transliterate: true,
						normalizeYo: true,
					}),
					[key]: value,
				},
			},
		}));
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.spellCorrection.title")}</h3>
					<p className="text-sm text-foreground/60">
						{t("search.spellCorrection.description")}
					</p>
				</div>
				<Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
					{t("search.spellCorrection.save")}
				</Button>
			</div>

			<div className="md:grid-cols-2 gap-6 grid grid-cols-1">
				{/* Max Edit Distance */}
				<div className="space-y-2">
					<label className="text-sm font-medium">
						{t("search.spellCorrection.maxEditDistance")}
					</label>
					<select
						value={config.maxEditDistance}
						onChange={(e) => updateField("maxEditDistance", Number(e.target.value))}
						className="p-2.5 rounded text-sm w-full border bg-background"
					>
						{[1, 2, 3, 4].map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
					<p className="text-xs text-foreground/40">
						{t("search.spellCorrection.maxEditDistanceHint")}
					</p>
				</div>

				{/* Verbosity */}
				<div className="space-y-2">
					<label className="text-sm font-medium">
						{t("search.spellCorrection.verbosity")}
					</label>
					<select
						value={config.verbosity}
						onChange={(e) =>
							updateField("verbosity", Number(e.target.value) as 0 | 1 | 2)
						}
						className="p-2.5 rounded text-sm w-full border bg-background"
					>
						{VERBOSITY_OPTIONS.map((v) => (
							<option key={v.value} value={v.value}>
								{v.label}
							</option>
						))}
					</select>
				</div>

				{/* Max Results */}
				<div className="space-y-2">
					<label className="text-sm font-medium">
						{t("search.spellCorrection.maxResults")}
					</label>
					<input
						type="number"
						min={1}
						max={50}
						value={config.maxResults}
						onChange={(e) => updateField("maxResults", Number(e.target.value))}
						className="p-2.5 rounded text-sm w-full border bg-background"
					/>
				</div>

				{/* Mode */}
				<div className="space-y-2">
					<label className="text-sm font-medium">
						{t("search.spellCorrection.mode")}
					</label>
					<select
						value={config.mode}
						onChange={(e) => updateField("mode", e.target.value as "auto" | "suggest")}
						className="p-2.5 rounded text-sm w-full border bg-background"
					>
						{MODE_OPTIONS.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
				</div>

				{/* Split Compound Words */}
				<div className="space-y-2 gap-3 pt-6 flex items-start">
					<input
						type="checkbox"
						id="splitCompounds"
						checked={config.splitCompoundWords}
						onChange={(e) => updateField("splitCompoundWords", e.target.checked)}
						className="mt-1"
					/>
					<div>
						<label
							htmlFor="splitCompounds"
							className="text-sm font-medium cursor-pointer"
						>
							{t("search.spellCorrection.splitCompounds")}
						</label>
						<p className="text-xs text-foreground/40">
							{t("search.spellCorrection.splitCompoundsHint")}
						</p>
					</div>
				</div>

				{/* Context Correction */}
				<div className="space-y-2 gap-3 pt-6 flex items-start">
					<input
						type="checkbox"
						id="useContextCorrection"
						checked={config.useContextCorrection}
						onChange={(e) => updateField("useContextCorrection", e.target.checked)}
						className="mt-1"
					/>
					<div>
						<label
							htmlFor="useContextCorrection"
							className="text-sm font-medium cursor-pointer"
						>
							{t("search.spellCorrection.useContextCorrection")}
						</label>
						<p className="text-xs text-foreground/40">
							{t("search.spellCorrection.useContextCorrectionHint")}
						</p>
					</div>
				</div>
			</div>

			{/* Per-Language Settings */}
			<div>
				<h4 className="text-md font-semibold mb-3">
					{t("search.spellCorrection.perLanguage")}
				</h4>
				<div className="md:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{LANGUAGES.map((lang) => {
						const langCfg = config.perLanguage[lang] ?? {
							enabled: true,
							fixKeyboardLayout: true,
							transliterate: true,
							normalizeYo: true,
						};
						return (
							<Card key={lang} className="p-4 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold uppercase">{lang}</span>
									<input
										type="checkbox"
										checked={langCfg.enabled}
										onChange={(e) =>
											updateLanguage(lang, "enabled", e.target.checked)
										}
									/>
								</div>
								{langCfg.enabled && (
									<div className="space-y-2">
										{lang === "ru" && (
											<>
												<label className="gap-2 text-xs flex items-center">
													<input
														type="checkbox"
														checked={langCfg.fixKeyboardLayout}
														onChange={(e) =>
															updateLanguage(
																lang,
																"fixKeyboardLayout",
																e.target.checked,
															)
														}
													/>
													{t("search.spellCorrection.fixKeyboardLayout")}
												</label>
												<label className="gap-2 text-xs flex items-center">
													<input
														type="checkbox"
														checked={langCfg.transliterate}
														onChange={(e) =>
															updateLanguage(
																lang,
																"transliterate",
																e.target.checked,
															)
														}
													/>
													{t("search.spellCorrection.transliterate")}
												</label>
												<label className="gap-2 text-xs flex items-center">
													<input
														type="checkbox"
														checked={langCfg.normalizeYo}
														onChange={(e) =>
															updateLanguage(
																lang,
																"normalizeYo",
																e.target.checked,
															)
														}
													/>
													{t("search.spellCorrection.normalizeYo")}
												</label>
											</>
										)}
									</div>
								)}
							</Card>
						);
					})}
				</div>
			</div>
		</Card>
	);
}
