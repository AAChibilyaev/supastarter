import { useTranslations } from "next-intl";

const LOGOS = [
	{ name: "NordikHome", industry: "ecommerce" },
	{ name: "DevStream", industry: "saas" },
	{ name: "ShopGuru", industry: "ecommerce" },
	{ name: "ContentStack", industry: "media" },
	{ name: "MarketPulse", industry: "analytics" },
	{ name: "BuildForge", industry: "devtools" },
	{ name: "RetailPro", industry: "enterprise" },
	{ name: "AgencyHub", industry: "agency" },
];

/**
 * Customer logo wall — social proof section showing brands that trust AACsearch.
 * Place on homepage between PricingPlans and CtaFooter.
 */
export function LogosWall() {
	const t = useTranslations("home");

	return (
		<section className="py-20 border-b border-border/60">
			<div className="container">
				<p className="text-sm font-semibold tracking-wider text-center text-muted-foreground uppercase">
					{t("logos.title")}
				</p>

				<div className="mt-10 gap-x-16 gap-y-8 flex flex-wrap items-center justify-center">
					{LOGOS.map((logo) => (
						<div
							key={logo.name}
							className="group gap-3 flex items-center opacity-60 transition-all duration-300 hover:opacity-100"
						>
							<div className="size-14 flex items-center justify-center rounded-xl border border-border/30 bg-accent/5 transition-colors group-hover:border-primary/30 group-hover:bg-accent/10">
								<span className="text-base font-bold tracking-tight text-muted-foreground/50 select-none group-hover:text-foreground/70">
									{logo.name.slice(0, 2)}
								</span>
							</div>
							<span className="text-sm font-medium whitespace-nowrap text-muted-foreground/50 group-hover:text-foreground/70">
								{logo.name}
							</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
