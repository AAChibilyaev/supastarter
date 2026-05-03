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
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { EmptyState } from "@shared/components/EmptyState";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeftRightIcon,
	CheckCircle2Icon,
	FlaskConicalIcon,
	Loader2Icon,
	PauseCircleIcon,
	PlayCircleIcon,
	PlusIcon,
	StopCircleIcon,
	TrophyIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

interface ABTestConfig {
	id: string;
	name: string;
	description: string;
	status: "draft" | "running" | "stopped" | "completed";
	configB: {
		queryBy?: string;
		rankingRules?: string[];
		synonyms?: Array<{ synonym: string; root: string }>;
	};
	trafficSplit: number;
	startDate: string;
	endDate?: string;
	createdAt: string;
	stoppedAt?: string;
	winnerVariant?: "A" | "B";
}

interface ABTestPageProps {
	organizationId: string;
}

const STATUS_COLORS: Record<string, "info" | "success" | "warning" | "muted"> = {
	draft: "muted",
	running: "info",
	stopped: "warning",
	completed: "success",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
	draft: <XCircleIcon className="size-3.5" />,
	running: <PlayCircleIcon className="size-3.5" />,
	stopped: <PauseCircleIcon className="size-3.5" />,
	completed: <CheckCircle2Icon className="size-3.5" />,
};

// ─── Create ABTest Dialog ─────────────────────────────────────────────────

