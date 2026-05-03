import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ActivityIcon,
	CheckCircleIcon,
	DatabaseIcon,
	SettingsIcon,
	TimerIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface BitrixItem {
	key:
		| "eventHandlers"
		| "backgroundAgent"
		| "catalogSupport"
		| "adminPanel"
		| "diagnostics"
		| "support";
	icon: ComponentType<{ className?: string }>;
}

const items: BitrixItem[] = [
	{ key: "eventHandlers", icon: ZapIcon },
	{ key: "backgroundAgent", icon: TimerIcon },
	{ key: "catalogSupport", icon: DatabaseIcon },
	{ key: "adminPanel", icon: SettingsIcon },
	{ key: "diagnostics", icon: ActivityIcon },
	{ key: "support", icon: CheckCircleIcon },
];

const spanMap: Record<BitrixItem["key"], string> = {
	eventHandlers: "md:col-span-2",
	backgroundAgent: "md:col-span-1",
	catalogSupport: "md:col-span-1",
	adminPanel: "md:col-span-1",
	diagnostics: "md:col-span-1",
	support: "md:col-span-2",
};

export function BitrixGrid() {
	const t = useTranslations("integrationsBitrix");

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
