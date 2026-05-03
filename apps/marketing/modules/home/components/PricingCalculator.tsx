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
	const [docsIdx, setDocsIdx] = useState(2);
	const [searchesIdx, setSearchesIdx] = useState(2);

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

	return (
		<section className="section-padding border-b border-border/80 bg-muted/[0.015]">
			<div className="container">
				<div className="max-w-xl mx-auto text-center">
					<h2 className="text-2xl font-semibold tracking-tight md:text-3xl leading-[1.08] text-balance text-foreground">
						{t("homePricingCalc.title")}
					</h2>
					<p className="mt-4 text-base font-normal leading-relaxed text-balance text-muted-foreground/80">
						{t("homePricingCalc.subtitle")}
					</p>
				</div>

				<div className="mt-10 max-w-xl mx-auto">
					<div className="p-6 md:p-8 space-y-7 rounded-2xl border border-border/50 bg-card shadow-[0_8px_28px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.15)]">
						{/* Docs slider */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-foreground/70">
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
								className="h-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:shadow-xs w-full cursor-pointer appearance-none rounded-full bg-border/40 accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
							/>
						</div>

						{/* Searches slider */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-foreground/70">
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
								className="h-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:shadow-xs w-full cursor-pointer appearance-none rounded-full bg-border/40 accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
							/>
						</div>

						{/* Units total */}
						<div className="pt-5 flex items-center justify-between border-t border-border/40">
							<span className="text-sm font-medium text-muted-foreground/70">
								{t("homePricingCalc.unitsLabel")}
							</span>
							<span className="text-base font-semibold text-foreground tabular-nums">
								{formatNumber(docs + searches)}
							</span>
						</div>

						{/* Recommended plan */}
						<div className="gap-4 p-5 sm:flex-row sm:items-center sm:justify-between flex flex-col rounded-xl border border-border/50 bg-muted/30">
							<div className="min-w-0">
								<p className="mb-1 font-medium text-[11px] tracking-[0.06em] text-muted-foreground/60 uppercase">
									{t("homePricingCalc.planLabel")}
								</p>
								<p className="text-lg font-semibold text-foreground">
									{t(`homePricingCalc.plans.${plan}.name`)}
									<span className="ml-2 text-base font-normal text-muted-foreground/60">
										{t(`homePricingCalc.plans.${plan}.price`)}
									</span>
								</p>
								<p className="mt-0.5 text-sm font-normal text-muted-foreground/60">
									{t(`homePricingCalc.plans.${plan}.limit`)}
								</p>
							</div>
							<Button
								variant={plan === "pro" ? "primary" : "outline"}
								asChild
								className="shrink-0 rounded-xl"
							>
								<a href={ctaHref}>{t(ctaKey)}</a>
							</Button>
						</div>

						{/* Fine print */}
						<p className="text-xs font-normal leading-relaxed text-center text-muted-foreground/50">
							{t("homePricingCalc.note")}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
