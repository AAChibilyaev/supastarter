import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BuildingIcon,
	ClockIcon,
	CreditCardIcon,
	EyeIcon,
	GaugeIcon,
	ShieldAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface RateLimitingItem {
	key:
		| "perKeyThrottling"
		| "orgQuota"
		| "graceful429"
		| "dashboardVisibility"
		| "planBased"
		| "gracePeriod";
	icon: ComponentType<{ className?: string }>;
}

const items: RateLimitingItem[] = [
	{ key: "perKeyThrottling", icon: GaugeIcon },
	{ key: "orgQuota", icon: BuildingIcon },
	{ key: "graceful429", icon: ShieldAlertIcon },
	{ key: "dashboardVisibility", icon: EyeIcon },
	{ key: "planBased", icon: CreditCardIcon },
	{ key: "gracePeriod", icon: ClockIcon },
];

const spanMap: Record<RateLimitingItem["key"], string> = {
	perKeyThrottling: "md:col-span-2",
	orgQuota: "md:col-span-1",
	graceful429: "md:col-span-1",
	dashboardVisibility: "md:col-span-1",
	planBased: "md:col-span-1",
	gracePeriod: "md:col-span-2",
};

export function RateLimitingGrid() {
	const t = useTranslations("featuresRateLimiting");

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
