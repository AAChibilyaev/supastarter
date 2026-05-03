import { Card, CardTitle } from "@repo/ui";
import { DollarSignIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function TypesenseScenarios() {
	const t = useTranslations("compareTypesense");

	const scenarios = ["scenario1", "scenario2", "scenario3"] as const;

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-4xl mx-auto">
					<div className="mb-10 text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("scenarios.title")}
						</h2>
					</div>
					<div className="space-y-6">
						{scenarios.map((scenario) => (
							<Card key={scenario} className="p-6">
								<div className="gap-3 flex items-start">
									<DollarSignIcon className="size-5 mt-0.5 shrink-0 text-primary" />
									<div className="space-y-3">
										<CardTitle className="text-lg">
											{t(`scenarios.${scenario}.heading`)}
										</CardTitle>
										<ul className="space-y-2 text-sm text-muted-foreground">
											<li className="gap-2 flex">
												<span className="font-semibold shrink-0 text-foreground">
													Typesense Cloud:
												</span>
												<span>
													{t(`scenarios.${scenario}.typesenseCloud`)}
												</span>
											</li>
											<li className="gap-2 flex">
												<span className="font-semibold shrink-0 text-primary">
													AACsearch:
												</span>
												<span>{t(`scenarios.${scenario}.aacsearch`)}</span>
											</li>
										</ul>
										<div className="pt-1 text-sm font-semibold text-muted-foreground">
											{t(`scenarios.${scenario}.saving`)}
										</div>
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
