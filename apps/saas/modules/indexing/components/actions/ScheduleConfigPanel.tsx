"use client";

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
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Save } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

interface ScheduleConfigPanelProps {
	organizationId: string;
	slug: string;
}

const INTERVAL_OPTIONS = [
	{ value: "5", label: "Every 5 minutes" },
	{ value: "15", label: "Every 15 minutes" },
	{ value: "60", label: "Every hour" },
	{ value: "360", label: "Every 6 hours" },
	{ value: "1440", label: "Every 24 hours" },
] as const;

// ── Main component ───────────────────────────────────────────────

export function ScheduleConfigPanel({ organizationId, slug }: ScheduleConfigPanelProps) {
	const queryClient = useQueryClient();

	// ── Fetch existing schedule ──────────────────────────────────

	// Note: schedules.list returns all schedules for the org; filter by slug
	const { data: schedulesData, isLoading } = useQuery(
		orpc.indexing.schedules.list.queryOptions({
			input: { organizationId },
			enabled: Boolean(organizationId),
		}),
	);

	const currentSchedule = schedulesData?.schedules?.find((s) => s.slug === slug);
	const currentInterval = currentSchedule?.intervalMinutes ?? null;
	const selectedInterval = currentInterval ? String(currentInterval) : INTERVAL_OPTIONS[2].value;

	// ── Create/Update schedule ────────────────────────────────────

	const saveMutation = useMutation(
		orpc.indexing.schedules.create.mutationOptions({
			onSuccess: async () => {
				toastSuccess("Schedule saved");
				await queryClient.invalidateQueries({
					queryKey: orpc.indexing.schedules.list.key(),
				});
			},
			onError: () => {
				toastError("Failed to save schedule");
			},
		}),
	);

	const handleSave = async (intervalValue: string) => {
		await saveMutation.mutateAsync({
			organizationId,
			slug,
			intervalMinutes: Number(intervalValue),
		});
	};

	// ── Loading ───────────────────────────────────────────────────

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<Clock className="size-4" />
						Schedule
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-9 w-24" />
				</CardContent>
			</Card>
		);
	}

	// ── Render ────────────────────────────────────────────────────

	return (
		<Card>
			<CardHeader>
				<CardTitle className="gap-2 text-base flex items-center">
					<Clock className="size-4" />
					Schedule
				</CardTitle>
				<CardDescription>Auto-index every:</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="gap-3 flex items-end">
					<Select value={selectedInterval} onValueChange={(val) => handleSave(val)}>
						<SelectTrigger className="w-56">
							<SelectValue placeholder="Select interval..." />
						</SelectTrigger>
						<SelectContent>
							{INTERVAL_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						variant="default"
						size="sm"
						className="gap-1.5"
						disabled={saveMutation.isPending}
						onClick={() => handleSave(selectedInterval)}
					>
						<Save className="size-3.5" />
						{saveMutation.isPending ? "Saving..." : "Save"}
					</Button>
				</div>

				{currentSchedule && (
					<p className="text-xs text-muted-foreground">
						Current: every {currentSchedule.intervalMinutes} minutes
					</p>
				)}
			</CardContent>
		</Card>
	);
}
