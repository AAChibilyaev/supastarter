import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ActivityIcon,
	AlertTriangleIcon,
	BarChart3Icon,
	BellIcon,
	DatabaseIcon,
	LayoutIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface StatusGridItem {
	key: "api" | "dashboard" | "ingest" | "analytics" | "incidents" | "subscribe";
	icon: ComponentType<{ className?: string }>;
}

const items: StatusGridItem[] = [
	{ key: "api", icon: ActivityIcon },
	{ key: "dashboard", icon: LayoutIcon },
	{ key: "ingest", icon: DatabaseIcon },
	{ key: "analytics", icon: BarChart3Icon },
	{ key: "incidents", icon: AlertTriangleIcon },
	{ key: "subscribe", icon: BellIcon },
];

const spanMap: Record<StatusGridItem["key"], string> = {
	api: "md:col-span-2",
	dashboard: "md:col-span-1",
	ingest: "md:col-span-1",
	analytics: "md:col-span-1",
	incidents: "md:col-span-1",
	subscribe: "md:col-span-2",
};

export function StatusGrid() {
	const t = useTranslations("status");

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
