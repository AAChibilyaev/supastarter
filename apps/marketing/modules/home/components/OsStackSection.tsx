import { Card, CardContent } from "@repo/ui/components/card";
import { useTranslations } from "next-intl";

type LayerKey = "input" | "understanding" | "retrieval" | "intelligence" | "control" | "security";

const LAYERS: LayerKey[] = [
	"input",
	"understanding",
	"retrieval",
	"intelligence",
	"control",
	"security",
];

const LAYER_TAGS: Record<LayerKey, string[]> = {
	input: ["Text", "Voice", "Image", "Screenshot", "Chat"],
	understanding: ["Embeddings", "OCR", "Transcription", "Intent", "Typo correction"],
	retrieval: ["Full-text", "Vector", "Visual", "Graph", "Hybrid"],
	intelligence: ["Suggestions", "Recommendations", "GraphRAG", "AI answers"],
	control: ["Indexes", "Relevance", "Synonyms", "A/B tests", "Quotas"],
	security: ["Scoped tokens", "Tenant isolation", "Origin allow-list", "SSO"],
};

export function OsStackSection() {
	const t = useTranslations("home.osStack");

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-base font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 lg:grid-cols-2 gap-8 grid grid-cols-1 items-start">
					{/* Layer cards */}
					<div className="space-y-2">
						{LAYERS.map((key, i) => (
							<div
								key={key}
								className="gap-4 px-5 py-4 flex items-start rounded-xl border border-border bg-card transition-colors hover:bg-muted/20"
							>
								<div className="min-w-0 flex-1">
									<div className="gap-2.5 mb-1 flex items-center">
										<span className="font-mono tracking-widest text-[10px] text-muted-foreground/40 uppercase">
											{String(i + 1).padStart(2, "0")}
										</span>
										<h3 className="text-sm font-normal text-foreground">
											{t(`layers.${key}.title`)}
										</h3>
									</div>
									<p className="text-xs font-light leading-relaxed text-muted-foreground">
										{t(`layers.${key}.description`)}
									</p>
									<div className="mt-2.5 gap-1 flex flex-wrap">
										{LAYER_TAGS[key].map((tag) => (
											<span
												key={tag}
												className="px-1.5 py-0.5 font-mono rounded border border-border/50 text-[10px] text-muted-foreground/50"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Architecture diagram — sticky on desktop */}
					<div className="top-8 lg:sticky">
						<Card>
							<CardContent className="p-6 md:p-8">
								<div className="font-mono mb-5 tracking-widest text-[10px] text-muted-foreground/50 uppercase">
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
						<div className="text-xs font-normal text-foreground">{box.label}</div>
						<div className="font-light mt-0.5 font-mono text-[10px] text-muted-foreground/60">
							{box.sublabel}
						</div>
					</div>
					{i < boxes.length - 1 && (
						<div className="py-0.5 flex justify-center">
							<div className="h-3 w-px bg-border" />
						</div>
					)}
				</div>
			))}
		</div>
	);
}
