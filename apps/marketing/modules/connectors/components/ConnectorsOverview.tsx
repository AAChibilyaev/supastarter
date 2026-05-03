import { cn } from "@repo/ui";
import { Badge, Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CodeIcon,
	DatabaseIcon,
	FileTextIcon,
	PlugIcon,
	ShoppingBagIcon,
	ShoppingCartIcon,
	StoreIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface AvailableItem {
	key: "prestashop" | "bitrix" | "connectorApi";
	icon: ComponentType<{ className?: string }>;
	span: string;
}

interface HeadlessCmsItem {
	key: "strapi" | "contentful" | "sanity";
	icon: ComponentType<{ className?: string }>;
}

interface ComingSoonItem {
	key: "woocommerce" | "shopify";
	icon: ComponentType<{ className?: string }>;
}

const availableItems: AvailableItem[] = [
	{ key: "prestashop", icon: ShoppingBagIcon, span: "md:col-span-2" },
	{ key: "bitrix", icon: DatabaseIcon, span: "md:col-span-2" },
	{ key: "connectorApi", icon: PlugIcon, span: "md:col-span-4" },
];

const headlessCmsItems: HeadlessCmsItem[] = [
	{ key: "strapi", icon: FileTextIcon },
	{ key: "contentful", icon: CodeIcon },
	{ key: "sanity", icon: FileTextIcon },
];

const comingSoonItems: ComingSoonItem[] = [
	{ key: "woocommerce", icon: ShoppingCartIcon },
	{ key: "shopify", icon: StoreIcon },
];

export function ConnectorsOverview() {
	const t = useTranslations("featuresConnectors");
	const tc = useTranslations("connectorsPage");

	return (
		<>
			<section className="section-padding border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("title")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
					</div>

					<div className="mt-16 gap-4 sm:grid-cols-2 md:grid-cols-4 grid grid-cols-1">
						{availableItems.map(({ key, icon: Icon, span }) => (
							<Card
								key={key}
								className={cn(
									"group transition-colors hover:border-primary/30 hover:bg-accent/5",
									span,
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

			<section className="section-padding border-b border-border/60 bg-muted/10">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{tc("headlessCmsTitle")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{tc("headlessCmsSubtitle")}
						</p>
					</div>

					<div className="mt-16 gap-4 md:grid-cols-3 max-w-4xl mx-auto grid grid-cols-1">
						{headlessCmsItems.map(({ key, icon: Icon }) => (
							<Card
								key={key}
								className="group transition-colors hover:border-primary/30 hover:bg-accent/5"
							>
								<FeatureCardHeaderRow icon={Icon}>
									<CardTitle>{tc(`headlessCmsItems.${key}.title`)}</CardTitle>
								</FeatureCardHeaderRow>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed">
										{tc(`headlessCmsItems.${key}.description`)}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section className="section-padding border-b border-border/60 bg-muted/20">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<Badge status="info" className="mb-4">
							{tc("comingSoon")}
						</Badge>
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{tc("comingSoonTitle")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{tc("comingSoonSubtitle")}
						</p>
					</div>

					<div className="mt-16 gap-4 md:grid-cols-2 max-w-2xl mx-auto grid grid-cols-1">
						{comingSoonItems.map(({ key, icon: Icon }) => (
							<Card key={key} className="opacity-60">
								<FeatureCardHeaderRow icon={Icon}>
									<CardTitle>{tc(`comingSoonItems.${key}.title`)}</CardTitle>
								</FeatureCardHeaderRow>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed">
										{tc(`comingSoonItems.${key}.description`)}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
