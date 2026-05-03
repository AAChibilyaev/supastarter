import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart2Icon,
	CheckCircleIcon,
	CloudIcon,
	PlugIcon,
	SearchIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareMeilisearchItem {
	key: "engine" | "hosted" | "multiTenancy" | "analytics" | "connectors" | "verdict";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareMeilisearchItem[] = [
	{ key: "engine", icon: SearchIcon },
	{ key: "hosted", icon: CloudIcon },
	{ key: "multiTenancy", icon: UsersIcon },
	{ key: "analytics", icon: BarChart2Icon },
	{ key: "connectors", icon: PlugIcon },
	{ key: "verdict", icon: CheckCircleIcon },
];

const spanMap: Record<CompareMeilisearchItem["key"], string> = {
	engine: "md:col-span-2",
	hosted: "md:col-span-1",
	multiTenancy: "md:col-span-1",
	analytics: "md:col-span-1",
	connectors: "md:col-span-1",
	verdict: "md:col-span-2",
};

export function CompareMeilisearchGrid() {
	const t = useTranslations("compareMeilisearch");

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
