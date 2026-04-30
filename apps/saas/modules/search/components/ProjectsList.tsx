"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface ProjectsListProps {
	organizationId: string;
	onSelect?: (slug: string) => void;
	selectedSlug?: string;
}

export function ProjectsList({ organizationId, onSelect, selectedSlug }: ProjectsListProps) {
	const t = useTranslations();

	const {
		data: indexes,
		isLoading,
		error,
	} = useQuery(orpc.search.listIndexes.queryOptions({ input: { organizationId } }));

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	if (error) {
		return <div className="text-destructive">{t("search.projects.loadError")}</div>;
	}

	if (!indexes || indexes.length === 0) {
		return (
			<Card>
				<CardContent className="pt-6 text-center text-muted-foreground">
					{t("search.noIndexes")}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{indexes.map((index) => (
				<Card
					key={index.id}
					className={`cursor-pointer transition-colors hover:bg-accent/50 ${
						selectedSlug === index.slug ? "ring-2 ring-primary" : ""
					}`}
					onClick={() => onSelect?.(index.slug)}
				>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">{index.displayName}</CardTitle>
							<div className="gap-2 flex items-center">
								<Badge variant="secondary">{index.slug}</Badge>
								<Badge>v{index.version}</Badge>
							</div>
						</div>
						<CardDescription>
							{index.apiKeyCount ?? 0} {t("search.projects.apiKeys")}
						</CardDescription>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
