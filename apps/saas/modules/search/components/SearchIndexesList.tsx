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
import { DatabaseIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useSearchIndexesQuery } from "../lib/api";
import { EmptyState } from "./EmptyState";

interface SearchIndexesListProps {
	organizationId: string;
	onSelect?: (slug: string) => void;
	selectedSlug?: string;
}

export function SearchIndexesList({
	organizationId,
	onSelect,
	selectedSlug,
}: SearchIndexesListProps) {
	const t = useTranslations();
	const params = useParams<{ organizationSlug: string }>();
	const { data, isLoading } = useSearchIndexesQuery(organizationId);
	const orgSlug = params.organizationSlug;

	if (isLoading) {
		return <div className="text-foreground/60">{t("search.loading")}</div>;
	}

	if (!data || data.length === 0) {
		return (
			<EmptyState
				title={t("search.noIndexes")}
				description={t("search.noIndexesDescription")}
				icon={DatabaseIcon}
			/>
		);
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
						<TableHead className="w-16 text-right">{""}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((index) => {
						const isSelected = index.slug === selectedSlug;
						return (
							<TableRow
								key={index.id}
								className={`cursor-pointer ${isSelected ? "bg-muted/40" : ""}`}
								onClick={() => onSelect?.(index.slug)}
							>
								<TableCell className="font-medium">{index.displayName}</TableCell>
								<TableCell className="font-mono text-xs">{index.slug}</TableCell>
								<TableCell className="text-right">v{index.version}</TableCell>
								<TableCell className="text-right">{index.apiKeysCount}</TableCell>
								<TableCell className="text-right">
									{orgSlug && (
										<Link
											href={`/${orgSlug}/search/${index.slug}`}
											className="gap-1 text-xs inline-flex items-center text-primary hover:underline"
											onClick={(e) => e.stopPropagation()}
										>
											{t("search.open")}
											<ExternalLinkIcon className="size-3" />
										</Link>
									)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</Card>
	);
}
