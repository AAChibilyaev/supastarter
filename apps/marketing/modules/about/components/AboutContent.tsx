import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import { GaugeIcon, CodeIcon, DollarSignIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface WhyItem {
	key: "speed" | "simple" | "open";
	icon: ComponentType<{ className?: string }>;
}

const whyItems: WhyItem[] = [
	{ key: "speed", icon: GaugeIcon },
	{ key: "simple", icon: CodeIcon },
	{ key: "open", icon: DollarSignIcon },
];

export function AboutContent() {
	const t = useTranslations("aboutPage");

	return (
		<>
			{/* Mission section */}
			<section className="py-24 border-b border-border/60">
				<div className="container">
					<div className="max-w-3xl mx-auto text-center">
						<p className="text-sm font-semibold tracking-widest text-primary uppercase">
							{t("mission.label")}
						</p>
						<blockquote className="mt-6 text-2xl md:text-3xl font-medium tracking-tight leading-snug text-balance">
							&ldquo;{t("mission.quote")}&rdquo;
						</blockquote>
						<p className="mt-6 text-lg text-balance text-muted-foreground">
							{t("mission.body")}
						</p>
					</div>
				</div>
			</section>

			{/* Stats section */}
			<section className="py-20 border-b border-border/60 bg-muted/30">
				<div className="container">
					<div className="md:grid-cols-4 gap-8 max-w-4xl mx-auto grid grid-cols-2 text-center">
						<div>
							<div className="text-4xl font-bold text-foreground tabular-nums">
								{t("stats.searches")}
							</div>
							<div className="mt-2 text-sm text-muted-foreground">
								{t("stats.searchesLabel")}
							</div>
						</div>
						<div>
							<div className="text-4xl font-bold text-foreground tabular-nums">
								{t("stats.companies")}
							</div>
							<div className="mt-2 text-sm text-muted-foreground">
								{t("stats.companiesLabel")}
							</div>
						</div>
						<div>
							<div className="text-4xl font-bold text-foreground tabular-nums">
								{t("stats.uptime")}
							</div>
							<div className="mt-2 text-sm text-muted-foreground">
								{t("stats.uptimeLabel")}
							</div>
						</div>
						<div>
							<div className="text-4xl font-bold text-foreground tabular-nums">
								{t("stats.latency")}
							</div>
							<div className="mt-2 text-sm text-muted-foreground">
								{t("stats.latencyLabel")}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Why AACsearch section */}
			<section className="py-24 border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("why.title")}
						</h2>
					</div>

					<div className="mt-16 md:grid-cols-3 gap-6 max-w-5xl mx-auto grid grid-cols-1">
						{whyItems.map(({ key, icon: Icon }) => (
							<Card
								key={key}
								className="group transition-colors hover:border-primary/30 hover:bg-accent/5"
							>
								<FeatureCardHeaderRow icon={Icon}>
									<CardTitle>{t(`why.items.${key}.title`)}</CardTitle>
								</FeatureCardHeaderRow>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed">
										{t(`why.items.${key}.description`)}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
