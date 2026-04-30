"use client";

import { Card } from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";

import { useSearchIndexesQuery } from "../lib/api";

interface SearchIndexesListProps {
	organizationId: string;
	onSelect: (slug: string) => void;
	selectedSlug?: string;
}

export function SearchIndexesList({
	organizationId,
	onSelect,
	selectedSlug,
}: SearchIndexesListProps) {
	const t = useTranslations();
	const { data, isLoading } = useSearchIndexesQuery(organizationId);

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	if (!data || data.length === 0) {
		return <Card className="p-6 text-center text-foreground/60">{t("search.noIndexes")}</Card>;
	}

	return (
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("search.fields.displayName")}</TableHead>
						<TableHead>{t("search.fields.slug")}</TableHead>
						<TableHead className="text-right">{t("search.fields.version")}</TableHead>
						<TableHead className="text-right">{t("search.fields.apiKeys")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((index) => {
						const isSelected = index.slug === selectedSlug;
						return (
							<TableRow
								key={index.id}
								className={`cursor-pointer ${isSelected ? "bg-muted/40" : ""}`}
								onClick={() => onSelect(index.slug)}
							>
								<TableCell className="font-medium">{index.displayName}</TableCell>
								<TableCell className="font-mono text-xs">{index.slug}</TableCell>
								<TableCell className="text-right">v{index.version}</TableCell>
								<TableCell className="text-right">{index.apiKeysCount}</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</Card>
	);
}
