"use client";

import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Textarea } from "@repo/ui/components/textarea";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "../cards/EmptyState";

interface RecommendationsGraphRAGProps {
	organizationId: string;
}

interface RagResult {
	id: string;
	title: string;
	explanation: string;
	score: number;
}

export function RecommendationsGraphRAG({
	organizationId: _organizationId,
}: RecommendationsGraphRAGProps) {
	const tr = useTranslations("search");

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<RagResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	const handleSearch = async () => {
		if (!query.trim()) {
			return;
		}

		setLoading(true);
		setHasSearched(true);

		try {
			// In production, this would call orpc.recommendations.graphRag or similar
			await new Promise((resolve) => setTimeout(resolve, 1000));
			setResults([]);
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{tr("recommendations.graphRag.title")}</CardTitle>
				<CardDescription>{tr("recommendations.graphRag.description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="gap-2 flex">
					<Textarea
						placeholder={tr("recommendations.graphRag.searchPlaceholder")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						rows={2}
						className="flex-1"
					/>
					<Button
						onClick={() => void handleSearch()}
						disabled={loading || !query.trim()}
						className="self-end"
					>
						{loading
							? tr("recommendations.comingSoon")
							: tr("recommendations.graphRag.searchButton")}
					</Button>
				</div>

				{!hasSearched && !loading && (
					<EmptyState
						variant="inline"
						title={tr("recommendations.graphRag.title")}
						description={tr("recommendations.graphRag.description")}
					/>
				)}

				{loading && (
					<div className="py-8 flex items-center justify-center">
						<div className="text-sm text-muted-foreground">Loading...</div>
					</div>
				)}

				{hasSearched && !loading && results.length === 0 && (
					<EmptyState
						variant="inline"
						title={tr("recommendations.graphRag.noResults")}
						description={tr("recommendations.graphRag.description")}
					/>
				)}

				{results.length > 0 && (
					<div className="space-y-4">
						<h4 className="font-medium">{tr("recommendations.graphRag.recommendations")}</h4>
						{results.map((item) => (
							<div key={item.id} className="space-y-2 p-4 rounded-lg border">
								<div className="flex items-center justify-between">
									<span className="font-medium">{item.title}</span>
									<span className="text-sm text-muted-foreground">
										Score: {item.score.toFixed(2)}
									</span>
								</div>
								<div className="text-sm text-muted-foreground">
									<span className="font-medium">{tr("recommendations.graphRag.explanation")}:</span>{" "}
									{item.explanation}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
