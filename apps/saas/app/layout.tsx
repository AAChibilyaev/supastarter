import { config } from "@config";
import { cn, Toaster } from "@repo/ui";
import { ApiClientProvider } from "@shared/components/ApiClientProvider";
import { ClientProviders } from "@shared/components/ClientProviders";
import { ConsentBanner } from "@shared/components/ConsentBanner";
import { ConsentProvider } from "@shared/components/ConsentProvider";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme } from "@teispace/next-themes/server";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Figtree } from "next/font/google";

import "./globals.css";
import "cropperjs/dist/cropper.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

const sansFont = Figtree({
	weight: ["300", "400", "500", "600", "700"],
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: {
		absolute: config.appName,
		default: config.appName,
		template: `%s | ${config.appName}`,
	},
};

export default async function RootLayout({ children }: PropsWithChildren) {
	const locale = await getLocale();
	const messages = await getMessages();
	const initialTheme = await getTheme();

	// Read consent cookie for GDPR cookie consent gating
	const cookieStore = await cookies();
	const consentCookie = cookieStore.get("consent");
	const initialConsent = consentCookie?.value === "true";

	return (
		<html lang={locale} suppressHydrationWarning className={sansFont.variable}>
			<body className={cn("min-h-screen bg-background text-foreground antialiased")}>
				<NuqsAdapter>
					<NextIntlClientProvider messages={messages}>
						<ThemeProvider
							attribute="class"
							defaultTheme={config.defaultTheme}
							disableTransitionOnChange
							enableSystem
							initialTheme={initialTheme ?? undefined}
							themes={Array.from(config.enabledThemes)}
						>
							<ConsentProvider initialConsent={initialConsent}>
								<ApiClientProvider>
									<ClientProviders>
										{children}

										<Toaster position="top-right" />
									</ClientProviders>
								</ApiClientProvider>

								<ConsentBanner />
							</ConsentProvider>
						</ThemeProvider>
					</NextIntlClientProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
