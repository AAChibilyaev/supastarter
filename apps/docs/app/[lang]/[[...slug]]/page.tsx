import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LLMCopyButton } from "@/components/ai/page-actions";
import { getPageImage, source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

type PageParams = { lang: string; slug?: string[] };

export default async function Page({ params }: { params: Promise<PageParams> }) {
	const { lang, slug } = await params;
	const page = source.getPage(slug, lang);

	if (!page) {
		notFound();
	}

	const MDX = page.data.body;

	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<div className="gap-2 pb-6 flex flex-row items-center border-b">
				<LLMCopyButton markdownUrl={`${page.url}.mdx`} />
			</div>
			<DocsBody>
				<MDX
					components={getMDXComponents({
						a: createRelativeLink(source, page),
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams("slug", "lang");
}

export async function generateMetadata({
	params,
}: {
	params: Promise<PageParams>;
}): Promise<Metadata> {
	const { lang, slug } = await params;
	const page = source.getPage(slug, lang);
	if (!page) {
		notFound();
	}

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			images: getPageImage(page).url,
		},
	};
}
