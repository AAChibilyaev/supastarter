"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Slider } from "@repo/ui/components/slider";
import { toastSuccess, toastError } from "@repo/ui/components/toast";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface RecommendationsSettingsProps {
	organizationId: string;
}

const DEFAULT_COUNT = 10;
const DEFAULT_ALGORITHM = "graph";
const DEFAULT_TITLE_WEIGHT = 10;
const DEFAULT_DESC_WEIGHT = 5;
const DEFAULT_CAT_WEIGHT = 3;

export function RecommendationsSettings({
	organizationId: _organizationId,
}: RecommendationsSettingsProps) {
	const tr = useTranslations("search");

	const [count, setCount] = useState(DEFAULT_COUNT);
	const [algorithm, setAlgorithm] = useState(DEFAULT_ALGORITHM);
	const [titleWeight, setTitleWeight] = useState(DEFAULT_TITLE_WEIGHT);
	const [descWeight, setDescWeight] = useState(DEFAULT_DESC_WEIGHT);
	const [catWeight, setCatWeight] = useState(DEFAULT_CAT_WEIGHT);
	const [saving, setSaving] = useState(false);

	const handleSave = useCallback(async () => {
		setSaving(true);
		try {
			// Simulate save — in production this would call an oRPC procedure
			await new Promise((resolve) => setTimeout(resolve, 500));
			toastSuccess(tr("recommendations.settings.saved"));
		} catch {
			toastError(tr("recommendations.settings.saveError"));
		} finally {
			setSaving(false);
		}
	}, [tr]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{tr("recommendations.settings.title")}</CardTitle>
				<CardDescription>{tr("recommendations.settings.countHint")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Count */}
				<div className="space-y-3">
					<Label>{tr("recommendations.settings.count")}</Label>
					<div className="gap-4 flex items-center">
						<Slider
							value={[count]}
							onValueChange={([v]) => setCount(v)}
							min={1}
							max={100}
							step={1}
							className="flex-1"
						/>
						<span className="w-8 text-sm font-medium text-right">{count}</span>
					</div>
				</div>

				{/* Algorithm */}
				<div className="space-y-3">
					<Label>{tr("recommendations.settings.algorithm")}</Label>
					<p className="text-sm text-muted-foreground">
						{tr("recommendations.settings.algorithmHint")}
					</p>
					<RadioGroup value={algorithm} onValueChange={setAlgorithm}>
						<div className="gap-2 flex items-center">
							<RadioGroupItem value="graph" id="algo-graph" />
							<Label htmlFor="algo-graph">
								{tr("recommendations.settings.algorithmGraph")}
							</Label>
						</div>
						<div className="gap-2 flex items-center">
							<RadioGroupItem value="vector" id="algo-vector" />
							<Label htmlFor="algo-vector">
								{tr("recommendations.settings.algorithmVector")}
							</Label>
						</div>
						<div className="gap-2 flex items-center">
							<RadioGroupItem value="hybrid" id="algo-hybrid" />
							<Label htmlFor="algo-hybrid">
								{tr("recommendations.settings.algorithmHybrid")}
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Field weights */}
				<div className="space-y-3">
					<Label>{tr("recommendations.settings.fieldWeights")}</Label>
					<p className="text-sm text-muted-foreground">
						{tr("recommendations.settings.fieldWeightsHint")}
					</p>

					<div className="max-w-xs gap-4 grid">
						<div className="space-y-1.5">
							<Label className="text-sm">
								{tr("recommendations.settings.fieldTitle")}
							</Label>
							<Input
								type="number"
								value={titleWeight}
								onChange={(e) => setTitleWeight(Number(e.target.value))}
								min={0}
								max={100}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-sm">
								{tr("recommendations.settings.fieldDescription")}
							</Label>
							<Input
								type="number"
								value={descWeight}
								onChange={(e) => setDescWeight(Number(e.target.value))}
								min={0}
								max={100}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-sm">
								{tr("recommendations.settings.fieldCategory")}
							</Label>
							<Input
								type="number"
								value={catWeight}
								onChange={(e) => setCatWeight(Number(e.target.value))}
								min={0}
								max={100}
							/>
						</div>
					</div>
				</div>

				<Button onClick={handleSave} disabled={saving}>
					{saving
						? tr("recommendations.settings.saved")
						: tr("recommendations.settings.save")}
				</Button>
			</CardContent>
		</Card>
	);
}
