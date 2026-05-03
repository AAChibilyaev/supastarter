import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BookmarkIcon,
	BuildingIcon,
	NetworkIcon,
	ScissorsIcon,
	SearchIcon,
	UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface KnowledgeItem {
	key: "ingestion" | "chunking" | "retrieval" | "graphRag" | "citations" | "multiTenant";
	icon: ComponentType<{ className?: string }>;
}

const items: KnowledgeItem[] = [
	{ key: "ingestion", icon: UploadIcon },
	{ key: "chunking", icon: ScissorsIcon },
	{ key: "retrieval", icon: SearchIcon },
	{ key: "graphRag", icon: NetworkIcon },
	{ key: "citations", icon: BookmarkIcon },
	{ key: "multiTenant", icon: BuildingIcon },
];

const spanMap: Record<KnowledgeItem["key"], string> = {
	ingestion: "md:col-span-2",
	chunking: "md:col-span-1",
	retrieval: "md:col-span-1",
	graphRag: "md:col-span-1",
	citations: "md:col-span-1",
	multiTenant: "md:col-span-2",
};

export function KnowledgeGrid() {
	const t = useTranslations("featuresKnowledge");

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
				</div>

				<div className="mt-16 gap-4 sm:grid-cols-2 md:grid-cols-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card
							key={key}
							className={cn(
								"group transition-colors hover:border-primary/30 hover:bg-accent/5",
								spanMap[key],
							)}
						>
							<FeatureCardHeaderRow icon={Icon}>
								<CardTitle>{t(`items.${key}.title`)}</CardTitle>
							</FeatureCardHeaderRow>
							<CardContent>
								<CardDescription className="text-sm leading-relaxed">
									{t(`items.${key}.description`)}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
