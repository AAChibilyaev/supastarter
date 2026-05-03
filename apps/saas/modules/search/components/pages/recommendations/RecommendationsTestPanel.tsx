"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { EmptyState } from "@search/components/cards/EmptyState";
import { SearchIcon, LightbulbIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
	organizationId: _organizationId,
	fetchRecommendations,
	title,
	emptyMessage,
	neo4jConnected,
}: RecommendationsTestPanelProps) {
	const t = useTranslations("search");
	const [query, setQuery] = useState("");
	const [productId, setProductId] = useState("");
	const [results, setResults] = useState<RecommendationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [error, setError] = useState("");

	if (!neo4jConnected) {
		return (
			<Card>
				<CardContent className="pt-6">
					<EmptyState
						title={t("recommendations.comingSoon")}
						description={t("recommendations.neo4jDisconnected")}
					/>
				</CardContent>
			</Card>
		);
	}

	const handleSearch = async () => {
		if (!query.trim()) return;
		setLoading(true);
		setSearched(true);
		setError("");

		try {
			const items = await fetchRecommendations(query.trim());
			setResults(items);
			setProductId(query.trim());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch recommendations");
			setResults([]);
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSearch();
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="gap-2 text-base flex items-center">
						<LightbulbIcon className="size-4 text-primary" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{t("recommendations.pickProduct")}
					</p>
					<div className="gap-2 flex">
						<div className="relative flex-1">
							<SearchIcon className="left-3 size-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={t("recommendations.searchProducts")}
								className="pl-9"
							/>
						</div>
						<Button onClick={handleSearch} disabled={loading || !query.trim()}>
							{t("recommendations.getRecommendations")}
						</Button>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</CardContent>
			</Card>

			{loading && (
				<Card>
					<CardContent className="space-y-3 pt-6">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</CardContent>
				</Card>
			)}

			{!loading && searched && results.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("recommendations.resultsCount", { count: results.length })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{results.map((item) => (
							<div
								key={item.id}
								className="gap-3 px-4 py-3 flex items-center justify-between rounded-lg border bg-card"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">{item.title}</p>
									<p className="text-xs truncate text-muted-foreground">
										ID: {item.id}
									</p>
								</div>
								<Badge status="info">{Math.round(item.score * 100)}%</Badge>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{!loading && searched && results.length === 0 && !error && (
				<Card>
					<CardContent className="pt-6">
						<EmptyState variant="inline" description={emptyMessage} />
					</CardContent>
				</Card>
			)}

			{!loading && !searched && (
				<Card>
					<CardContent className="pt-6">
						<EmptyState
							variant="inline"
							description={t("recommendations.selectProduct")}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
