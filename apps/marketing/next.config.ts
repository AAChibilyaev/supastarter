import { withContentCollections } from "@content-collections/next";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
	transpilePackages: ["@repo/i18n", "@repo/ui"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "placehold.co",
			},
			{
				protocol: "https",
				hostname: "picsum.photos",
			},
		],
	},
};

export default withSentryConfig(withContentCollections(withNextIntl(nextConfig)), {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	silent: !process.env.CI,
	widenClientFileUpload: true,
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	webpack: {
		treeshake: {
			removeDebugLogging: true,
		},
	},
});
