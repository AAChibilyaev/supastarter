import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	FileTextIcon,
	ImageIcon,
	MailIcon,
	NewspaperIcon,
	PackageIcon,
	RadioIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface PressGridItem {
	key: "mediaKit" | "boilerplate" | "pressReleases" | "coverage" | "contact" | "assets";
	icon: ComponentType<{ className?: string }>;
}

const items: PressGridItem[] = [
	{ key: "mediaKit", icon: PackageIcon },
	{ key: "boilerplate", icon: FileTextIcon },
	{ key: "pressReleases", icon: NewspaperIcon },
	{ key: "coverage", icon: RadioIcon },
	{ key: "contact", icon: MailIcon },
	{ key: "assets", icon: ImageIcon },
];

const spanMap: Record<PressGridItem["key"], string> = {
	mediaKit: "md:col-span-2",
	boilerplate: "md:col-span-1",
	pressReleases: "md:col-span-1",
	coverage: "md:col-span-1",
	contact: "md:col-span-1",
	assets: "md:col-span-2",
};

export function PressGrid() {
	const t = useTranslations("press");

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
