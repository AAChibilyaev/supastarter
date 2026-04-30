"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CreateSearchIndexDialog } from "./CreateSearchIndexDialog";
import { SearchApiKeysPanel } from "./SearchApiKeysPanel";
import { SearchIndexesList } from "./SearchIndexesList";
import { SearchUsageCard } from "./SearchUsageCard";

interface SearchDashboardProps {
	organizationId: string;
	canManage: boolean;
}

export function SearchDashboard({ organizationId, canManage }: SearchDashboardProps) {
	const t = useTranslations();
	const [selectedSlug, setSelectedSlug] = useState<string>();

	return (
		<div className="space-y-6">
			<div className="gap-4 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{t("search.title")}</h1>
					<p className="text-foreground/60">{t("search.subtitle")}</p>
				</div>
				{canManage && <CreateSearchIndexDialog organizationId={organizationId} />}
			</div>

			<SearchUsageCard organizationId={organizationId} />

			<div className="gap-6 lg:grid-cols-[2fr_3fr] grid">
				<SearchIndexesList
					organizationId={organizationId}
					onSelect={setSelectedSlug}
					selectedSlug={selectedSlug}
				/>
				{selectedSlug ? (
					<SearchApiKeysPanel organizationId={organizationId} slug={selectedSlug} />
				) : (
					<div className="rounded p-6 border text-center text-foreground/60">
						{t("search.selectIndex")}
					</div>
				)}
			</div>
		</div>
	);
}
