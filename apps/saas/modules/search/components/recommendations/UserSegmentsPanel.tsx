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
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface UserSegmentsPanelProps {
	organizationId: string;
}

export function UserSegmentsPanel({ organizationId }: UserSegmentsPanelProps) {
	const tr = useTranslations("search");
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [editSegmentId, setEditSegmentId] = useState<string | null>(null);

	const { data: segmentsData, isLoading: segmentsLoading } = useQuery(
		orpc.recommendations.listUserSegments.queryOptions({
			input: { organizationId },
			enabled: Boolean(organizationId),
		}),
	);

	const { data: statsData, isLoading: statsLoading } = useQuery(
		orpc.recommendations.getUserSegmentStats.queryOptions({
			input: { organizationId, window: 90 },
			enabled: Boolean(organizationId),
		}),
	);

	const deleteMutation = useMutation(
		orpc.recommendations.deleteUserSegment.mutationOptions({
			onSuccess: () => {
				toastSuccess(tr("recommendations.segments.deleted"));
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.listUserSegments.queryKey({
						input: { organizationId },
					}),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.getUserSegmentStats.queryKey({
						input: { organizationId, window: 90 },
					}),
				});
			},
			onError: () => {
				toastError(tr("recommendations.segments.deleteError"));
			},
		}),
	);

	const predefined = segmentsData?.predefined ?? [];
	const custom = segmentsData?.custom ?? [];
	const stats = statsData?.segments ?? [];
	const isLoading = segmentsLoading || statsLoading;

	const statsMap = new Map(stats.map((s) => [s.id, s]));

	return (
		<div className="space-y-4">
			{/* Custom segments actions */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<div>
						<CardTitle className="gap-2 text-base flex items-center">
							<UsersIcon className="size-4 text-primary" />
							{tr("recommendations.segments.title")}
						</CardTitle>
						<CardDescription>
							{tr("recommendations.segments.description")}
						</CardDescription>
					</div>
					<Dialog open={createOpen} onOpenChange={setCreateOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<PlusIcon className="size-4 mr-1" />
								{tr("recommendations.segments.createButton")}
							</Button>
						</DialogTrigger>
						<CreateSegmentDialog
							organizationId={organizationId}
							onClose={() => setCreateOpen(false)}
						/>
					</Dialog>
				</CardHeader>
			</Card>

			{/* Predefined Segments */}
			{isLoading ? (
				<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
					{[1, 2, 3].map((i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-8 w-16" />
								<Skeleton className="h-3 w-32" />
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<>
					{/* Predefined segments grid */}
					{predefined.length > 0 && (
						<div className="gap-4 md:grid-cols-3 grid grid-cols-1">
							{predefined.map((seg) => {
								const segStats = statsMap.get(seg.id);
								return (
									<Card key={seg.id}>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<CardTitle className="text-sm">
													{seg.name}
												</CardTitle>
												<Badge status="info">
													{tr("recommendations.segments.predefined")}
												</Badge>
											</div>
											<CardDescription className="text-xs">
												{seg.description}
											</CardDescription>
										</CardHeader>
										<CardContent>
											{segStats ? (
												<div className="space-y-1">
													<div className="gap-2 flex items-baseline">
														<span className="text-2xl font-bold">
															{segStats.userCount}
														</span>
														<span className="text-xs text-muted-foreground">
															{tr("recommendations.segments.users")}
														</span>
													</div>
													<div className="text-xs text-muted-foreground">
														{tr("recommendations.segments.avgEvents")}:{" "}
														{segStats.averageEvents} |{" "}
														{tr("recommendations.segments.totalEvents")}
														: {segStats.totalEvents}
													</div>
												</div>
											) : (
												<div className="text-xs text-muted-foreground">
													{tr("recommendations.segments.noStats")}
												</div>
											)}
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					{/* Custom segments list */}
					{custom.length === 0 ? (
						<Card>
							<CardContent className="pt-6">
								<EmptyState
									variant="inline"
									icon={UsersIcon}
									title={tr("recommendations.segments.noCustomSegments")}
									description={tr(
										"recommendations.segments.noCustomSegmentsDesc",
									)}
									action={{
										label: tr("recommendations.segments.createButton"),
										onClick: () => setCreateOpen(true),
									}}
								/>
							</CardContent>
						</Card>
					) : (
						<div className="gap-4 grid grid-cols-1">
							{custom.map((seg) => {
								const segStats = statsMap.get(seg.id);
								return (
									<Card key={seg.id}>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<div>
													<CardTitle className="text-sm">
														{seg.name}
													</CardTitle>
													{seg.description && (
														<CardDescription className="text-xs">
															{seg.description}
														</CardDescription>
													)}
												</div>
												<div className="gap-2 flex items-center">
													<Badge status="warning">
														{tr("recommendations.segments.custom")}
													</Badge>
													<Dialog
														open={editSegmentId === seg.id}
														onOpenChange={(open) => {
															if (!open) setEditSegmentId(null);
														}}
													>
														<DialogTrigger asChild>
															<Button
																variant="outline"
																size="icon"
																className="size-7"
																onClick={() =>
																	setEditSegmentId(seg.id)
																}
															>
																<PencilIcon className="size-3" />
															</Button>
														</DialogTrigger>
														<EditSegmentDialog
															organizationId={organizationId}
															segment={seg}
															onClose={() => setEditSegmentId(null)}
														/>
													</Dialog>
													<Button
														variant="destructive"
														size="icon"
														className="size-7"
														onClick={() =>
															deleteMutation.mutate({
																organizationId,
																segmentId: seg.id,
															})
														}
													>
														<Trash2Icon className="size-3" />
													</Button>
												</div>
											</div>
										</CardHeader>
										<CardContent>
											{segStats ? (
												<div className="gap-6 text-sm flex">
													<div>
														<span className="text-muted-foreground">
															{tr("recommendations.segments.users")}:
														</span>{" "}
														<span className="font-medium">
															{segStats.userCount}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">
															{tr(
																"recommendations.segments.avgEvents",
															)}
															:
														</span>{" "}
														<span className="font-medium">
															{segStats.averageEvents}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">
															{tr(
																"recommendations.segments.totalEvents",
															)}
															:
														</span>{" "}
														<span className="font-medium">
															{segStats.totalEvents}
														</span>
													</div>
												</div>
											) : (
												<div className="text-xs text-muted-foreground">
													{tr("recommendations.segments.noStats")}
												</div>
											)}

											{/* Segment criteria display */}
											<div className="mt-3 gap-2 flex flex-wrap">
												{seg.criteria.minEvents !== undefined && (
													<Badge variant="outline" className="text-xs">
														Min events: {seg.criteria.minEvents}
													</Badge>
												)}
												{seg.criteria.maxEvents !== undefined && (
													<Badge variant="outline" className="text-xs">
														Max events: {seg.criteria.maxEvents}
													</Badge>
												)}
												{seg.criteria.queryPatterns &&
													seg.criteria.queryPatterns.length > 0 && (
														<Badge
															variant="outline"
															className="text-xs"
														>
															{seg.criteria.queryPatterns.length}{" "}
															query pattern(s)
														</Badge>
													)}
												{seg.criteria.lastActiveDays !== undefined && (
													<Badge variant="outline" className="text-xs">
														{seg.criteria.lastActiveDays}d window
													</Badge>
												)}
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
}

// ─── Create Segment Dialog ─────────────────────────────────────────────────

function CreateSegmentDialog({
	organizationId,
	onClose,
}: {
	organizationId: string;
	onClose: () => void;
}) {
	const tr = useTranslations("search");
	const queryClient = useQueryClient();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [minEvents, setMinEvents] = useState("");
	const [maxEvents, setMaxEvents] = useState("");
	const [lastActiveDays, setLastActiveDays] = useState("90");

	const createMutation = useMutation(
		orpc.recommendations.createUserSegment.mutationOptions({
			onSuccess: () => {
				toastSuccess(tr("recommendations.segments.created"));
				onClose();
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.listUserSegments.queryKey({
						input: { organizationId },
					}),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.getUserSegmentStats.queryKey({
						input: { organizationId, window: 90 },
					}),
				});
			},
			onError: () => {
				toastError(tr("recommendations.segments.createError"));
			},
		}),
	);

	const handleCreate = () => {
		if (!name.trim()) return;

		const criteria: Record<string, number | string[]> = {};
		if (minEvents) criteria.minEvents = Number.parseInt(minEvents, 10);
		if (maxEvents) criteria.maxEvents = Number.parseInt(maxEvents, 10);
		if (lastActiveDays) criteria.lastActiveDays = Number.parseInt(lastActiveDays, 10);

		createMutation.mutate({
			organizationId,
			segment: {
				name: name.trim(),
				description: description.trim(),
				criteria,
			},
		});
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{tr("recommendations.segments.createDialogTitle")}</DialogTitle>
				<DialogDescription>
					{tr("recommendations.segments.createDialogDescription")}
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="seg-name">{tr("recommendations.segments.segmentName")}</Label>
					<Input
						id="seg-name"
						placeholder={tr("recommendations.segments.segmentNamePlaceholder")}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="seg-desc">
						{tr("recommendations.segments.segmentDescription")}
					</Label>
					<Textarea
						id="seg-desc"
						placeholder={tr("recommendations.segments.segmentDescriptionPlaceholder")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={2}
					/>
				</div>
				<div className="gap-4 grid grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="seg-min">{tr("recommendations.segments.minEvents")}</Label>
						<Input
							id="seg-min"
							type="number"
							min={0}
							placeholder="0"
							value={minEvents}
							onChange={(e) => setMinEvents(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="seg-max">{tr("recommendations.segments.maxEvents")}</Label>
						<Input
							id="seg-max"
							type="number"
							min={1}
							placeholder="-"
							value={maxEvents}
							onChange={(e) => setMaxEvents(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="seg-days">
							{tr("recommendations.segments.timeWindow")}
						</Label>
						<Input
							id="seg-days"
							type="number"
							min={1}
							max={365}
							placeholder="90"
							value={lastActiveDays}
							onChange={(e) => setLastActiveDays(e.target.value)}
						/>
					</div>
				</div>
			</div>
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">{tr("recommendations.segments.cancel")}</Button>
				</DialogClose>
				<Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
					{createMutation.isPending
						? tr("recommendations.segments.creating")
						: tr("recommendations.segments.createButton")}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

// ─── Edit Segment Dialog ───────────────────────────────────────────────────

function EditSegmentDialog({
	organizationId,
	segment,
	onClose,
}: {
	organizationId: string;
	segment: {
		id: string;
		name: string;
		description?: string;
		criteria: {
			minEvents?: number;
			maxEvents?: number;
			queryPatterns?: string[];
			lastActiveDays?: number;
		};
	};
	onClose: () => void;
}) {
	const tr = useTranslations("search");
	const queryClient = useQueryClient();

	const [name, setName] = useState(segment.name);
	const [description, setDescription] = useState(segment.description ?? "");
	const [minEvents, setMinEvents] = useState(segment.criteria.minEvents?.toString() ?? "");
	const [maxEvents, setMaxEvents] = useState(segment.criteria.maxEvents?.toString() ?? "");
	const [lastActiveDays, setLastActiveDays] = useState(
		segment.criteria.lastActiveDays?.toString() ?? "90",
	);

	const updateMutation = useMutation(
		orpc.recommendations.updateUserSegment.mutationOptions({
			onSuccess: () => {
				toastSuccess(tr("recommendations.segments.updated"));
				onClose();
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.listUserSegments.queryKey({
						input: { organizationId },
					}),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.recommendations.getUserSegmentStats.queryKey({
						input: { organizationId, window: 90 },
					}),
				});
			},
			onError: () => {
				toastError(tr("recommendations.segments.updateError"));
			},
		}),
	);

	const handleUpdate = () => {
		if (!name.trim()) return;

		const updates: Record<string, unknown> = { name: name.trim() };
		if (description.trim()) updates.description = description.trim();
		updates.criteria = {};
		if (minEvents)
			(updates.criteria as Record<string, number>).minEvents = Number.parseInt(minEvents, 10);
		if (maxEvents)
			(updates.criteria as Record<string, number>).maxEvents = Number.parseInt(maxEvents, 10);
		if (lastActiveDays)
			(updates.criteria as Record<string, number>).lastActiveDays = Number.parseInt(
				lastActiveDays,
				10,
			);

		updateMutation.mutate({
			organizationId,
			segmentId: segment.id,
			updates,
		});
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{tr("recommendations.segments.editDialogTitle")}</DialogTitle>
				<DialogDescription>
					{tr("recommendations.segments.editDialogDescription")}
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="edit-seg-name">
						{tr("recommendations.segments.segmentName")}
					</Label>
					<Input
						id="edit-seg-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="edit-seg-desc">
						{tr("recommendations.segments.segmentDescription")}
					</Label>
					<Textarea
						id="edit-seg-desc"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={2}
					/>
				</div>
				<div className="gap-4 grid grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="edit-seg-min">
							{tr("recommendations.segments.minEvents")}
						</Label>
						<Input
							id="edit-seg-min"
							type="number"
							min={0}
							value={minEvents}
							onChange={(e) => setMinEvents(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-seg-max">
							{tr("recommendations.segments.maxEvents")}
						</Label>
						<Input
							id="edit-seg-max"
							type="number"
							min={1}
							value={maxEvents}
							onChange={(e) => setMaxEvents(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-seg-days">
							{tr("recommendations.segments.timeWindow")}
						</Label>
						<Input
							id="edit-seg-days"
							type="number"
							min={1}
							max={365}
							value={lastActiveDays}
							onChange={(e) => setLastActiveDays(e.target.value)}
						/>
					</div>
				</div>
			</div>
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">{tr("recommendations.segments.cancel")}</Button>
				</DialogClose>
				<Button onClick={handleUpdate} disabled={!name.trim() || updateMutation.isPending}>
					{updateMutation.isPending
						? tr("recommendations.segments.updating")
						: tr("recommendations.segments.saveButton")}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
