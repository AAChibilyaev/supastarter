import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CheckCircleIcon,
	CreditCardIcon,
	DatabaseIcon,
	GaugeIcon,
	TargetIcon,
	WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareElasticsearchItem {
	key: "complexity" | "latency" | "useCase" | "cost" | "schema" | "verdict";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareElasticsearchItem[] = [
	{ key: "complexity", icon: WrenchIcon },
	{ key: "latency", icon: GaugeIcon },
	{ key: "useCase", icon: TargetIcon },
	{ key: "cost", icon: CreditCardIcon },
	{ key: "schema", icon: DatabaseIcon },
	{ key: "verdict", icon: CheckCircleIcon },
];

const spanMap: Record<CompareElasticsearchItem["key"], string> = {
	complexity: "md:col-span-2",
	latency: "md:col-span-1",
	useCase: "md:col-span-1",
	cost: "md:col-span-1",
	schema: "md:col-span-1",
	verdict: "md:col-span-2",
};

export function CompareElasticsearchGrid() {
	const t = useTranslations("compareElasticsearch");

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
