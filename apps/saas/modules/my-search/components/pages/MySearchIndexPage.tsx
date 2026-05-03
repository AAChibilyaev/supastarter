"use client";

import { PageHeader } from "@shared/components/PageHeader";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { AddUrlCard } from "../AddUrlCard";
import { AIAskPanel } from "../AIAskPanel";
import { MySearchFileTable } from "../files/MySearchFileTable";
import { PersonalSearch } from "../PersonalSearch";
import { SearchResults, type SearchHit } from "../SearchResults";

interface MySearchIndexPageProps {
	organizationId: string;
	indexId: string;
}

export function MySearchIndexPage({ organizationId, indexId }: MySearchIndexPageProps) {
	const t = useTranslations();
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [hasSearched, setHasSearched] = useState(false);
	const [fileTypeFilter, setFileTypeFilter] = useState<string | undefined>();

	// Fetch index details
	const { data: index } = useQuery(
		orpc.mySearch.getIndex.queryOptions({
			input: { organizationId, id: indexId },
		}),
	);

	// Search mutation
	const searchMutation = useMutation(orpc.mySearch.searchIndex.mutationOptions({}));

	// Debounced search handler
	const handleSearch = useCallback(
		(q: string) => {
			setQuery(q);
			setPage(1);
			setHasSearched(true);

			if (!q.trim()) return;

			searchMutation.mutate({
				organizationId,
				id: indexId,
				q: q.trim(),
				page: 1,
				perPage: 20,
				fileTypeFilter,
			});
		},
		[organizationId, indexId, fileTypeFilter, searchMutation],
	);

	// Pagination handler
	const handlePageChange = useCallback(
		(newPage: number) => {
			setPage(newPage);

			if (!query.trim()) return;

			searchMutation.mutate({
				organizationId,
				id: indexId,
				q: query.trim(),
				page: newPage,
				perPage: 20,
				fileTypeFilter,
			});
		},
		[organizationId, indexId, query, fileTypeFilter, searchMutation],
	);

	const searchResults = searchMutation.data;

	return (
		<div>
			<PageHeader title={index?.displayName ?? t("mySearch.searchIndex")} subtitle={index?.slug} />

			<div className="mt-6 space-y-6">
				{/* Add URL card */}
				<AddUrlCard organizationId={organizationId} indexId={indexId} />

				{/* File table */}
				<MySearchFileTable organizationId={organizationId} indexId={indexId} />

				{/* AI Ask panel */}
				<AIAskPanel organizationId={organizationId} indexId={indexId} />

				{/* Search input */}
				<PersonalSearch onSearch={handleSearch} />

				{/* File type filter */}
				<div className="gap-2 flex items-center">
					<select
						value={fileTypeFilter ?? ""}
						onChange={(e) => {
							setFileTypeFilter(e.target.value || undefined);
							// Re-run search if there's an active query
							if (query.trim()) {
								searchMutation.mutate({
									organizationId,
									id: indexId,
									q: query.trim(),
									page: 1,
									perPage: 20,
									fileTypeFilter: e.target.value || undefined,
								});
							}
						}}
						className="h-9 px-3 text-sm rounded-md border border-input bg-background"
						aria-label={t("mySearch.filterByType")}
					>
						<option value="">{t("mySearch.allTypes")}</option>
						<option value="pdf">PDF</option>
						<option value="docx">DOCX</option>
						<option value="csv">CSV</option>
						<option value="json">JSON</option>
						<option value="md">Markdown</option>
						<option value="txt">Text</option>
						<option value="epub">EPUB</option>
						<option value="url">Web Page</option>
					</select>
				</div>

				{/* Results */}
				<SearchResults
					hits={(searchResults?.hits as SearchHit[]) ?? []}
					found={searchResults?.found ?? 0}
					page={page}
					perPage={20}
					searchTimeMs={searchResults?.searchTimeMs ?? 0}
					isLoading={searchMutation.isPending}
					hasSearched={hasSearched}
					onPageChange={handlePageChange}
				/>
			</div>
		</div>
	);
}
