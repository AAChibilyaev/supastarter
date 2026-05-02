import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ClockIcon,
	FileTextIcon,
	LanguagesIcon,
	MonitorIcon,
	SearchCheckIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface ContentSitesItem {
	key: "contentIndexing" | "instantSearch" | "browserSdk" | "changelog" | "multilingual" | "seo";
	icon: ComponentType<{ className?: string }>;
}

const items: ContentSitesItem[] = [
	{ key: "contentIndexing", icon: FileTextIcon },
	{ key: "instantSearch", icon: ZapIcon },
	{ key: "browserSdk", icon: MonitorIcon },
	{ key: "changelog", icon: ClockIcon },
	{ key: "multilingual", icon: LanguagesIcon },
	{ key: "seo", icon: SearchCheckIcon },
];

const spanMap: Record<ContentSitesItem["key"], string> = {
	contentIndexing: "md:col-span-2",
	instantSearch: "md:col-span-1",
	browserSdk: "md:col-span-1",
	changelog: "md:col-span-1",
	multilingual: "md:col-span-1",
	seo: "md:col-span-2",
};

export function ContentSitesGrid() {
	const t = useTranslations("useCasesContentSites");

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
