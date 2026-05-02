import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import {
	BarChart3Icon,
	FileTextIcon,
	LayoutIcon,
	MonitorIcon,
	RefreshCwIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface IntegrationsContentfulItem {
	key:
		| "app"
		| "contentTypes"
		| "autoSync"
		| "webhook"
		| "widget"
		| "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: IntegrationsContentfulItem[] = [
	{ key: "app", icon: MonitorIcon },
	{ key: "contentTypes", icon: FileTextIcon },
	{ key: "autoSync", icon: RefreshCwIcon },
	{ key: "webhook", icon: ZapIcon },
	{ key: "widget", icon: LayoutIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<IntegrationsContentfulItem["key"], string> = {
	app: "md:col-span-2",
	contentTypes: "md:col-span-1",
	autoSync: "md:col-span-1",
	webhook: "md:col-span-1",
	widget: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function IntegrationsContentfulGrid() {
	const t = useTranslations("integrationsContentful");

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
							<CardHeader>
								<div className="mb-3 size-10 flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
									<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
								</div>
								<CardTitle>{t(`items.${key}.title`)}</CardTitle>
							</CardHeader>
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
