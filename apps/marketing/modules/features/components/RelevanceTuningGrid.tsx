import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	PinIcon,
	ShoppingBagIcon,
	SlidersIcon,
	StarIcon,
	TrendingUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface RelevanceTuningGridItem {
	key:
		| "fieldWeighting"
		| "boostRules"
		| "pinnedResults"
		| "merchandising"
		| "scoring"
		| "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: RelevanceTuningGridItem[] = [
	{ key: "fieldWeighting", icon: SlidersIcon },
	{ key: "boostRules", icon: TrendingUpIcon },
	{ key: "pinnedResults", icon: PinIcon },
	{ key: "merchandising", icon: ShoppingBagIcon },
	{ key: "scoring", icon: StarIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<RelevanceTuningGridItem["key"], string> = {
	fieldWeighting: "md:col-span-2",
	boostRules: "md:col-span-1",
	pinnedResults: "md:col-span-1",
	merchandising: "md:col-span-1",
	scoring: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function RelevanceTuningGrid() {
	const t = useTranslations("featuresRelevanceTuning");

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
