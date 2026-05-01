"use client";

import { I18nProvider } from "fumadocs-ui/contexts/i18n";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface LocaleItem {
	name: string;
	locale: string;
}

interface Props {
	lang: string;
	locales: LocaleItem[];
	children: ReactNode;
}

export function I18nProviderClient({ lang, locales, children }: Props) {
	const router = useRouter();

	return (
		<I18nProvider
			locale={lang}
			locales={locales}
			onLocaleChange={(locale) => router.push(`/${locale}`)}
		>
			{children}
		</I18nProvider>
	);
}
