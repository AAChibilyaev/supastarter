import { Card, CardContent } from "@repo/ui/components/card";
import { BrainIcon, CpuIcon, DatabaseIcon, LayersIcon, LockIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

type LayerKey = "input" | "understanding" | "retrieval" | "intelligence" | "control" | "security";

interface Layer {
	key: LayerKey;
	icon: ComponentType<{ className?: string }>;
}

const LAYERS: Layer[] = [
	{ key: "input", icon: LayersIcon },
	{ key: "understanding", icon: BrainIcon },
	{ key: "retrieval", icon: DatabaseIcon },
	{ key: "intelligence", icon: CpuIcon },
	{ key: "control", icon: SearchIcon },
	{ key: "security", icon: LockIcon },
];

export function OsStackSection() {
	const t = useTranslations("home.osStack");

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

				{/* Mobile: vertical list */}
				<div className="mt-12 md:mt-16 lg:hidden space-y-2">
					{LAYERS.map(({ key, icon: Icon }, i) => (
						<div
							key={key}
							className="gap-4 px-5 py-4 flex items-start rounded-xl border border-border bg-card transition-colors hover:bg-muted/20"
						>
							<div className="mt-0.5 size-8 flex shrink-0 items-center justify-center rounded-lg bg-muted">
								<Icon className="size-4 text-muted-foreground" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="gap-2 flex items-center">
									<span className="font-mono font-medium tracking-widest text-[10px] text-muted-foreground/50 uppercase">
										{String(i + 1).padStart(2, "0")}
									</span>
									<h3 className="text-sm font-medium text-foreground">
										{t(`layers.${key}.title`)}
									</h3>
								</div>
								<p className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">
									{t(`layers.${key}.description`)}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Desktop: two columns */}
				<div className="mt-12 md:mt-16 lg:grid lg:grid-cols-2 gap-8 hidden items-start">
					<div className="space-y-2">
						{LAYERS.map(({ key, icon: Icon }, i) => (
							<div
								key={key}
								className="gap-4 px-5 py-4 flex items-start rounded-xl border border-border bg-card transition-colors hover:bg-muted/20"
							>
								<div className="mt-0.5 size-8 flex shrink-0 items-center justify-center rounded-lg bg-muted">
									<Icon className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="gap-2 flex items-center">
										<span className="font-mono font-medium tracking-widest text-[10px] text-muted-foreground/50 uppercase">
											{String(i + 1).padStart(2, "0")}
										</span>
										<h3 className="text-sm font-medium text-foreground">
											{t(`layers.${key}.title`)}
										</h3>
									</div>
									<p className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">
										{t(`layers.${key}.description`)}
									</p>
								</div>
							</div>
						))}
					</div>

					<div className="top-8 sticky">
						<Card>
							<CardContent className="p-6 md:p-8">
								<div className="font-mono mb-5 tracking-widest text-[11px] text-muted-foreground/60 uppercase">
									AACSearch OS — architecture
								</div>
								<OsArchitectureDiagram />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}

function OsArchitectureDiagram() {
	const boxes = [
		{ label: "Input Layer", sublabel: "text · voice · image · chat" },
		{ label: "Understanding Layer", sublabel: "OCR · NLP · embeddings · intent" },
		{ label: "Retrieval Core", sublabel: "full-text · vector · visual · graph" },
		{ label: "Intelligence Layer", sublabel: "suggestions · recommendations · GraphRAG" },
		{ label: "Control Plane", sublabel: "relevance · synonyms · quotas · tenants" },
		{ label: "Security Plane", sublabel: "scoped tokens · isolation · audit log" },
	];

	return (
		<div className="space-y-1.5">
			{boxes.map((box, i) => (
				<div key={box.label}>
					<div className="px-4 py-2.5 rounded-lg border border-border bg-muted/30">
						<div className="text-xs font-medium text-foreground">{box.label}</div>
						<div className="font-light mt-0.5 text-[10px] text-muted-foreground/70">
							{box.sublabel}
						</div>
					</div>
					{i < boxes.length - 1 && (
						<div className="py-0.5 flex justify-center">
							<svg width="1" height="12" aria-hidden="true">
								<line
									x1="0.5"
									y1="0"
									x2="0.5"
									y2="12"
									stroke="currentColor"
									strokeWidth="1"
									className="text-border"
								/>
							</svg>
						</div>
					)}
				</div>
			))}
		</div>
	);
}
