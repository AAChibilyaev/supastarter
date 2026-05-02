import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	CalendarIcon,
	KeyIcon,
	PinIcon,
	TrendingUpIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CurationsGridItem {
	key: "pinned" | "excluded" | "promoted" | "triggerKeywords" | "schedule" | "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: CurationsGridItem[] = [
	{ key: "pinned", icon: PinIcon },
	{ key: "excluded", icon: XCircleIcon },
	{ key: "promoted", icon: TrendingUpIcon },
	{ key: "triggerKeywords", icon: KeyIcon },
	{ key: "schedule", icon: CalendarIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<CurationsGridItem["key"], string> = {
	pinned: "md:col-span-2",
	excluded: "md:col-span-1",
	promoted: "md:col-span-1",
	triggerKeywords: "md:col-span-1",
	schedule: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function CurationsGrid() {
	const t = useTranslations("featuresCurations");

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
