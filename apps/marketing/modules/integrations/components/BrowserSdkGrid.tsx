import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	AlertCircleIcon,
	CodeIcon,
	KeyRoundIcon,
	LayersIcon,
	SearchIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface BrowserSdkItem {
	key:
		| "typedClient"
		| "singleSearch"
		| "multiSearch"
		| "tokenHandling"
		| "errorHandling"
		| "lightweight";
	icon: ComponentType<{ className?: string }>;
}

const items: BrowserSdkItem[] = [
	{ key: "typedClient", icon: CodeIcon },
	{ key: "singleSearch", icon: SearchIcon },
	{ key: "multiSearch", icon: LayersIcon },
	{ key: "tokenHandling", icon: KeyRoundIcon },
	{ key: "errorHandling", icon: AlertCircleIcon },
	{ key: "lightweight", icon: ZapIcon },
];

const spanMap: Record<BrowserSdkItem["key"], string> = {
	typedClient: "md:col-span-2",
	singleSearch: "md:col-span-1",
	multiSearch: "md:col-span-1",
	tokenHandling: "md:col-span-1",
	errorHandling: "md:col-span-1",
	lightweight: "md:col-span-2",
};

export function BrowserSdkGrid() {
	const t = useTranslations("integrationsBrowserSdk");

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
