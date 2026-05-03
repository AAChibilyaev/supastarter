"use client";

import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BrainCircuitIcon,
	LayersIcon,
	SparklesIcon,
	BookOpenIcon,
	ShoppingBagIcon,
	DatabaseIcon,
	StoreIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SearchModeItem {
	key: "vector" | "hybrid" | "semantic";
	icon: ComponentType<{ className?: string }>;
}

const searchModes: SearchModeItem[] = [
	{ key: "vector", icon: BrainCircuitIcon },
	{ key: "hybrid", icon: LayersIcon },
	{ key: "semantic", icon: SparklesIcon },
];

interface UseCaseItem {
	key: "ecommerce" | "docs" | "knowledge" | "marketplace";
	icon: ComponentType<{ className?: string }>;
}

const useCases: UseCaseItem[] = [
	{ key: "ecommerce", icon: ShoppingBagIcon },
	{ key: "docs", icon: BookOpenIcon },
	{ key: "knowledge", icon: DatabaseIcon },
	{ key: "marketplace", icon: StoreIcon },
];

const howItWorksSteps = ["upload", "model", "index", "query"] as const;

export function AiSearchContent() {
	const t = useTranslations("aiSearchPage");

	return (
		<>
			{/* Search modes section */}
			<section className="section-padding border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("modes.title")}
						</h2>
					</div>

					<div className="mt-16 gap-4 sm:grid-cols-2 md:grid-cols-3 grid grid-cols-1">
						{searchModes.map(({ key, icon: Icon }) => (
							<Card
								key={key}
								className="group transition-colors hover:border-primary/30 hover:bg-accent/5"
							>
								<FeatureCardHeaderRow icon={Icon}>
									<CardTitle>{t(`modes.${key}.title`)}</CardTitle>
								</FeatureCardHeaderRow>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed">
										{t(`modes.${key}.description`)}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Use cases section */}
			<section className="section-padding border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("useCases.title")}
						</h2>
					</div>

					<div className="mt-16 gap-4 md:grid-cols-2 grid grid-cols-1">
						{useCases.map(({ key, icon: Icon }) => (
							<div
								key={key}
								className={cn(
									"group p-6 rounded-xl border border-border/60 bg-card",
									"transition-colors hover:border-primary/30 hover:bg-accent/5",
								)}
							>
								<div className="mb-4 size-10 flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
									<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
								</div>
								<h3 className="font-semibold text-base text-foreground">
									{t(`useCases.${key}.title`)}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{t(`useCases.${key}.description`)}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How it works section */}
			<section className="section-padding border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("howItWorks.title")}
						</h2>
					</div>

					<div className="mt-20 lg:grid-cols-4 gap-0 grid grid-cols-1">
						{howItWorksSteps.map((step, i) => (
							<div
								key={step}
								className="relative flex flex-col items-center text-center"
							>
								{/* Timeline connectors */}
								<div className="mb-6 relative flex w-full items-center justify-center">
									{/* Left connector (hidden on first) */}
									{i > 0 && (
										<div className="lg:block absolute top-1/2 right-1/2 hidden h-px w-full bg-border" />
									)}
									{/* Vertical connector on mobile (top) */}
									{i > 0 && (
										<div className="-top-10 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
									)}

									{/* Number circle */}
									<div className="size-12 shadow-sm z-10 flex items-center justify-center rounded-full border-2 border-primary/30 bg-background">
										<span className="font-semibold text-sm text-primary">
											{i + 1}
										</span>
									</div>

									{/* Right connector (hidden on last) */}
									{i < howItWorksSteps.length - 1 && (
										<div className="lg:block absolute top-1/2 left-1/2 hidden h-px w-full bg-border" />
									)}
									{/* Vertical connector on mobile (bottom) */}
									{i < howItWorksSteps.length - 1 && (
										<div className="top-12 h-10 lg:hidden absolute left-1/2 w-px bg-border" />
									)}
								</div>

								<h3 className="font-medium text-lg text-foreground">
									{t(`howItWorks.steps.${step}.title`)}
								</h3>
								<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
									{t(`howItWorks.steps.${step}.description`)}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
