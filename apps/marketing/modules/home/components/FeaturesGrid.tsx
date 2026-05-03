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
		<section id="features" className="border-b border-border py-14 md:py-24">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("home.features.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
						{t("home.features.subtitle")}
					</p>
				</div>

				<div className="mt-12 grid grid-cols-1 gap-px bg-border overflow-hidden rounded-lg border border-border sm:grid-cols-2 lg:grid-cols-3 md:mt-16">
					{items.map(({ key, icon: Icon }) => (
						<div key={key} className="flex flex-col gap-4 bg-card p-6 md:p-8">
							<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-primary/10">
								<Icon className="size-5 text-primary" />
							</div>
							<div>
								<h3 className="font-semibold text-base leading-snug text-foreground">
									{t(`home.features.items.${key}.title`)}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
									{t(`home.features.items.${key}.description`)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
