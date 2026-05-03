import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	FilterIcon,
	FolderIcon,
	GlobeLockIcon,
	ServerIcon,
	ShieldIcon,
	TimerIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface ScopedTokensItem {
	key: "hmacSigning" | "ttl" | "filters" | "originLock" | "indexScope" | "serverSide";
	icon: ComponentType<{ className?: string }>;
}

const items: ScopedTokensItem[] = [
	{ key: "hmacSigning", icon: ShieldIcon },
	{ key: "ttl", icon: TimerIcon },
	{ key: "filters", icon: FilterIcon },
	{ key: "originLock", icon: GlobeLockIcon },
	{ key: "indexScope", icon: FolderIcon },
	{ key: "serverSide", icon: ServerIcon },
];

const spanMap: Record<ScopedTokensItem["key"], string> = {
	hmacSigning: "md:col-span-2",
	ttl: "md:col-span-1",
	filters: "md:col-span-1",
	originLock: "md:col-span-1",
	indexScope: "md:col-span-1",
	serverSide: "md:col-span-2",
};

export function ScopedTokensGrid() {
	const t = useTranslations("featuresScopedTokens");

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
