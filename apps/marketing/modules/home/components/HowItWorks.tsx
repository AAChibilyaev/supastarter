import { DatabaseIcon, KeyRoundIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

const STEPS = [
	{ key: "step1", icon: DatabaseIcon },
	{ key: "step2", icon: KeyRoundIcon },
	{ key: "step3", icon: SearchIcon },
] as const;

function StepConnector() {
	return (
		<div className="lg:flex mx-auto hidden shrink-0 translate-y-[-20px] items-center">
			<svg
				width="48"
				height="12"
				viewBox="0 0 48 12"
				fill="none"
				aria-hidden="true"
				className="text-border"
			>
				<path
					d="M0 6H43M43 6L38 1M43 6L38 11"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

export function HowItWorks() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("home.howItWorks.title")}
					</h2>
					<p className="mt-4 text-base font-light text-muted-foreground">
						{t("home.howItWorks.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 grid grid-cols-1">
					{STEPS.map(({ key, icon: Icon }, i) => (
						<>
							<StepCard
								key={key}
								step={i + 1}
								icon={Icon}
								title={t(`home.howItWorks.${key}.title`)}
								description={t(`home.howItWorks.${key}.description`)}
								badge={t(`home.howItWorks.${key}.badge`)}
							/>
							{i < STEPS.length - 1 && <StepConnector key={`connector-${i}`} />}
						</>
					))}
				</div>
			</div>
		</section>
	);
}

interface StepCardProps {
	step: number;
	icon: ComponentType<{ className?: string }>;
	title: string;
	description: string;
	badge: string;
}

function StepCard({ step, icon: Icon, title, description, badge }: StepCardProps) {
	return (
		<div className="p-6 md:p-8 flex flex-col rounded-xl border border-border bg-card">
			{/* Step number + icon row */}
			<div className="gap-3 mb-5 flex items-center">
				<div className="size-9 flex shrink-0 items-center justify-center rounded-lg bg-muted">
					<Icon className="size-4 text-muted-foreground" />
				</div>
				<span className="font-mono text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
					Step {String(step).padStart(2, "0")}
				</span>
			</div>

			{/* Title + description */}
			<h3 className="text-base font-normal tracking-tight text-foreground">{title}</h3>
			<p className="mt-2 text-sm font-light leading-relaxed flex-1 text-pretty text-muted-foreground">
				{description}
			</p>

			{/* Technical badge */}
			<div className="mt-5 pt-4 border-t border-border">
				<span className="font-mono text-[11px] break-all text-muted-foreground/70">
					{badge}
				</span>
			</div>
		</div>
	);
}
