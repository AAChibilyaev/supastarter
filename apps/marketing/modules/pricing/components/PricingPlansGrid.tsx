import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import { Building2Icon, CrownIcon, GiftIcon, RocketIcon, StarIcon, WrenchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface PricingPlansGridItem {
	key: "free" | "starter" | "pro" | "business" | "enterprise" | "custom";
	icon: ComponentType<{ className?: string }>;
}

const items: PricingPlansGridItem[] = [
	{ key: "free", icon: GiftIcon },
	{ key: "starter", icon: RocketIcon },
	{ key: "pro", icon: StarIcon },
	{ key: "business", icon: Building2Icon },
	{ key: "enterprise", icon: CrownIcon },
	{ key: "custom", icon: WrenchIcon },
];

const spanMap: Record<PricingPlansGridItem["key"], string> = {
	free: "md:col-span-2",
	starter: "md:col-span-1",
	pro: "md:col-span-1",
	business: "md:col-span-1",
	enterprise: "md:col-span-1",
	custom: "md:col-span-2",
};

export function PricingPlansGrid() {
	const t = useTranslations("pricingPlans");

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
