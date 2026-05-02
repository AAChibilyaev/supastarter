import { CtaFooter } from "@home/components/CtaFooter";
import { CodeExampleSection } from "@shared/components/CodeExampleSection";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompareAlgoliaGrid } from "../../../../modules/compare/components/CompareAlgoliaGrid";

const COMPARE_ALGOLIA_CODE = `// Before: Algolia
const { hits } = await index.search('query', {
  filters: \`visible_by:\${userId}\`,
});

// After: AACsearch
const results = await client.search({
  q: 'query',
  filter_by: combineFilters(userFilter, scopedToken),
});`;

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "compareAlgoliaPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function CompareAlgoliaPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "compareAlgoliaPage" });

	return (
		<>
			<section className="py-20 border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-5xl font-bold tracking-tight text-balance">{t("title")}</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<CompareAlgoliaGrid />
			<CodeExampleSection
				namespace="compareAlgolia"
				code={COMPARE_ALGOLIA_CODE}
				language="typescript"
			/>
			<CtaFooter />
		</>
	);
}
