import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	CodeIcon,
	CreditCardIcon,
	TimerIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareSolrGridItem {
	key: "modernApi" | "setup" | "performance" | "multiTenancy" | "analyticsBuiltin" | "pricing";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareSolrGridItem[] = [
	{ key: "modernApi", icon: CodeIcon },
	{ key: "setup", icon: TimerIcon },
	{ key: "performance", icon: ZapIcon },
	{ key: "multiTenancy", icon: UsersIcon },
	{ key: "analyticsBuiltin", icon: BarChart3Icon },
	{ key: "pricing", icon: CreditCardIcon },
];

const spanMap: Record<CompareSolrGridItem["key"], string> = {
	modernApi: "md:col-span-2",
	setup: "md:col-span-1",
	performance: "md:col-span-1",
	multiTenancy: "md:col-span-1",
	analyticsBuiltin: "md:col-span-1",
	pricing: "md:col-span-2",
};

export function CompareSolrGrid() {
	const t = useTranslations("compareSolr");

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
