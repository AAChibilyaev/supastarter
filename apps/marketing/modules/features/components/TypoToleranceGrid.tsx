import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	AlignLeftIcon,
	BookIcon,
	CheckCircleIcon,
	PencilIcon,
	ScissorsIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface TypoToleranceGridItem {
	key:
		| "editDistance"
		| "prefixMatch"
		| "splitWords"
		| "customDictionary"
		| "performance"
		| "accuracy";
	icon: ComponentType<{ className?: string }>;
}

const items: TypoToleranceGridItem[] = [
	{ key: "editDistance", icon: PencilIcon },
	{ key: "prefixMatch", icon: AlignLeftIcon },
	{ key: "splitWords", icon: ScissorsIcon },
	{ key: "customDictionary", icon: BookIcon },
	{ key: "performance", icon: ZapIcon },
	{ key: "accuracy", icon: CheckCircleIcon },
];

const spanMap: Record<TypoToleranceGridItem["key"], string> = {
	editDistance: "md:col-span-2",
	prefixMatch: "md:col-span-1",
	splitWords: "md:col-span-1",
	customDictionary: "md:col-span-1",
	performance: "md:col-span-1",
	accuracy: "md:col-span-2",
};

export function TypoToleranceGrid() {
	const t = useTranslations("featuresTypoTolerance");

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
