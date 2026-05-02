import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BookOpenIcon,
	BuildingIcon,
	SearchIcon,
	ShoppingBagIcon,
	UsersIcon,
	WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface UseCaseItem {
	key: "ecommerce" | "helpCenter" | "multiTenant" | "devTools" | "internalTools" | "contentSites";
	icon: ComponentType<{ className?: string }>;
}

const items: UseCaseItem[] = [
	{ key: "ecommerce", icon: ShoppingBagIcon },
	{ key: "helpCenter", icon: BookOpenIcon },
	{ key: "multiTenant", icon: UsersIcon },
	{ key: "devTools", icon: WrenchIcon },
	{ key: "internalTools", icon: BuildingIcon },
	{ key: "contentSites", icon: SearchIcon },
];

const spanMap: Record<UseCaseItem["key"], string> = {
	ecommerce: "md:col-span-2",
	helpCenter: "md:col-span-1",
	multiTenant: "md:col-span-1",
	devTools: "md:col-span-1",
	internalTools: "md:col-span-1",
	contentSites: "md:col-span-2",
};

export function UseCasesGrid() {
	const t = useTranslations("useCases");

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
