"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { EmptyState } from "@search/components/cards/EmptyState";
import { SparklesIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface RecommendationsGraphRAGProps {
	organizationId: string;
}

interface RecommendationItem {
	id: string;
	title: string;
	reason: string;
}

export function RecommendationsGraphRAG({
	organizationId: _organizationId,
}: RecommendationsGraphRAGProps) {
	const t = useTranslations("search");
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<RecommendationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [error, setError] = useState("");

	const handleSearch = async () => {
		if (!query.trim()) return;
		setLoading(true);
		setSearched(true);
		setError("");

		try {
			// For now, show demo/placeholder results
			// TODO: Connect to actual GraphRAG endpoint when available
			await new Promise((r) => setTimeout(r, 1500));
			setResults([
				{
					id: "demo-1",
					title: t("recommendations.comingSoon"),
					reason: "AI-powered recommendations with explanations are being built.",
				},
			]);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("recommendations.graphRag.error"));
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
						<SparklesIcon className="size-4 text-primary" />
						{t("recommendations.graphRag.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{t("recommendations.graphRag.description")}
					</p>
					<div className="gap-2 flex">
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={t("recommendations.graphRag.searchPlaceholder")}
							className="h-9 px-3 text-sm flex-1 rounded-md border border-input bg-background"
						/>
						<Button onClick={handleSearch} disabled={loading || !query.trim()}>
							<SendIcon className="mr-1 size-4" />
							{t("recommendations.graphRag.searchButton")}
						</Button>
					</div>
				</CardContent>
			</Card>

			{loading && (
				<Card>
					<CardContent className="space-y-4 pt-6">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-5 w-3/4" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{!loading && searched && results.length > 0 && (
				<div className="space-y-4">
					{results.map((item) => (
						<Card key={item.id}>
							<CardHeader>
								<CardTitle className="gap-2 text-base flex items-center">
									<Badge status="info">
										{t("recommendations.graphRag.recommendations")}
									</Badge>
									{item.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="gap-2 flex items-start">
									<SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
									<div>
										<p className="text-xs font-medium text-muted-foreground">
											{t("recommendations.graphRag.explanation")}
										</p>
										<p className="mt-1 text-sm">{item.reason}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{!loading && searched && results.length === 0 && !error && (
				<Card>
					<CardContent className="pt-6">
						<EmptyState
							variant="inline"
							description={t("recommendations.graphRag.noResults")}
						/>
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
