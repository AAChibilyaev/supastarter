"use client";

import { StatsTile } from "@shared/components/StatsTile";
import { useTranslations } from "next-intl";

import { useSearchUsageQuery } from "../../lib/api";

interface SearchUsageCardProps {
	organizationId: string;
}

export function SearchUsageCard({ organizationId }: SearchUsageCardProps) {
	const t = useTranslations();
	const { data, isLoading } = useSearchUsageQuery(organizationId, 30);

	const totals = (data?.rows ?? []).reduce<Record<string, number>>((acc, row) => {
		acc[row.type] = (acc[row.type] ?? 0) + row.total;
		return acc;
	}, {});

	const context = isLoading
		? ` ${t("search.loading")}`
		: ` ${t("search.usage.windowDays", { days: 30 })}`;

	return (
		<div className="gap-4 sm:grid-cols-2 grid">
			<StatsTile
				title={t("search.usage.searches")}
				value={totals.search ?? 0}
				valueFormat="number"
				context={context}
			/>
			<StatsTile
				title={t("search.usage.ingests")}
				value={totals.ingest ?? 0}
				valueFormat="number"
				context={context}
			/>
		</div>
	);
}
