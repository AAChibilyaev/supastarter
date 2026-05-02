import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	DatabaseIcon,
	ListIcon,
	PlugIcon,
	RefreshCwIcon,
	ShoppingBagIcon,
	StethoscopeIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface ConnectorsItem {
	key: "prestashop" | "bitrix" | "connectorApi" | "fullSync" | "diagnostics" | "syncJobs";
	icon: ComponentType<{ className?: string }>;
}

const items: ConnectorsItem[] = [
	{ key: "prestashop", icon: ShoppingBagIcon },
	{ key: "bitrix", icon: DatabaseIcon },
	{ key: "connectorApi", icon: PlugIcon },
	{ key: "fullSync", icon: RefreshCwIcon },
	{ key: "diagnostics", icon: StethoscopeIcon },
	{ key: "syncJobs", icon: ListIcon },
];

const spanMap: Record<ConnectorsItem["key"], string> = {
	prestashop: "md:col-span-2",
	bitrix: "md:col-span-1",
	connectorApi: "md:col-span-1",
	fullSync: "md:col-span-1",
	diagnostics: "md:col-span-1",
	syncJobs: "md:col-span-2",
};

export function ConnectorsGrid() {
	const t = useTranslations("featuresConnectors");

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
