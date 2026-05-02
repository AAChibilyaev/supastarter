import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
	reactStrictMode: true,
	async redirects() {
		const nonDefaultLocales = ["de", "es", "fr", "ru"] as const;
		const localeGettingStarted = nonDefaultLocales.flatMap((locale) => [
			{
				source: `/${locale}/getting-started`,
				destination: `/${locale}/getting-started/overview`,
				permanent: false,
			},
			{
				source: `/${locale}/docs/getting-started`,
				destination: `/${locale}/getting-started/overview`,
				permanent: false,
			},
			{
				source: `/${locale}/docs/getting-started/:path*`,
				destination: `/${locale}/getting-started/:path*`,
				permanent: false,
			},
		]);

		return [
			{
				source: "/getting-started",
				destination: "/getting-started/overview",
				permanent: false,
			},
			{
				source: "/docs/getting-started",
				destination: "/getting-started/overview",
				permanent: false,
			},
			{
				source: "/docs/getting-started/:path*",
				destination: "/getting-started/:path*",
				permanent: false,
			},
			...localeGettingStarted,
		];
	},
	async rewrites() {
		return [
			{
				source: "/:path*.mdx",
				destination: "/llms.mdx/:path*",
			},
		];
	},
};

export default withMDX(config);
