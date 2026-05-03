import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BotIcon,
	BuildingIcon,
	CodeIcon,
	MonitorIcon,
	PuzzleIcon,
	ShoppingCartIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface IntegrationItem {
	key: "prestashop" | "bitrix" | "restApi" | "browserSdk" | "mcpServer" | "custom";
	icon: ComponentType<{ className?: string }>;
}

const items: IntegrationItem[] = [
	{ key: "prestashop", icon: ShoppingCartIcon },
	{ key: "bitrix", icon: BuildingIcon },
	{ key: "restApi", icon: CodeIcon },
	{ key: "browserSdk", icon: MonitorIcon },
	{ key: "mcpServer", icon: BotIcon },
	{ key: "custom", icon: PuzzleIcon },
];

const spanMap: Record<IntegrationItem["key"], string> = {
	prestashop: "md:col-span-2",
	bitrix: "md:col-span-1",
	restApi: "md:col-span-1",
	browserSdk: "md:col-span-1",
	mcpServer: "md:col-span-1",
	custom: "md:col-span-2",
};

export function IntegrationsGrid() {
	const t = useTranslations("integrations");

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
