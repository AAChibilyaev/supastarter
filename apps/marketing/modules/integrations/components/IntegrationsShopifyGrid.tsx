import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	DownloadIcon,
	LayoutIcon,
	PackageIcon,
	RefreshCwIcon,
	TagIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface IntegrationsShopifyItem {
	key: "install" | "productSync" | "variantSync" | "metafields" | "widget" | "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: IntegrationsShopifyItem[] = [
	{ key: "install", icon: DownloadIcon },
	{ key: "productSync", icon: RefreshCwIcon },
	{ key: "variantSync", icon: PackageIcon },
	{ key: "metafields", icon: TagIcon },
	{ key: "widget", icon: LayoutIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<IntegrationsShopifyItem["key"], string> = {
	install: "md:col-span-2",
	productSync: "md:col-span-1",
	variantSync: "md:col-span-1",
	metafields: "md:col-span-1",
	widget: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function IntegrationsShopifyGrid() {
	const t = useTranslations("integrationsShopify");

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
