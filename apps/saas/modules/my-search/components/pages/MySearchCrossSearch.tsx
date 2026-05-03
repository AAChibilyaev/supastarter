"use client";

import { PageHeader } from "@shared/components/PageHeader";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { PersonalSearch } from "../PersonalSearch";
import { type SearchHit } from "../ResultCard";
import { SearchResults } from "../SearchResults";

export function MySearchCrossSearch() {
	const t = useTranslations();
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [hasSearched, setHasSearched] = useState(false);

	// Cross-search mutation
	const crossSearchMutation = useMutation(orpc.mySearch.crossSearch.mutationOptions({}));

	const handleSearch = useCallback(
		(q: string) => {
			setQuery(q);
			setPage(1);
			setHasSearched(true);

			if (!q.trim()) return;

			crossSearchMutation.mutate({
				organizationId: "", // Will be patched with real org
				q: q.trim(),
				page: 1,
				perPage: 20,
			});
		},
		[crossSearchMutation],
	);

	const handlePageChange = useCallback(
		(newPage: number) => {
			setPage(newPage);

			if (!query.trim()) return;

			crossSearchMutation.mutate({
				organizationId: "", // Will be patched with real org
				q: query.trim(),
				page: newPage,
				perPage: 20,
			});
		},
		[query, crossSearchMutation],
	);

	const searchResults = crossSearchMutation.data;

	return (
		<div>
			<PageHeader
				title={t("mySearch.crossSearch")}
				subtitle={t("mySearch.crossSearchDescription")}
			/>

			<div className="mt-6 space-y-4">
				<PersonalSearch onSearch={handleSearch} />

				<SearchResults
					hits={(searchResults?.hits as unknown as SearchHit[]) ?? []}
					found={searchResults?.found ?? 0}
					page={page}
					perPage={20}
					searchTimeMs={searchResults?.searchTimeMs ?? 0}
					isLoading={crossSearchMutation.isPending}
					hasSearched={hasSearched}
					onPageChange={handlePageChange}
				/>
			</div>
		</div>
	);
}
