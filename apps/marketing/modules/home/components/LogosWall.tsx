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
		<section className="py-16 md:py-24 border-b border-border">
			<div className="container">
				<p className="text-xs font-semibold tracking-widest text-center text-muted-foreground/50 uppercase">
					{t("logos.title")}
				</p>

				<div className="mt-8 gap-x-10 gap-y-4 md:gap-x-16 flex flex-wrap items-center justify-center">
					{LOGOS.map((name) => (
						<span
							key={name}
							className="text-sm font-semibold tracking-tight text-muted-foreground/35 transition-colors duration-200 select-none hover:text-muted-foreground/65"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
