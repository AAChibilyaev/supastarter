"use client";

import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart3Icon,
	BookOpenIcon,
	BrainCircuitIcon,
	CheckCircleIcon,
	CloudIcon,
	CreditCardIcon,
	GaugeIcon,
	LinkIcon,
	MegaphoneIcon,
	MonitorIcon,
	SearchIcon,
	SparklesIcon,
	ThumbsUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";

interface RoadmapItem {
	key:
		| "aiNlp"
		| "analytics"
		| "billing"
		| "connectors"
		| "docs"
		| "knowledge"
		| "marketing"
		| "metering"
		| "searchCore"
		| "selfHost"
		| "vectorSearch"
		| "widget";
	icon: ComponentType<{ className?: string }>;
	initialVotes: number;
}

const VOTE_STORAGE_KEY = "aacsearch_roadmap_votes";

const ALL_ITEMS: RoadmapItem[] = [
	{ key: "searchCore", icon: CheckCircleIcon, initialVotes: 142 },
	{ key: "marketing", icon: MegaphoneIcon, initialVotes: 68 },
	{ key: "connectors", icon: LinkIcon, initialVotes: 95 },
	{ key: "knowledge", icon: BrainCircuitIcon, initialVotes: 127 },
	{ key: "metering", icon: GaugeIcon, initialVotes: 89 },
	{ key: "billing", icon: CreditCardIcon, initialVotes: 73 },
	{ key: "analytics", icon: BarChart3Icon, initialVotes: 81 },
	{ key: "widget", icon: MonitorIcon, initialVotes: 64 },
	{ key: "aiNlp", icon: SparklesIcon, initialVotes: 112 },
	{ key: "docs", icon: BookOpenIcon, initialVotes: 113 },
	{ key: "selfHost", icon: CloudIcon, initialVotes: 156 },
	{ key: "vectorSearch", icon: SearchIcon, initialVotes: 78 },
];

const spanMap: Record<RoadmapItem["key"], string> = {
	searchCore: "md:col-span-2",
	marketing: "md:col-span-2",
	connectors: "md:col-span-2",
	knowledge: "md:col-span-2",
	metering: "md:col-span-2",
	billing: "md:col-span-2",
	analytics: "md:col-span-2",
	widget: "md:col-span-2",
	aiNlp: "md:col-span-2",
	docs: "md:col-span-2",
	selfHost: "md:col-span-2",
	vectorSearch: "md:col-span-2",
};

function RoadmapCard({ key, icon: Icon, initialVotes }: RoadmapItem) {
	const t = useTranslations("roadmap");
	const [votedFeatures, setVotedFeatures] = useState<Record<string, boolean>>({});
	const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(VOTE_STORAGE_KEY);
			const parsed = stored ? JSON.parse(stored) : {};
			setVotedFeatures(parsed);

			const storedCounts = localStorage.getItem(`${VOTE_STORAGE_KEY}_counts`);
			const initialCounts: Record<string, number> = {};
			for (const item of ALL_ITEMS) {
				initialCounts[item.key] = item.initialVotes;
			}
			const savedCounts = storedCounts
				? { ...initialCounts, ...JSON.parse(storedCounts) }
				: initialCounts;
			setVoteCounts(savedCounts);
			setMounted(true);
		} catch {
			setMounted(true);
		}
	}, []);

	const handleVote = useCallback(() => {
		const newVoted = { ...votedFeatures };
		const newCounts = { ...voteCounts };

		if (newVoted[key]) {
			// Unvote
			delete newVoted[key];
			newCounts[key] = Math.max(0, (newCounts[key] ?? initialVotes) - 1);
		} else {
			// Vote
			newVoted[key] = true;
			newCounts[key] = (newCounts[key] ?? initialVotes) + 1;
		}

		setVotedFeatures(newVoted);
		setVoteCounts(newCounts);

		try {
			localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(newVoted));
			localStorage.setItem(`${VOTE_STORAGE_KEY}_counts`, JSON.stringify(newCounts));
		} catch {
			// localStorage may be full or disabled
		}
	}, [key, votedFeatures, voteCounts, initialVotes]);

	const isVoted = mounted && votedFeatures[key];
	const voteCount = mounted ? (voteCounts[key] ?? initialVotes) : initialVotes;

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

				{/* Vote button row */}
				<div className="mt-4 pt-3 flex items-center justify-between border-t border-border/20">
					<button
						type="button"
						onClick={handleVote}
						disabled={isShipped}
						className={cn(
							"gap-1.5 px-3 py-1.5 text-xs font-medium inline-flex items-center rounded-lg transition-all",
							isShipped && "cursor-not-allowed opacity-30",
							isVoted
								? "border border-primary/20 bg-primary/10 text-primary"
								: "border border-border/30 bg-muted/50 text-muted-foreground hover:border-primary/20 hover:text-foreground",
						)}
					>
						<ThumbsUpIcon className={cn("size-3.5", isVoted && "fill-current")} />
						{isVoted ? t("voted") : t("vote")}
					</button>
					<span className="text-xs text-muted-foreground">
						<strong className="font-semibold text-foreground">{voteCount}</strong>{" "}
						{t("votes", { count: voteCount })}
					</span>
				</div>
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
			t(`items.${item.key}.status`) !== "shipped" && t(`items.${item.key}.status`) !== "inProgress",
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
						<RoadmapSection status="inProgress" titleKey="inProgressTitle" items={inProgress} />
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
						<p className="mt-4 text-lg text-muted-foreground">{t("feedback.description")}</p>
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
