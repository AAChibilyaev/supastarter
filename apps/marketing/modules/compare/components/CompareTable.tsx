"use client";

import { Badge } from "@repo/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

type CellValue = { type: "bool"; value: boolean } | { type: "text"; key: string };

interface FeatureRow {
	key: string;
	aacsearch: CellValue;
	algolia: CellValue;
	elasticsearch: CellValue;
	meilisearch: CellValue;
}

const rows: FeatureRow[] = [
	{
		key: "fulltext",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "vector",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: false },
	},
	{
		key: "hybrid",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: false },
		meilisearch: { type: "bool", value: false },
	},
	{
		key: "realtime",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "opensource",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: false },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "selfhost",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: false },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "pricing",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: false },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "managed",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: true },
	},
	{
		key: "connector",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: false },
		elasticsearch: { type: "bool", value: false },
		meilisearch: { type: "bool", value: false },
	},
	{
		key: "cms",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: true },
		elasticsearch: { type: "bool", value: false },
		meilisearch: { type: "bool", value: false },
	},
	{
		key: "setup",
		aacsearch: { type: "text", key: "minutes" },
		algolia: { type: "text", key: "hours" },
		elasticsearch: { type: "text", key: "days" },
		meilisearch: { type: "text", key: "minutes" },
	},
	{
		key: "free",
		aacsearch: { type: "bool", value: true },
		algolia: { type: "bool", value: false },
		elasticsearch: { type: "bool", value: true },
		meilisearch: { type: "bool", value: false },
	},
];

function BoolCell({ value, highlight }: { value: boolean; highlight?: boolean }) {
	if (value) {
		return (
			<Badge status="success" className={highlight ? "font-semibold" : undefined}>
				<Check className="mr-1 size-3 inline-block" aria-hidden />
				{highlight ? null : null}
			</Badge>
		);
	}
	return (
		<span className="size-7 inline-flex items-center justify-center rounded-full bg-destructive/10">
			<X className="size-3.5 text-destructive" aria-hidden />
		</span>
	);
}

function TextCell({ label, highlight }: { label: string; highlight?: boolean }) {
	return (
		<span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>
			{label}
		</span>
	);
}

export function CompareTable() {
	const t = useTranslations("comparePage");

	function renderCell(cell: CellValue, highlight?: boolean) {
		if (cell.type === "bool") {
			return <BoolCell value={cell.value} highlight={highlight} />;
		}
		return (
			<TextCell
				label={t(`table.values.${cell.key}` as Parameters<typeof t>[0])}
				highlight={highlight}
			/>
		);
	}

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-56">{t("table.feature")}</TableHead>
							<TableHead className="font-semibold bg-primary/5 text-foreground">
								{t("table.aacsearch")}
							</TableHead>
							<TableHead>Algolia</TableHead>
							<TableHead>Elasticsearch</TableHead>
							<TableHead>MeiliSearch</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.key}>
								<TableCell className="font-medium">
									{t(`table.features.${row.key}` as Parameters<typeof t>[0])}
								</TableCell>
								<TableCell className="bg-primary/5">
									{renderCell(row.aacsearch, true)}
								</TableCell>
								<TableCell>{renderCell(row.algolia)}</TableCell>
								<TableCell>{renderCell(row.elasticsearch)}</TableCell>
								<TableCell>{renderCell(row.meilisearch)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}
