import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { VisualFrame } from "../components/VisualFrame";

const PROVIDERS = ["Algolia", "Meilisearch", "Elasticsearch", "Typesense"] as const;

const STEPS = [
	{ n: "01", label: "Export", note: "JSON / NDJSON or API export", done: true },
	{ n: "02", label: "Import", note: "CLI one-liner or drag & drop", done: true },
	{ n: "03", label: "Parallel index", note: "Both run simultaneously", done: true },
	{ n: "04", label: "Alias switch", note: "Zero-downtime cutover", done: false },
] as const;

export function MigrationFlowVisual() {
	return (
		<VisualFrame className="p-5 md:p-6">
			{/* Providers → AACsearch */}
			<div className="mb-6 gap-3 flex flex-wrap items-center">
				<div className="gap-2 flex flex-wrap items-center">
					{PROVIDERS.map((name) => (
						<div
							key={name}
							className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-muted/50 text-muted-foreground"
						>
							{name}
						</div>
					))}
				</div>

				<ArrowRightIcon className="size-5 shrink-0 text-muted-foreground" />

				<div className="px-4 py-2 text-sm font-semibold rounded-lg border border-primary/30 bg-primary/8 text-primary">
					AACsearch
				</div>
			</div>

			{/* Steps */}
			<div className="gap-3 sm:grid-cols-4 grid grid-cols-2">
				{STEPS.map((step, i) => (
					<div
						key={step.n}
						className="p-4 relative rounded-xl border border-border bg-muted/30"
					>
						{i < STEPS.length - 1 && (
							<div className="-right-1.5 w-3 sm:block absolute top-1/2 hidden h-px -translate-y-1/2 bg-border" />
						)}

						<div className="flex items-start justify-between">
							<span className="font-mono font-bold text-[11px] text-primary">
								{step.n}
							</span>
							{step.done && (
								<div className="size-4 flex items-center justify-center rounded-full bg-muted">
									<CheckIcon className="size-2.5 text-primary" />
								</div>
							)}
						</div>
						<p className="mt-2 text-sm font-medium text-foreground">{step.label}</p>
						<p className="mt-1 leading-relaxed text-[11px] text-muted-foreground">
							{step.note}
						</p>
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="mt-4 gap-6 flex flex-wrap items-center">
				<p className="text-[11px] text-muted-foreground">
					↻ Rollback available at any step
				</p>
				<p className="text-[11px] text-muted-foreground">⊗ No downtime required</p>
				<p className="text-[11px] text-muted-foreground">
					⚡ Average migration: &lt; 1 hour
				</p>
			</div>
		</VisualFrame>
	);
}
