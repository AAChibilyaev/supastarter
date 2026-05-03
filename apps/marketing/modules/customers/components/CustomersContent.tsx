"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { useTranslations } from "next-intl";

const COMPANY_NAMES = [
	"TechCorp",
	"ShopNow",
	"DevHub",
	"CloudBase",
	"AppWorks",
	"DataFlow",
] as const;

type CustomerKey =
	| "ecommerce"
	| "saasFounder"
	| "devTools"
	| "enterprise"
	| "marketplace"
	| "agency";

const CUSTOMER_KEYS: CustomerKey[] = [
	"ecommerce",
	"saasFounder",
	"devTools",
	"enterprise",
	"marketplace",
	"agency",
];

const STATS = [
	{ value: "500+", label: "Companies worldwide" },
	{ value: "10M+", label: "Searches per day" },
	{ value: "99.9%", label: "Platform uptime" },
	{ value: "4.9/5", label: "Average rating" },
] as const;

const LOGOS_LABEL = "Trusted by teams at";

export function CustomersContent() {
	const t = useTranslations("customers");

	return (
		<>
			{/* Stats bar */}
			<section className="py-16 border-b border-border/60">
				<div className="container">
					<div className="gap-8 md:grid-cols-4 grid grid-cols-2">
						{STATS.map(({ value, label }) => (
							<div key={value} className="text-center">
								<p className="text-4xl font-bold tracking-tight">{value}</p>
								<p className="mt-1 text-sm text-muted-foreground">{label}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Testimonials grid */}
			<section className="section-padding border-b border-border/60">
				<div className="container">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-center text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-center text-muted-foreground">
						{t("subtitle")}
					</p>
					<div className="mt-12 gap-6 md:grid-cols-2 lg:grid-cols-3 grid grid-cols-1">
						{CUSTOMER_KEYS.map((key) => (
							<Card key={key} className="flex flex-col">
								<CardHeader>
									<CardTitle>{t(`items.${key}.title`)}</CardTitle>
									<CardDescription className="text-sm leading-relaxed mt-2">
										{t(`items.${key}.description`)}
									</CardDescription>
								</CardHeader>
								<CardContent className="mt-auto">
									<p className="text-xs text-muted-foreground italic">
										— {t(`items.${key}.role`)}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Logos section */}
			<section className="py-16 border-b border-border/60">
				<div className="container">
					<p className="text-sm font-medium tracking-widest text-center text-muted-foreground uppercase">
						{LOGOS_LABEL}
					</p>
					<div className="mt-8 w-full overflow-x-auto">
						<div className="gap-x-10 mx-auto flex w-max items-center">
							{COMPANY_NAMES.map((name) => (
								<span
									key={name}
									className="text-lg font-semibold shrink-0 whitespace-nowrap text-muted-foreground select-none"
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
