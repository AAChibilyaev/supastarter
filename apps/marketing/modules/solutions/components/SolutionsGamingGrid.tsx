import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	LayersIcon,
	MapPinIcon,
	SearchIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SolutionsGamingItem {
	key: "itemSearch" | "playerSearch" | "geoSearch" | "realTimeSync" | "multiSearch" | "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: SolutionsGamingItem[] = [
	{ key: "itemSearch", icon: SearchIcon },
	{ key: "playerSearch", icon: UsersIcon },
	{ key: "geoSearch", icon: MapPinIcon },
	{ key: "realTimeSync", icon: ZapIcon },
	{ key: "multiSearch", icon: LayersIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<SolutionsGamingItem["key"], string> = {
	itemSearch: "md:col-span-2",
	playerSearch: "md:col-span-1",
	geoSearch: "md:col-span-1",
	realTimeSync: "md:col-span-1",
	multiSearch: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function SolutionsGamingGrid() {
	const t = useTranslations("solutionsGaming");

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
