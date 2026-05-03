import { withContentCollections } from "@content-collections/next";
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

export default withContentCollections(withNextIntl(nextConfig));
