import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const PERFECT_COUNT = 5;
const SKIP_COUNT = 4;

export function FitSection() {
	const t = useTranslations("homeFit");

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
				</div>

				<div className="mt-12 md:mt-16 md:grid-cols-2 gap-6 max-w-4xl mx-auto grid grid-cols-1">
					{/* Perfect fit */}
					<div className="p-6 md:p-8 rounded-xl border border-border bg-card">
						<div className="gap-2 mb-5 flex items-center">
							<div className="size-7 flex shrink-0 items-center justify-center rounded-md bg-success/15">
								<CheckIcon className="size-4 text-success" />
							</div>
							<h3 className="text-base font-light text-foreground">
								{t("perfectTitle")}
							</h3>
						</div>
						<ul className="space-y-3">
							{Array.from({ length: PERFECT_COUNT }, (_, i) => (
								<li key={i} className="gap-3 flex items-start">
									<CheckIcon className="mt-0.5 size-4 shrink-0 text-success/60" />
									<span className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
										{t(`perfect.${i}`)}
									</span>
								</li>
							))}
						</ul>
					</div>

					{/* Skip if */}
					<div className="p-6 md:p-8 rounded-xl border border-border bg-card">
						<div className="gap-2 mb-5 flex items-center">
							<div className="size-7 flex shrink-0 items-center justify-center rounded-md bg-muted">
								<XIcon className="size-4 text-muted-foreground" />
							</div>
							<h3 className="text-base font-light text-foreground">
								{t("skipTitle")}
							</h3>
						</div>
						<ul className="space-y-3">
							{Array.from({ length: SKIP_COUNT }, (_, i) => (
								<li key={i} className="gap-3 flex items-start">
									<XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
									<span className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
										{t(`skip.${i}`)}
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}
