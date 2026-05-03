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
import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Slider } from "@repo/ui/components/slider";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface RecommendationsSettingsProps {
	organizationId: string;
}

interface PersonalizationConfigForm {
	sourceEvents: string[];
	decayFactor: number;
	minEventsPerUser: number;
	timeWindowDays: number;
}

export function RecommendationsSettings({ organizationId }: RecommendationsSettingsProps) {
	const tr = useTranslations("search");
	const queryClient = useQueryClient();

	const { data: config, isLoading } = useQuery(
		orpc.recommendations.getPersonalizationConfig.queryOptions({
			input: { organizationId },
			enabled: Boolean(organizationId),
		}),
	);

	const [form, setForm] = useState<PersonalizationConfigForm | null>(null);
	const initialized = form !== null;

	if (!initialized && !isLoading && config) {
		setForm({
			sourceEvents: [...config.sourceEvents],
			decayFactor: config.decayFactor,
			minEventsPerUser: config.minEventsPerUser,
			timeWindowDays: config.timeWindowDays,
		});
	}

	const mutation = useMutation(
		orpc.recommendations.updatePersonalizationConfig.mutationOptions({
			onSuccess: () => {
				toastSuccess(tr("recommendations.settings.configSaved"));
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.getPersonalizationConfig.queryOptions({
						input: { organizationId },
					}).queryKey,
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.personalizationOverview.queryOptions({
						input: { organizationId, window: 7 },
					}).queryKey,
				});
			},
			onError: () => toastError(tr("recommendations.settings.configSaveError")),
		}),
	);

	const handleToggleEvent = (event: string, checked: boolean) => {
		if (!form) return;
		const updated = checked
			? [...form.sourceEvents, event]
			: form.sourceEvents.filter((e) => e !== event);
		setForm({ ...form, sourceEvents: updated.length > 0 ? updated : [event] });
	};

	const handleSave = () => {
		if (!form) return;
		mutation.mutate({
			organizationId,
			config: {
				sourceEvents: form.sourceEvents as ("click" | "purchase" | "view")[],
				decayFactor: form.decayFactor,
				minEventsPerUser: form.minEventsPerUser,
				timeWindowDays: form.timeWindowDays,
			},
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!form) return null;

	return (
		<Card>
			<CardHeader>
				<div className="gap-2 flex items-center justify-between">
					<div>
						<CardTitle className="text-base">
							{tr("recommendations.settings.personalizationModelTitle")}
						</CardTitle>
						<CardDescription>
							{tr("recommendations.settings.personalizationModelDesc")}
						</CardDescription>
					</div>
					<Badge
						status={
							form.sourceEvents.length > 0 && form.minEventsPerUser <= 50 ? "success" : "warning"
						}
					>
						{form.sourceEvents.length > 0
							? tr("recommendations.overview.enabled")
							: tr("recommendations.overview.disabled")}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Source Events */}
				<div className="space-y-3">
					<Label>{tr("recommendations.settings.sourceEvents")}</Label>
					<p className="text-sm text-muted-foreground">
						{tr("recommendations.settings.sourceEventsHint")}
					</p>
					<div className="gap-3 flex flex-wrap">
						{(["click", "purchase", "view"] as const).map((event) => (
							<Label key={event} className="gap-2 text-sm flex cursor-pointer items-center">
								<Checkbox
									checked={form.sourceEvents.includes(event)}
									onCheckedChange={(checked) => handleToggleEvent(event, checked === true)}
								/>
								{tr(
									`recommendations.settings.source${event.charAt(0).toUpperCase() + event.slice(1)}`,
								)}
							</Label>
						))}
					</div>
				</div>

				{/* Decay Factor */}
				<div className="space-y-3">
					<div className="gap-2 flex items-center justify-between">
						<Label>{tr("recommendations.settings.decayFactor")}</Label>
						<span className="text-sm font-mono text-muted-foreground">
							{form.decayFactor.toFixed(1)}
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{tr("recommendations.settings.decayFactorHint")}
					</p>
					<Slider
						value={[form.decayFactor]}
						onValueChange={([v]) => setForm({ ...form, decayFactor: v })}
						min={0.1}
						max={1.0}
						step={0.1}
					/>
				</div>

				{/* Min Events Per User */}
				<div className="space-y-3">
					<div className="gap-2 flex items-center justify-between">
						<Label>{tr("recommendations.settings.minEventsPerUser")}</Label>
						<span className="text-sm font-mono text-muted-foreground">{form.minEventsPerUser}</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{tr("recommendations.settings.minEventsPerUserHint")}
					</p>
					<Slider
						value={[form.minEventsPerUser]}
						onValueChange={([v]) => setForm({ ...form, minEventsPerUser: v })}
						min={0}
						max={50}
						step={1}
					/>
				</div>

				{/* Time Window */}
				<div className="space-y-3">
					<Label>{tr("recommendations.settings.timeWindow")}</Label>
					<RadioGroup
						value={String(form.timeWindowDays)}
						onValueChange={(v) => setForm({ ...form, timeWindowDays: Number(v) })}
					>
						{[7, 30, 90].map((days) => (
							<div key={days} className="gap-2 flex items-center">
								<RadioGroupItem value={String(days)} id={`tw-${days}`} />
								<Label htmlFor={`tw-${days}`}>
									{tr("recommendations.settings.timeWindowDays", { days })}
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>

				<Button onClick={handleSave} loading={mutation.isPending}>
					{tr("recommendations.settings.save")}
				</Button>
			</CardContent>
		</Card>
	);
}
