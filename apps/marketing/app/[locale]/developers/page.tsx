import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DevelopersFeatures } from "../../../modules/developers/components/DevelopersFeatures";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "developersPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function DevelopersPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "developersPage" });

	const featureKeys = ["api", "sdks", "browserSdk", "connectorApi", "openapi", "dashboard"] as const;
	const features = featureKeys.map((key) => ({
		key,
		title: t(`features.${key}.title`),
		description: t(`features.${key}.description`),
	}));

	const codeSample = `// AACsearch in 3 lines
const client = new AACSearchClient({ apiKey: "ss_search_***", host: "search.yourdomain.com" });
const results = await client.search({ q: "sneakers", collection: "products" });
console.log(results.hits);`;

	return (
		<>
			{/* Hero */}
			<section className="py-20 border-b border-border/60">
				<div className="container">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
						<span className="size-1.5 rounded-full bg-primary" />
						<span className="font-medium text-primary">{t("hero.badge")}</span>
					</div>
					<h1 className="mt-4 text-5xl font-bold tracking-tight text-balance max-w-3xl">
						{t("title")}
					</h1>
					<p className="mt-4 text-xl text-muted-foreground text-balance max-w-2xl">
						{t("description")}
					</p>

					{/* Code block */}
					<div className="mt-10 max-w-2xl">
						<p className="mb-2 text-sm text-muted-foreground font-medium">{t("hero.codeCaption")}</p>
						<div className="rounded-lg border border-border/60 bg-card/80 overflow-hidden shadow-lg">
							{/* Terminal title bar */}
							<div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
								<span className="size-2.5 rounded-full bg-red-500/70" />
								<span className="size-2.5 rounded-full bg-amber-500/70" />
								<span className="size-2.5 rounded-full bg-emerald-500/70" />
								<span className="ml-3 text-xs font-mono text-muted-foreground">search.ts</span>
							</div>
							<pre className="p-5 font-mono text-[13px] leading-relaxed overflow-x-auto text-foreground/90 bg-muted/10">
								<code>{codeSample}</code>
							</pre>
						</div>
					</div>
				</div>
			</section>

			<DevelopersFeatures sectionTitle={t("features.title")} features={features} />

			<CtaFooter />
		</>
	);
}
