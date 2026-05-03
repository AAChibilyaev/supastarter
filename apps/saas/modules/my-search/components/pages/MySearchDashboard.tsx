"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { PageHeader } from "@shared/components/PageHeader";
import { FileUpIcon, GlobeIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function MySearchDashboard() {
	const t = useTranslations();

	return (
		<div>
			<PageHeader title={t("mySearch.title")} subtitle={t("mySearch.subtitle")} />

			{/* Empty state — no indexes yet */}
			<Card className="mt-6 p-12">
				<div className="flex flex-col items-center justify-center text-center">
					<div className="h-16 w-16 flex items-center justify-center rounded-full bg-muted">
						<SearchIcon className="h-8 w-8 text-muted-foreground" />
					</div>

					<h3 className="mt-4 text-lg font-semibold">{t("mySearch.noIndexes")}</h3>
					<p className="mt-2 max-w-md text-sm text-muted-foreground">
						{t("mySearch.noIndexesDescription")}
					</p>

					<div className="mt-8 gap-4 flex flex-wrap items-center justify-center">
						<Button size="lg">
							<FileUpIcon className="mr-2 h-4 w-4" />
							{t("mySearch.createFromFiles")}
						</Button>
						<Button size="lg" variant="outline">
							<GlobeIcon className="mr-2 h-4 w-4" />
							{t("mySearch.createFromUrl")}
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
