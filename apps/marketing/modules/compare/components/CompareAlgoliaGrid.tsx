import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ArrowRightIcon,
	CheckCircleIcon,
	CreditCardIcon,
	ShieldCheckIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareAlgoliaItem {
	key: "pricing" | "performance" | "multiTenancy" | "security" | "migration" | "verdict";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareAlgoliaItem[] = [
	{ key: "pricing", icon: CreditCardIcon },
	{ key: "performance", icon: ZapIcon },
	{ key: "multiTenancy", icon: UsersIcon },
	{ key: "security", icon: ShieldCheckIcon },
	{ key: "migration", icon: ArrowRightIcon },
	{ key: "verdict", icon: CheckCircleIcon },
];

const spanMap: Record<CompareAlgoliaItem["key"], string> = {
	pricing: "md:col-span-2",
	performance: "md:col-span-1",
	multiTenancy: "md:col-span-1",
	security: "md:col-span-1",
	migration: "md:col-span-1",
	verdict: "md:col-span-2",
};

export function CompareAlgoliaGrid() {
	const t = useTranslations("compareAlgolia");

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
