"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const DOCS_STEPS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000];
const SEARCHES_STEPS = [
	5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000, 50000000,
];

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 0)}K`;
	return n.toString();
}

type PlanKey = "free" | "pro" | "enterprise";

function resolvePlan(docs: number, searches: number): PlanKey {
	const total = docs + searches;
	if (total <= 10_000) return "free";
	if (total <= 1_000_000) return "pro";
	return "enterprise";
}

export function PricingCalculator() {
	const t = useTranslations();
	const [docsIdx, setDocsIdx] = useState(2); // 10,000
	const [searchesIdx, setSearchesIdx] = useState(2); // 25,000

	const docs = DOCS_STEPS[docsIdx]!;
	const searches = SEARCHES_STEPS[searchesIdx]!;
	const plan = useMemo(() => resolvePlan(docs, searches), [docs, searches]);

	const ctaHref = plan === "enterprise" ? "/contact" : (config.saasUrl ?? "/signup");
	const ctaKey =
		plan === "free"
			? "homePricingCalc.ctaFree"
			: plan === "pro"
				? "homePricingCalc.ctaPro"
				: "homePricingCalc.ctaEnterprise";

	const planColors: Record<PlanKey, string> = {
		free: "text-muted-foreground",
		pro: "text-primary",
		enterprise: "text-foreground",
	};

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homePricingCalc.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homePricingCalc.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 max-w-2xl mx-auto">
					<div className="p-6 md:p-10 space-y-8 rounded-xl border border-border bg-card">
						{/* Docs slider */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-light text-muted-foreground">
									{t("homePricingCalc.docsLabel")}
								</label>
								<span className="text-sm font-semibold text-foreground tabular-nums">
									{formatNumber(docs)}
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={DOCS_STEPS.length - 1}
								value={docsIdx}
								onChange={(e) => setDocsIdx(Number(e.target.value))}
								className="w-full cursor-pointer accent-primary"
							/>
						</div>

						{/* Searches slider */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-light text-muted-foreground">
									{t("homePricingCalc.searchesLabel")}
								</label>
								<span className="text-sm font-semibold text-foreground tabular-nums">
									{formatNumber(searches)}
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={SEARCHES_STEPS.length - 1}
								value={searchesIdx}
								onChange={(e) => setSearchesIdx(Number(e.target.value))}
								className="w-full cursor-pointer accent-primary"
							/>
						</div>

						{/* Units total */}
						<div className="pt-2 flex items-center justify-between border-t border-border">
							<span className="text-sm font-light text-muted-foreground">
								{t("homePricingCalc.unitsLabel")}
							</span>
							<span className="text-sm font-semibold text-foreground tabular-nums">
								{formatNumber(docs + searches)}
							</span>
						</div>

						{/* Recommended plan */}
						<div className="p-5 sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col rounded-lg border border-border bg-muted/40">
							<div>
								<p className="text-xs font-light tracking-widest mb-1 text-muted-foreground uppercase">
									{t("homePricingCalc.planLabel")}
								</p>
								<p className={`text-2xl font-semibold ${planColors[plan]}`}>
									{t(`homePricingCalc.plans.${plan}.name`)}
									<span className="ml-3 text-lg font-light text-muted-foreground">
										{t(`homePricingCalc.plans.${plan}.price`)}
									</span>
								</p>
								<p className="mt-1 text-sm font-light text-muted-foreground">
									{t(`homePricingCalc.plans.${plan}.limit`)}
								</p>
							</div>
							<Button
								variant={plan === "pro" ? "primary" : "outline"}
								asChild
								className="shrink-0"
							>
								<a href={ctaHref}>{t(ctaKey)}</a>
							</Button>
						</div>

						{/* Fine print */}
						<p className="text-xs font-light text-center text-muted-foreground">
							{t("homePricingCalc.note")}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
