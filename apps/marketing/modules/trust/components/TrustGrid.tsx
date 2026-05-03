import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ClipboardListIcon,
	EyeIcon,
	LockIcon,
	MapPinIcon,
	ScaleIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface TrustGridItem {
	key: "soc2" | "gdpr" | "encryption" | "dataResidency" | "auditLog" | "disclosure";
	icon: ComponentType<{ className?: string }>;
}

const items: TrustGridItem[] = [
	{ key: "soc2", icon: ShieldCheckIcon },
	{ key: "gdpr", icon: ScaleIcon },
	{ key: "encryption", icon: LockIcon },
	{ key: "dataResidency", icon: MapPinIcon },
	{ key: "auditLog", icon: ClipboardListIcon },
	{ key: "disclosure", icon: EyeIcon },
];

const spanMap: Record<TrustGridItem["key"], string> = {
	soc2: "md:col-span-2",
	gdpr: "md:col-span-1",
	encryption: "md:col-span-1",
	dataResidency: "md:col-span-1",
	auditLog: "md:col-span-1",
	disclosure: "md:col-span-2",
};

export function TrustGrid() {
	const t = useTranslations("trust");

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
