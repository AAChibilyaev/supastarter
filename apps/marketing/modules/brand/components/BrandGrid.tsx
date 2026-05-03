import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	DownloadIcon,
	FileCheckIcon,
	MailIcon,
	PaletteIcon,
	StarIcon,
	TypeIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface BrandGridItem {
	key: "logo" | "colors" | "typography" | "guidelines" | "assets" | "contact";
	icon: ComponentType<{ className?: string }>;
}

const items: BrandGridItem[] = [
	{ key: "logo", icon: StarIcon },
	{ key: "colors", icon: PaletteIcon },
	{ key: "typography", icon: TypeIcon },
	{ key: "guidelines", icon: FileCheckIcon },
	{ key: "assets", icon: DownloadIcon },
	{ key: "contact", icon: MailIcon },
];

const spanMap: Record<BrandGridItem["key"], string> = {
	logo: "md:col-span-2",
	colors: "md:col-span-1",
	typography: "md:col-span-1",
	guidelines: "md:col-span-1",
	assets: "md:col-span-1",
	contact: "md:col-span-2",
};

export function BrandGrid() {
	const t = useTranslations("brand");

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
