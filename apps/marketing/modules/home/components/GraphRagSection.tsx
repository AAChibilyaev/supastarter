import { Card, CardContent } from "@repo/ui/components/card";
import { GitBranchIcon, MessageSquareQuoteIcon, NetworkIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

type FeatureKey = "entityExtraction" | "relationshipGraph" | "answersWithCitations";

interface Feature {
	key: FeatureKey;
	icon: ComponentType<{ className?: string }>;
}

const FEATURES: Feature[] = [
	{ key: "entityExtraction", icon: TagIcon },
	{ key: "relationshipGraph", icon: NetworkIcon },
	{ key: "answersWithCitations", icon: MessageSquareQuoteIcon },
];

const QUERY_KEYS = ["q1", "q2", "q3", "q4"] as const;

export function GraphRagSection() {
	const t = useTranslations("home.graphrag");

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 lg:grid-cols-2 gap-8 grid grid-cols-1 items-start">
					{/* Left: feature cards */}
					<div className="space-y-4">
						{FEATURES.map(({ key, icon: Icon }) => (
							<Card key={key}>
								<CardContent className="p-6 gap-4 flex flex-col">
									<div className="gap-4 flex items-center">
										<div className="size-10 bg-emerald-500/10 flex shrink-0 items-center justify-center rounded-lg">
											<Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
										</div>
										<h3 className="text-base font-medium text-foreground">
											{t(`features.${key}.title`)}
										</h3>
									</div>
									<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
										{t(`features.${key}.description`)}
									</p>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Right: example queries + graph diagram */}
					<div className="space-y-4">
						{/* Example queries */}
						<Card>
							<CardContent className="p-6 md:p-8">
								<div className="gap-2 mb-5 flex items-center">
									<GitBranchIcon className="size-4 text-emerald-500" />
									<span className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
										Example queries
									</span>
								</div>
								<ul className="space-y-3">
									{QUERY_KEYS.map((qk) => (
										<li key={qk} className="gap-3 flex items-start">
											<span className="mt-0.5 size-5 border-emerald-500/30 bg-emerald-500/5 flex shrink-0 items-center justify-center rounded-full border">
												<span className="size-1.5 bg-emerald-500/60 rounded-full" />
											</span>
											<span className="text-sm font-light text-foreground/80">
												{t(`exampleQueries.${qk}`)}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>

						{/* Graph diagram */}
						<Card>
							<CardContent className="p-6">
								<div className="font-mono mb-4 tracking-widest text-[10px] text-muted-foreground/50 uppercase">
									Knowledge graph — billing service
								</div>
								<GraphDiagram />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}

function GraphDiagram() {
	const nodes = [
		{ label: "Service: billing", main: true },
		{ label: "→ incidents (3)" },
		{ label: "→ owners (2)" },
		{ label: "→ docs (12)" },
		{ label: "→ API methods (8)" },
		{ label: "→ customers affected (147)" },
	];

	return (
		<div className="space-y-1.5 font-mono text-[11px]">
			{nodes.map((node) => (
				<div
					key={node.label}
					className={`px-3 py-1.5 rounded-md ${
						node.main
							? "border-emerald-500/30 bg-emerald-500/5 font-medium border text-foreground"
							: "pl-5 text-muted-foreground/70"
					}`}
				>
					{node.label}
				</div>
			))}
		</div>
	);
}