function CreateABTestDialog({
	organizationId,
	indexSlug,
	open,
	onOpenChange,
}: {
	organizationId: string;
	indexSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [queryByB, setQueryByB] = useState("");
	const [trafficSplit, setTrafficSplit] = useState(50);
	const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
	const [endDate, setEndDate] = useState("");

	const createMutation = useMutation(
		orpc.search.abTest.create.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("search.abTest.createdSuccess"));
				queryClient.invalidateQueries({
					queryKey: orpc.search.abTest.list.queryKey({ organizationId, slug: indexSlug }),
				});
				onOpenChange(false);
				resetForm();
			},
			onError: (err) => {
				toastError(err.message || t("search.abTest.createFailed"));
			},
		}),
	);

	const resetForm = () => {
		setName("");
		setDescription("");
		setQueryByB("");
		setTrafficSplit(50);
		setStartDate(new Date().toISOString().slice(0, 10));
		setEndDate("");
	};

	const handleSubmit = () => {
		if (!name.trim()) {
			toastError(t("search.abTest.nameRequired"));
			return;
		}
		if (!queryByB.trim() && indexSlug) {
			toastError(t("search.abTest.configRequired"));
			return;
		}
		createMutation.mutate({
			organizationId,
			slug: indexSlug,
			name: name.trim(),
			description: description.trim(),
			configB: {
				queryBy: queryByB.trim() || undefined,
			},
			trafficSplit,
			startDate: new Date(startDate).toISOString(),
			endDate: endDate ? new Date(endDate).toISOString() : undefined,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button>
					<PlusIcon className="size-4" />
					{t("search.abTest.createNew")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("search.abTest.createTitle")}</DialogTitle>
					<DialogDescription>{t("search.abTest.createDescription")}</DialogDescription>
				</DialogHeader>
				<div className="gap-4 py-4 grid">
					<div className="gap-2 grid">
						<label className="text-sm font-medium">{t("search.abTest.testName")}</label>
						<input
							className="h-10 px-3 py-2 text-sm file:text-sm file:font-medium flex w-full rounded-md border border-input bg-background ring-offset-background file:border-0 file:bg-transparent placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder={t("search.abTest.testNamePlaceholder")}
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="gap-2 grid">
						<label className="text-sm font-medium">
							{t("search.abTest.description")}
						</label>
						<input
							className="h-10 px-3 py-2 text-sm file:text-sm file:font-medium flex w-full rounded-md border border-input bg-background ring-offset-background file:border-0 file:bg-transparent placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder={t("search.abTest.descriptionPlaceholder")}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="gap-2 grid">
						<label className="text-sm font-medium">
							{t("search.abTest.configBQueryBy")}
						</label>
						<input
							className="h-10 px-3 py-2 text-sm file:text-sm file:font-medium flex w-full rounded-md border border-input bg-background ring-offset-background file:border-0 file:bg-transparent placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder={t("search.abTest.queryByPlaceholder")}
							value={queryByB}
							onChange={(e) => setQueryByB(e.target.value)}
						/>
					</div>
					<div className="gap-2 grid">
						<label className="text-sm font-medium">
							{t("search.abTest.trafficSplit")}
						</label>
						<div className="gap-3 flex items-center">
							<input
								type="range"
								min={5}
								max={95}
								step={5}
								className="flex-1"
								value={trafficSplit}
								onChange={(e) => setTrafficSplit(Number(e.target.value))}
							/>
							<span className="text-sm font-mono min-w-12 text-right tabular-nums">
								{trafficSplit}% B / {100 - trafficSplit}% A
							</span>
						</div>
					</div>
					<div className="gap-2 grid grid-cols-2">
						<div className="gap-2 grid">
							<label className="text-sm font-medium">
								{t("search.abTest.startDate")}
							</label>
							<input
								type="date"
								className="h-10 px-3 py-2 text-sm flex w-full rounded-md border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<div className="gap-2 grid">
							<label className="text-sm font-medium">
								{t("search.abTest.endDate")}
							</label>
							<input
								type="date"
								className="h-10 px-3 py-2 text-sm flex w-full rounded-md border border-input bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("search.abTest.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={createMutation.isPending}>
						{createMutation.isPending ? (
							<Loader2Icon className="size-4 animate-spin" />
						) : (
							<FlaskConicalIcon className="size-4" />
						)}
						{t("search.abTest.startTest")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── ABTest Card ──────────────────────────────────────────────────────────

function ABTestCard({
	test,
	organizationId,
	indexSlug,
	onRefresh,
}: {
	test: ABTestConfig;
	organizationId: string;
	indexSlug: string;
	onRefresh: () => void;
}) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const stopMutation = useMutation(
		orpc.search.abTest.updateStatus.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("search.abTest.stoppedSuccess"));
				queryClient.invalidateQueries({
					queryKey: orpc.search.abTest.list.queryKey({ organizationId, slug: indexSlug }),
				});
				onRefresh();
			},
			onError: (err) => {
				toastError(err.message || t("search.abTest.failedToStop"));
			},
		}),
	);

	const applyMutation = useMutation(
		orpc.search.abTest.updateStatus.mutationOptions({
			onSuccess: () => {
				toastSuccess(t("search.abTest.winnerApplied"));
				queryClient.invalidateQueries({
					queryKey: orpc.search.abTest.list.queryKey({ organizationId, slug: indexSlug }),
				});
				onRefresh();
			},
			onError: (err) => {
				toastError(err.message || t("search.abTest.failedToApply"));
			},
		}),
	);

	const handleStop = () => {
		stopMutation.mutate({
			organizationId,
			slug: indexSlug,
			testId: test.id,
			status: "stopped",
		});
	};

	const handleApplyWinner = (variant: "A" | "B") => {
		applyMutation.mutate({
			organizationId,
			slug: indexSlug,
			testId: test.id,
			status: "completed",
			winnerVariant: variant,
		});
	};

	const diffLines = useMemo(() => {
		const lines: Array<{ label: string; a: string; b: string }> = [];
		if (test.configB.queryBy) {
			lines.push({
				label: t("search.abTest.queryBy"),
				a: t("search.abTest.currentConfig"),
				b: test.configB.queryBy,
			});
		}
		if (test.configB.rankingRules && test.configB.rankingRules.length > 0) {
			lines.push({
				label: t("search.abTest.rankingRules"),
				a: t("search.abTest.currentConfig"),
				b: test.configB.rankingRules.join(", "),
			});
		}
		if (test.configB.synonyms && test.configB.synonyms.length > 0) {
			lines.push({
				label: t("search.abTest.synonyms"),
				a: t("search.abTest.currentConfig"),
				b: `${test.configB.synonyms.length} ${t("search.abTest.synonymRules")}`,
			});
		}
		return lines;
	}, [test, t]);

	const { data: results } = useQuery(
		orpc.search.abTest.results.queryOptions({
			input: {
				organizationId,
				slug: indexSlug,
				testId: test.id,
			},
			enabled:
				test.status === "running" ||
				test.status === "stopped" ||
				test.status === "completed",
		}),
	);

	return (
		<Card>
			<CardHeader className="flex-row items-start justify-between">
				<div className="gap-1 grid">
					<div className="gap-2 flex items-center">
						<CardTitle className="text-base">{test.name}</CardTitle>
						<Badge status={STATUS_COLORS[test.status]} className="gap-1">
							{STATUS_ICONS[test.status]}
							{t(`search.abTest.status_${test.status}`)}
						</Badge>
						{test.winnerVariant && (
							<Badge status="success" className="gap-1">
								<TrophyIcon className="size-3.5" />
								{t("search.abTest.winner")} {test.winnerVariant}
							</Badge>
						)}
					</div>
					{test.description && <CardDescription>{test.description}</CardDescription>}
				</div>
				{test.status === "running" && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleStop}
						disabled={stopMutation.isPending}
					>
						<StopCircleIcon className="size-4" />
						{t("search.abTest.stopTest")}
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Traffic split bar */}
				<div className="gap-2 grid">
					<div className="text-sm flex justify-between">
						<span className="font-medium text-muted-foreground">
							{t("search.abTest.trafficSplit")}
						</span>
						<span className="text-xs text-muted-foreground tabular-nums">
							A: {100 - test.trafficSplit}% &mdash; B: {test.trafficSplit}%
						</span>
					</div>
					<div className="h-2 flex w-full overflow-hidden rounded-full bg-muted">
						<div
							className="bg-chart-1 h-full rounded-full transition-all"
							style={{ width: `${100 - test.trafficSplit}%` }}
						/>
						<div
							className="bg-chart-2 h-full rounded-full transition-all"
							style={{ width: `${test.trafficSplit}%` }}
						/>
					</div>
				</div>

				{/* Config diff */}
				{diffLines.length > 0 && (
					<div className="gap-2 grid">
						<span className="text-sm font-medium">{t("search.abTest.configDiff")}</span>
						<div className="gap-1 grid">
							{diffLines.map((line) => (
								<div
									key={line.label}
									className="gap-2 text-sm grid grid-cols-[100px_1fr_1fr]"
								>
									<span className="text-xs text-muted-foreground">
										{line.label}
									</span>
									<div className="rounded px-2 py-1 font-mono text-xs flex items-center bg-muted/50">
										<Badge
											status="info"
											className="mr-1 size-3.5 p-0 rounded-full text-[8px]"
										>
											A
										</Badge>
										{line.a}
									</div>
									<div className="rounded px-2 py-1 font-mono text-xs flex items-center bg-muted/50">
										<Badge
											status="success"
											className="mr-1 size-3.5 p-0 rounded-full text-[8px]"
										>
											B
										</Badge>
										{line.b}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Results section */}
				{results && (
					<div className="gap-3 grid">
						<span className="text-sm font-medium">{t("search.abTest.results")}</span>
						<div className="gap-4 grid grid-cols-2">
							{/* Variant A */}
							<div className="p-3 space-y-2 rounded-lg border">
								<div className="gap-1.5 flex items-center">
									<Badge
										status="info"
										className="size-4 p-0 rounded-full text-[10px]"
									>
										A
									</Badge>
									<span className="text-xs font-medium text-muted-foreground">
										{t("search.abTest.variantA")}
									</span>
								</div>
								<div className="gap-1.5 grid grid-cols-2">
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.searches")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantA.searches}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.clicks")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantA.clicks}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.ctr")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{(results.variantA.ctr * 100).toFixed(2)}%
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.zeroResults")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantA.zeroResults}
										</p>
									</div>
								</div>
							</div>
							{/* Variant B */}
							<div className="p-3 space-y-2 rounded-lg border">
								<div className="gap-1.5 flex items-center">
									<Badge
										status="success"
										className="size-4 p-0 rounded-full text-[10px]"
									>
										B
									</Badge>
									<span className="text-xs font-medium text-muted-foreground">
										{t("search.abTest.variantB")}
									</span>
								</div>
								<div className="gap-1.5 grid grid-cols-2">
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.searches")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantB.searches}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.clicks")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantB.clicks}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.ctr")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{(results.variantB.ctr * 100).toFixed(2)}%
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">
											{t("search.abTest.zeroResults")}
										</p>
										<p className="text-lg font-semibold tabular-nums">
											{results.variantB.zeroResults}
										</p>
									</div>
								</div>
							</div>
						</div>
						{/* Winner indicator */}
						{results.variantA.ctr > 0 && results.variantB.ctr > 0 && (
							<div className="text-xs text-muted-foreground">
								{results.variantA.ctr > results.variantB.ctr
									? t("search.abTest.variantALeading", {
											diff: (
												(results.variantA.ctr - results.variantB.ctr) *
												100
											).toFixed(2),
										})
									: results.variantB.ctr > results.variantA.ctr
										? t("search.abTest.variantBLeading", {
												diff: (
													(results.variantB.ctr - results.variantA.ctr) *
													100
												).toFixed(2),
											})
										: t("search.abTest.variantsTied")}
							</div>
						)}
					</div>
				)}

				{/* Winner actions for stopped tests */}
				{test.status === "stopped" && !test.winnerVariant && (
					<div className="gap-2 pt-2 flex items-center">
						<span className="text-sm text-muted-foreground">
							{t("search.abTest.declareWinner")}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleApplyWinner("A")}
							disabled={applyMutation.isPending}
						>
							<TrophyIcon className="size-3.5" />
							{t("search.abTest.winnerA")}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleApplyWinner("B")}
							disabled={applyMutation.isPending}
						>
							<TrophyIcon className="size-3.5" />
							{t("search.abTest.winnerB")}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ─── ABTest List Table ────────────────────────────────────────────────────

