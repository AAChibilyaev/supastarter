import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ActivityIcon,
	BuildingIcon,
	FileJsonIcon,
	KeyRoundIcon,
	MonitorIcon,
	ServerIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SearchApiItem {
	key: "endpoints" | "openApi" | "browserSdk" | "authentication" | "tenancy" | "observability";
	icon: ComponentType<{ className?: string }>;
}

const items: SearchApiItem[] = [
	{ key: "endpoints", icon: ServerIcon },
	{ key: "openApi", icon: FileJsonIcon },
	{ key: "browserSdk", icon: MonitorIcon },
	{ key: "authentication", icon: KeyRoundIcon },
	{ key: "tenancy", icon: BuildingIcon },
	{ key: "observability", icon: ActivityIcon },
];

const spanMap: Record<SearchApiItem["key"], string> = {
	endpoints: "md:col-span-2",
	openApi: "md:col-span-1",
	browserSdk: "md:col-span-1",
	authentication: "md:col-span-1",
	tenancy: "md:col-span-1",
	observability: "md:col-span-2",
};

export function SearchApiGrid() {
	const t = useTranslations("featuresSearchApi");

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
