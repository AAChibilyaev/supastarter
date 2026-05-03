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

	const featureKeys = [
		"api",
		"sdks",
		"browserSdk",
		"connectorApi",
		"openapi",
		"dashboard",
	] as const;
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
					<div className="mb-4 gap-2 px-4 py-1.5 text-sm backdrop-blur-sm inline-flex items-center rounded-full border border-primary/20 bg-primary/5">
						<span className="size-1.5 rounded-full bg-primary" />
						<span className="font-medium text-primary">{t("hero.badge")}</span>
					</div>
					<h1 className="mt-4 text-5xl font-bold tracking-tight max-w-3xl text-balance">
						{t("title")}
					</h1>
					<p className="mt-4 text-xl max-w-2xl text-balance text-muted-foreground">
						{t("description")}
					</p>

					{/* Code block */}
					<div className="mt-10 max-w-2xl">
						<p className="mb-2 text-sm font-medium text-muted-foreground">
							{t("hero.codeCaption")}
						</p>
						<div className="shadow-lg overflow-hidden rounded-lg border border-border/60 bg-card/80">
							{/* Terminal title bar */}
							<div className="gap-2 px-4 py-3 flex items-center border-b border-border/50 bg-muted/30">
								<span className="size-2.5 bg-red-500/70 rounded-full" />
								<span className="size-2.5 bg-amber-500/70 rounded-full" />
								<span className="size-2.5 bg-emerald-500/70 rounded-full" />
								<span className="ml-3 text-xs font-mono text-muted-foreground">search.ts</span>
							</div>
							<pre className="p-5 font-mono leading-relaxed overflow-x-auto bg-muted/10 text-[13px] text-foreground/90">
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
