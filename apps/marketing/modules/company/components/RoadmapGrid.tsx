"use client";

import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BookOpenIcon,
	BrainCircuitIcon,
	CheckCircleIcon,
	CloudIcon,
	GaugeIcon,
	LinkIcon,
	MegaphoneIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface RoadmapItem {
	key:
		| "searchCore"
		| "marketing"
		| "connectors"
		| "knowledge"
		| "metering"
		| "docs"
		| "selfHost"
		| "vectorSearch";
	icon: ComponentType<{ className?: string }>;
}

const ALL_ITEMS: RoadmapItem[] = [
	{ key: "searchCore", icon: CheckCircleIcon },
	{ key: "marketing", icon: MegaphoneIcon },
	{ key: "connectors", icon: LinkIcon },
	{ key: "knowledge", icon: BrainCircuitIcon },
	{ key: "metering", icon: GaugeIcon },
	{ key: "docs", icon: BookOpenIcon },
	{ key: "selfHost", icon: CloudIcon },
	{ key: "vectorSearch", icon: SearchIcon },
];

const spanMap: Record<RoadmapItem["key"], string> = {
	searchCore: "md:col-span-2",
	marketing: "md:col-span-2",
	connectors: "md:col-span-2",
	knowledge: "md:col-span-2",
	metering: "md:col-span-2",
	docs: "md:col-span-2",
	selfHost: "md:col-span-2",
	vectorSearch: "md:col-span-2",
};

function RoadmapCard({ key, icon: Icon }: RoadmapItem) {
	const t = useTranslations("roadmap");

	const status = t(`items.${key}.status`);
	const isShipped = status === "shipped";
	const isInProgress = status === "inProgress";

	return (
		<Card
			className={cn(
				"group transition-all duration-300 hover:border-primary/30 hover:bg-accent/5",
				isShipped && "border-green-500/10",
				isInProgress && "border-blue-500/10",
			)}
		>
			<FeatureCardHeaderRow icon={Icon}>
				<CardTitle className="gap-2 flex items-center">
					{t(`items.${key}.title`)}
					<span
						className={cn(
							"text-xs font-normal px-2 py-0.5 rounded-full border",
							isShipped
								? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
								: isInProgress
									? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
									: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
						)}
					>
						{isShipped ? t("shipped") : isInProgress ? t("inProgress") : t("planned")}
					</span>
				</CardTitle>
			</FeatureCardHeaderRow>
			<CardContent>
				<CardDescription className="text-sm leading-relaxed">
					{t(`items.${key}.description`)}
				</CardDescription>
			</CardContent>
		</Card>
	);
}

function RoadmapSection({
	status,
	titleKey,
	items,
}: {
	status: string;
	titleKey: string;
	items: RoadmapItem[];
}) {
	const t = useTranslations("roadmap");

	if (items.length === 0) return null;

	return (
		<div className="mb-16 last:mb-0">
			<div className="mb-8 max-w-2xl mx-auto text-center">
				<h2 className="font-medium text-2xl tracking-tight md:text-3xl text-balance">
					{t(titleKey)}
				</h2>
			</div>
			<div className="gap-4 md:grid-cols-4 grid grid-cols-1">
				{items.map((item) => (
					<div key={item.key} className={spanMap[item.key]}>
						<RoadmapCard {...item} />
					</div>
				))}
			</div>
		</div>
	);
}

export function RoadmapGrid() {
	const t = useTranslations("roadmap");

	const shipped = ALL_ITEMS.filter((item) => t(`items.${item.key}.status`) === "shipped");
	const inProgress = ALL_ITEMS.filter((item) => t(`items.${item.key}.status`) === "inProgress");
	const planned = ALL_ITEMS.filter(
		(item) =>
			t(`items.${item.key}.status`) !== "shipped" &&
			t(`items.${item.key}.status`) !== "inProgress",
	);

	return (
		<>
			<section className="py-24 border-b border-border/60">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("subtitle")}
						</p>
					</div>

					<div className="mt-16">
						<RoadmapSection status="shipped" titleKey="shippedTitle" items={shipped} />
						<RoadmapSection
							status="inProgress"
							titleKey="inProgressTitle"
							items={inProgress}
						/>
						<RoadmapSection status="planned" titleKey="plannedTitle" items={planned} />
					</div>
				</div>
			</section>

			{/* Feedback CTA */}
			<section className="py-20">
				<div className="container">
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("feedback.title")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{t("feedback.description")}
						</p>
						<div className="mt-8 gap-3 flex flex-wrap items-center justify-center">
							<a
								href="mailto:feedback@aacsearch.com?subject=Feature%20Request"
								className="px-6 py-3 text-sm font-medium rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
							>
								{t("feedback.cta")}
							</a>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
