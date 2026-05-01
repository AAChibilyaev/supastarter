import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import {
	ArrowLeftRightIcon,
	CloudIcon,
	HammerIcon,
	InfoIcon,
	SearchIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CompareItem {
	key:
		| "vsAlgolia"
		| "vsElasticsearch"
		| "vsMeilisearch"
		| "vsTypesense"
		| "vsCustom"
		| "whenNotUs";
	icon: ComponentType<{ className?: string }>;
}

const items: CompareItem[] = [
	{ key: "vsAlgolia", icon: ArrowLeftRightIcon },
	{ key: "vsElasticsearch", icon: ZapIcon },
	{ key: "vsMeilisearch", icon: SearchIcon },
	{ key: "vsTypesense", icon: CloudIcon },
	{ key: "vsCustom", icon: HammerIcon },
	{ key: "whenNotUs", icon: InfoIcon },
];

const spanMap: Record<CompareItem["key"], string> = {
	vsAlgolia: "md:col-span-2",
	vsElasticsearch: "md:col-span-1",
	vsMeilisearch: "md:col-span-1",
	vsTypesense: "md:col-span-1",
	vsCustom: "md:col-span-1",
	whenNotUs: "md:col-span-2",
};

export function CompareGrid() {
	const t = useTranslations("compare");

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
