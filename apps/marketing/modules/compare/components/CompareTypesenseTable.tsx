"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useTranslations } from "next-intl";

// Features to show in the comparison table, in order
const FEATURE_KEYS = [
	"searchEngine",
	"managedHosting",
	"analytics",
	"widget",
	"connectors",
	"multiTenancy",
	"scopedTokens",
	"rateLimiting",
	"apiKeyManagement",
	"publicApi",
	"userManagement",
	"pricing",
	"entryPrice",
	"midMarket",
	"sla",
	"selfHost",
] as const;

function FeatureCell({ text, highlight }: { text: string; highlight?: boolean }) {
	return (
		<span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>
			{text}
		</span>
	);
}

export function CompareTypesenseTable() {
	const t = useTranslations("compareTypesense");

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-5xl mx-auto">
					<div className="mb-10 text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("table.title")}
						</h2>
						<p className="mt-3 text-lg text-muted-foreground">{t("table.subtitle")}</p>
					</div>

					{/* Mobile: card-based layout */}
					<div className="md:hidden space-y-4">
						{FEATURE_KEYS.map((key) => (
							<div key={key} className="p-4 rounded-lg border border-border/60">
								<div className="font-semibold text-sm mb-2">
									{t(`table.features.${key}.title`)}
								</div>
								<div className="gap-2 text-sm grid grid-cols-2">
									<div>
										<div className="text-xs mb-1 text-muted-foreground">
											AACsearch
										</div>
										<div className="rounded px-2 py-1 font-medium bg-primary/5">
											{t(`table.features.${key}.aacsearch`)}
										</div>
									</div>
									<div>
										<div className="text-xs mb-1 text-muted-foreground">
											Typesense Cloud
										</div>
										<div className="rounded px-2 py-1">
											{t(`table.features.${key}.typesenseCloud`)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Desktop: table layout */}
					<div className="md:block hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-56" />
									<TableHead className="font-semibold bg-primary/5 text-foreground">
										AACsearch
									</TableHead>
									<TableHead>Typesense Cloud</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{FEATURE_KEYS.map((key) => (
									<TableRow key={key}>
										<TableCell className="font-medium">
											{t(`table.features.${key}.title`)}
										</TableCell>
										<TableCell className="bg-primary/5">
											<FeatureCell
												text={t(`table.features.${key}.aacsearch`)}
												highlight
											/>
										</TableCell>
										<TableCell>
											<FeatureCell
												text={t(`table.features.${key}.typesenseCloud`)}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		</section>
	);
}
