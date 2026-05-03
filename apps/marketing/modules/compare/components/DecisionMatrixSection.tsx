"use client";

import { useTranslations } from "next-intl";

export function DecisionMatrixSection() {
	const t = useTranslations("compareAlgolia");

	const aacItems = [0, 1, 2, 3, 4];
	const algoliaItems = [0, 1, 2, 3];

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-4xl mx-auto">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl mb-12 text-center text-balance">
						{t("decisionMatrix.title")}
					</h2>
					<div className="md:grid-cols-2 gap-8 grid">
						{/* AACsearch column */}
						<div className="p-6 md:p-8 rounded-xl border border-primary/20 bg-primary/5">
							<h3 className="font-semibold text-xl mb-4 text-primary">
								{t("decisionMatrix.whenAACsearch.heading")}
							</h3>
							<ul className="space-y-3">
								{aacItems.map((i) => (
									<li key={i} className="gap-3 text-sm flex">
										<span className="size-5 mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-primary/20">
											<span className="font-bold text-xs text-primary">✓</span>
										</span>
										<span className="leading-relaxed text-muted-foreground">
											{t(`decisionMatrix.whenAACsearch.items.${i}` as Parameters<typeof t>[0])}
										</span>
									</li>
								))}
							</ul>
						</div>

						{/* Algolia column */}
						<div className="p-6 md:p-8 rounded-xl border border-border/60">
							<h3 className="font-semibold text-xl mb-4">
								{t("decisionMatrix.whenAlgolia.heading")}
							</h3>
							<ul className="space-y-3">
								{algoliaItems.map((i) => (
									<li key={i} className="gap-3 text-sm flex">
										<span className="size-5 mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-muted">
											<span className="font-bold text-xs text-muted-foreground">•</span>
										</span>
										<span className="leading-relaxed text-muted-foreground">
											{t(`decisionMatrix.whenAlgolia.items.${i}` as Parameters<typeof t>[0])}
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
