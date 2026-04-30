"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CreateSearchIndexDialog } from "./CreateSearchIndexDialog";
import { SearchApiKeysPanel } from "./SearchApiKeysPanel";
import { SearchIndexesList } from "./SearchIndexesList";
import { SearchUsageCards } from "./SearchUsageCards";

interface SearchApiKeysPageProps {
	organizationId: string;
}

export function SearchApiKeysPage({ organizationId }: SearchApiKeysPageProps) {
	const t = useTranslations();
	const [selectedSlug, setSelectedSlug] = useState<string>();

	return (
		<div className="space-y-6">
			<div className="gap-4 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{t("search.apiKeysPage.title")}
					</h1>
					<p className="mt-1 text-muted-foreground">{t("search.apiKeys.description")}</p>
				</div>
				<CreateSearchIndexDialog organizationId={organizationId} />
			</div>

			<div className="gap-6 lg:grid-cols-[2fr_3fr] grid">
				<SearchIndexesList
					organizationId={organizationId}
					onSelect={setSelectedSlug}
					selectedSlug={selectedSlug}
				/>
				{selectedSlug ? (
					<div className="space-y-4">
						<SearchUsageCards organizationId={organizationId} />
						<SearchApiKeysPanel organizationId={organizationId} slug={selectedSlug} />
					</div>
				) : (
					<Card className="p-6">
						<div className="rounded p-6 text-center text-foreground/60">
							{t("search.selectIndex")}
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}
