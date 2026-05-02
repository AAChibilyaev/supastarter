import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BrainCircuitIcon,
	LanguagesIcon,
	MonitorIcon,
	SearchIcon,
	SearchXIcon,
	TrendingUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface HelpCenterItem {
	key: "articleSearch" | "knowledgeRag" | "zeroResults" | "multilingual" | "widget" | "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: HelpCenterItem[] = [
	{ key: "articleSearch", icon: SearchIcon },
	{ key: "knowledgeRag", icon: BrainCircuitIcon },
	{ key: "zeroResults", icon: SearchXIcon },
	{ key: "multilingual", icon: LanguagesIcon },
	{ key: "widget", icon: MonitorIcon },
	{ key: "analytics", icon: TrendingUpIcon },
];

const spanMap: Record<HelpCenterItem["key"], string> = {
	articleSearch: "md:col-span-2",
	knowledgeRag: "md:col-span-1",
	zeroResults: "md:col-span-1",
	multilingual: "md:col-span-1",
	widget: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function HelpCenterGrid() {
	const t = useTranslations("useCasesHelpCenter");

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
