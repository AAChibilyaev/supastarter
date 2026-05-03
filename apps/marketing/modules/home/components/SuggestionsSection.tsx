import { Card, CardContent } from "@repo/ui/components/card";
import { useTranslations } from "next-intl";

const SUGGESTION_ITEMS = [
	"Autocomplete",
	"Query completions",
	"Recent searches",
	"Pinned suggestions",
	"Typo suggestions",
	"Facet suggestions",
	"No-result suggestions",
];

const RECOMMENDATION_ITEMS = [
	"Similar items",
	"Related documents",
	"Frequently searched together",
	"Trending queries",
	"Session-based recommendations",
	"Personalized recommendations",
	"Tenant-specific recommendations",
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
					<p className="mt-4 text-base font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 md:grid-cols-2 gap-6 grid grid-cols-1">
					{/* Suggestions Engine */}
					<Card>
						<CardContent className="p-6 md:p-8 flex h-full flex-col">
							<div className="mb-5">
								<div className="font-mono mb-3 tracking-widest text-[10px] text-muted-foreground/50 uppercase">
									01
								</div>
								<h3 className="text-base font-normal text-foreground">
									{t("suggestionsTitle")}
								</h3>
								<p className="mt-1.5 text-sm font-light text-muted-foreground">
									{t("suggestionsDescription")}
								</p>
							</div>
							<ul className="space-y-2 mt-auto">
								{SUGGESTION_ITEMS.map((label) => (
									<li
										key={label}
										className="gap-2.5 text-sm font-light flex items-center text-muted-foreground"
									>
										<span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
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
								<div className="font-mono mb-3 tracking-widest text-[10px] text-muted-foreground/50 uppercase">
									02
								</div>
								<h3 className="text-base font-normal text-foreground">
									{t("recommendationsTitle")}
								</h3>
								<p className="mt-1.5 text-sm font-light text-muted-foreground">
									{t("recommendationsDescription")}
								</p>
							</div>
							<ul className="space-y-2 mt-auto">
								{RECOMMENDATION_ITEMS.map((label) => (
									<li
										key={label}
										className="gap-2.5 text-sm font-light flex items-center text-muted-foreground"
									>
										<span className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
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
