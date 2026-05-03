import { Logo } from "@repo/ui";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import { AacsearchSearchProvider } from "@/components/aacsearch-search-provider";
import { SearchToggle } from "@/components/search-toggle";
import { I18nProviderClient } from "@/components/i18n-provider";
import { source } from "@/lib/source";

const locales = [
	{ name: "English", locale: "en" },
	{ name: "Deutsch", locale: "de" },
	{ name: "Español", locale: "es" },
	{ name: "Français", locale: "fr" },
	{ name: "Русский", locale: "ru" },
];

export default async function LangLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const tree = source.getPageTree(lang);

	return (
		<RootProvider>
			<I18nProviderClient lang={lang} locales={locales}>
				<AacsearchSearchProvider lang={lang}>
					<DocsLayout
						tree={tree}
						nav={{
							title: <Logo />,
							children: <SearchToggle />,
						}}
					>
						{children}
					</DocsLayout>
				</AacsearchSearchProvider>
			</I18nProviderClient>
		</RootProvider>
	);
}
