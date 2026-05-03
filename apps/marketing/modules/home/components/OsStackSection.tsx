import { Card, CardContent } from "@repo/ui/components/card";
import { BrainIcon, CpuIcon, DatabaseIcon, LayersIcon, LockIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

type LayerKey = "input" | "understanding" | "retrieval" | "intelligence" | "control" | "security";

interface Layer {
	key: LayerKey;
	icon: ComponentType<{ className?: string }>;
	accent: string;
}

const LAYERS: Layer[] = [
	{ key: "input", icon: LayersIcon, accent: "text-blue-500" },
	{ key: "understanding", icon: BrainIcon, accent: "text-violet-500" },
	{ key: "retrieval", icon: DatabaseIcon, accent: "text-cyan-500" },
	{ key: "intelligence", icon: CpuIcon, accent: "text-emerald-500" },
	{ key: "control", icon: SearchIcon, accent: "text-orange-500" },
	{ key: "security", icon: LockIcon, accent: "text-rose-500" },
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

				{/* Stack diagram — vertical flow on mobile, horizontal on lg */}
				<div className="mt-12 md:mt-16 lg:hidden space-y-2">
					{LAYERS.map(({ key, icon: Icon, accent }, i) => (
						<div
							key={key}
							className="group gap-4 px-5 py-4 flex items-start rounded-xl border border-border bg-card transition-colors hover:border-border/80 hover:bg-muted/20"
						>
							<div className="mt-0.5 size-8 flex shrink-0 items-center justify-center rounded-lg bg-muted">
								<Icon className={`size-4 ${accent}`} />
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

				{/* Desktop: 2-column grid with stack visual */}
				<div className="mt-12 md:mt-16 lg:grid lg:grid-cols-2 gap-8 hidden items-start">
					{/* Left: layer cards */}
					<div className="space-y-2">
						{LAYERS.map(({ key, icon: Icon, accent }, i) => (
							<div
								key={key}
								className="gap-4 px-5 py-4 flex items-start rounded-xl border border-border bg-card transition-colors hover:border-border/80 hover:bg-muted/20"
							>
								<div className="mt-0.5 size-8 flex shrink-0 items-center justify-center rounded-lg bg-muted">
									<Icon className={`size-4 ${accent}`} />
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

					{/* Right: architecture diagram */}
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
	const boxes: Array<{ label: string; sublabel: string; color: string }> = [
		{
			label: "Input Layer",
			sublabel: "text · voice · image · chat",
			color: "border-blue-500/30 bg-blue-500/5",
		},
		{
			label: "Understanding Layer",
			sublabel: "OCR · NLP · embeddings · intent",
			color: "border-violet-500/30 bg-violet-500/5",
		},
		{
			label: "Retrieval Core",
			sublabel: "full-text · vector · visual · graph",
			color: "border-cyan-500/30 bg-cyan-500/5",
		},
		{
			label: "Intelligence Layer",
			sublabel: "suggestions · recommendations · GraphRAG",
			color: "border-emerald-500/30 bg-emerald-500/5",
		},
		{
			label: "Control Plane",
			sublabel: "relevance · synonyms · quotas · tenants",
			color: "border-orange-500/30 bg-orange-500/5",
		},
		{
			label: "Security Plane",
			sublabel: "scoped tokens · isolation · audit log",
			color: "border-rose-500/30 bg-rose-500/5",
		},
	];

	return (
		<div className="space-y-1.5">
			{boxes.map((box, i) => (
				<div key={box.label}>
					<div className={`px-4 py-2.5 rounded-lg border ${box.color}`}>
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
