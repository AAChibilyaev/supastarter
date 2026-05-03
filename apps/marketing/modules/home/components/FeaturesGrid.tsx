import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	GaugeIcon,
	GitBranchIcon,
	GlobeLockIcon,
	KeyRoundIcon,
	LayersIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface FeatureItem {
	key:
		| "scopedTokens"
		| "originAllowlist"
		| "rateLimitQuota"
		| "multiSearch"
		| "reindex"
		| "enterpriseSecurity";
	icon: ComponentType<{ className?: string }>;
}

const items: FeatureItem[] = [
	{ key: "scopedTokens", icon: KeyRoundIcon },
	{ key: "originAllowlist", icon: GlobeLockIcon },
	{ key: "rateLimitQuota", icon: GaugeIcon },
	{ key: "multiSearch", icon: LayersIcon },
	{ key: "reindex", icon: GitBranchIcon },
	{ key: "enterpriseSecurity", icon: ShieldCheckIcon },
];

const spanMap: Record<FeatureItem["key"], string> = {
	scopedTokens: "md:col-span-2",
	originAllowlist: "md:col-span-1",
	rateLimitQuota: "md:col-span-1",
	multiSearch: "md:col-span-1",
	reindex: "md:col-span-1",
	enterpriseSecurity: "md:col-span-2",
};

export function FeaturesGrid() {
	const t = useTranslations();

	return (
		<section id="features" className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-semibold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.features.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						{t("home.features.subtitle")}
					</p>
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
								<CardTitle className="font-semibold leading-snug">
									{t(`home.features.items.${key}.title`)}
								</CardTitle>
							</FeatureCardHeaderRow>
							<CardContent>
								<CardDescription className="text-sm leading-relaxed">
									{t(`home.features.items.${key}.description`)}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
