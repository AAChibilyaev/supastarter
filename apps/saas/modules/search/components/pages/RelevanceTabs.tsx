"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CurationsPanel } from "../panels/CurationsPanel";
import { SynonymsPanel } from "../panels/SynonymsPanel";

interface RelevanceTabsProps {
	organizationId: string;
	slug?: string;
}

export function RelevanceTabs({ organizationId, slug }: RelevanceTabsProps) {
	const t = useTranslations();
	const [tab, setTab] = useState<"synonyms" | "curations">("synonyms");

	if (!slug) {
		return (
			<div className="rounded p-6 border text-center text-foreground/60">
				{t("search.selectIndex")}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="gap-2 flex border-b">
				<button
					type="button"
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						tab === "synonyms"
							? "border-primary text-primary"
							: "border-transparent text-foreground/60 hover:text-foreground"
					}`}
					onClick={() => setTab("synonyms")}
				>
					{t("search.synonyms.tab")}
				</button>
				<button
					type="button"
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						tab === "curations"
							? "border-primary text-primary"
							: "border-transparent text-foreground/60 hover:text-foreground"
					}`}
					onClick={() => setTab("curations")}
				>
					{t("search.curations.tab")}
				</button>
			</div>

			{tab === "synonyms" ? (
				<SynonymsPanel organizationId={organizationId} slug={slug} />
			) : (
				<CurationsPanel organizationId={organizationId} slug={slug} />
			)}
		</div>
	);
}
