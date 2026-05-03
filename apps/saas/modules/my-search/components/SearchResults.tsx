"use client";

import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { ResultCard, type SearchHit } from "./ResultCard";

export type { SearchHit };

interface SearchResultsProps {
	hits: SearchHit[];
	found: number;
	page: number;
	perPage: number;
	searchTimeMs: number;
	isLoading: boolean;
	hasSearched: boolean;
	onPageChange: (page: number) => void;
}

export function SearchResults({
	hits,
	found,
	page,
	perPage,
	searchTimeMs,
	isLoading,
	hasSearched,
	onPageChange,
}: SearchResultsProps) {
	const t = useTranslations();

	if (!hasSearched) {
		return (
			<div className="py-16 flex flex-col items-center justify-center text-center">
				<p className="text-sm text-muted-foreground">{t("mySearch.searchPrompt")}</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-3 pt-4">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="space-y-2 p-4 rounded-lg border">
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-2/3" />
					</div>
				))}
			</div>
		);
	}

	if (hits.length === 0) {
		return (
			<div className="py-16 flex flex-col items-center justify-center text-center">
				<p className="text-sm text-muted-foreground">{t("mySearch.noResults")}</p>
			</div>
		);
	}

	const totalPages = Math.ceil(found / perPage);

	return (
		<div className="space-y-4 pt-4">
			{/* Results summary */}
			<div className="text-xs flex items-center justify-between text-muted-foreground">
				<span>
					{t("mySearch.resultsCount", {
						count: found,
						time: searchTimeMs.toFixed(0),
					})}
				</span>
			</div>

			{/* Result cards */}
			<div className="space-y-2">
				{hits.map((hit) => (
					<ResultCard key={hit.chunk_id} hit={hit} />
				))}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="gap-2 pt-4 flex items-center justify-center">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => onPageChange(page - 1)}
					>
						{t("common.previous")}
					</Button>
					<span className="text-sm text-muted-foreground">
						{page} / {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => onPageChange(page + 1)}
					>
						{t("common.next")}
					</Button>
				</div>
			)}
		</div>
	);
}
