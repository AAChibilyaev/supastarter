import { Card, CardContent } from "@repo/ui/components/card";
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

export function FeaturesGrid() {
	const t = useTranslations();

	return (
		<section id="features" className="py-14 md:py-24 border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight md:text-4xl text-balance">
						{t("home.features.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
						{t("home.features.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
									<Icon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="font-semibold text-lg leading-snug text-foreground">
										{t(`home.features.items.${key}.title`)}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
										{t(`home.features.items.${key}.description`)}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
