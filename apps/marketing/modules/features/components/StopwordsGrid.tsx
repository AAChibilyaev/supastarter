import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import {
	ActivityIcon,
	BarChart3Icon,
	FilterIcon,
	GlobeIcon,
	LayersIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface StopwordsGridItem {
	key:
		| "customStopwords"
		| "perCollection"
		| "languageAware"
		| "analytics"
		| "realTime"
		| "performance";
	icon: ComponentType<{ className?: string }>;
}

const items: StopwordsGridItem[] = [
	{ key: "customStopwords", icon: FilterIcon },
	{ key: "perCollection", icon: LayersIcon },
	{ key: "languageAware", icon: GlobeIcon },
	{ key: "analytics", icon: BarChart3Icon },
	{ key: "realTime", icon: ZapIcon },
	{ key: "performance", icon: ActivityIcon },
];

const spanMap: Record<StopwordsGridItem["key"], string> = {
	customStopwords: "md:col-span-2",
	perCollection: "md:col-span-1",
	languageAware: "md:col-span-1",
	analytics: "md:col-span-1",
	realTime: "md:col-span-1",
	performance: "md:col-span-2",
};

export function StopwordsGrid() {
	const t = useTranslations("featuresStopwords");

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
							<CardHeader>
								<div className="mb-3 size-10 flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
									<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
								</div>
								<CardTitle>{t(`items.${key}.title`)}</CardTitle>
							</CardHeader>
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
