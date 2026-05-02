import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BookOpenIcon,
	BrainCircuitIcon,
	CheckCircleIcon,
	GaugeIcon,
	LinkIcon,
	MegaphoneIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface RoadmapItem {
	key:
		| "searchCore"
		| "marketing"
		| "connectors"
		| "knowledge"
		| "metering"
		| "docs"
		| "vectorSearch";
	icon: ComponentType<{ className?: string }>;
}

const items: RoadmapItem[] = [
	{ key: "searchCore", icon: CheckCircleIcon },
	{ key: "marketing", icon: MegaphoneIcon },
	{ key: "connectors", icon: LinkIcon },
	{ key: "knowledge", icon: BrainCircuitIcon },
	{ key: "metering", icon: GaugeIcon },
	{ key: "docs", icon: BookOpenIcon },
	{ key: "vectorSearch", icon: SearchIcon },
];

const spanMap: Record<RoadmapItem["key"], string> = {
	searchCore: "md:col-span-2",
	marketing: "md:col-span-2",
	connectors: "md:col-span-2",
	knowledge: "md:col-span-2",
	metering: "md:col-span-2",
	docs: "md:col-span-2",
	vectorSearch: "md:col-span-2",
};

export function RoadmapGrid() {
	const t = useTranslations("roadmap");

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
				</div>

				<div className="mt-16 gap-4 md:grid-cols-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card
							key={key}
							className={cn(
								"group transition-colors hover:border-primary/30 hover:bg-accent/5",
								spanMap[key],
							)}
						>
							<FeatureCardHeaderRow icon={Icon}>
								<CardTitle className="gap-2 flex items-center">
									{t(`items.${key}.title`)}
									<span
										className={cn(
											"text-xs font-normal px-2 py-0.5 rounded-full border",
											t(`items.${key}.status`) === "shipped"
												? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
												: t(`items.${key}.status`) === "inProgress"
													? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
													: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
										)}
									>
										{t(`items.${key}.status`) === "shipped"
											? t("shipped")
											: t(`items.${key}.status`) === "inProgress"
												? t("inProgress")
												: t("planned")}
									</span>
								</CardTitle>
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
