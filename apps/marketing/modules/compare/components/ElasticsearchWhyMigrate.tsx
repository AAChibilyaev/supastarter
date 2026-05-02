"use client";

import { useTranslations } from "next-intl";

export function ElasticsearchWhyMigrate() {
	const t = useTranslations("compareElasticsearch");

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl mb-10 text-center text-balance">
						{t("whyMigrate.title")}
					</h2>
					<div className="space-y-4">
						{[
							"whyMigrate.items.0",
							"whyMigrate.items.1",
							"whyMigrate.items.2",
							"whyMigrate.items.3",
						].map((key, i) => (
							<div
								key={key}
								className="gap-4 p-4 flex items-start rounded-lg border border-border/60"
							>
								<span className="size-8 text-sm font-semibold flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
									{i + 1}
								</span>
								<p className="leading-relaxed pt-1 text-muted-foreground">
									{t(key as Parameters<typeof t>[0])}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
