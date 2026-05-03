"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { logger } from "@repo/logs";
import { SearchConfigWizard } from "@search/components/wizard/SearchConfigWizard";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function SearchConfigPage({ organizationId }: { organizationId: string }) {
	const router = useRouter();
	const slug = useActiveOrganization()?.activeOrganization?.slug;

	const saveMutation = useMutation(
		orpc.search.saveWidgetConfig.mutationOptions({
			onSuccess: (_, variables) => {
				logger.info("Widget config saved", { slug: variables.slug });
				router.push(`/${slug}/search?tab=widget`);
			},
			onError: (error) => {
				logger.error("Failed to save widget config", { error });
			},
		}),
	);

	const handleComplete = useCallback(
		(data: {
			indexSlug: string;
			queryBy: string[];
			facetFields: string[];
			defaultSortField?: string;
			theme: "light" | "dark" | "auto";
			placeholder: string;
			resultsPerPage: number;
			showThumbnails: boolean;
			showSearchButton: boolean;
			searchButtonText: string;
			accentColor: string;
			keyboardShortcut: boolean;
		}) => {
			if (!slug) return;

			saveMutation.mutate({
				organizationId,
				slug: data.indexSlug,
				config: {
					facetFields: data.facetFields,
					defaultSortField: data.defaultSortField,
					showPrices: true,
					showImages: data.showThumbnails,
					theme: data.theme,
					queryBy: data.queryBy,
					placeholder: data.placeholder,
					resultsPerPage: data.resultsPerPage,
					showThumbnails: data.showThumbnails,
					showSearchButton: data.showSearchButton,
					searchButtonText: data.searchButtonText,
					accentColor: data.accentColor,
					keyboardShortcut: data.keyboardShortcut,
				},
			});
		},
		[organizationId, slug, saveMutation],
	);

	return (
		<div className="max-w-3xl mx-auto">
			<SearchConfigWizard
				organizationId={organizationId}
				onComplete={handleComplete}
				isSaving={saveMutation.isPending}
			/>
		</div>
	);
}
