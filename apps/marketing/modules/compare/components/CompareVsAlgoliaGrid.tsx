import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CheckCircleIcon,
	CpuIcon,
	CreditCardIcon,
	GitCompareArrowsIcon,
	GlobeIcon,
	ShieldCheckIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareVsAlgoliaItem {
	key:
		| "pricing"
		| "performance"
		| "multiTenancy"
		| "security"
		| "migration"
		| "openSource"
		| "ecosystem"
		| "verdict";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareVsAlgoliaItem[] = [
	{ key: "pricing", icon: CreditCardIcon },
	{ key: "performance", icon: ZapIcon },
	{ key: "multiTenancy", icon: UsersIcon },
	{ key: "security", icon: ShieldCheckIcon },
	{ key: "migration", icon: GitCompareArrowsIcon },
	{ key: "openSource", icon: CpuIcon },
	{ key: "ecosystem", icon: GlobeIcon },
	{ key: "verdict", icon: CheckCircleIcon },
];

const spanMap: Record<CompareVsAlgoliaItem["key"], string> = {
	pricing: "md:col-span-2",
	performance: "md:col-span-1",
	multiTenancy: "md:col-span-1",
	security: "md:col-span-1",
	migration: "md:col-span-1",
	openSource: "md:col-span-1",
	ecosystem: "md:col-span-1",
	verdict: "md:col-span-2",
};

interface DecisionRow {
	labelKey: string;
	aacsearchValueKey: string;
	algoliaValueKey: string;
}

const decisionRows: DecisionRow[] = [
	{
		labelKey: "decision.price",
		aacsearchValueKey: "decision.aacsearch.price",
		algoliaValueKey: "decision.algolia.price",
	},
	{
		labelKey: "decision.timeToShip",
		aacsearchValueKey: "decision.aacsearch.timeToShip",
		algoliaValueKey: "decision.algolia.timeToShip",
	},
	{
		labelKey: "decision.multiTenant",
		aacsearchValueKey: "decision.aacsearch.multiTenant",
		algoliaValueKey: "decision.algolia.multiTenant",
	},
	{
		labelKey: "decision.lockIn",
		aacsearchValueKey: "decision.aacsearch.lockIn",
		algoliaValueKey: "decision.algolia.lockIn",
	},
	{
		labelKey: "decision.vendorFit",
		aacsearchValueKey: "decision.aacsearch.vendorFit",
		algoliaValueKey: "decision.algolia.vendorFit",
	},
];

export function CompareVsAlgoliaGrid() {
	const t = useTranslations("vsAlgolia");

	return (
		<>
			{/* Comparison items grid */}
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

			{/* Decision matrix section */}
			<section className="py-24 border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("decision.title")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{t("decision.subtitle")}
						</p>
					</div>

					<div className="mt-16 max-w-4xl mx-auto">
						<div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
							{/* Header row */}
							<div className="gap-4 p-4 text-sm font-medium grid grid-cols-3 bg-muted/30 text-muted-foreground">
								<div>{t("decision.criterion")}</div>
								<div className="text-primary">AACsearch</div>
								<div>Algolia</div>
							</div>

							{decisionRows.map((row) => (
								<div
									key={row.labelKey}
									className="gap-4 p-4 text-sm grid grid-cols-3 transition-colors hover:bg-muted/10"
								>
									<div className="font-medium">{t(row.labelKey)}</div>
									<div className="font-medium text-primary">
										{t(row.aacsearchValueKey)}
									</div>
									<div className="text-muted-foreground">
										{t(row.algoliaValueKey)}
									</div>
								</div>
							))}
						</div>

						<p className="mt-6 text-sm text-center text-muted-foreground">
							{t("decision.footnote")}
						</p>
					</div>
				</div>
			</section>
		</>
	);
}
