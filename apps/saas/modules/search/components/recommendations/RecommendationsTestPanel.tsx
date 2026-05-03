"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface RecommendationItem {
	id: string;
	title: string;
	score: number;
}

interface RecommendationsTestPanelProps {
	organizationId: string;
	fetchRecommendations: (productId: string) => Promise<RecommendationItem[]>;
	title: string;
	emptyMessage: string;
	neo4jConnected: boolean;
}

export function RecommendationsTestPanel({
	organizationId,
	fetchRecommendations,
	title,
	emptyMessage,
	neo4jConnected,
}: RecommendationsTestPanelProps) {
	const t = useTranslations();
	const tr = useTranslations("search");

	const { data: indexes } = useQuery(
		orpc.search.listIndexes.queryOptions({
			input: { organizationId },
		}),
	);

	const [selectedSlug, setSelectedSlug] = useState<string>("");
	const [query, setQuery] = useState("");
	const [selectedProductId, setSelectedProductId] = useState<string>("");
	const [selectedProductTitle, setSelectedProductTitle] = useState<string>("");
	const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [loadingRecs, setLoadingRecs] = useState(false);
	const [searchResults, setSearchResults] = useState<
		Array<{ id: string; title: string; score: number }>
	>([]);
	const [hasSearched, setHasSearched] = useState(false);

	const slug = selectedSlug || indexes?.[0]?.slug || "";

	const handleSearch = useCallback(async () => {
		if (!query.trim() || !slug) {
			return;
		}
		setLoadingSearch(true);
		setHasSearched(true);
		setSelectedProductId("");
		setRecommendations([]);

		try {
			const result = await orpc.search.dynamicSearch.call({
				organizationId,
				slug,
				query: query.trim(),
				queryBy: "title,name,description",
				perPage: 10,
				page: 1,
			});

			const hits = (result?.hits ?? []).map((hit: any) => ({
				id: String(hit.document?.id ?? hit.document?.sku ?? ""),
				title: String(hit.document?.title ?? hit.document?.name ?? "Unknown"),
				score: typeof hit.textMatch === "number" ? hit.textMatch : 0,
			}));

			setSearchResults(hits);
		} catch {
			setSearchResults([]);
		} finally {
			setLoadingSearch(false);
		}
	}, [query, slug, organizationId]);

	const handleSelectProduct = useCallback(
		async (productId: string, productTitle: string) => {
			setSelectedProductId(productId);
			setSelectedProductTitle(productTitle);
			setLoadingRecs(true);

			try {
				const results = await fetchRecommendations(productId);
				setRecommendations(results);
			} catch {
				setRecommendations([]);
			} finally {
				setLoadingRecs(false);
			}
		},
		[fetchRecommendations],
	);

	const availableIndexes = useMemo(() => indexes ?? [], [indexes]);

	if (!neo4jConnected) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						title={tr("recommendations.comingSoon")}
						description={tr("recommendations.neo4jDisconnected")}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Index + Search */}
			<div className="gap-4 flex items-end">
				<div className="w-48">
					<Select value={selectedSlug} onValueChange={setSelectedSlug}>
						<SelectTrigger>
							<SelectValue placeholder={t("search.selectIndex")} />
						</SelectTrigger>
						<SelectContent>
							{availableIndexes.map((idx) => (
								<SelectItem key={idx.id} value={idx.slug}>
									{idx.displayName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex-1">
					<Input
						placeholder={tr("recommendations.searchProducts")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								void handleSearch();
							}
						}}
					/>
				</div>

				<Button
					onClick={() => void handleSearch()}
					disabled={loadingSearch || !query.trim() || !slug}
				>
					{loadingSearch ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						<SearchIcon className="size-4" />
					)}
					{t("search.search")}
				</Button>
			</div>

			<div className="gap-4 md:grid-cols-2 grid">
				{/* Search results */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{tr("recommendations.resultsCount", { count: searchResults.length })}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{hasSearched && searchResults.length === 0 && !loadingSearch && (
							<EmptyState
								variant="inline"
								title={tr("recommendations.noResults")}
								description={tr("recommendations.selectProduct")}
							/>
						)}

						{loadingSearch && (
							<div className="py-8 flex items-center justify-center">
								<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
							</div>
						)}

						{!hasSearched && !loadingSearch && (
							<EmptyState
								variant="inline"
								title={tr("recommendations.pickProduct")}
								description={tr("recommendations.searchProducts")}
							/>
						)}

						{searchResults.length > 0 && (
							<div className="space-y-2">
								{searchResults.map((item) => (
									<button
										key={item.id}
										type="button"
										className={`p-3 w-full rounded-lg border text-left transition-colors hover:bg-accent ${
											selectedProductId === item.id ? "border-primary bg-accent" : ""
										}`}
										onClick={() => handleSelectProduct(item.id, item.title)}
									>
										<div className="font-medium">{item.title}</div>
										<div className="text-xs text-muted-foreground">ID: {item.id}</div>
									</button>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recommendations */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{title}</CardTitle>
					</CardHeader>
					<CardContent>
						{!selectedProductId && !loadingRecs && (
							<EmptyState
								variant="inline"
								title={tr("recommendations.pickProduct")}
								description={emptyMessage}
							/>
						)}

						{loadingRecs && (
							<div className="py-8 flex items-center justify-center">
								<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
							</div>
						)}

						{selectedProductId && !loadingRecs && (
							<div className="space-y-1">
								<p className="mb-3 text-sm text-muted-foreground">
									{tr("recommendations.resultsCount", {
										count: recommendations.length,
									})}{" "}
									for <strong>{selectedProductTitle}</strong>
								</p>

								{recommendations.length === 0 && (
									<EmptyState
										variant="inline"
										title={tr("recommendations.noResults")}
										description={emptyMessage}
									/>
								)}

								{recommendations.map((rec) => (
									<div
										key={rec.id}
										className="p-3 flex items-center justify-between rounded-lg border"
									>
										<span className="font-medium">{rec.title}</span>
										<span className="text-sm text-muted-foreground">
											Score: {rec.score.toFixed(2)}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
