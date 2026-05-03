"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { Settings2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface RecommendationsSettingsProps {
	organizationId: string;
}

const STORAGE_KEY = "aacsearch_recommendations_settings";

interface Settings {
	count: number;
	algorithm: "graph" | "vector" | "hybrid";
	fieldWeights: {
		title: number;
		description: number;
		category: number;
	};
}

const DEFAULT_SETTINGS: Settings = {
	count: 10,
	algorithm: "hybrid",
	fieldWeights: {
		title: 3,
		description: 1,
		category: 2,
	},
};

export function RecommendationsSettings({
	organizationId: _organizationId,
}: RecommendationsSettingsProps) {
	const t = useTranslations("search");
	const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				setSettings({
					...DEFAULT_SETTINGS,
					...parsed,
					fieldWeights: { ...DEFAULT_SETTINGS.fieldWeights, ...parsed.fieldWeights },
				});
			}
		} catch {
			// ignore corrupt storage
		}
		setLoaded(true);
	}, []);

	const handleSave = () => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
			toastSuccess(t("recommendations.settings.saved"));
		} catch {
			toastError(t("recommendations.settings.saveError"));
		}
	};

	if (!loaded) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					<Settings2Icon className="size-4 text-primary" />
					{t("recommendations.settings.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="max-w-lg space-y-6">
				{/* Count */}
				<div className="space-y-2">
					<Label htmlFor="rec-count">{t("recommendations.settings.count")}</Label>
					<p className="text-xs text-muted-foreground">
						{t("recommendations.settings.countHint")}
					</p>
					<Input
						id="rec-count"
						type="number"
						min={1}
						max={100}
						value={settings.count}
						onChange={(e) =>
							setSettings({
								...settings,
								count: Math.max(1, Math.min(100, Number(e.target.value))),
							})
						}
						className="w-24"
					/>
				</div>

				{/* Algorithm */}
				<div className="space-y-2">
					<Label htmlFor="rec-algorithm">{t("recommendations.settings.algorithm")}</Label>
					<p className="text-xs text-muted-foreground">
						{t("recommendations.settings.algorithmHint")}
					</p>
					<select
						id="rec-algorithm"
						value={settings.algorithm}
						onChange={(e) =>
							setSettings({
								...settings,
								algorithm: e.target.value as Settings["algorithm"],
							})
						}
						className="h-9 max-w-xs px-3 text-sm w-full rounded-md border border-input bg-background"
					>
						<option value="graph">
							{t("recommendations.settings.algorithmGraph")}
						</option>
						<option value="vector">
							{t("recommendations.settings.algorithmVector")}
						</option>
						<option value="hybrid">
							{t("recommendations.settings.algorithmHybrid")}
						</option>
					</select>
				</div>

				{/* Field Weights */}
				<div className="space-y-2">
					<Label>{t("recommendations.settings.fieldWeights")}</Label>
					<p className="text-xs text-muted-foreground">
						{t("recommendations.settings.fieldWeightsHint")}
					</p>
					<div className="space-y-2">
						{(["title", "description", "category"] as const).map((field) => (
							<div key={field} className="gap-3 flex items-center">
								<Label
									htmlFor={`weight-${field}`}
									className="w-24 text-sm font-normal shrink-0"
								>
									{t(
										`recommendations.settings.field${field.charAt(0).toUpperCase() + field.slice(1)}`,
									)}
								</Label>
								<Input
									id={`weight-${field}`}
									type="number"
									min={0}
									max={10}
									step={0.5}
									value={settings.fieldWeights[field]}
									onChange={(e) =>
										setSettings({
											...settings,
											fieldWeights: {
												...settings.fieldWeights,
												[field]: Number(e.target.value),
											},
										})
									}
									className="w-20"
								/>
							</div>
						))}
					</div>
				</div>

				<Button onClick={handleSave}>{t("recommendations.settings.save")}</Button>
			</CardContent>
		</Card>
	);
}
