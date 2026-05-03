"use client";

import { useState } from "react";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { PageHeader } from "@shared/components/PageHeader";
import { FileUpIcon, GlobeIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { CreateIndexForm } from "../CreateIndexForm";

export function MySearchDashboard() {
	const t = useTranslations();
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<div>
			<PageHeader title={t("mySearch.title")} subtitle={t("mySearch.subtitle")}>
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
			</PageHeader>

			{/* Empty state — no indexes yet */}
			<Card className="mt-6">
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
						<SearchIcon className="h-8 w-8 text-muted-foreground" />
					</div>

					<h3 className="text-lg font-semibold">{t("mySearch.emptyStateTitle")}</h3>
					<p className="mt-2 max-w-md text-sm text-muted-foreground">
						{t("mySearch.noIndexesDescription")}
					</p>

					<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
						<Dialog open={createOpen} onOpenChange={setCreateOpen}>
							<DialogTrigger asChild>
								<Button size="lg">
									<FileUpIcon className="mr-2 h-4 w-4" />
									{t("mySearch.createFromFiles")}
								</Button>
							</DialogTrigger>
						</Dialog>
						<Button size="lg" variant="outline">
							<GlobeIcon className="mr-2 h-4 w-4" />
							{t("mySearch.createFromUrl")}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
