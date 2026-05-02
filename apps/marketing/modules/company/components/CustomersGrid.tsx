import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BuildingIcon,
	CodeIcon,
	RocketIcon,
	ShoppingCartIcon,
	StoreIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CustomersItem {
	key: "ecommerce" | "saasFounder" | "devTools" | "enterprise" | "marketplace" | "agency";
	icon: ComponentType<{ className?: string }>;
}

const items: CustomersItem[] = [
	{ key: "ecommerce", icon: ShoppingCartIcon },
	{ key: "saasFounder", icon: RocketIcon },
	{ key: "devTools", icon: CodeIcon },
	{ key: "enterprise", icon: BuildingIcon },
	{ key: "marketplace", icon: StoreIcon },
	{ key: "agency", icon: UsersIcon },
];

const spanMap: Record<CustomersItem["key"], string> = {
	ecommerce: "md:col-span-2",
	saasFounder: "md:col-span-1",
	devTools: "md:col-span-1",
	enterprise: "md:col-span-1",
	marketplace: "md:col-span-1",
	agency: "md:col-span-2",
};

export function CustomersGrid() {
	const t = useTranslations("customers");

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
								<p className="mt-2 text-xs text-muted-foreground/70 italic">
									{t(`items.${key}.role`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
