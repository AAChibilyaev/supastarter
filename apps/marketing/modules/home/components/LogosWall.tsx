import { useTranslations } from "next-intl";

const LOGOS = [
	"NordikHome",
	"DevStream",
	"ShopGuru",
	"ContentStack",
	"MarketPulse",
	"BuildForge",
	"RetailPro",
	"AgencyHub",
];

export function LogosWall() {
	const t = useTranslations("home");

	return (
		<section className="border-b border-border py-12 md:py-16">
			<div className="container">
				<p className="text-xs font-semibold tracking-widest text-center text-muted-foreground/50 uppercase">
					{t("logos.title")}
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-16">
					{LOGOS.map((name) => (
						<span
							key={name}
							className="text-sm font-semibold tracking-tight text-muted-foreground/35 select-none transition-colors duration-200 hover:text-muted-foreground/65"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
