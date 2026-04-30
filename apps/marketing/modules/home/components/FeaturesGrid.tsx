import {
	GaugeIcon,
	GitBranchIcon,
	GlobeLockIcon,
	KeyRoundIcon,
	LayersIcon,
	ServerIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface FeatureItem {
	key: "scopedTokens" | "originAllowlist" | "rateLimitQuota" | "multiSearch" | "reindex" | "selfHost";
	icon: ComponentType<{ className?: string }>;
}

const items: FeatureItem[] = [
	{ key: "scopedTokens", icon: KeyRoundIcon },
	{ key: "originAllowlist", icon: GlobeLockIcon },
	{ key: "rateLimitQuota", icon: GaugeIcon },
	{ key: "multiSearch", icon: LayersIcon },
	{ key: "reindex", icon: GitBranchIcon },
	{ key: "selfHost", icon: ServerIcon },
];

export function FeaturesGrid() {
	const t = useTranslations();

	return (
		<section id="features" className="border-b border-border/60 py-20">
			<div className="container">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-balance font-medium text-3xl tracking-tight md:text-4xl">
						{t("home.features.title")}
					</h2>
					<p className="mt-3 text-muted-foreground">{t("home.features.subtitle")}</p>
				</div>

				<div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
					{items.map(({ key, icon: Icon }) => (
						<div
							key={key}
							className="bg-card/30 p-6 backdrop-blur transition hover:bg-card/60"
						>
							<Icon className="size-5 text-emerald-300" />
							<h3 className="mt-4 font-medium text-foreground">
								{t(`home.features.items.${key}.title`)}
							</h3>
							<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
								{t(`home.features.items.${key}.description`)}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
