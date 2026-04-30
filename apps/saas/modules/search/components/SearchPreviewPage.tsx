"use client";

import { Card } from "@repo/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useSearchIndexesQuery } from "../lib/api";
import { SearchPreview } from "./SearchPreview";

interface SearchPreviewPageProps {
	organizationId: string;
}

export function SearchPreviewPage({ organizationId }: SearchPreviewPageProps) {
	const t = useTranslations();
	const { data: indexes, isLoading } = useSearchIndexesQuery(organizationId);
	const [selectedSlug, setSelectedSlug] = useState<string>("");

	const handleIndexChange = (slug: string) => {
		setSelectedSlug(slug);
	};

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					{t("search.previewPage.title")}
				</h1>
				<p className="mt-1 text-muted-foreground">{t("search.preview.description")}</p>
			</div>

			{!indexes || indexes.length === 0 ? (
				<Card className="p-6">
					<div className="rounded p-6 text-center text-foreground/60">
						{t("search.noIndexes")}
					</div>
				</Card>
			) : (
				<>
					<div className="max-w-xs">
						<Select value={selectedSlug} onValueChange={handleIndexChange}>
							<SelectTrigger>
								<SelectValue placeholder={t("search.selectIndex")} />
							</SelectTrigger>
							<SelectContent>
								{indexes.map((index) => (
									<SelectItem key={index.id} value={index.slug}>
										{index.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedSlug ? (
						<SearchPreview organizationId={organizationId} slug={selectedSlug} />
					) : (
						<Card className="p-6">
							<div className="rounded p-6 text-center text-foreground/60">
								{t("search.selectIndex")}
							</div>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
