import { useTranslations } from "next-intl";

const ROWS = ["priceModel", "oneMillion", "tenMillion", "overage", "records", "zeroDowntime"] as const;

export function TcoComparison() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeTco.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeTco.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 overflow-x-auto rounded-xl border border-border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted/50">
								<th className="p-4 text-left font-medium text-foreground/70" />
								<th className="p-4 text-left font-semibold text-foreground">
									Algolia
								</th>
								<th className="p-4 text-left font-semibold text-primary">
									AACsearch
								</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((row) => (
								<tr key={row} className="border-b border-border last:border-0">
									<td className="p-4 font-medium text-foreground whitespace-nowrap">
										{t(`homeTco.rows.${row}.metric`)}
									</td>
									<td className="p-4 text-muted-foreground">
										{t(`homeTco.rows.${row}.algolia`)}
									</td>
									<td className="p-4 text-foreground">
										{t(`homeTco.rows.${row}.aac`)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
