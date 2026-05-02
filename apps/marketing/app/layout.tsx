import { config } from "@config";
import { getBaseUrl } from "@shared/lib/base-url";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import "./globals.css";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
	metadataBase: new URL(baseUrl),
	title: {
		absolute: config.appName,
		default: config.appName,
		template: `%s | ${config.appName}`,
	},
	description:
		"Hosted search-as-a-service API with org-scoped tokens, per-key rate limiting, and instant full-text search. Ship search in one afternoon.",
	keywords: [
		"search API",
		"hosted search",
		"Typesense",
		"full-text search",
		"search as a service",
		"search analytics",
		"faceted search",
	],
	openGraph: {
		type: "website",
		siteName: config.appName,
		images: [
			{
				url: "/images/hero-image.png",
				width: 1200,
				height: 630,
				alt: config.appName,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		images: ["/images/hero-image.png"],
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({ children }: PropsWithChildren) {
	return children;
}
