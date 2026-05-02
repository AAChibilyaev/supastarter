import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	CodeIcon,
	GitMergeIcon,
	LayoutIcon,
	TerminalIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface IntegrationsSanityGridItem {
	key: "plugin" | "schemaSync" | "webhook" | "groq" | "widget" | "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: IntegrationsSanityGridItem[] = [
	{ key: "plugin", icon: CodeIcon },
	{ key: "schemaSync", icon: GitMergeIcon },
	{ key: "webhook", icon: ZapIcon },
	{ key: "groq", icon: TerminalIcon },
	{ key: "widget", icon: LayoutIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<IntegrationsSanityGridItem["key"], string> = {
	plugin: "md:col-span-2",
	schemaSync: "md:col-span-1",
	webhook: "md:col-span-1",
	groq: "md:col-span-1",
	widget: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function IntegrationsSanityGrid() {
	const t = useTranslations("integrationsSanity");

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
