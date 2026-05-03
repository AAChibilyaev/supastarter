import { useTranslations } from "next-intl";

interface FlowStep {
	label: string;
	note?: string;
}

interface FlowProps {
	color: string;
	badge: string;
	steps: FlowStep[];
}

function Flow({ color, badge, steps }: FlowProps) {
	return (
		<div className="flex flex-col gap-0">
			<span
				className={`self-start mb-3 px-2 py-0.5 text-xs font-medium rounded-md ${color}`}
			>
				{badge}
			</span>
			<div className="flex flex-wrap items-center gap-0">
				{steps.map((step, i) => (
					<div key={step.label} className="flex items-center">
						<div className="rounded-lg border border-border bg-card px-4 py-2.5 text-center min-w-[110px]">
							<p className="text-sm font-normal text-foreground whitespace-nowrap">{step.label}</p>
							{step.note && (
								<p className="mt-0.5 text-[10px] font-light text-muted-foreground whitespace-nowrap">
									{step.note}
								</p>
							)}
						</div>
						{i < steps.length - 1 && (
							<div className="mx-2 flex items-center text-muted-foreground/50">
								<svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
									<path
										d="M0 6H17M17 6L12 1M17 6L12 11"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

export function ArchitectureSection() {
	const t = useTranslations("homeArchitecture");

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

				<div className="mt-12 md:mt-16 max-w-4xl mx-auto rounded-xl border border-border bg-card overflow-hidden">
					{/* Diagram grid */}
					<div className="p-6 md:p-10 space-y-8 overflow-x-auto">
						<Flow
							color="bg-muted text-muted-foreground"
							badge={t("ingestLabel")}
							steps={[
								{ label: "Your backend" },
								{ label: "Admin API", note: "Bearer ss_connector_*" },
								{ label: "Ingest queue", note: "DB buffer" },
								{ label: "Search index", note: "Typesense" },
							]}
						/>

						<Flow
							color="bg-muted text-muted-foreground"
							badge={t("searchLabel")}
							steps={[
								{ label: "Browser / app" },
								{ label: "Scoped token", note: "HMAC-signed" },
								{ label: "Search API" },
								{ label: "Results" },
							]}
						/>

						<Flow
							color="bg-muted text-muted-foreground"
							badge={t("manageLabel")}
							steps={[
								{ label: "Dashboard" },
								{ label: "Analytics", note: "top queries, CTR" },
								{ label: "Keys & quotas" },
							]}
						/>
					</div>

					{/* Footer callouts */}
					<div className="px-6 md:px-10 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row gap-4 sm:gap-8">
						<p className="text-xs font-light text-muted-foreground">
							<span className="font-medium text-foreground">↻ </span>
							{t("zeroDowntime")}
						</p>
						<p className="text-xs font-light text-muted-foreground">
							<span className="font-medium text-foreground">⊗ </span>
							{t("tenantIsolation")}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
