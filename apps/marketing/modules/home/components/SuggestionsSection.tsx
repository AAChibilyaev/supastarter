import { Card, CardContent } from "@repo/ui/components/card";
import {
	ArrowRightIcon,
	BookOpenIcon,
	ClockIcon,
	HashIcon,
	SearchIcon,
	ShoppingBagIcon,
	SparklesIcon,
	StarIcon,
	TrendingUpIcon,
	UserIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface ListItem {
	icon: ComponentType<{ className?: string }>;
	label: string;
}

const SUGGESTION_ITEMS: ListItem[] = [
	{ icon: SearchIcon, label: "Autocomplete" },
	{ icon: ZapIcon, label: "Query completions" },
	{ icon: ClockIcon, label: "Recent searches" },
	{ icon: StarIcon, label: "Pinned suggestions" },
	{ icon: HashIcon, label: "Typo suggestions" },
	{ icon: BookOpenIcon, label: "Facet suggestions" },
	{ icon: ArrowRightIcon, label: "No-result suggestions" },
];

const RECOMMENDATION_ITEMS: ListItem[] = [
	{ icon: ShoppingBagIcon, label: "Similar items" },
	{ icon: BookOpenIcon, label: "Related documents" },
	{ icon: HashIcon, label: "Frequently searched together" },
	{ icon: TrendingUpIcon, label: "Trending queries" },
	{ icon: ClockIcon, label: "Session-based recommendations" },
	{ icon: UserIcon, label: "Personalized recommendations" },
	{ icon: SparklesIcon, label: "Tenant-specific recommendations" },
];

export function SuggestionsSection() {
	const t = useTranslations("home.suggestions");

	return (
		<section className="section-padding border-b border-border bg-muted/20">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 md:grid-cols-2 gap-6 grid grid-cols-1">
					{/* Suggestions Engine */}
					<Card>
						<CardContent className="p-6 md:p-8 flex h-full flex-col">
							<div className="mb-5">
								<div className="size-10 mb-4 flex items-center justify-center rounded-lg bg-muted">
									<SearchIcon className="size-5 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-medium text-foreground">
									{t("suggestionsTitle")}
								</h3>
								<p className="mt-1.5 text-sm font-light text-muted-foreground">
									{t("suggestionsDescription")}
								</p>
							</div>
							<ul className="space-y-2 mt-auto">
								{SUGGESTION_ITEMS.map(({ icon: Icon, label }) => (
									<li
										key={label}
										className="gap-2.5 text-sm font-light flex items-center text-muted-foreground"
									>
										<Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
										{label}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					{/* Recommendation Engine */}
					<Card>
						<CardContent className="p-6 md:p-8 flex h-full flex-col">
							<div className="mb-5">
								<div className="size-10 mb-4 flex items-center justify-center rounded-lg bg-muted">
									<SparklesIcon className="size-5 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-medium text-foreground">
									{t("recommendationsTitle")}
								</h3>
								<p className="mt-1.5 text-sm font-light text-muted-foreground">
									{t("recommendationsDescription")}
								</p>
							</div>
							<ul className="space-y-2 mt-auto">
								{RECOMMENDATION_ITEMS.map(({ icon: Icon, label }) => (
									<li
										key={label}
										className="gap-2.5 text-sm font-light flex items-center text-muted-foreground"
									>
										<Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
										{label}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>

				{/* Tagline */}
				<div className="mt-8 p-5 max-w-2xl mx-auto rounded-xl border border-border bg-card text-center">
					<p className="text-sm font-light text-muted-foreground">{t("tagline")}</p>
				</div>
			</div>
		</section>
	);
}
