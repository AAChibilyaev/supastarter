import { getAllPosts } from "@blog/lib/posts";
import { CtaFooter } from "@home/components/CtaFooter";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CustomersCaseStudies } from "../../../modules/company/components/CustomersCaseStudies";
import { CustomersGrid } from "../../../modules/company/components/CustomersGrid";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "customersPage" });
	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function CustomersPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const allPosts = await getAllPosts(locale);
	const caseStudies = allPosts.filter(
		(post) => post.tags && post.tags.includes("case-study") && post.published,
	);

	const t = await getTranslations({ locale, namespace: "customersPage" });

	return (
		<>
			<section className="section-padding border-b border-border/60 text-center">
				<div className="container">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
						{t("title")}
					</h1>
					<p className="mt-4 text-xl max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("description")}
					</p>
				</div>
			</section>
			<CustomersGrid />
			{caseStudies.length > 0 && <CustomersCaseStudies caseStudies={caseStudies} />}
			<CtaFooter />
		</>
	);
}
