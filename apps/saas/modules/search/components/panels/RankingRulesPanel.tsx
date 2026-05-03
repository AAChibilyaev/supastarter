"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, PlusIcon, Trash2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface RankingRulesPanelProps {
	organizationId: string;
	slug: string;
}

interface FieldWeight {
	name: string;
	weight: number;
}

interface CustomRule {
	id: string;
	expression: string;
}

export function RankingRulesPanel({ organizationId, slug }: RankingRulesPanelProps) {
	const t = useTranslations("search");
	const queryClient = useQueryClient();

	const [fieldWeights, setFieldWeights] = useState<FieldWeight[]>([]);
	const [typoTolerance, setTypoTolerance] = useState(1);
	const [prefixSearch, setPrefixSearch] = useState(true);
	const [infixSearch, setInfixSearch] = useState<"off" | "fallback" | "always">("fallback");
	const [exactMatch, setExactMatch] = useState(true);
	const [defaultSortingField, setDefaultSortingField] = useState<string | null>(null);
	const [customRules, setCustomRules] = useState<CustomRule[]>([]);
	const [initialized, setInitialized] = useState(false);
	const [changed, setChanged] = useState(false);

	// ── Fetch schema (for field list) ──────────────────────────────

	const { data: schemaData, isLoading: schemaLoading } = useQuery(
		orpc.search.schema.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	const schemaFields = schemaData?.fields?.filter((f) => f.type === "string") ?? [];

	const { data: rankingData, isLoading: rankingLoading } = useQuery(
		orpc.search.rankingRules.get.queryOptions({
			input: { organizationId, slug },
			enabled: !!organizationId && !!slug,
		}),
	);

	// ── Initialize from fetched data ───────────────────────────────

	useEffect(() => {
		if (!rankingData || initialized) return;

		const rules = rankingData.rankingRules;
		const weights: FieldWeight[] = schemaFields.map((f) => ({
			name: f.name,
			weight: rules.fieldWeights[f.name] ?? 1,
		}));

		setFieldWeights(weights);
		setTypoTolerance(rules.typoTolerance);
		setPrefixSearch(rules.prefixSearch);
		setInfixSearch(rules.infixSearch);
		setExactMatch(rules.exactMatch);
		setDefaultSortingField(rules.defaultSortingField);
		setCustomRules(
			rules.customRankingRules.map((expr, i) => ({
				id: `rule_${i}`,
				expression: expr,
			})),
		);
		setInitialized(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rankingData, schemaFields.length, initialized]);

	// ── Update mutation ────────────────────────────────────────────

	const updateMutation = useMutation({
		...orpc.search.rankingRules.update.mutationOptions(),
		onSuccess: async () => {
			toastSuccess(t("rankingRules.saved"));
			setChanged(false);
			await queryClient.invalidateQueries({
				queryKey: orpc.search.rankingRules.get.queryKey({
					input: { organizationId, slug },
				}),
			});
		},
		onError: (error) => {
			toastError(error instanceof Error ? error.message : t("rankingRules.error"));
		},
	});

	const handleSave = () => {
		const fieldWeightsMap: Record<string, number> = {};
		fieldWeights.forEach((fw) => {
			fieldWeightsMap[fw.name] = fw.weight;
		});

		updateMutation.mutate({
			organizationId,
			slug,
			rankingRules: {
				fieldWeights: fieldWeightsMap,
				defaultSortingField,
				typoTolerance,
				prefixSearch,
				infixSearch,
				exactMatch,
				customRankingRules: customRules.map((r) => r.expression).filter(Boolean),
			},
		});
	};

	const setWeight = (fieldName: string, weight: number) => {
		setFieldWeights((prev) => prev.map((fw) => (fw.name === fieldName ? { ...fw, weight } : fw)));
		setChanged(true);
	};

	const addCustomRule = () => {
		setCustomRules((prev) => [...prev, { id: `rule_${Date.now()}`, expression: "" }]);
		setChanged(true);
	};

	const removeCustomRule = (id: string) => {
		setCustomRules((prev) => prev.filter((r) => r.id !== id));
		setChanged(true);
	};

	const updateCustomRule = (id: string, expression: string) => {
		setCustomRules((prev) => prev.map((r) => (r.id === id ? { ...r, expression } : r)));
		setChanged(true);
	};

	const isLoading = schemaLoading || rankingLoading;

	if (isLoading) {
		return <div className="text-foreground/60">{t("loading")}</div>;
	}

	return (
		<Card className="p-6 space-y-8">
			{/* Header */}
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("rankingRules.title")}</h3>
					<p className="text-sm text-foreground/60">{t("rankingRules.description")}</p>
				</div>
				<Button
					variant="primary"
					onClick={handleSave}
					disabled={!changed}
					loading={updateMutation.isPending}
				>
					{t("rankingRules.save")}
				</Button>
			</div>

			{/* Per-field weights */}
			<div className="space-y-3">
				<div>
					<h4 className="text-sm font-medium">{t("rankingRules.fieldWeights")}</h4>
					<p className="text-xs text-muted-foreground">{t("rankingRules.fieldWeightsHint")}</p>
				</div>

				{fieldWeights.length === 0 ? (
					<EmptyState
						title={t("rankingRules.noFields")}
						description={t("rankingRules.noFieldsHint")}
						icon={TrendingUp}
					/>
				) : (
					<Card>
						<CardContent className="p-0 overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-8" />
										<TableHead>{t("rankingRules.fieldColumn")}</TableHead>
										<TableHead className="w-24">{t("rankingRules.weightColumn")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{fieldWeights.map((fw) => (
										<TableRow key={fw.name}>
											<TableCell className="text-muted-foreground">
												<GripVertical className="size-4" />
											</TableCell>
											<TableCell className="font-mono text-xs">{fw.name}</TableCell>
											<TableCell>
												<Input
													type="number"
													min={1}
													max={100}
													value={fw.weight}
													onChange={(e) => setWeight(fw.name, Number(e.target.value))}
													className="h-7 w-20 text-xs"
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}
			</div>

			{/* General ranking settings */}
			<div className="space-y-4">
				<div>
					<h4 className="text-sm font-medium">{t("rankingRules.generalSettings")}</h4>
					<p className="text-xs text-muted-foreground">{t("rankingRules.generalSettingsHint")}</p>
				</div>

				<div className="gap-4 md:grid-cols-2 grid">
					{/* Default sorting field */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">
							{t("rankingRules.defaultSortField")}
						</Label>
						<Select
							value={defaultSortingField ?? ""}
							onValueChange={(v) => {
								setDefaultSortingField(v || null);
								setChanged(true);
							}}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue placeholder={t("rankingRules.noDefaultSort")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">{t("rankingRules.noDefaultSort")}</SelectItem>
								{schemaFields.map((f) => (
									<SelectItem key={f.name} value={f.name}>
										{f.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Typo tolerance */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">
							{t("rankingRules.typoTolerance")}
						</Label>
						<Select
							value={String(typoTolerance)}
							onValueChange={(v) => {
								setTypoTolerance(Number(v));
								setChanged(true);
							}}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">{t("rankingRules.typoOff")}</SelectItem>
								<SelectItem value="1">{t("rankingRules.typo1")}</SelectItem>
								<SelectItem value="2">{t("rankingRules.typo2")}</SelectItem>
								<SelectItem value="4">{t("rankingRules.typo4")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Infix search */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">{t("rankingRules.infixSearch")}</Label>
						<Select
							value={infixSearch}
							onValueChange={(v: "off" | "fallback" | "always") => {
								setInfixSearch(v);
								setChanged(true);
							}}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="off">{t("rankingRules.infixOff")}</SelectItem>
								<SelectItem value="fallback">{t("rankingRules.infixFallback")}</SelectItem>
								<SelectItem value="always">{t("rankingRules.infixAlways")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Toggle switches */}
				<div className="gap-6 flex flex-wrap">
					<div className="gap-2 flex items-center">
						<Switch
							id="prefix-search"
							checked={prefixSearch}
							onCheckedChange={(v) => {
								setPrefixSearch(v);
								setChanged(true);
							}}
						/>
						<Label htmlFor="prefix-search" className="text-sm cursor-pointer">
							{t("rankingRules.prefixSearch")}
						</Label>
					</div>
					<div className="gap-2 flex items-center">
						<Switch
							id="exact-match"
							checked={exactMatch}
							onCheckedChange={(v) => {
								setExactMatch(v);
								setChanged(true);
							}}
						/>
						<Label htmlFor="exact-match" className="text-sm cursor-pointer">
							{t("rankingRules.exactMatch")}
						</Label>
					</div>
				</div>
			</div>

			{/* Custom ranking rules */}
			<div className="space-y-3">
				<div className="sm:flex-row sm:items-center sm:justify-between gap-2 flex flex-col">
					<div>
						<h4 className="text-sm font-medium">{t("rankingRules.customRules")}</h4>
						<p className="text-xs text-muted-foreground">{t("rankingRules.customRulesHint")}</p>
					</div>
					<Button variant="outline" size="sm" onClick={addCustomRule}>
						<PlusIcon className="size-3.5 mr-1" />
						{t("rankingRules.addRule")}
					</Button>
				</div>

				{customRules.length === 0 ? (
					<EmptyState
						title={t("rankingRules.noCustomRules")}
						description={t("rankingRules.noCustomRulesHint")}
						icon={TrendingUp}
					/>
				) : (
					<div className="space-y-2">
						{customRules.map((rule) => (
							<div key={rule.id} className="gap-2 flex items-start">
								<div className="flex-1">
									<Input
										type="text"
										value={rule.expression}
										onChange={(e) => updateCustomRule(rule.id, e.target.value)}
										placeholder={t("rankingRules.rulePlaceholder")}
										className="h-8 text-xs font-mono"
									/>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeCustomRule(rule.id)}
									className="shrink-0 text-destructive hover:text-destructive"
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</Card>
	);
}
