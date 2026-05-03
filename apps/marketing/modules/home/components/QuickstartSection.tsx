import { useTranslations } from "next-intl";

export function QuickstartSection() {
	const t = useTranslations();

	const steps = ["create", "index", "token", "search"] as const;

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeQuickstart.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeQuickstart.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 gap-6 lg:gap-8 grid grid-cols-1 lg:grid-cols-2">
					{steps.map((step) => (
						<div
							key={step}
							className="overflow-hidden rounded-lg border border-border bg-[#0d0d10]"
						>
							<div className="gap-2 border-white/8 px-4 py-2.5 flex items-center border-b">
								<span className="size-2.5 bg-red-500/70 rounded-full" />
								<span className="size-2.5 bg-amber-500/70 rounded-full" />
								<span className="size-2.5 bg-emerald-500/70 rounded-full" />
								<span className="ml-2 font-mono text-xs text-white/40">
									{t(`homeQuickstart.steps.${step}.title`)}
								</span>
							</div>
							<pre className="p-4 font-mono leading-relaxed overflow-x-auto text-[13px] text-white/75">
								<code>{t(`homeQuickstart.steps.${step}.code`)}</code>
							</pre>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
