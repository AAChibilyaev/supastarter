"use client";

import { useSession } from "@auth/hooks/use-session";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { PageHeader } from "@shared/components/PageHeader";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { FileUpIcon, GlobeIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { CreateIndexForm } from "../CreateIndexForm";

export function MySearchDashboard() {
	const t = useTranslations();
	const { user } = useSession();
	const [createOpen, setCreateOpen] = useState(false);

	const organizationId = user?.id ?? "";

	const { data: indexes = [] } = useQuery(
		orpc.mySearch.listIndexes.queryOptions({
			input: { organizationId },
		}),
	);

	const hasIndexes = indexes.length > 0;

	return (
		<div>
			<div className="mb-6 flex items-start justify-between">
				<PageHeader title={t("mySearch.title")} subtitle={t("mySearch.subtitle")} />
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button size="sm">
							<PlusIcon className="mr-2 h-4 w-4" />
							{t("mySearch.createIndex")}
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-2xl">
						<DialogTitle>{t("mySearch.createNewIndex")}</DialogTitle>
						<CreateIndexForm onSuccess={() => setCreateOpen(false)} />
					</DialogContent>
				</Dialog>
			</div>

			{hasIndexes ? (
				<div className="mt-6 gap-4 sm:grid-cols-2 lg:grid-cols-3 grid grid-cols-2">
					{indexes.map((index) => (
						<Link
							key={index.id}
							href={`/my-search/${index.id}`}
							className="block transition-colors hover:opacity-80"
						>
							<Card className="h-full cursor-pointer">
								<CardContent className="gap-2 p-4 flex flex-col items-start">
									<div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
										<SearchIcon className="h-5 w-5 text-primary" />
									</div>
									<h3 className="font-semibold">{index.displayName}</h3>
									<p className="text-xs text-muted-foreground">
										{t("mySearch.indexSlug")}: {index.slug}
									</p>
									<p className="text-xs text-muted-foreground">
										{new Date(index.createdAt).toLocaleDateString()}
									</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			) : (
				/* Empty state — no indexes yet */
				<Card className="mt-6">
					<CardContent className="py-12 flex flex-col items-center justify-center text-center">
						<div className="mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-muted">
							<SearchIcon className="h-8 w-8 text-muted-foreground" />
						</div>

						<h3 className="text-lg font-semibold">{t("mySearch.emptyStateTitle")}</h3>
						<p className="mt-2 max-w-md text-sm text-muted-foreground">
							{t("mySearch.noIndexesDescription")}
						</p>

						<div className="mt-8 gap-4 flex flex-wrap items-center justify-center">
							<Button size="lg" onClick={() => setCreateOpen(true)}>
								<FileUpIcon className="mr-2 h-4 w-4" />
								{t("mySearch.createFromFiles")}
							</Button>
							<Button size="lg" variant="outline" onClick={() => setCreateOpen(true)}>
								<GlobeIcon className="mr-2 h-4 w-4" />
								{t("mySearch.createFromUrl")}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
