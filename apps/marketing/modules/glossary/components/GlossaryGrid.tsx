import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BrainCircuitIcon,
	DatabaseIcon,
	FilterIcon,
	HashIcon,
	LayoutIcon,
	StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface GlossaryGridItem {
	key: "searchIndex" | "facet" | "relevance" | "invertedIndex" | "embedding" | "searchUnit";
	icon: ComponentType<{ className?: string }>;
}

const items: GlossaryGridItem[] = [
	{ key: "searchIndex", icon: DatabaseIcon },
	{ key: "facet", icon: FilterIcon },
	{ key: "relevance", icon: StarIcon },
	{ key: "invertedIndex", icon: LayoutIcon },
	{ key: "embedding", icon: BrainCircuitIcon },
	{ key: "searchUnit", icon: HashIcon },
];

const spanMap: Record<GlossaryGridItem["key"], string> = {
	searchIndex: "md:col-span-2",
	facet: "md:col-span-1",
	relevance: "md:col-span-1",
	invertedIndex: "md:col-span-1",
	embedding: "md:col-span-1",
	searchUnit: "md:col-span-2",
};

export function GlossaryGrid() {
	const t = useTranslations("glossary");

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
