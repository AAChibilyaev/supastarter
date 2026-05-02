import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	AccessibilityIcon,
	BarChart3Icon,
	BookOpenIcon,
	GlobeIcon,
	MapIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SolutionsEducationItem {
	key:
		| "courseSearch"
		| "learningPaths"
		| "multiLanguage"
		| "accessibility"
		| "synonyms"
		| "analytics";
	icon: ComponentType<{ className?: string }>;
}

const items: SolutionsEducationItem[] = [
	{ key: "courseSearch", icon: SearchIcon },
	{ key: "learningPaths", icon: MapIcon },
	{ key: "multiLanguage", icon: GlobeIcon },
	{ key: "accessibility", icon: AccessibilityIcon },
	{ key: "synonyms", icon: BookOpenIcon },
	{ key: "analytics", icon: BarChart3Icon },
];

const spanMap: Record<SolutionsEducationItem["key"], string> = {
	courseSearch: "md:col-span-2",
	learningPaths: "md:col-span-1",
	multiLanguage: "md:col-span-1",
	accessibility: "md:col-span-1",
	synonyms: "md:col-span-1",
	analytics: "md:col-span-2",
};

export function SolutionsEducationGrid() {
	const t = useTranslations("solutionsEducation");

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
