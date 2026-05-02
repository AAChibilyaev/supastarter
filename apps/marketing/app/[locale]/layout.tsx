import { AnalyticsScript } from "@analytics";
import { config } from "@config";
import { config as i18nConfig } from "@i18n/config";
import { cn } from "@repo/ui";
import { ClientProviders } from "@shared/components/ClientProviders";
import { ConsentBanner } from "@shared/components/ConsentBanner";
import { ConsentProvider } from "@shared/components/ConsentProvider";
import { Footer } from "@shared/components/Footer";
import { NavBar } from "@shared/components/NavBar";
import { MarketingThemeProvider } from "@shared/components/ThemeProvider";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Figtree } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { PropsWithChildren } from "react";

const sansFont = Figtree({
	weight: ["300", "400", "500", "600", "700"],
	subsets: ["latin"],
	variable: "--font-sans",
});

const locales = Object.keys(i18nConfig.locales) as string[];
const defaultLocale = i18nConfig.defaultLocale;

const ogLocaleMap: Record<string, string> = {
	en: "en_US",
	de: "de_DE",
	es: "es_ES",
	fr: "fr_FR",
	ru: "ru_RU",
};

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const baseUrl = getBaseUrl();

	const alternateLanguages: Record<string, string> = {};
	for (const l of locales) {
		const prefix = l === defaultLocale ? "" : `/${l}`;
		alternateLanguages[l] = `${baseUrl}${prefix}`;
	}
	alternateLanguages["x-default"] = baseUrl;

	return {
		alternates: {
			languages: alternateLanguages,
		},
		openGraph: {
			locale: ogLocaleMap[locale] ?? locale,
			alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocaleMap[l] ?? l),
		},
	};
}

export default async function MarketingLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ locale: string }> }>) {
	const { locale } = await params;

	if (!locales.includes(locale)) {
		notFound();
	}

	setRequestLocale(locale);

	const messages = await getMessages();

	const cookieStore = await cookies();
	const consentCookie = cookieStore.get("consent");

	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={cn(sansFont.variable, config.defaultTheme === "dark" ? "dark" : undefined)}
		>
			<body className={cn("min-h-screen bg-background text-foreground antialiased")}>
				<ConsentProvider initialConsent={consentCookie?.value === "true"}>
					<NextIntlClientProvider locale={locale} messages={messages}>
						<ClientProviders>
							<MarketingThemeProvider defaultTheme={config.defaultTheme}>
								<NavBar />

								<main className="min-h-screen">{children}</main>

								<Footer />

								<ConsentBanner />
								<AnalyticsScript />
							</MarketingThemeProvider>
						</ClientProviders>
					</NextIntlClientProvider>
				</ConsentProvider>
			</body>
		</html>
	);
}
