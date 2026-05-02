import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import { BotIcon, BrainIcon, CodeIcon, ServerIcon, TerminalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface DevToolsItem {
	key: "restApi" | "mcp" | "semanticSearch" | "typedSdk" | "orpcControl";
	icon: ComponentType<{ className?: string }>;
}

const items: DevToolsItem[] = [
	{ key: "restApi", icon: ServerIcon },
	{ key: "mcp", icon: BotIcon },
	{ key: "semanticSearch", icon: BrainIcon },
	{ key: "typedSdk", icon: CodeIcon },
	{ key: "orpcControl", icon: TerminalIcon },
];

const spanMap: Record<DevToolsItem["key"], string> = {
	restApi: "md:col-span-2",
	mcp: "md:col-span-1",
	semanticSearch: "md:col-span-1",
	typedSdk: "md:col-span-1",
	orpcControl: "md:col-span-2",
};

export function DevToolsGrid() {
	const t = useTranslations("useCasesDevTools");

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