function ABTestsTable({
	tests,
	organizationId,
	indexSlug,
}: {
	tests: ABTestConfig[];
	organizationId: string;
	indexSlug: string;
}) {
	const t = useTranslations();
	const format = new Intl.DateTimeFormat();

	if (tests.length === 0) {
		return (
			<EmptyState
				title={t("search.abTest.noTests")}
				description={t("search.abTest.noTestsDescription")}
				icon={FlaskConicalIcon}
			/>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("search.abTest.allTests")}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.abTest.name")}</TableHead>
							<TableHead>{t("search.abTest.status")}</TableHead>
							<TableHead className="text-right">
								{t("search.abTest.trafficSplit")}
							</TableHead>
							<TableHead>{t("search.abTest.winner")}</TableHead>
							<TableHead>{t("search.abTest.startDate")}</TableHead>
							<TableHead>{t("search.abTest.endDate")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tests.map((test) => (
							<TableRow key={test.id}>
								<TableCell className="font-medium">{test.name}</TableCell>
								<TableCell>
									<Badge status={STATUS_COLORS[test.status]} className="gap-1">
										{STATUS_ICONS[test.status]}
										{t(`search.abTest.status_${test.status}`)}
									</Badge>
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{test.trafficSplit}%
								</TableCell>
								<TableCell>
									{test.winnerVariant ? (
										<Badge status="success">
											<TrophyIcon className="size-3" />
											{test.winnerVariant}
										</Badge>
									) : (
										<span className="text-sm text-muted-foreground">
											&mdash;
										</span>
									)}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{format.format(new Date(test.startDate))}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{test.endDate
										? format.format(new Date(test.endDate))
										: "\u2014"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

// ─── Main Page Component ──────────────────────────────────────────────────

export function ABTestPage({ organizationId }: ABTestPageProps) {
	const t = useTranslations();
	const [selectedIndexSlug, setSelectedIndexSlug] = useState<string>("");
	const [createOpen, setCreateOpen] = useState(false);

	// Fetch indexes for the dropdown filter
	const { data: indexes = [] } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const { data: tests = [], isLoading } = useQuery(
		orpc.search.abTest.list.queryOptions({
			input: { organizationId, slug: selectedIndexSlug },
			enabled: !!selectedIndexSlug,
		}),
	);

	const refreshTests = () => {
		// Force refetch via query invalidation — handled by TanStack Query
	};

	if (indexes.length === 0 && !isLoading) {
		return (
			<EmptyState
				title={t("search.abTest.noIndexes")}
				description={t("search.abTest.noIndexesDescription")}
				icon={FlaskConicalIcon}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Controls row */}
			<div className="flex items-center justify-between">
				<div className="gap-3 flex items-center">
					<Select
						value={selectedIndexSlug}
						onValueChange={(val) => {
							setSelectedIndexSlug(val);
						}}
					>
						<SelectTrigger className="w-[280px]">
							<SelectValue placeholder={t("search.abTest.selectIndex")} />
						</SelectTrigger>
						<SelectContent>
							{indexes.map((idx: { slug: string; displayName: string }) => (
								<SelectItem key={idx.slug} value={idx.slug}>
									{idx.displayName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{selectedIndexSlug && (
					<CreateABTestDialog
						organizationId={organizationId}
						indexSlug={selectedIndexSlug}
						open={createOpen}
						onOpenChange={setCreateOpen}
					/>
				)}
			</div>

			{/* Content */}
			{!selectedIndexSlug ? (
				<EmptyState
					title={t("search.abTest.selectIndexFirst")}
					description={t("search.abTest.selectIndexFirstDescription")}
					icon={ArrowLeftRightIcon}
				/>
			) : isLoading ? (
				<div className="py-12 flex items-center justify-center">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="space-y-6">
					{/* Active tests */}
					{tests.filter((t) => t.status === "running" || t.status === "draft").length >
						0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								{t("search.abTest.activeTests")}
							</h3>
							{tests
								.filter(
									(test) => test.status === "running" || test.status === "draft",
								)
								.map((test) => (
									<ABTestCard
										key={test.id}
										test={test}
										organizationId={organizationId}
										indexSlug={selectedIndexSlug}
										onRefresh={refreshTests}
									/>
								))}
						</div>
					)}

					{/* All tests table */}
					<ABTestsTable
						tests={tests}
						organizationId={organizationId}
						indexSlug={selectedIndexSlug}
					/>
				</div>
			)}
		</div>
	);
}
