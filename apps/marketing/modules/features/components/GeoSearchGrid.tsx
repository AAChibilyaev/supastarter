import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ArrowUpDownIcon,
	FilterIcon,
	MapIcon,
	MapPinIcon,
	SquareIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface GeoSearchItem {
	key:
		| "radiusSearch"
		| "boundingBox"
		| "distanceSorting"
		| "multipleLocations"
		| "performance"
		| "filters";
	icon: ComponentType<{ className?: string }>;
}

const items: GeoSearchItem[] = [
	{ key: "radiusSearch", icon: MapPinIcon },
	{ key: "boundingBox", icon: SquareIcon },
	{ key: "distanceSorting", icon: ArrowUpDownIcon },
	{ key: "multipleLocations", icon: MapIcon },
	{ key: "performance", icon: ZapIcon },
	{ key: "filters", icon: FilterIcon },
];

const spanMap: Record<GeoSearchItem["key"], string> = {
	radiusSearch: "md:col-span-2",
	boundingBox: "md:col-span-1",
	distanceSorting: "md:col-span-1",
	multipleLocations: "md:col-span-1",
	performance: "md:col-span-1",
	filters: "md:col-span-2",
};

export function GeoSearchGrid() {
	const t = useTranslations("featuresGeoSearch");

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
