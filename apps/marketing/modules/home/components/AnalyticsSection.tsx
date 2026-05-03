import { Card, CardContent } from "@repo/ui/components/card";
import {
	BarChart3Icon,
	SearchIcon,
	MousePointerClickIcon,
	SlidersHorizontalIcon,
	TrendingUpIcon,
	ShieldAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface AnalyticsItem {
	key: "topQueries" | "noResults" | "ctr" | "filterUsage" | "conversion" | "quota";
	icon: ComponentType<{ className?: string }>;
}

const items: AnalyticsItem[] = [
	{ key: "topQueries", icon: BarChart3Icon },
	{ key: "noResults", icon: SearchIcon },
	{ key: "ctr", icon: MousePointerClickIcon },
	{ key: "filterUsage", icon: SlidersHorizontalIcon },
	{ key: "conversion", icon: TrendingUpIcon },
	{ key: "quota", icon: ShieldAlertIcon },
];

export function AnalyticsSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeAnalytics.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeAnalytics.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="gap-4 flex items-center">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-light">
										{t(`homeAnalytics.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeAnalytics.items.${key}.description`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
