import { Logo } from "@repo/ui";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

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
				<DocsLayout tree={tree} nav={{ title: <Logo /> }}>
					{children}
				</DocsLayout>
			</I18nProviderClient>
		</RootProvider>
	);
}
